// lib/database.js
const { Sequelize } = require('sequelize');

// Connection from Render environment variable
const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  protocol: 'postgres',
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  },
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  }
});

// Test connection
const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ PostgreSQL Connected');
    
    // Sync models (create tables if they don't exist)
    await sequelize.sync({ alter: true });
    console.log('✅ Database tables synced');
    
    return sequelize;
  } catch (error) {
    console.error('❌ PostgreSQL Connection Error:', error.message);
    throw error;
  }
};

module.exports = { sequelize, connectDB };
