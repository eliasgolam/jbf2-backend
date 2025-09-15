/**
 * In-Memory Advice Session Repository
 * Stores advice sessions in memory using Map
 */

// In-memory storage for advice sessions
const adviceSessions = new Map();

/**
 * Get advice session by ID
 * @param {string} id - Session ID (client ID)
 * @returns {Object|null} Advice session or null if not found
 */
function get(id) {
  return adviceSessions.get(id) || null;
}

/**
 * Upsert (insert or update) advice session
 * @param {string} id - Session ID (client ID)
 * @param {Object} session - Advice session data
 * @returns {Object} The stored session
 */
function upsert(id, session) {
  // Add/update timestamp
  session.meta = session.meta || {};
  session.meta.updatedAt = new Date();
  
  // Store in memory
  adviceSessions.set(id, session);
  
  return session;
}

/**
 * Partial update of advice session
 * @param {string} sessionId - Session ID (client ID)
 * @param {Object} patch - Partial data to update
 * @returns {Object} The updated session
 */
function update(sessionId, patch) {
  // Get existing session or create new one
  let existingSession = adviceSessions.get(sessionId);
  
  if (!existingSession) {
    // Create new session with patch data
    const newSession = {
      ...patch,
      meta: {
        clientId: sessionId,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    };
    
    adviceSessions.set(sessionId, newSession);
    return newSession;
  }

  // Merge patch into existing session
  const updatedSession = {
    ...existingSession,
    ...patch,
    meta: {
      ...existingSession.meta,
      updatedAt: new Date()
    }
  };

  // Store updated session
  adviceSessions.set(sessionId, updatedSession);
  
  return updatedSession;
}

/**
 * Delete advice session by ID
 * @param {string} id - Session ID
 * @returns {boolean} True if deleted, false if not found
 */
function remove(id) {
  return adviceSessions.delete(id);
}

/**
 * Get all advice session IDs
 * @returns {string[]} Array of session IDs
 */
function getAllIds() {
  return Array.from(adviceSessions.keys());
}

/**
 * Get all advice sessions
 * @returns {Object[]} Array of all sessions
 */
function getAll() {
  return Array.from(adviceSessions.values());
}

/**
 * Clear all advice sessions (for testing)
 */
function clear() {
  adviceSessions.clear();
}

module.exports = {
  get,
  upsert,
  update,
  remove,
  getAllIds,
  getAll,
  clear
};

