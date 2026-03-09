/**
 * Firestore service layer — replaces all Express API calls.
 * All reads/writes go directly to Firebase from the browser.
 */
import { db, storage, auth, secondaryAuth } from '../firebase';
import { createUserWithEmailAndPassword, signOut as secondarySignOut } from 'firebase/auth';
import {
  collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc, setDoc,
  query, orderBy, serverTimestamp,
} from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL, getBytes, deleteObject } from 'firebase/storage';
// sql-wasm.wasm is imported as a URL string only (no WASM bytes in the main bundle).
// It is copied to /dist/assets/ by Vite and used only when a .gpkg file is parsed.
import sqlWasm from 'sql.js/dist/sql-wasm.wasm?url';

// ── helpers ────────────────────────────────────────────────────────────────

function docToObj(d) {
  return { id: d.id, ...d.data() };
}

// ── GeoPackage WKB geometry parsing ────────────────────────────────────────

/**
 * Parse a GPKG geometry blob (GPKG header + WKB) into a GeoJSON geometry object.
 * GPKG geometry header: 2 bytes magic (GP) + 1 byte version + 1 byte flags +
 * 4 bytes srs_id + optional envelope (size depends on flags bits 1-3) + WKB.
 */
function parseGpkgGeometry(blob) {
  const buf = blob instanceof Uint8Array ? blob : new Uint8Array(blob);
  if (buf[0] !== 0x47 || buf[1] !== 0x50) throw new Error('Not a valid GPKG geometry blob');
  const flags = buf[3];
  const envelopeIndicator = (flags >> 1) & 7;
  const envelopeBytes = [0, 32, 48, 48, 64][envelopeIndicator] || 0;
  const state = { offset: 8 + envelopeBytes }; // 2+1+1+4 header + envelope
  return parseWKBGeometry(new DataView(buf.buffer, buf.byteOffset, buf.byteLength), state);
}

/** Recursively parse a WKB geometry. `state.offset` is advanced as bytes are read. */
function parseWKBGeometry(view, state) {
  const byteOrder = view.getUint8(state.offset); state.offset += 1;
  const le = byteOrder === 1;
  const u32 = () => { const v = view.getUint32(state.offset, le); state.offset += 4; return v; };
  const f64 = () => { const v = view.getFloat64(state.offset, le); state.offset += 8; return v; };

  const rawType = u32();
  const hasZ = !!(rawType & 0x80000000) || (rawType > 1000 && rawType < 2000);
  const hasM = !!(rawType & 0x40000000) || (rawType >= 2000 && rawType < 4000);
  const geomBase = rawType & 0xFFFF;
  // Normalise ISO Z/M type codes (1001→1, 2001→1, 3001→1, etc.) to 1-7
  const geomType = geomBase > 1000 ? ((geomBase - 1) % 1000) + 1 : geomBase;

  const pt = () => {
    const c = [f64(), f64()];
    if (hasZ) c.push(f64()); else if (geomBase > 1000 && geomBase < 2000) c.push(f64());
    if (hasM) f64(); // consume M, don't include in GeoJSON
    return c;
  };
  const ring = () => Array.from({ length: u32() }, pt);

  switch (geomType) {
    case 1: return { type: 'Point', coordinates: pt() };
    case 2: return { type: 'LineString', coordinates: Array.from({ length: u32() }, pt) };
    case 3: return { type: 'Polygon', coordinates: Array.from({ length: u32() }, ring) };
    case 4: return { type: 'MultiPoint', coordinates: Array.from({ length: u32() }, () => parseWKBGeometry(view, state).coordinates) };
    case 5: return { type: 'MultiLineString', coordinates: Array.from({ length: u32() }, () => parseWKBGeometry(view, state).coordinates) };
    case 6: return { type: 'MultiPolygon', coordinates: Array.from({ length: u32() }, () => parseWKBGeometry(view, state).coordinates) };
    case 7: return { type: 'GeometryCollection', geometries: Array.from({ length: u32() }, () => parseWKBGeometry(view, state)) };
    default: throw new Error(`Unsupported WKB geometry type: ${geomType}`);
  }
}

/** Parse a GeoPackage (.gpkg) file and return a GeoJSON FeatureCollection. */
async function parseGeoPackage(file) {
  const initSqlJs = (await import('sql.js')).default;
  const SQL = await initSqlJs({ locateFile: () => sqlWasm });
  const buf = await file.arrayBuffer();
  const db = new SQL.Database(new Uint8Array(buf));

  let tablesResult;
  try {
    tablesResult = db.exec('SELECT table_name, column_name FROM gpkg_geometry_columns');
  } catch {
    db.close();
    throw new Error('File does not appear to be a valid GeoPackage (missing gpkg_geometry_columns).');
  }

  if (!tablesResult.length || !tablesResult[0].values.length) {
    db.close();
    throw new Error('GeoPackage contains no feature layers.');
  }

  const features = [];
  for (const [tableName, geomCol] of tablesResult[0].values) {
    let rows;
    try {
      rows = db.exec(`SELECT * FROM "${tableName}"`);
    } catch { continue; }
    if (!rows.length) continue;

    const cols = rows[0].columns;
    const geomIdx = cols.indexOf(geomCol);
    for (const row of rows[0].values) {
      const geomBlob = row[geomIdx];
      if (!geomBlob) continue;
      try {
        const geometry = parseGpkgGeometry(geomBlob);
        const properties = {};
        cols.forEach((col, i) => { if (i !== geomIdx) properties[col] = row[i]; });
        features.push({ type: 'Feature', geometry, properties });
      } catch { /* skip invalid geometry rows */ }
    }
  }
  db.close();

  if (!features.length) throw new Error('GeoPackage was read but contained no valid geometries.');
  return { type: 'FeatureCollection', features };
}

