/**
 * Main API Routes
 * Central routing for all API endpoints
 */

const express = require('express');
const router = express.Router();

// Health check endpoint
router.get('/ping', (req, res) => {
  res.json({ ok: true });
});

// Advice session routes
router.use('/advice', require('./adviceRoutes'));

// PDF summary routes
router.use('/advice', require('./summaryPdfRoute'));

module.exports = router;
