/**
 * Environment Configuration
 * Centralized environment variable management
 */

function getEnv() {
  return {
    PORT: process.env.PORT || 5000,
    PDF_ENABLED: process.env.PDF_ENABLED === 'true' || false,
    ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS 
      ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
      : [
          'https://jbf2-frontend.vercel.app',
          'https://www.myjbfinanz.ch',
          'https://myjbfinanz.ch',
          'http://localhost:3000'
        ]
  };
}

module.exports = { getEnv };

