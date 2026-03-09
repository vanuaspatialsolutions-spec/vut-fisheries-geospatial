/**
 * Auto-detect the Vanuatu province for a GeoJSON geometry using a
 * nearest-island-centroid approach.  Each island has a known centroid and
 * province; we compute the centroid of the input geometry and return the
 * province of the closest island within 350 km (covers all of Vanuatu's EEZ).
 */

// [lon, lat] centroids of Vanuatu's main islands with their province
const ISLAND_CENTROIDS = [
  // Torba
  { lon: 166.63, lat: -13.43, province: 'Torba' },  // Torres Islands
  { lon: 167.47, lat: -13.83, province: 'Torba' },  // Vanua Lava
  { lon: 167.52, lat: -14.28, province: 'Torba' },  // Gaua (Santa Maria)
  { lon: 167.68, lat: -13.68, province: 'Torba' },  // Mota Lava
  // Sanma
  { lon: 167.12, lat: -15.25, province: 'Sanma' },  // Espiritu Santo
  { lon: 167.17, lat: -15.75, province: 'Sanma' },  // Malo
  // Penama
  { lon: 168.07, lat: -15.38, province: 'Penama' }, // Ambae (Aoba)
  { lon: 168.28, lat: -15.18, province: 'Penama' }, // Maewo
  { lon: 168.20, lat: -16.02, province: 'Penama' }, // Pentecost
  // Malampa
  { lon: 167.43, lat: -16.22, province: 'Malampa' }, // Malekula
  { lon: 168.22, lat: -16.27, province: 'Malampa' }, // Ambrym
  { lon: 168.27, lat: -16.47, province: 'Malampa' }, // Paama
  // Shefa
  { lon: 168.30, lat: -16.98, province: 'Shefa' },  // Epi
  { lon: 168.67, lat: -17.08, province: 'Shefa' },  // Shepherd Islands
  { lon: 168.35, lat: -17.72, province: 'Shefa' },  // Efate
  { lon: 168.55, lat: -17.45, province: 'Shefa' },  // Nguna / Pele
  // Tafea
  { lon: 169.12, lat: -18.82, province: 'Tafea' },  // Erromango
  { lon: 169.43, lat: -19.52, province: 'Tafea' },  // Tanna
  { lon: 169.80, lat: -20.23, province: 'Tafea' },  // Aneityum
  { lon: 170.22, lat: -19.53, province: 'Tafea' },  // Futuna
];

/** Haversine distance in km between two lat/lon points. */
function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(a));
}

/**
 * Compute the mean centroid [lon, lat] of any GeoJSON object
 * (Geometry, Feature, or FeatureCollection).
 */
function geoCentroid(geojson) {
  const coords = [];
  function extract(c) {
    if (typeof c[0] === 'number') {
      coords.push(c);
    } else {
      c.forEach(extract);
    }
  }
  if (geojson?.type === 'FeatureCollection') {
    for (const feat of (geojson.features || [])) {
      if (feat?.geometry?.coordinates) extract(feat.geometry.coordinates);
    }
  } else {
    const geom = geojson?.type === 'Feature' ? geojson.geometry : geojson;
    if (!geom?.coordinates) return null;
    extract(geom.coordinates);
  }
  if (!coords.length) return null;
  const lon = coords.reduce((s, c) => s + c[0], 0) / coords.length;
  const lat = coords.reduce((s, c) => s + c[1], 0) / coords.length;
  return { lat, lon };
}

/**
 * Detect the Vanuatu province for a GeoJSON object.
 * Returns a province name string, or null if it cannot be determined.
 */
export function detectProvince(geojson) {
  if (!geojson) return null;
  const centroid = geoCentroid(geojson);
  if (!centroid) return null;

  let nearestProvince = null;
  let minDist = Infinity;
  for (const island of ISLAND_CENTROIDS) {
    const d = haversineKm(centroid.lat, centroid.lon, island.lat, island.lon);
    if (d < minDist) {
      minDist = d;
      nearestProvince = island.province;
    }
  }
  // 350 km covers all of Vanuatu's territorial waters
  return minDist < 350 ? nearestProvince : null;
}