// ── File → GeoJSON conversion ───────────────────────────────────────────────

/**
 * Parse any supported geospatial file into a GeoJSON FeatureCollection.
 *
 * Supported formats: .geojson, .json, .kml, .gpkg, .shp (standalone), .zip
 *
 * ZIP handling strategy:
 *  1. shpjs.parseZip() — fast path for flat shapefile ZIPs
 *  2. JSZip deep scan — finds .shp at any subdirectory depth
 *  3. Embedded .geojson/.json — reads GeoJSON bundled inside the ZIP
 */
export async function parseFileToGeoJSON(file) {
  const ext = file.name.split('.').pop().toLowerCase();

  // ── GeoJSON / JSON ────────────────────────────────────────────────────────
  if (['geojson', 'json'].includes(ext)) {
    const text = await file.text();
    const parsed = JSON.parse(text);
    if (!parsed || (parsed.type !== 'FeatureCollection' && parsed.type !== 'Feature')) {
      throw new Error('File does not appear to be valid GeoJSON.');
    }
    return parsed;
  }

  // ── KML ───────────────────────────────────────────────────────────────────
  if (ext === 'kml') {
    const { kml: parseKML } = await import('@mapbox/togeojson');
    const text = await file.text();
    const dom = new DOMParser().parseFromString(text, 'text/xml');
    const result = parseKML(dom);
    if (!result?.features?.length) throw new Error('KML file contains no mappable features.');
    return result;
  }

  // ── GeoPackage ────────────────────────────────────────────────────────────
  if (ext === 'gpkg') {
    return await parseGeoPackage(file);
  }

  // ── Standalone Shapefile (.shp) ───────────────────────────────────────────
  if (ext === 'shp') {
    const { parseShp } = await import('shpjs');
    const buffer = await file.arrayBuffer();
    const geometries = parseShp(buffer);
    if (!geometries?.length) {
      throw new Error('Shapefile contains no geometry. For best results, ZIP all shapefile components (.shp, .dbf, .shx, .prj) together.');
    }
    return {
      type: 'FeatureCollection',
      features: geometries.map(g => ({ type: 'Feature', geometry: g, properties: {} })),
    };
  }

  // ── ZIP (shapefile bundle or embedded GeoJSON) ────────────────────────────
  if (ext === 'zip') {
    const buffer = await file.arrayBuffer();

    // Attempt 1: shpjs fast path (works when .shp files are at the ZIP root)
    try {
      const { parseZip } = await import('shpjs');
      const result = await parseZip(buffer);
      const layers = Array.isArray(result) ? result : [result];
      const features = layers.flatMap(fc => fc?.features || []);
      if (features.length > 0) return { type: 'FeatureCollection', features };
    } catch (shpErr) {
      if (!shpErr.message?.includes('no layers')) throw shpErr;
    }

    // Attempt 2: JSZip deep scan — handles nested directory structure
    const JSZip = (await import('jszip')).default;
    const zip = await JSZip.loadAsync(buffer);
    const names = Object.keys(zip.files).filter(n => !zip.files[n].dir);

    const shpFiles = names.filter(n => n.toLowerCase().endsWith('.shp'));
    if (shpFiles.length > 0) {
      const { parseShp, parseDbf, combine } = await import('shpjs');
      const allFeatures = [];
      for (const shpPath of shpFiles) {
        const base = shpPath.replace(/\.shp$/i, '');
        const dbfPath = names.find(n => n.toLowerCase() === (base + '.dbf').toLowerCase());
        const shpBuf = await zip.files[shpPath].async('arraybuffer');
        const shpGeo = parseShp(shpBuf);
        let fc;
        if (dbfPath) {
          const dbfBuf = await zip.files[dbfPath].async('arraybuffer');
          fc = combine([shpGeo, parseDbf(dbfBuf)]);
        } else {
          fc = { type: 'FeatureCollection', features: shpGeo.map(g => ({ type: 'Feature', geometry: g, properties: {} })) };
        }
        allFeatures.push(...(fc?.features || []));
      }
      if (allFeatures.length > 0) return { type: 'FeatureCollection', features: allFeatures };
    }

    // Attempt 3: GeoJSON file embedded inside the ZIP
    const geoFile = names.find(n => /\.(geojson|json)$/i.test(n));
    if (geoFile) {
      const text = await zip.files[geoFile].async('text');
      const parsed = JSON.parse(text);
      if (parsed?.type) return parsed;
    }

    const listed = names.slice(0, 8).join(', ');
    throw new Error(`No mappable data found in ZIP. Contents: ${listed || '(empty)'}. Expected: .shp shapefile or .geojson file.`);
  }

  throw new Error('Unsupported file type. Accepted: .geojson, .json, .zip, .kml, .gpkg, .shp');
}

