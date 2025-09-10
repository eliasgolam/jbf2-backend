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
const summaryPdfRoute = require('./summaryPdfRoute');
router.use('/advice', summaryPdfRoute.router);

module.exports = router;
