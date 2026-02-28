// lib/database.js
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(process.env.DATABASE_URL, {
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
    console.log('✅ Neon PostgreSQL Connected');
    await sequelize.sync({ alter: true });
    console.log('✅ Database tables synced');
    return sequelize;
  } catch (error) {
    console.error('❌ Neon Connection Error:', error.message);
    return null;
  }
};

module.exports = { sequelize, connectDB };
