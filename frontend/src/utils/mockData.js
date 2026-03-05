// DEMO DATA — remove this file and revert page imports when backend is ready

// ─── Executive Summary ─────────────────────────────────────────────────────
export const mockExecutiveSummary = {
  reportingPeriod: 'January – March 2026',
  totalFishers: 391,
  totalCommunities: 12,
  provincesActive: 6,
  committeePct: 75,      // % of communities with registered CBFM committee
  tabooAreaPct: 67,      // % of communities with taboo area
  avgReefHealthScore: 3.5, // mean reef health score across all monitored sites
  coralTarget: 50,       // target coral cover %
};

export const mockAlerts = [
  {
    id: 1,
    severity: 'high',
    category: 'Reef Health',
    title: 'Critical coral cover — West Tanna Fish Survey',
    detail: 'Coral cover at 29.6%, below the 30% intervention threshold. Reef health score 2/5.',
    location: 'Tafea · Tanna',
    link: '/monitoring',
  },
  {
    id: 2,
    severity: 'high',
    category: 'Reef Health',
    title: 'Degraded reef — Yasur Reef Station',
    detail: 'Coral cover at 33.1%, reef health score 2/5. Scheduled monitoring recommended.',
    location: 'Tafea · Tanna',
    link: '/monitoring',
  },
  {
    id: 3,
    severity: 'medium',
    category: 'Area Status',
    title: 'Marine area inactive — Longana Taboo Site',
    detail: 'Status set to inactive. Community re-engagement or formal closure review required.',
    location: 'Penama · Ambae',
    link: '/marine',
  },
  {
    id: 4,
    severity: 'medium',
    category: 'Data Review',
    title: '1 dataset pending approval',
    detail: 'Coral Cover All Sites 2024, submitted by Mere Wokon, is awaiting peer review.',
    location: null,
    link: '/datasets',
  },
  {
    id: 5,
    severity: 'low',
    category: 'Compliance',
    title: '3 communities without CBFM committee',
    detail: 'Tasiriki (Sanma), Lakatoro (Malampa), and Longana (Penama) have no registered committee.',
    location: 'Sanma · Malampa · Penama',
    link: '/surveys',
  },
];

export const mockRecentActivity = [
  { date: '2024-11-15', type: 'survey',     title: 'Baseline survey — Mele Village',                   province: 'Shefa',    by: 'James Kalotiti' },
  { date: '2024-11-10', type: 'monitoring', title: 'Reef fish survey — Mele Reef Transect A',           province: 'Shefa',    by: 'Mere Wokon' },
  { date: '2024-11-08', type: 'monitoring', title: 'Coral cover assessment — Eton Coral Belt',          province: 'Shefa',    by: 'Mere Wokon' },
  { date: '2024-10-30', type: 'dataset',    title: 'Vanuatu LMMA Boundaries GIS Layer — published',     province: 'National', by: 'Sarah Tura' },
  { date: '2024-10-22', type: 'survey',     title: 'Monitoring survey — Eton Village',                  province: 'Shefa',    by: 'Tom Naupa' },
  { date: '2024-10-15', type: 'monitoring', title: 'Reef fish survey — Santo North Transect 1',         province: 'Sanma',    by: 'Tom Naupa' },
];

export const mockProvinceMetrics = [
  { province: 'Shefa',   surveys: 14, areas: 3, avgCoralCover: 55.4, reefHealthAvg: 4.0 },
  { province: 'Sanma',   surveys: 11, areas: 2, avgCoralCover: 44.7, reefHealthAvg: 3.0 },
  { province: 'Tafea',   surveys: 9,  areas: 2, avgCoralCover: 31.4, reefHealthAvg: 2.0 },
  { province: 'Malampa', surveys: 7,  areas: 3, avgCoralCover: null, reefHealthAvg: 3.5 },
  { province: 'Penama',  surveys: 5,  areas: 2, avgCoralCover: 52.8, reefHealthAvg: 4.0 },
  { province: 'Torba',   surveys: 2,  areas: 1, avgCoralCover: 64.9, reefHealthAvg: 5.0 },
];