/**
 * Shrink a GeoJSON FeatureCollection to fit within maxBytes for Firestore inline storage.
 *
 * Strategy (applied in order until data fits):
 *  1. Turf topology simplification — dramatically reduces vertex count on complex polygons
 *  2. Coordinate decimal precision reduction (5→4→3 decimal places)
 *
 * Returns the compressed GeoJSON, or null if it still can't fit (data will be
 * served from Firebase Storage instead, which supports unlimited sizes).
 */
/**
 * Calculate the geodetic area of all Polygon / MultiPolygon features in a GeoJSON
 * object and return the total in hectares (rounded to 2 decimal places).
 * Uses the spherical excess formula (same algorithm as @turf/area).
 */
export function calculateGeoJSONAreaHa(geojson) {
  const R = 6378137; // WGS84 mean radius in metres
  function rad(d) { return d * Math.PI / 180; }

  function ringAreaM2(coords) {
    const n = coords.length;
    if (n < 3) return 0;
    let area = 0;
    for (let i = 0; i < n; i++) {
      const p1 = coords[i === 0 ? n - 1 : i - 1];
      const p2 = coords[i];
      const p3 = coords[(i + 1) % n];
      area += (rad(p3[0]) - rad(p1[0])) * Math.sin(rad(p2[1]));
    }
    return Math.abs(area * R * R / 2);
  }

  function polyHa(rings) {
    if (!rings?.length) return 0;
    let a = ringAreaM2(rings[0]);
    for (let i = 1; i < rings.length; i++) a -= ringAreaM2(rings[i]); // subtract holes
    return a / 10000; // m² → ha
  }

  const feats = geojson?.type === 'FeatureCollection' ? (geojson.features || [])
    : geojson?.type === 'Feature' ? [geojson] : [];

  let total = 0;
  for (const f of feats) {
    const g = f?.geometry;
    if (!g) continue;
    if (g.type === 'Polygon') total += polyHa(g.coordinates);
    else if (g.type === 'MultiPolygon') g.coordinates.forEach(p => { total += polyHa(p); });
  }
  return Math.round(total * 100) / 100;
}

async function fitGeoJSONToLimit(geojson, maxBytes = 880000) {
  function roundCoord(c, p) {
    return typeof c === 'number' ? parseFloat(c.toFixed(p)) : c.map(x => roundCoord(x, p));
  }
  function roundGeom(geom, p) {
    if (!geom || !geom.coordinates) return geom;
    return { ...geom, coordinates: roundCoord(geom.coordinates, p) };
  }
  const byteSize = (obj) => new TextEncoder().encode(JSON.stringify(obj)).length;

  if (byteSize(geojson) <= maxBytes) return geojson;

  // Step 1: Topology simplification (most effective for complex polygon/line datasets)
  try {
    const { default: simplify } = await import('@turf/simplify');
    for (const tolerance of [0.0001, 0.001, 0.005, 0.01]) {
      try {
        const simplified = simplify(
          { type: 'FeatureCollection', features: (geojson.features || []).filter(f => f.geometry) },
          { tolerance, highQuality: false, mutate: false }
        );
        if (byteSize(simplified) <= maxBytes) return simplified;
        geojson = simplified; // feed into next round of coordinate rounding
      } catch { break; } // stop if simplify throws (e.g. invalid geometry)
    }
  } catch (e) {
    console.warn('Turf simplify not available:', e.message);
  }

  // Step 2: Coordinate precision reduction (fast, always applicable)
  for (const precision of [5, 4, 3]) {
    const compressed = {
      ...geojson,
      features: (geojson.features || []).map(f => ({
        ...f,
        geometry: roundGeom(f.geometry, precision),
      })),
    };
    if (byteSize(compressed) <= maxBytes) return compressed;
  }

  return null; // Too large — will be served from Firebase Storage
}

function paginate(arr, page, pageSize) {
  const total = arr.length;
  return {
    data: arr.slice((page - 1) * pageSize, page * pageSize),
    pagination: { total, pages: Math.ceil(total / pageSize) || 1, page },
  };
}

// ── SURVEYS ────────────────────────────────────────────────────────────────

