const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Dataset = sequelize.define('Dataset', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
  },
  dataType: {
    type: DataTypes.ENUM('community_survey', 'marine_area', 'biological_monitoring', 'catch_data', 'other'),
    allowNull: false,
  },
  fileFormat: {
    type: DataTypes.ENUM('zip', 'shapefile', 'csv', 'kml', 'geojson', 'other'),
    allowNull: false,
  },
  fileName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  fileSize: {
    type: DataTypes.BIGINT,
  },
  filePath: {
    type: DataTypes.STRING, // S3 key or local path
    allowNull: false,
  },
  // Metadata fields
  collectionDate: {
    type: DataTypes.DATEONLY,
  },
  collectionEndDate: {
    type: DataTypes.DATEONLY,
  },
  province: {
    type: DataTypes.STRING,
  },
  island: {
    type: DataTypes.STRING,
  },
  community: {
    type: DataTypes.STRING,
  },
  lmmaName: {
    type: DataTypes.STRING, // Locally Managed Marine Area
  },
  coordinatorName: {
    type: DataTypes.STRING,
  },
  coordinatorContact: {
    type: DataTypes.STRING,
  },
  methodology: {
    type: DataTypes.TEXT,
  },
  tags: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: [],
  },
  // Status management
  status: {
    type: DataTypes.ENUM('draft', 'under_review', 'published', 'archived'),
    defaultValue: 'draft',
  },
  publishedAt: {
    type: DataTypes.DATE,
  },
  publishedBy: {
    type: DataTypes.UUID,
  },
  // Spatial bounding box (for quick filtering)
  bboxMinLng: { type: DataTypes.FLOAT },
  bboxMinLat: { type: DataTypes.FLOAT },
  bboxMaxLng: { type: DataTypes.FLOAT },
  bboxMaxLat: { type: DataTypes.FLOAT },
  // Upload metadata
  uploadedBy: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  downloadCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  notes: {
    type: DataTypes.TEXT,
  },
}, {
  tableName: 'datasets',
  indexes: [
    { fields: ['status'] },
    { fields: ['dataType'] },
    { fields: ['province'] },
    { fields: ['uploadedBy'] },
  ],
});

module.exports = Dataset;