// ─── Dashboard Stats ──────────────────────────────────────────────────────────
export const mockSurveyStats = {
  total: 48,
  byProvince: [
    { province: 'Shefa', count: 14 },
    { province: 'Sanma', count: 11 },
    { province: 'Tafea', count: 9 },
    { province: 'Malampa', count: 7 },
    { province: 'Penama', count: 5 },
    { province: 'Torba', count: 2 },
  ],
};

export const mockMarineStats = {
  total: 22,
  totalAreaHa: 18450,
  byType: [
    { areaType: 'lmma', count: 9 },
    { areaType: 'taboo_area', count: 6 },
    { areaType: 'patrol_zone', count: 4 },
    { areaType: 'spawning_aggregation', count: 2 },
    { areaType: 'buffer_zone', count: 1 },
  ],
};

export const mockMonitoringStats = {
  total: 63,
  avgCoralCover: 42.3,
  byType: [
    { monitoringType: 'reef_fish_survey', count: 21 },
    { monitoringType: 'coral_cover', count: 18 },
    { monitoringType: 'invertebrate_survey', count: 12 },
    { monitoringType: 'catch_composition', count: 7 },
    { monitoringType: 'seagrass_survey', count: 3 },
    { monitoringType: 'mangrove_survey', count: 2 },
  ],
};

export const mockDatasetStats = {
  total: 17,
  published: 11,
  byType: [
    { dataType: 'geospatial', count: 6 },
    { dataType: 'survey', count: 5 },
    { dataType: 'monitoring', count: 4 },
    { dataType: 'catch', count: 2 },
  ],
};

// ─── Community Surveys ────────────────────────────────────────────────────────
export const mockSurveys = {
  surveys: [
    { id: '1', community: 'Mele Village', lmmaName: 'Mele LMMA', province: 'Shefa', island: 'Efate', surveyDate: '2024-11-15', surveyType: 'baseline', totalFishers: 42, hasCBFMCommittee: true, hasTabooArea: true },
    { id: '2', community: 'Eton Village', lmmaName: 'Eton Reef Zone', province: 'Shefa', island: 'Efate', surveyDate: '2024-10-22', surveyType: 'monitoring', totalFishers: 28, hasCBFMCommittee: true, hasTabooArea: false },
    { id: '3', community: 'Luganville East', lmmaName: 'Santo North LMMA', province: 'Sanma', island: 'Espiritu Santo', surveyDate: '2024-10-08', surveyType: 'baseline', totalFishers: 56, hasCBFMCommittee: true, hasTabooArea: true },
    { id: '4', community: 'Tasiriki', lmmaName: 'Tasiriki Community', province: 'Sanma', island: 'Espiritu Santo', surveyDate: '2024-09-30', surveyType: 'follow_up', totalFishers: 19, hasCBFMCommittee: false, hasTabooArea: true },
    { id: '5', community: 'Port Resolution', lmmaName: 'Yasur Coastal Zone', province: 'Tafea', island: 'Tanna', surveyDate: '2024-09-14', surveyType: 'baseline', totalFishers: 33, hasCBFMCommittee: true, hasTabooArea: true },
    { id: '6', community: 'Lenakel', lmmaName: 'West Tanna LMMA', province: 'Tafea', island: 'Tanna', surveyDate: '2024-08-27', surveyType: 'monitoring', totalFishers: 47, hasCBFMCommittee: true, hasTabooArea: false },
    { id: '7', community: 'Lakatoro', lmmaName: 'Malekula Central', province: 'Malampa', island: 'Malekula', surveyDate: '2024-08-12', surveyType: 'baseline', totalFishers: 38, hasCBFMCommittee: false, hasTabooArea: true },
    { id: '8', community: 'Norsup', lmmaName: 'Norsup Bay LMMA', province: 'Malampa', island: 'Malekula', surveyDate: '2024-07-25', surveyType: 'follow_up', totalFishers: 24, hasCBFMCommittee: true, hasTabooArea: true },
    { id: '9', community: 'Saratamata', lmmaName: 'Ambae East Coast', province: 'Penama', island: 'Ambae', surveyDate: '2024-07-10', surveyType: 'monitoring', totalFishers: 31, hasCBFMCommittee: true, hasTabooArea: false },
    { id: '10', community: 'Longana', lmmaName: 'Longana Reef', province: 'Penama', island: 'Ambae', surveyDate: '2024-06-18', surveyType: 'baseline', totalFishers: 22, hasCBFMCommittee: false, hasTabooArea: true },
    { id: '11', community: 'Sola', lmmaName: 'Torres LMMA', province: 'Torba', island: 'Vanua Lava', surveyDate: '2024-06-03', surveyType: 'baseline', totalFishers: 15, hasCBFMCommittee: true, hasTabooArea: true },
    { id: '12', community: 'Mosina', lmmaName: 'Mosina Coastal', province: 'Shefa', island: 'Efate', surveyDate: '2024-05-20', surveyType: 'monitoring', totalFishers: 36, hasCBFMCommittee: true, hasTabooArea: false },
  ],
  pagination: { pages: 4, total: 48 },
};

