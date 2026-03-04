const sequelize = require('../config/database');
const User = require('./User');
const Dataset = require('./Dataset');
const CommunitySurvey = require('./CommunitySurvey');
const MarineArea = require('./MarineArea');
const BiologicalMonitoring = require('./BiologicalMonitoring');

// Associations
User.hasMany(Dataset, { foreignKey: 'uploadedBy', as: 'datasets' });
Dataset.belongsTo(User, { foreignKey: 'uploadedBy', as: 'uploader' });

User.hasMany(CommunitySurvey, { foreignKey: 'submittedBy', as: 'communitySurveys' });
CommunitySurvey.belongsTo(User, { foreignKey: 'submittedBy', as: 'submitter' });

User.hasMany(MarineArea, { foreignKey: 'submittedBy', as: 'marineAreas' });
MarineArea.belongsTo(User, { foreignKey: 'submittedBy', as: 'submitter' });

User.hasMany(BiologicalMonitoring, { foreignKey: 'submittedBy', as: 'bioMonitoring' });
BiologicalMonitoring.belongsTo(User, { foreignKey: 'submittedBy', as: 'submitter' });

const syncDatabase = async () => {
  try {
    await sequelize.authenticate();
    console.log('Database connection established.');
    await sequelize.sync({ alter: process.env.NODE_ENV === 'development' });
    console.log('Database models synchronized.');
  } catch (error) {
    console.error('Database sync error:', error);
    throw error;
  }
};

module.exports = {
  sequelize,
  syncDatabase,
  User,
  Dataset,
  CommunitySurvey,
  MarineArea,
  BiologicalMonitoring,
};