export async function getSurveys({ province, surveyType, search, page = 1, pageSize = 15 } = {}) {
  const snap = await getDocs(query(collection(db, 'surveys'), orderBy('createdAt', 'desc')));
  let list = snap.docs.map(docToObj);
  if (province) list = list.filter(s => s.province === province);
  if (surveyType) list = list.filter(s => s.surveyType === surveyType);
  if (search) {
    const q = search.toLowerCase();
    list = list.filter(s =>
      s.community?.toLowerCase().includes(q) ||
      s.lmmaName?.toLowerCase().includes(q) ||
      s.province?.toLowerCase().includes(q)
    );
  }
  const { data, pagination } = paginate(list, page, pageSize);
  return { surveys: data, pagination };
}

export async function getSurvey(id) {
  const snap = await getDoc(doc(db, 'surveys', id));
  return snap.exists() ? docToObj(snap) : null;
}

export async function createSurvey(data) {
  return addDoc(collection(db, 'surveys'), {
    ...data,
    submittedBy: auth.currentUser?.uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateSurvey(id, data) {
  return updateDoc(doc(db, 'surveys', id), { ...data, updatedAt: serverTimestamp() });
}

export async function deleteSurvey(id) {
  return deleteDoc(doc(db, 'surveys', id));
}

export async function getSurveyStats() {
  const snap = await getDocs(collection(db, 'surveys'));
  const list = snap.docs.map(d => d.data());
  const byProvince = {};
  const communities = new Set();
  list.forEach(s => {
    const p = s.province || 'Unknown';
    byProvince[p] = (byProvince[p] || 0) + 1;
    if (s.community) communities.add(s.community);
  });
  return {
    total: list.length,
    communityCount: communities.size,
    byProvince: Object.entries(byProvince).map(([province, count]) => ({ province, count })),
  };
}

export async function getSurveysForMap() {
  const snap = await getDocs(collection(db, 'surveys'));
  return snap.docs.map(docToObj).filter(s => s.latitude && s.longitude);
}

// ── MARINE AREAS ───────────────────────────────────────────────────────────

export async function getMarineAreas({ province, areaType, managementStatus, search, page = 1, pageSize = 15 } = {}) {
  const snap = await getDocs(query(collection(db, 'marine_areas'), orderBy('createdAt', 'desc')));
  let list = snap.docs.map(docToObj);
  if (province) list = list.filter(a => a.province === province);
  if (areaType) list = list.filter(a => a.areaType === areaType);
  if (managementStatus) list = list.filter(a => a.managementStatus === managementStatus);
  if (search) {
    const q = search.toLowerCase();
    list = list.filter(a =>
      a.areaName?.toLowerCase().includes(q) ||
      a.community?.toLowerCase().includes(q)
    );
  }
  const { data, pagination } = paginate(list, page, pageSize);
  return { areas: data, pagination };
}

export async function createMarineArea(data) {
  return addDoc(collection(db, 'marine_areas'), {
    ...data,
    submittedBy: auth.currentUser?.uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateMarineArea(id, data) {
  return updateDoc(doc(db, 'marine_areas', id), { ...data, updatedAt: serverTimestamp() });
}

export async function deleteMarineArea(id) {
  return deleteDoc(doc(db, 'marine_areas', id));
}

export async function getMarineArea(id) {
  const snap = await getDoc(doc(db, 'marine_areas', id));
  return snap.exists() ? docToObj(snap) : null;
}

export async function getMarineStats() {
  const snap = await getDocs(collection(db, 'marine_areas'));
  const list = snap.docs.map(d => d.data());

  const byType = {};
  const byProvince = {};
  const byStatus = {};
  const communities = new Set();
  let totalAreaHa = 0;
  let protectedCount = 0;
  let protectedAreaHa = 0;
  let activeCount = 0;
  let restorationAreaHa = 0;

  list.forEach(a => {
    const ha = parseFloat(a.areaSizeHa) || 0;
    totalAreaHa += ha;

    // Area type tally
    const t = a.areaType || 'other';
    if (!byType[t]) byType[t] = { count: 0, totalHa: 0 };
    byType[t].count += 1;
    byType[t].totalHa += ha;

    // Province tally
    const p = a.province || 'Unknown';
    if (!byProvince[p]) byProvince[p] = { count: 0, totalHa: 0, communities: new Set(), activeCount: 0 };
    byProvince[p].count += 1;
    byProvince[p].totalHa += ha;
    if (a.community) byProvince[p].communities.add(a.community);
    if (a.managementStatus === 'active') byProvince[p].activeCount += 1;

    // Status tally
    const s = a.managementStatus || 'unknown';
    byStatus[s] = (byStatus[s] || 0) + 1;
    if (s === 'active') activeCount += 1;

    // Protected: has a protectionLevel set or is active LMMA
    if (a.protectionLevel || a.managementStatus === 'active') {
      protectedCount += 1;
      protectedAreaHa += ha;
    }

    // Unique communities
    if (a.community) communities.add(a.community);

    // Restoration: areas with mangrove or seagrass habitat types
    if (Array.isArray(a.habitatTypes) &&
        (a.habitatTypes.includes('mangrove') || a.habitatTypes.includes('seagrass'))) {
      restorationAreaHa += ha;
    }
  });

  return {
    total: list.length,
    totalAreaHa,
    protectedCount,
    protectedAreaHa,
    activeCount,
    communityCount: communities.size,
    restorationAreaHa,
    byType: Object.entries(byType).map(([areaType, v]) => ({ areaType, count: v.count, totalHa: v.totalHa })),
    byStatus: Object.entries(byStatus).map(([status, count]) => ({ status, count })),
    byProvince: Object.entries(byProvince).map(([province, v]) => ({
      province,
      count: v.count,
      totalHa: v.totalHa,
      communityCount: v.communities.size,
      activeCount: v.activeCount,
    })),
  };
}

export async function getMarineGeoJSON({ province, areaType } = {}) {
  const snap = await getDocs(collection(db, 'marine_areas'));
  let list = snap.docs.map(d => d.data());
  if (province) list = list.filter(a => a.province === province);
  if (areaType) list = list.filter(a => a.areaType === areaType);
  const features = list
    .filter(a => a.geometry)
    .map(a => ({
      type: 'Feature',
      properties: {
        areaName: a.areaName,
        areaType: a.areaType,
        community: a.community,
        areaSizeHa: a.areaSizeHa,
        managementStatus: a.managementStatus,
        isCurrentlyOpen: a.isCurrentlyOpen,
      },
      geometry: a.geometry,
    }));
  return { type: 'FeatureCollection', features };
}

// ── MONITORING ─────────────────────────────────────────────────────────────

export async function getMonitoringRecords({ province, monitoringType, search, page = 1, pageSize = 15 } = {}) {
  const snap = await getDocs(query(collection(db, 'monitoring'), orderBy('createdAt', 'desc')));
  let list = snap.docs.map(docToObj);
  if (province) list = list.filter(r => r.province === province);
  if (monitoringType) list = list.filter(r => r.monitoringType === monitoringType);
  if (search) {
    const q = search.toLowerCase();
    list = list.filter(r =>
      r.siteName?.toLowerCase().includes(q) ||
      r.surveyName?.toLowerCase().includes(q)
    );
  }
  const { data, pagination } = paginate(list, page, pageSize);
  return { records: data, pagination };
}

export async function createMonitoring(data) {
  return addDoc(collection(db, 'monitoring'), {
    ...data,
    submittedBy: auth.currentUser?.uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateMonitoring(id, data) {
  return updateDoc(doc(db, 'monitoring', id), { ...data, updatedAt: serverTimestamp() });
}

export async function deleteMonitoring(id) {
  return deleteDoc(doc(db, 'monitoring', id));
}

export async function getMonitoringRecord(id) {
  const snap = await getDoc(doc(db, 'monitoring', id));
  return snap.exists() ? docToObj(snap) : null;
}

export async function getMonitoringStats() {
  const snap = await getDocs(collection(db, 'monitoring'));
  const list = snap.docs.map(d => d.data());
  const byType = {};
  let coralSum = 0, coralCount = 0;
  list.forEach(r => {
    const t = r.monitoringType || 'other';
    byType[t] = (byType[t] || 0) + 1;
    if (r.liveCoralCoverPct != null) { coralSum += r.liveCoralCoverPct; coralCount++; }
  });
  return {
    total: list.length,
    avgCoralCover: coralCount > 0 ? (coralSum / coralCount).toFixed(1) : null,
    byType: Object.entries(byType).map(([monitoringType, count]) => ({ monitoringType, count })),
  };
}

export async function getMonitoringForMap() {
  const snap = await getDocs(collection(db, 'monitoring'));
  return snap.docs.map(docToObj).filter(r => r.latitude && r.longitude);
}

/**
 * Returns monthly activity counts for the last 12 months.
 * Each entry: { month: 'YYYY-MM', label: 'Jan 25', surveys: N, monitoring: N }
 *
 * Uses createdAt timestamp when available, falling back to the surveyDate string.
 */
export async function getMonthlyActivityStats() {
  const [surveySnap, monSnap] = await Promise.all([
    getDocs(collection(db, 'surveys')),
    getDocs(collection(db, 'monitoring')),
  ]);

  // Build a map keyed by 'YYYY-MM' for the trailing 12 months (including current).
  const monthly = {};
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    monthly[key] = {
      month: key,
      label: d.toLocaleDateString('en', { month: 'short', year: '2-digit' }),
      surveys: 0,
      monitoring: 0,
    };
  }

  const toKey = (data) => {
    const date = data.createdAt?.toDate
      ? data.createdAt.toDate()
      : new Date(data.surveyDate || 0);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  };

  surveySnap.docs.forEach(d => {
    const key = toKey(d.data());
    if (monthly[key]) monthly[key].surveys += 1;
  });

  monSnap.docs.forEach(d => {
    const key = toKey(d.data());
    if (monthly[key]) monthly[key].monitoring += 1;
  });

  return Object.values(monthly);
}

// ── DATASETS ───────────────────────────────────────────────────────────────

export async function getDatasets({ status, dataType, province, search, page = 1, pageSize = 15 } = {}) {
  const snap = await getDocs(query(collection(db, 'datasets'), orderBy('createdAt', 'desc')));
  // Strip the large geojsonData blob — it's only needed by the map, not the list UI.
  let list = snap.docs.map(d => { const o = docToObj(d); delete o.geojsonData; return o; });
  if (status) list = list.filter(d => d.status === status);
  if (dataType) list = list.filter(d => d.dataType === dataType);
  if (province) list = list.filter(d => d.province === province);
  if (search) {
    const q = search.toLowerCase();
    list = list.filter(d =>
      d.title?.toLowerCase().includes(q) ||
      d.description?.toLowerCase().includes(q) ||
      d.community?.toLowerCase().includes(q)
    );
  }
  const { data, pagination } = paginate(list, page, pageSize);
  return { datasets: data, pagination };
}

export async function getDatasetStats() {
  const snap = await getDocs(collection(db, 'datasets'));
  const list = snap.docs.map(d => d.data());
  const byType = {};
  const byProvince = {};
  let published = 0;
  list.forEach(d => {
    if (d.status === 'published') published++;
    const t = d.dataType || 'other';
    if (!byType[t]) byType[t] = { count: 0, featureCount: 0, totalAreaHa: 0, publishedAreaHa: 0 };
    byType[t].count += 1;

    // For spatial categories, count individual features (MPAs) within the dataset,
    // not just the number of dataset files.
    // Prefer inline geojsonData for an exact count; fall back to the stored
    // featureCount (written at upload time) so datasets whose GeoJSON was too
    // large to cache inline are still counted correctly.
    const spatialTypes = ['protected_marine', 'marine_spatial_plan', 'habitat_restoration'];
    if (spatialTypes.includes(t) && d.geojsonData) {
      try {
        const geojson = typeof d.geojsonData === 'string' ? JSON.parse(d.geojsonData) : d.geojsonData;
        const feats = geojson?.features?.length ?? (d.featureCount || 1);
        byType[t].featureCount += feats;
      } catch {
        byType[t].featureCount += d.featureCount || 1;
      }
    } else {
      byType[t].featureCount += d.featureCount || 1;
    }

    const ha = parseFloat(d.calculatedAreaHa) || 0;
    byType[t].totalAreaHa += ha;
    if (d.status === 'published') byType[t].publishedAreaHa += ha;

    // Province breakdown — only published datasets with area contribute.
    if (d.status === 'published' && ha > 0 && spatialTypes.includes(t)) {
      const p = d.province || 'Unknown';
      if (!byProvince[p]) byProvince[p] = { totalAreaHa: 0 };
      byProvince[p].totalAreaHa += ha;
    }
  });
  return {
    total: list.length,
    published,
    byType: Object.entries(byType).map(([dataType, v]) => ({
      dataType,
      count: v.count,
      featureCount: v.featureCount,
      totalAreaHa: Math.round(v.totalAreaHa * 10) / 10,
      publishedAreaHa: Math.round(v.publishedAreaHa * 10) / 10,
    })),
    byProvince: Object.entries(byProvince).map(([province, v]) => ({
      province,
      totalAreaHa: Math.round(v.totalAreaHa * 10) / 10,
    })),
  };
}

/**
 * Upload a dataset file to Firebase Storage and record its metadata in Firestore.
 *
 * @param {File}     file       - The file to upload
 * @param {object}   metadata   - Form metadata (title, description, dataType, …)
 * @param {function} onProgress - Called with 0-100 upload progress values
 * @param {function} onStage    - Called with stage strings: 'processing' | 'uploading'
 */
export async function uploadDataset(file, metadata, onProgress, onStage) {
  if (!auth.currentUser) throw new Error('Must be signed in to upload datasets.');
  const path = `datasets/${auth.currentUser.uid}/${Date.now()}_${file.name}`;
  const storageRef = ref(storage, path);
  const ext = file.name.split('.').pop().toLowerCase();
  const fileFormat = ext === 'json' ? 'geojson' : ext;

  // For all map-eligible formats, parse to GeoJSON and try to cache inline in Firestore.
  // Inline caching means the map loads without Storage SDK / CORS requirements.
  // If the GeoJSON is too large even after simplification, it's served from Storage instead.
  const mapFormats = ['json', 'geojson', 'zip', 'kml', 'gpkg', 'shp'];
  let geojsonData = null;
  let rawFeatureCount = null;
  if (mapFormats.includes(ext)) {
    try {
      onStage?.('processing');
      const raw = await parseFileToGeoJSON(file);
      rawFeatureCount = raw?.features?.length ?? null;
      geojsonData = await fitGeoJSONToLimit(raw);
      if (!geojsonData) {
        console.warn('GeoJSON too large even after simplification — inline cache skipped. Staff can use "Fix Map Layer" at publish time.');
      }
    } catch (e) {
      console.warn('Could not parse file for inline map storage:', e.message);
    }
    onStage?.('uploading');
  }

  return new Promise((resolve, reject) => {
    const task = uploadBytesResumable(storageRef, file);
    task.on(
      'state_changed',
      (snap) => onProgress?.(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
      reject,
      async () => {
        try {
          const downloadURL = await getDownloadURL(task.snapshot.ref);
          const tags = metadata.tags
            ? metadata.tags.split(',').map(t => t.trim()).filter(Boolean)
            : [];
          const docData = {
            ...metadata,
            tags,
            fileName: file.name,
            fileSize: file.size,
            filePath: path,
            downloadURL,
            fileFormat,
            status: 'draft',
            downloadCount: 0,
            uploadedBy: auth.currentUser.uid,
            uploaderName: `${auth.currentUser.displayName || ''}`.trim(),
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          };
          if (geojsonData) {
            // Firestore doesn't support nested arrays (GeoJSON coordinates).
            // Serialise as a JSON string; deserialise in getDatasetGeoJSON().
            docData.geojsonData = JSON.stringify(geojsonData);
            docData.hasGeojsonData = true;
            const areaHa = calculateGeoJSONAreaHa(geojsonData);
            if (areaHa > 0) docData.calculatedAreaHa = areaHa;
          }
          // Always store the parsed feature count so stats are accurate even
          // when geojsonData is null (file was too large to cache inline).
          if (rawFeatureCount !== null) docData.featureCount = rawFeatureCount;
          await addDoc(collection(db, 'datasets'), docData);
          resolve();
        } catch (err) {
          reject(err);
        }
      }
    );
  });
}

export async function publishDataset(id) {
  const updateData = {
    status: 'published',
    publishedAt: serverTimestamp(),
    publishedBy: auth.currentUser?.uid,
    updatedAt: serverTimestamp(),
  };

  // For existing datasets without inline geojsonData, try to fetch and cache now.
  // This runs in the same browser session as the authenticated admin, so the
  // download URL (which has a public token) is most likely to succeed here.
  try {
    const snap = await getDoc(doc(db, 'datasets', id));
    const d = snap.exists() ? snap.data() : null;
    const isGeoJSON = d && ['geojson', 'json'].includes(d.fileFormat?.toLowerCase());
    if (isGeoJSON && !d.hasGeojsonData) {
      let parsed = null;
      // Try SDK getBytes first (uses auth token, avoids CORS issues with fetch).
      if (d.filePath && !parsed) {
        try {
          const bytes = await withTimeout(getBytes(ref(storage, d.filePath)), 12000, 'publish-getBytes');
          parsed = JSON.parse(new TextDecoder().decode(bytes));
        } catch (e) { console.warn('publish getBytes failed:', e.message); }
      }
      // Fallback: fetch the stored download URL.
      if (!parsed && d.downloadURL) {
        try {
          const res = await withTimeout(fetch(d.downloadURL), 10000, 'publish-fetch');
          if (res.ok) parsed = await res.json();
        } catch (e) { console.warn('publish fetch failed:', e.message); }
      }
      if (parsed && (parsed.type === 'FeatureCollection' || parsed.type === 'Feature')) {
        updateData.geojsonData = JSON.stringify(parsed);
        updateData.hasGeojsonData = true;
        const areaHa = calculateGeoJSONAreaHa(parsed);
        if (areaHa > 0) updateData.calculatedAreaHa = areaHa;
      }
    } else if (d && d.hasGeojsonData && !d.calculatedAreaHa && d.geojsonData) {
      // Backfill area for already-cached datasets that don't have it yet.
      try {
        const existing = JSON.parse(d.geojsonData);
        const areaHa = calculateGeoJSONAreaHa(existing);
        if (areaHa > 0) updateData.calculatedAreaHa = areaHa;
      } catch { /* malformed cache — skip */ }
    }
  } catch (e) {
    console.warn('Could not cache GeoJSON inline on publish:', e.message);
  }

  return updateDoc(doc(db, 'datasets', id), updateData);
}

export async function unpublishDataset(id) {
  return updateDoc(doc(db, 'datasets', id), {
    status: 'archived',
    updatedAt: serverTimestamp(),
  });
}

export async function submitDatasetForReview(id) {
  return updateDoc(doc(db, 'datasets', id), {
    status: 'under_review',
    updatedAt: serverTimestamp(),
  });
}

export async function getPublishedGeoJSONDatasets() {
  const snap = await getDocs(collection(db, 'datasets'));
  return snap.docs
    .map(docToObj)
    .filter(d => {
      if (d.status !== 'published') return false;
      const fmt = d.fileFormat?.toLowerCase();
      // Native GeoJSON: always map-eligible (served from Firestore or Storage)
      if (['geojson', 'json'].includes(fmt)) return true;
      // All other geo formats: only eligible once GeoJSON has been cached
      if (['zip', 'kml', 'gpkg', 'shp'].includes(fmt) && d.hasGeojsonData) return true;
      return false;
    });
}

// Staff can re-select the original file (GeoJSON or shapefile ZIP) to cache
// the GeoJSON data inline in Firestore, bypassing Storage SDK and CORS entirely.
// Coordinate precision reduction is applied automatically if the GeoJSON is too large.
export async function recacheDatasetGeoJSON(id, file) {
  const raw = await parseFileToGeoJSON(file);
  const fitted = await fitGeoJSONToLimit(raw);
  if (!fitted) {
    const kb = (new TextEncoder().encode(JSON.stringify(raw)).length / 1024).toFixed(0);
    throw new Error(`GeoJSON is ${kb} KB — too large to cache in Firestore even after simplification. The dataset will still be available for download; staff can publish it and the map will stream it from Storage.`);
  }
  return updateDoc(doc(db, 'datasets', id), {
    geojsonData: JSON.stringify(fitted),
    hasGeojsonData: true,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteDataset(id, filePath) {
  // Delete storage file first (best-effort — may fail if already gone or no permission).
  if (filePath) {
    try {
      await deleteObject(ref(storage, filePath));
    } catch (err) {
      console.warn('Storage file delete failed (continuing):', err.message);
    }
  }
  return deleteDoc(doc(db, 'datasets', id));
}

function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out`)), ms)
    ),
  ]);
}

export async function getDatasetGeoJSON(dataset) {
  // 1. Best path: GeoJSON was stored inline in Firestore at upload/publish time.
  //    No storage SDK or CORS needed.
  if (dataset.geojsonData) {
    // Stored as a JSON string to avoid Firestore's nested-array restriction.
    // Handle both string (new) and object (legacy documents written before this fix).
    return typeof dataset.geojsonData === 'string'
      ? JSON.parse(dataset.geojsonData)
      : dataset.geojsonData;
  }

  // 2. Try Storage SDK getBytes with a 12s timeout.
  if (dataset.filePath) {
    try {
      const bytes = await withTimeout(
        getBytes(ref(storage, dataset.filePath)), 12000, 'getBytes'
      );
      return JSON.parse(new TextDecoder().decode(bytes));
    } catch (err) {
      console.warn('getBytes failed:', err.code || err.message);
    }

    // 3. Fresh download URL via SDK, then fetch with timeout.
    try {
      const freshUrl = await withTimeout(
        getDownloadURL(ref(storage, dataset.filePath)), 8000, 'getDownloadURL'
      );
      const res = await withTimeout(fetch(freshUrl), 12000, 'fetch freshUrl');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    } catch (err) {
      console.warn('Fresh downloadURL fetch failed:', err.message);
    }
  }

  // 4. Stored download URL with timeout.
  if (dataset.downloadURL) {
    try {
      const res = await withTimeout(fetch(dataset.downloadURL), 12000, 'fetch storedUrl');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    } catch (err) {
      console.warn('Stored downloadURL fetch failed:', err.message);
    }
  }

  // All methods failed — return null so the caller can skip this layer gracefully.
  return null;
}

// ── USERS (ADMIN) ──────────────────────────────────────────────────────────

export async function getAllUsers() {
  const snap = await getDocs(collection(db, 'users'));
  return snap.docs.map(docToObj);
}

export async function updateUserProfile(uid, data) {
  return updateDoc(doc(db, 'users', uid), { ...data, updatedAt: serverTimestamp() });
}

export async function approveUser(uid) {
  return updateDoc(doc(db, 'users', uid), {
    status: 'approved',
    isActive: true,
    approvalNotified: false, // triggers welcome toast on user's next login
    approvedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function rejectUser(uid) {
  return updateDoc(doc(db, 'users', uid), {
    status: 'rejected',
    isActive: false,
    rejectedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function deleteUserProfile(uid) {
  return deleteDoc(doc(db, 'users', uid));
}

/**
 * Admin-only: create a new Firebase Auth account + Firestore profile without
 * signing out the currently logged-in admin. Uses the secondary app instance
 * so the primary auth session is untouched.
 *
 * @param {{ email, password, firstName, lastName, role, organization, province }} data
 */
export async function createUserByAdmin({ email, password, firstName, lastName, role, organization, province }) {
  if (!auth.currentUser) throw new Error('Must be signed in as admin.');

  // Create Auth account using secondary app — does NOT affect the primary session.
  let newCred;
  try {
    newCred = await createUserWithEmailAndPassword(secondaryAuth, email, password);
  } catch (err) {
    if (err.code === 'auth/email-already-in-use') throw new Error('An account with this email already exists.');
    if (err.code === 'auth/weak-password') throw new Error('Password must be at least 6 characters.');
    if (err.code === 'auth/invalid-email') throw new Error('Invalid email address.');
    throw err;
  }

  const uid = newCred.user.uid;

  // Sign the secondary app out immediately — we only needed it for account creation.
  await secondarySignOut(secondaryAuth).catch(() => {});

  // Write the Firestore user profile (authenticated as the admin via primary app).
  await setDoc(doc(db, 'users', uid), {
    uid,
    email,
    firstName: firstName.trim(),
    lastName: lastName.trim(),
    role: role || 'staff',
    organization: organization?.trim() || '',
    province: province || '',
    status: 'approved',
    isActive: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    createdByAdmin: auth.currentUser.uid,
  });

  return uid;
}