// ─── Marine Areas ─────────────────────────────────────────────────────────────
export const mockMarineAreas = {
  areas: [
    { id: '1', areaName: 'Mele LMMA', province: 'Shefa', island: 'Efate', community: 'Mele Village', areaType: 'lmma', managementStatus: 'active', areaSizeHa: 1240, protectionLevel: 'High', isCurrentlyOpen: false },
    { id: '2', areaName: 'Eton Taboo Zone', province: 'Shefa', island: 'Efate', community: 'Eton Village', areaType: 'taboo_area', managementStatus: 'active', areaSizeHa: 320, protectionLevel: 'Full', isCurrentlyOpen: false },
    { id: '3', areaName: 'Santo North LMMA', province: 'Sanma', island: 'Espiritu Santo', community: 'Luganville East', areaType: 'lmma', managementStatus: 'active', areaSizeHa: 2850, protectionLevel: 'Medium', isCurrentlyOpen: true },
    { id: '4', areaName: 'Tasiriki Patrol Zone', province: 'Sanma', island: 'Espiritu Santo', community: 'Tasiriki', areaType: 'patrol_zone', managementStatus: 'active', areaSizeHa: 780, protectionLevel: 'Medium', isCurrentlyOpen: true },
    { id: '5', areaName: 'Yasur Coastal Reserve', province: 'Tafea', island: 'Tanna', community: 'Port Resolution', areaType: 'lmma', managementStatus: 'active', areaSizeHa: 1560, protectionLevel: 'High', isCurrentlyOpen: false },
    { id: '6', areaName: 'West Tanna Taboo', province: 'Tafea', island: 'Tanna', community: 'Lenakel', areaType: 'taboo_area', managementStatus: 'under_review', areaSizeHa: 445, protectionLevel: 'Full', isCurrentlyOpen: false },
    { id: '7', areaName: 'Malekula Buffer Zone', province: 'Malampa', island: 'Malekula', community: 'Lakatoro', areaType: 'buffer_zone', managementStatus: 'active', areaSizeHa: 920, protectionLevel: 'Low', isCurrentlyOpen: true },
    { id: '8', areaName: 'Norsup Spawning Site', province: 'Malampa', island: 'Malekula', community: 'Norsup', areaType: 'spawning_aggregation', managementStatus: 'active', areaSizeHa: 180, protectionLevel: 'Full', isCurrentlyOpen: false },
    { id: '9', areaName: 'Ambae East LMMA', province: 'Penama', island: 'Ambae', community: 'Saratamata', areaType: 'lmma', managementStatus: 'proposed', areaSizeHa: 1100, protectionLevel: 'Medium', isCurrentlyOpen: true },
    { id: '10', areaName: 'Torres LMMA', province: 'Torba', island: 'Vanua Lava', community: 'Sola', areaType: 'lmma', managementStatus: 'active', areaSizeHa: 2200, protectionLevel: 'High', isCurrentlyOpen: false },
    { id: '11', areaName: 'Mosina Reef Patrol', province: 'Shefa', island: 'Efate', community: 'Mosina', areaType: 'patrol_zone', managementStatus: 'active', areaSizeHa: 610, protectionLevel: 'Medium', isCurrentlyOpen: true },
    { id: '12', areaName: 'Longana Taboo Site', province: 'Penama', island: 'Ambae', community: 'Longana', areaType: 'taboo_area', managementStatus: 'inactive', areaSizeHa: 275, protectionLevel: 'Full', isCurrentlyOpen: false },
  ],
  pagination: { pages: 2, total: 22 },
};

