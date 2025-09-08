/**
 * Advice Session Routes
 * Handles CRUD operations for advice sessions
 */

const express = require('express');
const router = express.Router();
const { getRepository } = require('../config/database');
const { createAdviceSession } = require('../domain/adviceSession');
const { optionalAuth, rateLimit, validateInput } = require('../../middleware/auth');
const { logSecurityEvent } = require('../../middleware/logging');

/**
 * PUT /api/advice/:id
 * Create or update advice session
 */
router.put('/:id', rateLimit, validateInput, optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const sessionData = req.body;

    // Rudimentary validation
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ 
        message: 'Invalid session ID' 
      });
    }

    if (!sessionData || typeof sessionData !== 'object') {
      return res.status(400).json({ 
        message: 'Invalid session data' 
      });
    }

    // Ensure required meta fields exist
    if (!sessionData.meta) {
      sessionData.meta = {};
    }

    if (!sessionData.meta.clientId) {
      sessionData.meta.clientId = id;
    }

    if (!sessionData.meta.clientName) {
      sessionData.meta.clientName = 'Unknown Client';
    }

    if (!sessionData.meta.consultantName) {
      sessionData.meta.consultantName = 'Unknown Consultant';
    }

    // Upsert session
    const adviceRepository = getRepository();
    const session = await adviceRepository.upsert(id, sessionData);

    res.status(204).send();
  } catch (error) {
    console.error('Error updating advice session:', error);
    res.status(500).json({ 
      message: 'Internal server error' 
    });
  }
});

/**
 * GET /api/advice/:id
 * Get advice session by ID
 */
router.get('/:id', rateLimit, optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ 
        message: 'Invalid session ID' 
      });
    }

    const adviceRepository = getRepository();
    const session = await adviceRepository.get(id);

    if (!session) {
      return res.status(404).json({ 
        message: 'not found' 
      });
    }

    res.status(200).json(session);
  } catch (error) {
    console.error('Error getting advice session:', error);
    res.status(500).json({ 
      message: 'Internal server error' 
    });
  }
});

/**
 * POST /api/advice/:id/initialize
 * Initialize a new advice session for a client
 */
router.post('/:id/initialize', rateLimit, validateInput, optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { clientName, consultantName } = req.body;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ 
        message: 'Invalid session ID' 
      });
    }

    // Check if session already exists
    const adviceRepository = getRepository();
    const existingSession = await adviceRepository.get(id);
    if (existingSession) {
      return res.status(409).json({ 
        message: 'Session already exists' 
      });
    }

    // Create new session
    const newSession = createAdviceSession(
      id,
      clientName || 'Unknown Client',
      consultantName || 'Unknown Consultant'
    );

    await adviceRepository.upsert(id, newSession);

    res.status(201).json(newSession);
  } catch (error) {
    console.error('Error initializing advice session:', error);
    res.status(500).json({ 
      message: 'Internal server error' 
    });
  }
});

module.exports = router;

