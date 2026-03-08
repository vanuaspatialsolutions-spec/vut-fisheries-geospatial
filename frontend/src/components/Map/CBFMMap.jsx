import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, GeoJSON, CircleMarker, useMap } from 'react-leaflet';
import L from 'leaflet';
import { VANUATU_CENTER, VANUATU_ZOOM } from '../../utils/constants';

// Fix Leaflet default icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const AREA_COLORS = {
  lmma: '#2563eb',
  taboo_area: '#dc2626',
  patrol_zone: '#ca8a04',
  buffer_zone: '#7c3aed',
  spawning_aggregation: '#059669',
  other: '#6b7280',
};

const MONITORING_COLORS = {
  reef_fish_survey: '#2563eb',
  invertebrate_survey: '#059669',
  coral_cover: '#ea580c',
  seagrass_survey: '#7c3aed',
  mangrove_survey: '#16a34a',
  catch_composition: '#ca8a04',
};

function FlyTo({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.flyTo(center, zoom || 10);
  }, [center, zoom, map]);
  return null;
}

function FitDatasetBounds({ datasetLayers }) {
  const map = useMap();
  useEffect(() => {
    if (!datasetLayers || datasetLayers.length === 0) return;
    try {
      const allLayers = L.geoJSON(datasetLayers.map(d => d.geojson));
      const bounds = allLayers.getBounds();
      if (bounds.isValid()) map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    } catch (e) {
      console.warn('Could not fit dataset bounds:', e);
    }
  }, [datasetLayers, map]);
  return null;
}

const DATASET_COLORS = ['#7c3aed', '#0891b2', '#b45309', '#be123c', '#047857'];

const DATASET_CATEGORY_COLORS = {
  marine_spatial_plan: '#38bdf8',
  protected_marine:    '#a78bfa',
  habitat_restoration: '#34d399',
};

/** HTML-escape a value for safe insertion into popup innerHTML. */
const esc = (str) =>
  String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

// Maximum features rendered per dataset layer. Beyond this, features are sampled
// evenly to keep the map responsive with 30 MB+ datasets.
const MAX_RENDER_FEATURES = 5000;

const DATASET_CATEGORY_LABELS = {
  marine_spatial_plan: 'Marine areas under spatial plan',
  protected_marine:    'Protected Marine areas',
  habitat_restoration: 'Areas under habitat restoration',
};

const BASEMAPS = {
  osm: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    label: '🛰 Satellite',
  },
  satellite: {
    // ESRI World Imagery — note tile order is z/y/x (not z/x/y)
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution:
      'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
    label: '🗺 Streets',
  },
};

/** Spherical excess formula (WGS84) — returns ha for a single GeoJSON Feature or geometry. */
function featureAreaHa(feature) {
  const R = 6378137;
  function rad(d) { return d * Math.PI / 180; }
  function ringM2(coords) {
    const n = coords.length;
    if (n < 3) return 0;
    let a = 0;
    for (let i = 0; i < n; i++) {
      const p1 = coords[i === 0 ? n - 1 : i - 1];
      const p2 = coords[i];
      const p3 = coords[(i + 1) % n];
      a += (rad(p3[0]) - rad(p1[0])) * Math.sin(rad(p2[1]));
    }
    return Math.abs(a * R * R / 2);
  }
  function polyHa(rings) {
    if (!rings?.length) return 0;
    let a = ringM2(rings[0]);
    for (let i = 1; i < rings.length; i++) a -= ringM2(rings[i]);
    return a / 10000;
  }
  const g = feature?.geometry ?? feature;
  if (!g) return null;
  let ha = 0;
  if (g.type === 'Polygon') ha = polyHa(g.coordinates);
  else if (g.type === 'MultiPolygon') g.coordinates.forEach(p => { ha += polyHa(p); });
  else return null; // points / lines — no area
  return ha > 0 ? ha : null;
}