// ─── Biological Monitoring ────────────────────────────────────────────────────
export const mockMonitoringRecords = {
  records: [
    { id: '1', siteName: 'Mele Reef Transect A', surveyName: 'Efate Reef Survey 2024', monitoringType: 'reef_fish_survey', province: 'Shefa', community: 'Mele Village', surveyDate: '2024-11-10', liveCoralCoverPct: 58.2, totalFishBiomassKg: 124.5, reefHealthScore: 4 },
    { id: '2', siteName: 'Eton Coral Belt', surveyName: 'Efate Reef Survey 2024', monitoringType: 'coral_cover', province: 'Shefa', community: 'Eton Village', surveyDate: '2024-11-08', liveCoralCoverPct: 71.4, totalFishBiomassKg: null, reefHealthScore: 5 },
    { id: '3', siteName: 'Santo North Transect 1', surveyName: 'Santo Coastal Baseline', monitoringType: 'reef_fish_survey', province: 'Sanma', community: 'Luganville East', surveyDate: '2024-10-15', liveCoralCoverPct: 44.7, totalFishBiomassKg: 98.3, reefHealthScore: 3 },
    { id: '4', siteName: 'Tasiriki Invertebrate Survey', surveyName: 'Santo Coastal Baseline', monitoringType: 'invertebrate_survey', province: 'Sanma', community: 'Tasiriki', surveyDate: '2024-10-12', liveCoralCoverPct: null, totalFishBiomassKg: null, reefHealthScore: 3 },
    { id: '5', siteName: 'Yasur Reef Station', surveyName: 'Tanna Marine Health', monitoringType: 'coral_cover', province: 'Tafea', community: 'Port Resolution', surveyDate: '2024-09-20', liveCoralCoverPct: 33.1, totalFishBiomassKg: null, reefHealthScore: 2 },
    { id: '6', siteName: 'West Tanna Fish Survey', surveyName: 'Tanna Marine Health', monitoringType: 'reef_fish_survey', province: 'Tafea', community: 'Lenakel', surveyDate: '2024-09-18', liveCoralCoverPct: 29.6, totalFishBiomassKg: 67.8, reefHealthScore: 2 },
    { id: '7', siteName: 'Norsup Seagrass Bed', surveyName: 'Malekula Ecosystem Survey', monitoringType: 'seagrass_survey', province: 'Malampa', community: 'Norsup', surveyDate: '2024-08-30', liveCoralCoverPct: null, totalFishBiomassKg: null, reefHealthScore: 4 },
    { id: '8', siteName: 'Lakatoro Catch Sample', surveyName: 'Malekula Ecosystem Survey', monitoringType: 'catch_composition', province: 'Malampa', community: 'Lakatoro', surveyDate: '2024-08-25', liveCoralCoverPct: null, totalFishBiomassKg: 210.4, reefHealthScore: 3 },
    { id: '9', siteName: 'Ambae East Reef', surveyName: 'Penama Reef Assessment', monitoringType: 'reef_fish_survey', province: 'Penama', community: 'Saratamata', surveyDate: '2024-07-22', liveCoralCoverPct: 52.8, totalFishBiomassKg: 143.2, reefHealthScore: 4 },
    { id: '10', siteName: 'Torres Deep Transect', surveyName: 'Torres Islands Baseline', monitoringType: 'coral_cover', province: 'Torba', community: 'Sola', surveyDate: '2024-07-05', liveCoralCoverPct: 64.9, totalFishBiomassKg: null, reefHealthScore: 5 },
    { id: '11', siteName: 'Longana Mangrove Survey', surveyName: 'Penama Reef Assessment', monitoringType: 'mangrove_survey', province: 'Penama', community: 'Longana', surveyDate: '2024-06-28', liveCoralCoverPct: null, totalFishBiomassKg: null, reefHealthScore: 4 },
    { id: '12', siteName: 'Mosina Invertebrate Belt', surveyName: 'Efate Reef Survey 2024', monitoringType: 'invertebrate_survey', province: 'Shefa', community: 'Mosina', surveyDate: '2024-06-14', liveCoralCoverPct: 38.5, totalFishBiomassKg: null, reefHealthScore: 3 },
  ],
  pagination: { pages: 5, total: 63 },
};

