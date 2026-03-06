/**
 * Firestore service layer — replaces all Express API calls.
 * All reads/writes go directly to Firebase from the browser.
 */
import { db, storage, auth } from '../firebase';
import {
  collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc,
  query, orderBy, serverTimestamp,
} from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL, getBytes, deleteObject } from 'firebase/storage';

// ── helpers ────────────────────────────────────────────────────────────────

function docToObj(d) {
  return { id: d.id, ...d.data() };
}

/**
 * Parse a file (GeoJSON or shapefile ZIP) into a GeoJSON FeatureCollection.
 * Uses shpjs for ZIP files so shapefiles are supported without a backend.
 */
export async function parseFileToGeoJSON(file) {
  const ext = file.name.split('.').pop().toLowerCase();

  if (['geojson', 'json'].includes(ext)) {
    const text = await file.text();
    const parsed = JSON.parse(text);
    if (!parsed || (parsed.type !== 'FeatureCollection' && parsed.type !== 'Feature')) {
      throw new Error('File does not appear to be valid GeoJSON.');
    }
    return parsed;
  }

  if (ext === 'zip') {
    const { parseZip } = await import('shpjs');
    const buffer = await file.arrayBuffer();
    const result = await parseZip(buffer);
    // shpjs may return a FeatureCollection or an array (one per layer); merge them.
    if (Array.isArray(result)) {
      return {
        type: 'FeatureCollection',
        features: result.flatMap(fc => fc.features || []),
      };
    }
    return result;
  }

  throw new Error('Unsupported file type. Accepted: .geojson, .json, .zip (shapefile)');
}

/**
 * Reduce coordinate decimal precision to shrink GeoJSON size for Firestore storage.
 * Tries precision 6 → 5 → 4 → 3 until the JSON fits within maxBytes.
 * Precision 5 = ~1 m accuracy, 4 = ~10 m, 3 = ~100 m — all fine for web maps.
 * Returns the (possibly compressed) GeoJSON, or null if it can't fit.
 */
function fitGeoJSONToLimit(geojson, maxBytes = 880000) {
  function roundCoord(c, p) {
    return typeof c === 'number' ? parseFloat(c.toFixed(p)) : c.map(x => roundCoord(x, p));
  }
  function roundGeom(geom, p) {
    if (!geom || !geom.coordinates) return geom;
    return { ...geom, coordinates: roundCoord(geom.coordinates, p) };
  }

  const raw = JSON.stringify(geojson);
  if (new TextEncoder().encode(raw).length <= maxBytes) return geojson;

  for (const precision of [5, 4, 3]) {
    const compressed = {
      ...geojson,
      features: (geojson.features || []).map(f => ({
        ...f,
        geometry: roundGeom(f.geometry, precision),
      })),
    };
    const size = new TextEncoder().encode(JSON.stringify(compressed)).length;
    if (size <= maxBytes) return compressed;
  }
  return null; // Still too large — cannot cache inline
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
  list.forEach(s => {
    const p = s.province || 'Unknown';
    byProvince[p] = (byProvince[p] || 0) + 1;
  });
  return {
    total: list.length,
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
  let totalAreaHa = 0;
  list.forEach(a => {
    const t = a.areaType || 'other';
    byType[t] = (byType[t] || 0) + 1;
    if (a.areaSizeHa) totalAreaHa += parseFloat(a.areaSizeHa) || 0;
  });
  return {
    total: list.length,
    totalAreaHa,
    byType: Object.entries(byType).map(([areaType, count]) => ({ areaType, count })),
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
  let published = 0;
  list.forEach(d => {
    if (d.status === 'published') published++;
    const t = d.dataType || 'other';
    byType[t] = (byType[t] || 0) + 1;
  });
  return {
    total: list.length,
    published,
    byType: Object.entries(byType).map(([dataType, count]) => ({ dataType, count })),
  };
}

export async function uploadDataset(file, metadata, onProgress) {
  if (!auth.currentUser) throw new Error('Must be signed in to upload datasets.');
  const path = `datasets/${auth.currentUser.uid}/${Date.now()}_${file.name}`;
  const storageRef = ref(storage, path);
  const ext = file.name.split('.').pop().toLowerCase();
  const fileFormat = ext === 'json' ? 'geojson' : ext;

  // For GeoJSON and shapefile ZIP files, parse and store inline in Firestore so
  // the map can load without needing Firebase Storage SDK access or CORS config.
  // For ZIPs, the compressed size ≠ GeoJSON size, so we don't pre-check file.size.
  // We parse, then fit to the 880 KB Firestore limit via coordinate precision reduction.
  let geojsonData = null;
  if (['json', 'geojson', 'zip'].includes(ext)) {
    try {
      const raw = await parseFileToGeoJSON(file);
      geojsonData = fitGeoJSONToLimit(raw);
      if (!geojsonData) {
        console.warn('GeoJSON too large even after coordinate simplification — inline cache skipped. Use "Fix Map Layer" at publish time.');
      }
    } catch (e) {
      console.warn('Could not parse file for inline map storage:', e.message);
    }
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
            docData.geojsonData = geojsonData;
            docData.hasGeojsonData = true;
          }
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
        updateData.geojsonData = parsed;
        updateData.hasGeojsonData = true;
      }
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
      // Native GeoJSON files are always candidates (even if not yet cached).
      if (['geojson', 'json'].includes(fmt)) return true;
      // ZIP / shapefile datasets are only map-eligible when GeoJSON has been cached.
      if (fmt === 'zip' && d.hasGeojsonData) return true;
      return false;
    });
}

// Staff can re-select the original file (GeoJSON or shapefile ZIP) to cache
// the GeoJSON data inline in Firestore, bypassing Storage SDK and CORS entirely.
// Coordinate precision reduction is applied automatically if the GeoJSON is too large.
export async function recacheDatasetGeoJSON(id, file) {
  const raw = await parseFileToGeoJSON(file);
  const fitted = fitGeoJSONToLimit(raw);
  if (!fitted) {
    const kb = (new TextEncoder().encode(JSON.stringify(raw)).length / 1024).toFixed(0);
    throw new Error(`GeoJSON is ${kb} KB — too large to cache in Firestore even after simplification. Try reducing the number of features or use a more generalised shapefile.`);
  }
  return updateDoc(doc(db, 'datasets', id), {
    geojsonData: fitted,
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
    return dataset.geojsonData;
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
