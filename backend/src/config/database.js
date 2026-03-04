const { Sequelize } = require('sequelize');

const isProduction = process.env.NODE_ENV === 'production';
const useSSL = process.env.DATABASE_SSL !== 'false';

// Render/Railway provide DATABASE_URL; fall back to individual env vars for dev
const sequelize = process.env.DATABASE_URL
  ? new Sequelize(process.env.DATABASE_URL, {
      dialect: 'postgres',
      logging: false,
      pool: { max: 10, min: 0, acquire: 30000, idle: 10000 },
      dialectOptions: useSSL ? { ssl: { require: true, rejectUnauthorized: false } } : {},
    })
  : new Sequelize(
      process.env.DB_NAME,
      process.env.DB_USER,
      process.env.DB_PASSWORD,
      {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT || 5432,
        dialect: 'postgres',
        logging: isProduction ? false : console.log,
        pool: { max: 10, min: 0, acquire: 30000, idle: 10000 },
        dialectOptions: {
          ssl: isProduction ? { require: true, rejectUnauthorized: false } : false,
        },
      }
    );

module.exports = sequelize;