// ─── Datasets ─────────────────────────────────────────────────────────────────
export const mockDatasets = {
  datasets: [
    { id: '1', title: 'Efate Reef Fish Biomass Survey 2024', description: 'Comprehensive reef fish biomass data from 12 transects around Efate island.', status: 'published', fileFormat: 'CSV', dataType: 'monitoring', province: 'Shefa', community: 'Mele Village', collectionDate: '2024-11-15', fileSize: 245760, downloadCount: 14, fileName: 'efate_reef_fish_2024.csv', uploader: { firstName: 'James', lastName: 'Kalotiti' } },
    { id: '2', title: 'Vanuatu LMMA Boundaries GIS Layer', description: 'GeoJSON polygons of all registered LMMAs across Vanuatu provinces.', status: 'published', fileFormat: 'GeoJSON', dataType: 'geospatial', province: null, community: null, collectionDate: '2024-10-30', fileSize: 1843200, downloadCount: 31, fileName: 'vanuatu_lmma_boundaries.geojson', uploader: { firstName: 'Sarah', lastName: 'Tura' } },
    { id: '3', title: 'Santo North Baseline Survey Data', description: 'Baseline socioeconomic and fishing effort data from Espiritu Santo communities.', status: 'published', fileFormat: 'XLSX', dataType: 'survey', province: 'Sanma', community: 'Luganville East', collectionDate: '2024-10-08', fileSize: 512000, downloadCount: 8, fileName: 'santo_north_baseline_2024.xlsx', uploader: { firstName: 'Tom', lastName: 'Naupa' } },
    { id: '4', title: 'Coral Cover Percentage — All Sites 2024', description: 'Aggregated coral cover data from benthic surveys conducted Jan–Nov 2024.', status: 'under_review', fileFormat: 'CSV', dataType: 'monitoring', province: null, community: null, collectionDate: '2024-11-01', fileSize: 98304, downloadCount: 0, fileName: 'coral_cover_all_2024.csv', uploader: { firstName: 'Mere', lastName: 'Wokon' } },
    { id: '5', title: 'Tanna Fishing Catch Records Q3 2024', description: 'Daily catch composition and effort logs from West Tanna fishing communities.', status: 'published', fileFormat: 'CSV', dataType: 'catch', province: 'Tafea', community: 'Lenakel', collectionDate: '2024-09-30', fileSize: 163840, downloadCount: 6, fileName: 'tanna_catch_q3_2024.csv', uploader: { firstName: 'Anna', lastName: 'Iavro' } },
    { id: '6', title: 'Malekula Marine Area GPS Coordinates', description: 'GPS boundary points and waypoints for marine areas in Malampa Province.', status: 'published', fileFormat: 'KML', dataType: 'geospatial', province: 'Malampa', community: null, collectionDate: '2024-08-15', fileSize: 307200, downloadCount: 11, fileName: 'malekula_marine_gps.kml', uploader: { firstName: 'Jack', lastName: 'Vira' } },
    { id: '7', title: 'Vanuatu Coral Reef Habitat Map', description: 'Classified satellite imagery showing reef habitat types across Vanuatu EEZ.', status: 'published', fileFormat: 'GeoTIFF', dataType: 'geospatial', province: null, community: null, collectionDate: '2024-07-01', fileSize: 52428800, downloadCount: 22, fileName: 'vanuatu_reef_habitat_2024.tif', uploader: { firstName: 'Sarah', lastName: 'Tura' } },
    { id: '8', title: 'Penama Community Survey Responses', description: 'Raw survey responses from Ambae and Maewo community consultations.', status: 'draft', fileFormat: 'XLSX', dataType: 'survey', province: 'Penama', community: 'Saratamata', collectionDate: '2024-07-20', fileSize: 204800, downloadCount: 0, fileName: 'penama_survey_responses_2024.xlsx', uploader: { firstName: 'Lisa', lastName: 'Moli' } },
    { id: '9', title: 'Torres Islands Invertebrate Count Data', description: 'Sea cucumber, trochus, and green snail population counts from Torres Group.', status: 'published', fileFormat: 'CSV', dataType: 'monitoring', province: 'Torba', community: 'Sola', collectionDate: '2024-07-05', fileSize: 81920, downloadCount: 9, fileName: 'torres_invertebrates_2024.csv', uploader: { firstName: 'Tom', lastName: 'Naupa' } },
    { id: '10', title: 'National Fishing Effort Survey 2024', description: 'Nationwide fishing effort, gear type, and household dependency survey results.', status: 'published', fileFormat: 'CSV', dataType: 'survey', province: null, community: null, collectionDate: '2024-06-15', fileSize: 737280, downloadCount: 45, fileName: 'national_fishing_effort_2024.csv', uploader: { firstName: 'James', lastName: 'Kalotiti' } },
  ],
  pagination: { pages: 2, total: 17 },
};

