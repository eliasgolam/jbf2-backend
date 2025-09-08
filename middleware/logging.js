/**
 * Secure Logging Middleware
 * Logs requests without PII and summarizes errors
 */

const fs = require('fs');
const path = require('path');

// Error tracking
const errorTracker = {
  errors: new Map(),
  lastReset: Date.now(),
  resetInterval: 24 * 60 * 60 * 1000 // 24 hours
};

/**
 * Sanitize data to remove PII
 */
function sanitizeData(data) {
  if (!data || typeof data !== 'object') return data;
  
  const sanitized = { ...data };
  const piiFields = [
    'password', 'token', 'secret', 'key', 'ssn', 'socialSecurityNumber',
    'creditCard', 'cardNumber', 'cvv', 'pin', 'clientName', 'clientId',
    'email', 'phone', 'address', 'personalData', 'privateData'
  ];

  function removePII(obj) {
    for (const key in obj) {
      if (piiFields.some(field => key.toLowerCase().includes(field))) {
        obj[key] = '[REDACTED]';
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        removePII(obj[key]);
      }
    }
  }

  removePII(sanitized);
  return sanitized;
}

/**
 * Generate request ID for tracking
 */
function generateRequestId() {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Format log entry
 */
function formatLogEntry(level, message, data = {}) {
  const timestamp = new Date().toISOString();
  const sanitizedData = sanitizeData(data);
  
  return {
    timestamp,
    level,
    message,
    data: sanitizedData,
    pid: process.pid,
    version: process.env.npm_package_version || '1.0.0'
  };
}

/**
 * Write log to file
 */
function writeLog(level, message, data = {}) {
  try {
    const logEntry = formatLogEntry(level, message, data);
    const logLine = JSON.stringify(logEntry) + '\n';
    
    // Ensure logs directory exists
    const logsDir = path.join(__dirname, '..', 'logs');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
    
    // Write to daily log file
    const today = new Date().toISOString().split('T')[0];
    const logFile = path.join(logsDir, `app-${today}.log`);
    
    fs.appendFileSync(logFile, logLine);
  } catch (error) {
    console.error('Failed to write log:', error);
  }
}

/**
 * Track and summarize errors
 */
function trackError(error, context = {}) {
  const errorKey = `${error.name}:${error.message}`;
  const now = Date.now();
  
  // Reset error tracking if interval passed
  if (now - errorTracker.lastReset > errorTracker.resetInterval) {
    errorTracker.errors.clear();
    errorTracker.lastReset = now;
  }
  
  if (!errorTracker.errors.has(errorKey)) {
    errorTracker.errors.set(errorKey, {
      count: 0,
      firstSeen: now,
      lastSeen: now,
      context: sanitizeData(context)
    });
  }
  
  const errorData = errorTracker.errors.get(errorKey);
  errorData.count++;
  errorData.lastSeen = now;
  
  // Log individual error
  writeLog('error', `Error: ${error.message}`, {
    error: {
      name: error.name,
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    },
    context: sanitizeData(context)
  });
  
  // Log error summary if count is significant
  if (errorData.count % 10 === 0) {
    writeLog('warn', `Error summary: ${errorKey}`, {
      errorKey,
      count: errorData.count,
      firstSeen: new Date(errorData.firstSeen).toISOString(),
      lastSeen: new Date(errorData.lastSeen).toISOString()
    });
  }
}

/**
 * Request logging middleware
 */
function requestLogger(req, res, next) {
  const requestId = generateRequestId();
  req.requestId = requestId;
  
  const startTime = Date.now();
  
  // Log request
  writeLog('info', 'Request received', {
    requestId,
    method: req.method,
    url: req.url,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    origin: req.get('Origin')
  });
  
  // Override res.json to log responses
  const originalJson = res.json;
  res.json = function(data) {
    const duration = Date.now() - startTime;
    
    writeLog('info', 'Response sent', {
      requestId,
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      responseSize: JSON.stringify(data).length
    });
    
    return originalJson.call(this, data);
  };
  
  next();
}

/**
 * Error logging middleware
 */
function errorLogger(error, req, res, next) {
  const context = {
    requestId: req.requestId,
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  };
  
  trackError(error, context);
  
  // Send generic error response
  res.status(500).json({
    message: 'Internal server error',
    requestId: req.requestId,
    code: 'INTERNAL_ERROR'
  });
}

/**
 * Security event logging
 */
function logSecurityEvent(event, details = {}) {
  writeLog('warn', `Security event: ${event}`, {
    event,
    details: sanitizeData(details),
    timestamp: new Date().toISOString()
  });
}

/**
 * Performance logging
 */
function logPerformance(operation, duration, details = {}) {
  writeLog('info', `Performance: ${operation}`, {
    operation,
    duration: `${duration}ms`,
    details: sanitizeData(details)
  });
}

/**
 * Get error summary
 */
function getErrorSummary() {
  const summary = {};
  for (const [errorKey, data] of errorTracker.errors.entries()) {
    summary[errorKey] = {
      count: data.count,
      firstSeen: new Date(data.firstSeen).toISOString(),
      lastSeen: new Date(data.lastSeen).toISOString()
    };
  }
  return summary;
}

module.exports = {
  requestLogger,
  errorLogger,
  logSecurityEvent,
  logPerformance,
  trackError,
  getErrorSummary,
  sanitizeData
};
