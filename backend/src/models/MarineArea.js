const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const MarineArea = sequelize.define('MarineArea', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  // Identification
  areaName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  areaType: {
    type: DataTypes.ENUM('lmma', 'taboo_area', 'patrol_zone', 'buffer_zone', 'spawning_aggregation', 'other'),
    allowNull: false,
  },
  // Location
  province: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  island: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  community: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  // Geometry stored as GeoJSON
  geometry: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'GeoJSON geometry (Polygon or MultiPolygon)',
  },
  // Area metrics
  areaSizeHa: {
    type: DataTypes.FLOAT,
  },
  perimeterKm: {
    type: DataTypes.FLOAT,
  },
  // Management
  establishedYear: {
    type: DataTypes.INTEGER,
  },
  managementStatus: {
    type: DataTypes.ENUM('active', 'inactive', 'under_review', 'proposed'),
    defaultValue: 'active',
  },
  protectionLevel: {
    type: DataTypes.ENUM('fully_protected', 'partially_protected', 'seasonal'),
  },
  // Taboo / closure details
  isCurrentlyOpen: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  lastClosureDate: {
    type: DataTypes.DATEONLY,
  },
  lastOpeningDate: {
    type: DataTypes.DATEONLY,
  },
  closureDurationMonths: {
    type: DataTypes.INTEGER,
  },
  // Patrol info
  patrolFrequency: {
    type: DataTypes.ENUM('daily', 'weekly', 'monthly', 'irregular', 'none'),
  },
  // Habitat types present
  habitatTypes: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: [],
    comment: 'e.g. coral_reef, mangrove, seagrass, sandy_bottom',
  },
  // Notes
  notes: {
    type: DataTypes.TEXT,
  },
  submittedBy: {
    type: DataTypes.UUID,
    allowNull: false,
  },
}, {
  tableName: 'marine_areas',
  indexes: [
    { fields: ['province'] },
    { fields: ['areaType'] },
    { fields: ['managementStatus'] },
  ],
});

module.exports = MarineArea;