// ─── Map GeoJSON ──────────────────────────────────────────────────────────────
export const mockSurveyMapFeatures = {
  features: [
    { type: 'Feature', geometry: { type: 'Point', coordinates: [168.321, -17.741] }, properties: { id: '1', community: 'Mele Village', province: 'Shefa', surveyType: 'baseline', surveyDate: '2024-11-15', totalFishers: 42 } },
    { type: 'Feature', geometry: { type: 'Point', coordinates: [168.412, -17.658] }, properties: { id: '2', community: 'Eton Village', province: 'Shefa', surveyType: 'monitoring', surveyDate: '2024-10-22', totalFishers: 28 } },
    { type: 'Feature', geometry: { type: 'Point', coordinates: [167.172, -15.528] }, properties: { id: '3', community: 'Luganville East', province: 'Sanma', surveyType: 'baseline', surveyDate: '2024-10-08', totalFishers: 56 } },
    { type: 'Feature', geometry: { type: 'Point', coordinates: [166.920, -15.142] }, properties: { id: '4', community: 'Tasiriki', province: 'Sanma', surveyType: 'follow_up', surveyDate: '2024-09-30', totalFishers: 19 } },
    { type: 'Feature', geometry: { type: 'Point', coordinates: [169.441, -19.523] }, properties: { id: '5', community: 'Port Resolution', province: 'Tafea', surveyType: 'baseline', surveyDate: '2024-09-14', totalFishers: 33 } },
    { type: 'Feature', geometry: { type: 'Point', coordinates: [169.282, -19.551] }, properties: { id: '6', community: 'Lenakel', province: 'Tafea', surveyType: 'monitoring', surveyDate: '2024-08-27', totalFishers: 47 } },
    { type: 'Feature', geometry: { type: 'Point', coordinates: [167.418, -16.096] }, properties: { id: '7', community: 'Lakatoro', province: 'Malampa', surveyType: 'baseline', surveyDate: '2024-08-12', totalFishers: 38 } },
    { type: 'Feature', geometry: { type: 'Point', coordinates: [167.332, -15.981] }, properties: { id: '8', community: 'Norsup', province: 'Malampa', surveyType: 'follow_up', surveyDate: '2024-07-25', totalFishers: 24 } },
    { type: 'Feature', geometry: { type: 'Point', coordinates: [167.941, -15.473] }, properties: { id: '9', community: 'Saratamata', province: 'Penama', surveyType: 'monitoring', surveyDate: '2024-07-10', totalFishers: 31 } },
    { type: 'Feature', geometry: { type: 'Point', coordinates: [167.972, -15.321] }, properties: { id: '10', community: 'Longana', province: 'Penama', surveyType: 'baseline', surveyDate: '2024-06-18', totalFishers: 22 } },
    { type: 'Feature', geometry: { type: 'Point', coordinates: [167.521, -13.857] }, properties: { id: '11', community: 'Sola', province: 'Torba', surveyType: 'baseline', surveyDate: '2024-06-03', totalFishers: 15 } },
  ],
};