function fmtHa(ha) {
  if (ha === null || ha === undefined) return null;
  return ha >= 1000
    ? ha.toLocaleString(undefined, { maximumFractionDigits: 0 }) + ' ha'
    : ha.toLocaleString(undefined, { maximumFractionDigits: 2 }) + ' ha';
}

function capFeatures(geojson) {
  const features = geojson?.features;
  if (!features || features.length <= MAX_RENDER_FEATURES) return geojson;
  // Sample evenly across the dataset so spatial distribution is preserved
  const step = features.length / MAX_RENDER_FEATURES;
  const sampled = Array.from({ length: MAX_RENDER_FEATURES }, (_, i) => features[Math.floor(i * step)]);
  return { ...geojson, features: sampled, _truncated: true, _original: features.length };
}

export default function CBFMMap({ surveys = [], marineAreas = null, monitoringPoints = [], datasetLayers = [], flyTo }) {
  const [basemap, setBasemap] = useState('osm');
  const onEachFeature = (feature, layer) => {
    const p = feature.properties;
    const storedHa = parseFloat(p.areaSizeHa) || null;
    const calcHa   = featureAreaHa(feature);
    const areaStr  = fmtHa(storedHa ?? calcHa);
    layer.bindPopup(`
      <div style="min-width:180px;font-family:inherit">
        <div style="font-weight:700;font-size:14px;margin-bottom:4px;color:#1e3a8a">${esc(p.areaName || 'Unnamed area')}</div>
        ${areaStr ? `<div style="font-size:13px;font-weight:600;color:#2563eb;margin-bottom:4px">&#x1F4CF; ${areaStr}</div>` : ''}
        ${p.areaType ? `<div style="font-size:12px;color:#6b7280">Type: ${esc(p.areaType.replace(/_/g,' '))}</div>` : ''}
        ${p.community ? `<div style="font-size:12px;color:#6b7280">Community: ${esc(p.community)}</div>` : ''}
        ${p.province ? `<div style="font-size:12px;color:#6b7280">Province: ${esc(p.province)}</div>` : ''}
        ${p.managementStatus ? `<div style="font-size:12px;font-weight:500;color:${p.managementStatus==='active'?'#059669':'#dc2626'};margin-top:2px">${esc(p.managementStatus)}</div>` : ''}
      </div>
    `);
  };

  const styleArea = (feature) => ({
    color: AREA_COLORS[feature.properties?.areaType] || '#6b7280',
    weight: 2,
    opacity: 0.9,
    fillOpacity: 0.25,
    fillColor: AREA_COLORS[feature.properties?.areaType] || '#6b7280',
  });

  const bm = BASEMAPS[basemap];

  return (
    <div className="relative w-full h-full">
      {/* Basemap toggle — positioned over the map (above Leaflet zoom controls) */}
      <button
        onClick={() => setBasemap(b => b === 'osm' ? 'satellite' : 'osm')}
        title="Toggle basemap"
        style={{
          position: 'absolute',
          top: 10,
          right: 10,
          zIndex: 1000,
          background: 'white',
          border: '2px solid rgba(0,0,0,0.2)',
          borderRadius: 6,
          padding: '5px 10px',
          fontSize: 12,
          fontWeight: 600,
          cursor: 'pointer',
          boxShadow: '0 1px 5px rgba(0,0,0,0.25)',
          lineHeight: 1.4,
        }}
      >
        {bm.label}
      </button>

    <MapContainer center={VANUATU_CENTER} zoom={VANUATU_ZOOM} className="w-full h-full rounded-xl">
      <TileLayer key={basemap} url={bm.url} attribution={bm.attribution} />

      {flyTo && <FlyTo center={flyTo.center} zoom={flyTo.zoom} />}
      <FitDatasetBounds datasetLayers={datasetLayers} />

      {/* Marine Areas (polygons) */}
      {marineAreas && (
        <GeoJSON
          data={marineAreas}
          style={styleArea}
          onEachFeature={onEachFeature}
        />
      )}

      {/* Community Survey points */}
      {surveys.map((s) => (
        s.latitude && s.longitude && (
          <CircleMarker
            key={s.id}
            center={[s.latitude, s.longitude]}
            radius={7}
            pathOptions={{ color: '#2563eb', fillColor: '#38bdf8', fillOpacity: 0.8, weight: 2 }}
          >
            <Popup>
              <div className="text-sm">
                <strong>{s.community}</strong><br />
                <span className="text-gray-500">{s.province} – {s.island}</span><br />
                <span className="text-gray-500">Survey: {s.surveyDate}</span><br />
                {s.totalFishers && <span className="text-gray-500">Fishers: {s.totalFishers}</span>}
                {s.hasCBFMCommittee && <span className="block text-green-600 text-xs mt-1">✓ Has CBFM Committee</span>}
              </div>
            </Popup>
          </CircleMarker>
        )
      ))}

      {/* Published dataset GeoJSON layers */}
      {datasetLayers.map(({ meta, geojson }, idx) => {
        const capped = capFeatures(geojson);
        const color = DATASET_CATEGORY_COLORS[meta.dataType] || DATASET_COLORS[idx % DATASET_COLORS.length];
        return (
          <GeoJSON
            key={meta.id}
            data={capped}
            style={() => ({ color, weight: 2, opacity: 0.9, fillOpacity: 0.2, fillColor: color })}
            pointToLayer={(_, latlng) => L.circleMarker(latlng, { radius: 5, color, fillColor: color, fillOpacity: 0.7, weight: 1.5 })}
            onEachFeature={(feature, layer) => {
              const p = feature.properties || {};
              const name = p.name || p.NAME || p.Name || p.NAMES || p.label || p.AREANAME || p.area_name || meta.title;
              const areaHa = featureAreaHa(feature);
              const areaStr = fmtHa(areaHa);
              const categoryLabel = DATASET_CATEGORY_LABELS[meta.dataType] || meta.dataType?.replace(/_/g,' ') || 'Dataset';
              const truncNote = capped._truncated
                ? `<div style="font-size:11px;color:#d97706;margin-top:4px">Showing ${MAX_RENDER_FEATURES.toLocaleString()} of ${capped._original.toLocaleString()} features</div>`
                : '';
              layer.bindPopup(`
                <div style="min-width:180px;font-family:inherit">
                  <div style="font-weight:700;font-size:14px;margin-bottom:4px;color:#1e3a8a">${esc(name)}</div>
                  ${areaStr ? `<div style="font-size:13px;font-weight:600;color:#2563eb;margin-bottom:4px">&#x1F4CF; ${areaStr}</div>` : ''}
                  <div style="font-size:12px;color:#6b7280;margin-bottom:2px">Category: ${esc(categoryLabel)}</div>
                  ${meta.province ? `<div style="font-size:12px;color:#6b7280">Province: ${esc(meta.province)}</div>` : ''}
                  ${meta.community ? `<div style="font-size:12px;color:#6b7280">Community: ${esc(meta.community)}</div>` : ''}
                  ${truncNote}
                </div>
              `);
            }}
          />
        );
      })}

      {/* Biological monitoring points */}
      {monitoringPoints.map((m) => (
        m.latitude && m.longitude && (
          <CircleMarker
            key={m.id}
            center={[m.latitude, m.longitude]}
            radius={6}
            pathOptions={{
              color: MONITORING_COLORS[m.monitoringType] || '#6b7280',
              fillColor: MONITORING_COLORS[m.monitoringType] || '#9ca3af',
              fillOpacity: 0.85,
              weight: 2,
            }}
          >
            <Popup>
              <div className="text-sm">
                <strong>{m.siteName}</strong><br />
                <span className="text-gray-500">{m.monitoringType?.replace(/_/g, ' ')}</span><br />
                <span className="text-gray-500">{m.community} – {m.province}</span><br />
                <span className="text-gray-500">Date: {m.surveyDate}</span><br />
                {m.liveCoralCoverPct && <span className="text-gray-500">Coral: {m.liveCoralCoverPct}%</span>}
              </div>
            </Popup>
          </CircleMarker>
        )
      ))}
    </MapContainer>
    </div>
  );
}
