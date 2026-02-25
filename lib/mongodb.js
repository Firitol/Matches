// lib/mongodb.js
const { MongoClient } = require('mongodb');

if (!process.env.MONGODB_URI) {
  throw new Error('Please add MONGODB_URI to .env.local');
}

const uri = process.env.MONGODB_URI;
const options = {
  maxPoolSize: 10,
  minPoolSize: 5,
  maxIdleTimeMS: 60000,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
};

let client;
let clientPromise;

if (process.env.NODE_ENV === 'development') {
  // In development, use global to preserve connection across hot reloads
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri, options);
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  // In production, create new connection per invocation (serverless)
  client = new MongoClient(uri, options);
  clientPromise = client.connect();
}

// Helper to get database
export async function getDatabase(dbName = 'ethiomatch') {
  const client = await clientPromise;
  return client.db(dbName);
}

// Helper to get collection
export async function getCollection(collectionName, dbName = 'ethiomatch') {
  const db = await getDatabase(dbName);
  return db.collection(collectionName);
}

// Mongoose wrapper for serverless (optional)
export async function getMongooseConnection() {
  const mongoose = require('mongoose');
  
  if (mongoose.connection.readyState !== 1) {
    await mongoose.connect(uri, {
      ...options,
      bufferCommands: false,
    });
  }
  
  return mongoose;
}

export default clientPromise;
