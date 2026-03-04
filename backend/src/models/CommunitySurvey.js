const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const CommunitySurvey = sequelize.define('CommunitySurvey', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
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
  lmmaName: {
    type: DataTypes.STRING,
  },
  latitude: {
    type: DataTypes.FLOAT,
  },
  longitude: {
    type: DataTypes.FLOAT,
  },
  // Survey details
  surveyDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  surveyType: {
    type: DataTypes.ENUM('baseline', 'annual', 'follow_up', 'rapid_assessment'),
    allowNull: false,
  },
  surveyorName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  surveyorOrganization: {
    type: DataTypes.STRING,
  },
  // Community profile
  totalHouseholds: {
    type: DataTypes.INTEGER,
  },
  totalFishers: {
    type: DataTypes.INTEGER,
  },
  maleFishers: {
    type: DataTypes.INTEGER,
  },
  femaleFishers: {
    type: DataTypes.INTEGER,
  },
  youthFishers: {
    type: DataTypes.INTEGER,
  },
  // CBFM governance
  hasCBFMCommittee: {
    type: DataTypes.BOOLEAN,
  },
  committeeSize: {
    type: DataTypes.INTEGER,
  },
  femaleMembersOnCommittee: {
    type: DataTypes.INTEGER,
  },
  hasFishingRules: {
    type: DataTypes.BOOLEAN,
  },
  hasTabooArea: {
    type: DataTypes.BOOLEAN,
  },
  tabooAreaSizeHa: {
    type: DataTypes.FLOAT,
  },
  lastTabooLiftYear: {
    type: DataTypes.INTEGER,
  },
  // Livelihood
  primaryIncomeSource: {
    type: DataTypes.ENUM('fishing', 'agriculture', 'both', 'other'),
  },
  averageMonthlyIncomeFishing: {
    type: DataTypes.FLOAT, // in VUV
  },
  // Challenges (multi-select stored as array)
  challenges: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: [],
  },
  // Training
  trainingReceived: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: [],
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
  tableName: 'community_surveys',
  indexes: [
    { fields: ['province'] },
    { fields: ['island'] },
    { fields: ['surveyDate'] },
    { fields: ['submittedBy'] },
  ],
});

module.exports = CommunitySurvey;
