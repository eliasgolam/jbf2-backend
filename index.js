/**
 * Main Entry Point
 * Express server with CORS and API routing
 */

const express = require('express');
const cors = require('cors');
const { getEnv } = require('./src/config/env');

const app = express();
const env = getEnv();

// Middleware
app.use(express.json());

// CORS configuration with whitelist
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    
    if (env.ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

// API Routes
app.use('/api', require('./src/routes'));

// Health check
app.get('/', (req, res) => {
  res.json({ 
    message: 'JB Finanz Backend API',
    status: 'running',
    pdfEnabled: env.PDF_ENABLED
  });
});

// Start server
app.listen(env.PORT, () => {
  console.log(`✅ Server running on port ${env.PORT}`);
  console.log(`📄 PDF generation: ${env.PDF_ENABLED ? 'enabled' : 'disabled'}`);
});

