/**
 * MongoDB Advice Session Repository
 * Persistent storage for advice sessions using Mongoose
 */

const mongoose = require('mongoose');

// Advice Session Schema
const adviceSessionSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  session: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  updatedAt: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true, // Automatically adds createdAt and updatedAt
  collection: 'advice_sessions'
});

// Create model
const AdviceSession = mongoose.model('AdviceSession', adviceSessionSchema);

/**
 * MongoDB Advice Session Repository Implementation
 */
class MongoAdviceRepository {
  constructor() {
    this.connected = false;
  }

  /**
   * Ensure MongoDB connection
   */
  async ensureConnection() {
    if (!this.connected && mongoose.connection.readyState !== 1) {
      const mongoUri = process.env.MONGODB_URI;
      if (!mongoUri) {
        throw new Error('MONGODB_URI environment variable is required');
      }
      
      try {
        await mongoose.connect(mongoUri);
        this.connected = true;
        console.log('✅ MongoDB connected for advice sessions');
      } catch (error) {
        console.error('❌ MongoDB connection failed:', error);
        throw error;
      }
    }
  }

  /**
   * Get advice session by ID
   * @param {string} id - Session ID (client ID)
   * @returns {Promise<Object|null>} Advice session or null if not found
   */
  async get(id) {
    try {
      await this.ensureConnection();
      
      const doc = await AdviceSession.findOne({ id });
      return doc ? doc.session : null;
    } catch (error) {
      console.error('Error getting advice session:', error);
      throw error;
    }
  }

  /**
   * Upsert (insert or update) advice session
   * @param {string} id - Session ID (client ID)
   * @param {Object} session - Advice session data
   * @returns {Promise<Object>} The stored session
   */
  async upsert(id, session) {
    try {
      await this.ensureConnection();

      // Add/update timestamp
      session.meta = session.meta || {};
      session.meta.updatedAt = new Date();

      const doc = await AdviceSession.findOneAndUpdate(
        { id },
        { 
          id, 
          session,
          updatedAt: new Date()
        },
        { 
          upsert: true, 
          new: true,
          setDefaultsOnInsert: true
        }
      );

      return doc.session;
    } catch (error) {
      console.error('Error upserting advice session:', error);
      throw error;
    }
  }

  /**
   * Delete advice session by ID
   * @param {string} id - Session ID
   * @returns {Promise<boolean>} True if deleted, false if not found
   */
  async remove(id) {
    try {
      await this.ensureConnection();
      
      const result = await AdviceSession.deleteOne({ id });
      return result.deletedCount > 0;
    } catch (error) {
      console.error('Error removing advice session:', error);
      throw error;
    }
  }

  /**
   * Get all advice session IDs
   * @returns {Promise<string[]>} Array of session IDs
   */
  async getAllIds() {
    try {
      await this.ensureConnection();
      
      const docs = await AdviceSession.find({}, 'id').sort({ updatedAt: -1 });
      return docs.map(doc => doc.id);
    } catch (error) {
      console.error('Error getting all session IDs:', error);
      throw error;
    }
  }

  /**
   * Get all advice sessions
   * @returns {Promise<Object[]>} Array of all sessions
   */
  async getAll() {
    try {
      await this.ensureConnection();
      
      const docs = await AdviceSession.find({}).sort({ updatedAt: -1 });
      return docs.map(doc => doc.session);
    } catch (error) {
      console.error('Error getting all sessions:', error);
      throw error;
    }
  }

  /**
   * Clear all advice sessions (for testing)
   */
  async clear() {
    try {
      await this.ensureConnection();
      
      await AdviceSession.deleteMany({});
      console.log('✅ All advice sessions cleared');
    } catch (error) {
      console.error('Error clearing sessions:', error);
      throw error;
    }
  }

  /**
   * Get session count
   * @returns {Promise<number>} Number of sessions
   */
  async count() {
    try {
      await this.ensureConnection();
      
      return await AdviceSession.countDocuments();
    } catch (error) {
      console.error('Error counting sessions:', error);
      throw error;
    }
  }

  /**
   * Get sessions by date range
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Object[]>} Array of sessions in date range
   */
  async getByDateRange(startDate, endDate) {
    try {
      await this.ensureConnection();
      
      const docs = await AdviceSession.find({
        updatedAt: {
          $gte: startDate,
          $lte: endDate
        }
      }).sort({ updatedAt: -1 });
      
      return docs.map(doc => doc.session);
    } catch (error) {
      console.error('Error getting sessions by date range:', error);
      throw error;
    }
  }

  /**
   * Close MongoDB connection
   */
  async close() {
    try {
      if (mongoose.connection.readyState === 1) {
        await mongoose.connection.close();
        this.connected = false;
        console.log('✅ MongoDB connection closed');
      }
    } catch (error) {
      console.error('Error closing MongoDB connection:', error);
      throw error;
    }
  }
}

// Create singleton instance
const mongoRepository = new MongoAdviceRepository();

module.exports = {
  mongoRepository,
  AdviceSession
};
