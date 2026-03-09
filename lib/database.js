// lib/database.js
const { Sequelize } = require('sequelize');

const connectionString = process.env.DATABASE_URL || 'postgres://postgres:postgres@127.0.0.1:5432/ethiomatch';

if (!process.env.DATABASE_URL) {
  console.warn('DATABASE_URL is not set. Falling back to local default connection string.');
}

const sequelize = new Sequelize(connectionString, {
  dialect: 'postgres',
  protocol: 'postgres',
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  dialectOptions: {
    ssl: { require: true, rejectUnauthorized: false }
  },
  pool: { max: 5, min: 0, acquire: 30000, idle: 10000 },
  retry: { match: [/Deadlock/i, /Transaction/i, /Connection/i], max: 3 }
});

const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ PostgreSQL Connected');
    
    const shouldSync = process.env.DB_SYNC === 'true';
    if (shouldSync) {
      await sequelize.sync({ alter: false });
      console.log('✅ Tables synced');
    }
    
    return sequelize;
  } catch (error) {
    console.error('❌ Database connection error:', error.message);
    return null;
  }
};

module.exports = { sequelize, connectDB };
