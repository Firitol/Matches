// api/health.js
const { getDatabase } = require('../lib/mongodb');

module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  
  try {
    const db = await getDatabase();
    const stats = await db.stats();
    
    res.statusCode = 200;
    res.end(JSON.stringify({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      nodeVersion: process.version,
      database: {
        connected: true,
        name: db.databaseName,
        collections: stats.collections,
        documents: stats.objects
      }
    }));
  } catch (error) {
    res.statusCode = 503;
    res.end(JSON.stringify({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    }));
  }
};
