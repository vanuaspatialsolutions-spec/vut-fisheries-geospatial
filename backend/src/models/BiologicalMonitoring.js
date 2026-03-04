const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const BiologicalMonitoring = sequelize.define('BiologicalMonitoring', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  // Survey identification
  surveyName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  monitoringType: {
    type: DataTypes.ENUM('reef_fish_survey', 'invertebrate_survey', 'coral_cover', 'seagrass_survey', 'mangrove_survey', 'catch_composition'),
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
  siteName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  latitude: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
  longitude: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
  depthM: {
    type: DataTypes.FLOAT,
  },
  // Survey dates & team
  surveyDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  surveyTeam: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: [],
  },
  // Reef fish
  transectLengthM: {
    type: DataTypes.FLOAT,
  },
  transectWidthM: {
    type: DataTypes.FLOAT,
  },
  numberOfTransects: {
    type: DataTypes.INTEGER,
  },
  totalFishCount: {
    type: DataTypes.INTEGER,
  },
  totalFishBiomassKg: {
    type: DataTypes.FLOAT,
  },
  targetSpeciesCount: {
    type: DataTypes.INTEGER,
  },
  // Coral cover
  liveCoralCoverPct: {
    type: DataTypes.FLOAT,
  },
  deadCoralCoverPct: {
    type: DataTypes.FLOAT,
  },
  algaeCoverPct: {
    type: DataTypes.FLOAT,
  },
  // Invertebrates
  seaCucumberDensityPer100m2: {
    type: DataTypes.FLOAT,
  },
  trochusDensityPer100m2: {
    type: DataTypes.FLOAT,
  },
  // Species data stored as JSON array of observations
  speciesData: {
    type: DataTypes.JSONB,
    defaultValue: [],
    comment: '[{species, commonName, count, sizeRange, notes}]',
  },
  // Health indicators
  reefHealthScore: {
    type: DataTypes.FLOAT, // 1-5
  },
  bleachingPresent: {
    type: DataTypes.BOOLEAN,
  },
  bleachingPct: {
    type: DataTypes.FLOAT,
  },
  // Threats observed
  threatsObserved: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: [],
    comment: 'e.g. blast_fishing, poison_fishing, overfishing, runoff',
  },
  // Notes
  methodology: {
    type: DataTypes.TEXT,
  },
  notes: {
    type: DataTypes.TEXT,
  },
  submittedBy: {
    type: DataTypes.UUID,
    allowNull: false,
  },
}, {
  tableName: 'biological_monitoring',
  indexes: [
    { fields: ['province'] },
    { fields: ['monitoringType'] },
    { fields: ['surveyDate'] },
    { fields: ['submittedBy'] },
  ],
});

module.exports = BiologicalMonitoring;
