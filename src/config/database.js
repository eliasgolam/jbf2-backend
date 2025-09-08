/**
 * Database Configuration
 * Handles MongoDB connection and repository selection
 */

const mongoose = require('mongoose');
const { mongoRepository } = require('../repositories/adviceRepository.mongo');
const inMemoryRepository = require('../repositories/adviceRepository');

/**
 * Database configuration
 */
const config = {
  // Use MongoDB if USE_MONGO is true, otherwise use in-memory
  useMongo: process.env.USE_MONGO === 'true',
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/jbfinanz_advice',
  
  // Repository selection
  getRepository: () => {
    return config.useMongo ? mongoRepository : inMemoryRepository;
  }
};

/**
 * Initialize database connection
 */
async function initializeDatabase() {
  try {
    if (config.useMongo) {
      console.log('🗄️  Using MongoDB for advice session persistence');
      
      if (!config.mongoUri) {
        throw new Error('MONGODB_URI environment variable is required when USE_MONGO=true');
      }

      // Connect to MongoDB
      await mongoose.connect(config.mongoUri, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });

      console.log('✅ MongoDB connected for advice sessions');
      
      // Test repository connection
      await mongoRepository.ensureConnection();
      
    } else {
      console.log('💾 Using in-memory storage for advice sessions');
    }
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
}

/**
 * Close database connection
 */
async function closeDatabase() {
  try {
    if (config.useMongo && mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      console.log('✅ MongoDB connection closed');
    }
  } catch (error) {
    console.error('❌ Error closing database connection:', error);
    throw error;
  }
}

/**
 * Get current repository
 */
function getRepository() {
  return config.getRepository();
}

/**
 * Check if using MongoDB
 */
function isUsingMongo() {
  return config.useMongo;
}

module.exports = {
  initializeDatabase,
  closeDatabase,
  getRepository,
  isUsingMongo,
  config
};