export const mockMarineGeoJSON = {
  type: 'FeatureCollection',
  features: [
    { type: 'Feature', geometry: { type: 'Polygon', coordinates: [[[168.29,-17.75],[168.31,-17.75],[168.33,-17.76],[168.31,-17.78],[168.29,-17.77],[168.29,-17.75]]] }, properties: { id: '1', areaName: 'Mele LMMA', areaType: 'lmma', managementStatus: 'active', areaSizeHa: 1240, province: 'Shefa' } },
    { type: 'Feature', geometry: { type: 'Polygon', coordinates: [[[168.40,-17.65],[168.42,-17.65],[168.43,-17.66],[168.42,-17.67],[168.40,-17.66],[168.40,-17.65]]] }, properties: { id: '2', areaName: 'Eton Taboo Zone', areaType: 'taboo_area', managementStatus: 'active', areaSizeHa: 320, province: 'Shefa' } },
    { type: 'Feature', geometry: { type: 'Polygon', coordinates: [[[167.14,-15.50],[167.19,-15.50],[167.21,-15.53],[167.18,-15.56],[167.14,-15.54],[167.14,-15.50]]] }, properties: { id: '3', areaName: 'Santo North LMMA', areaType: 'lmma', managementStatus: 'active', areaSizeHa: 2850, province: 'Sanma' } },
    { type: 'Feature', geometry: { type: 'Polygon', coordinates: [[[169.42,-19.51],[169.46,-19.51],[169.47,-19.53],[169.45,-19.55],[169.42,-19.53],[169.42,-19.51]]] }, properties: { id: '5', areaName: 'Yasur Coastal Reserve', areaType: 'lmma', managementStatus: 'active', areaSizeHa: 1560, province: 'Tafea' } },
    { type: 'Feature', geometry: { type: 'Polygon', coordinates: [[[167.40,-16.08],[167.44,-16.08],[167.45,-16.10],[167.43,-16.12],[167.40,-16.10],[167.40,-16.08]]] }, properties: { id: '7', areaName: 'Malekula Buffer Zone', areaType: 'buffer_zone', managementStatus: 'active', areaSizeHa: 920, province: 'Malampa' } },
    { type: 'Feature', geometry: { type: 'Polygon', coordinates: [[[167.50,-13.84],[167.54,-13.84],[167.55,-13.86],[167.53,-13.88],[167.50,-13.86],[167.50,-13.84]]] }, properties: { id: '10', areaName: 'Torres LMMA', areaType: 'lmma', managementStatus: 'active', areaSizeHa: 2200, province: 'Torba' } },
  ],
};

export const mockMonitoringMapFeatures = {
  features: [
    { type: 'Feature', geometry: { type: 'Point', coordinates: [168.300, -17.748] }, properties: { id: '1', siteName: 'Mele Reef Transect A', monitoringType: 'reef_fish_survey', province: 'Shefa', liveCoralCoverPct: 58.2, reefHealthScore: 4 } },
    { type: 'Feature', geometry: { type: 'Point', coordinates: [168.415, -17.661] }, properties: { id: '2', siteName: 'Eton Coral Belt', monitoringType: 'coral_cover', province: 'Shefa', liveCoralCoverPct: 71.4, reefHealthScore: 5 } },
    { type: 'Feature', geometry: { type: 'Point', coordinates: [167.165, -15.535] }, properties: { id: '3', siteName: 'Santo North Transect 1', monitoringType: 'reef_fish_survey', province: 'Sanma', liveCoralCoverPct: 44.7, reefHealthScore: 3 } },
    { type: 'Feature', geometry: { type: 'Point', coordinates: [169.448, -19.528] }, properties: { id: '5', siteName: 'Yasur Reef Station', monitoringType: 'coral_cover', province: 'Tafea', liveCoralCoverPct: 33.1, reefHealthScore: 2 } },
    { type: 'Feature', geometry: { type: 'Point', coordinates: [167.335, -15.988] }, properties: { id: '7', siteName: 'Norsup Seagrass Bed', monitoringType: 'seagrass_survey', province: 'Malampa', liveCoralCoverPct: null, reefHealthScore: 4 } },
    { type: 'Feature', geometry: { type: 'Point', coordinates: [167.938, -15.478] }, properties: { id: '9', siteName: 'Ambae East Reef', monitoringType: 'reef_fish_survey', province: 'Penama', liveCoralCoverPct: 52.8, reefHealthScore: 4 } },
    { type: 'Feature', geometry: { type: 'Point', coordinates: [167.524, -13.860] }, properties: { id: '10', siteName: 'Torres Deep Transect', monitoringType: 'coral_cover', province: 'Torba', liveCoralCoverPct: 64.9, reefHealthScore: 5 } },
  ],
};
