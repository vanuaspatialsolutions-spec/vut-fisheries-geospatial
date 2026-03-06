import { useEffect, useRef } from 'react';
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
  lmma: '#0369a1',
  taboo_area: '#dc2626',
  patrol_zone: '#ca8a04',
  buffer_zone: '#7c3aed',
  spawning_aggregation: '#059669',
  other: '#6b7280',
};

const MONITORING_COLORS = {
  reef_fish_survey: '#0369a1',
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

const esc = (str) => String(str ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Maximum features rendered per dataset layer. Beyond this, features are sampled
// evenly to keep the map responsive with 30 MB+ datasets.
const MAX_RENDER_FEATURES = 5000;

function capFeatures(geojson) {
  const features = geojson?.features;
  if (!features || features.length <= MAX_RENDER_FEATURES) return geojson;
  // Sample evenly across the dataset so spatial distribution is preserved
  const step = features.length / MAX_RENDER_FEATURES;
  const sampled = Array.from({ length: MAX_RENDER_FEATURES }, (_, i) => features[Math.floor(i * step)]);
  return { ...geojson, features: sampled, _truncated: true, _original: features.length };
}

export default function CBFMMap({ surveys = [], marineAreas = null, monitoringPoints = [], datasetLayers = [], flyTo }) {
  const onEachFeature = (feature, layer) => {
    const p = feature.properties;
    layer.bindPopup(`
      <div class="text-sm">
        <strong class="text-ocean-900">${esc(p.areaName)}</strong><br/>
        <span class="text-gray-500">Type: ${esc(p.areaType?.replace(/_/g, ' '))}</span><br/>
        <span class="text-gray-500">Community: ${esc(p.community)}</span><br/>
        ${p.areaSizeHa ? `<span class="text-gray-500">Area: ${esc(p.areaSizeHa)} ha</span><br/>` : ''}
        <span class="${p.managementStatus === 'active' ? 'text-green-600' : 'text-red-500'}">
          ${esc(p.managementStatus)}
        </span>
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

  return (
    <MapContainer center={VANUATU_CENTER} zoom={VANUATU_ZOOM} className="w-full h-full rounded-xl">
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      />

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
            pathOptions={{ color: '#0369a1', fillColor: '#38bdf8', fillOpacity: 0.8, weight: 2 }}
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
        const color = DATASET_COLORS[idx % DATASET_COLORS.length];
        return (
          <GeoJSON
            key={meta.id}
            data={capped}
            style={() => ({ color, weight: 2, opacity: 0.9, fillOpacity: 0.2, fillColor: color })}
            pointToLayer={(_, latlng) => L.circleMarker(latlng, { radius: 5, color, fillColor: color, fillOpacity: 0.7, weight: 1.5 })}
            onEachFeature={(feature, layer) => {
              const p = feature.properties || {};
              const name = p.name || p.NAME || p.Name || p.NAMES || p.label || p.id || meta.title;
              const truncNote = capped._truncated
                ? `<div class="text-xs text-amber-600 mt-1">Showing ${MAX_RENDER_FEATURES.toLocaleString()} of ${capped._original.toLocaleString()} features</div>`
                : '';
              layer.bindPopup(`
                <div class="text-sm">
                  <strong>${esc(name)}</strong><br/>
                  <span class="text-gray-500">Dataset: ${esc(meta.title)}</span><br/>
                  ${meta.province ? `<span class="text-gray-500">Province: ${esc(meta.province)}</span><br/>` : ''}
                  ${meta.community ? `<span class="text-gray-500">Community: ${esc(meta.community)}</span>` : ''}
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
  );
}
