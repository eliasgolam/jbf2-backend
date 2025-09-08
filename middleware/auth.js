/**
 * Authentication Middleware
 * Optional authentication for protected routes
 */

/**
 * Simple token-based authentication middleware
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
function authenticateToken(req, res, next) {
  try {
    // Check if authentication is enabled
    if (process.env.AUTH_ENABLED !== 'true') {
      return next(); // Skip authentication if disabled
    }

    // Get token from Authorization header
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ 
        message: 'Access token required',
        code: 'MISSING_TOKEN'
      });
    }

    // Simple token validation (replace with JWT verification in production)
    const validTokens = process.env.VALID_TOKENS ? 
      process.env.VALID_TOKENS.split(',').map(t => t.trim()) : 
      ['default-token'];

    if (!validTokens.includes(token)) {
      return res.status(403).json({ 
        message: 'Invalid access token',
        code: 'INVALID_TOKEN'
      });
    }

    // Add user info to request (if needed)
    req.user = {
      id: 'authenticated-user',
      token: token
    };

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ 
      message: 'Authentication error',
      code: 'AUTH_ERROR'
    });
  }
}

/**
 * Optional authentication middleware for advice routes
 * Only applies if AUTH_ENABLED=true
 */
function optionalAuth(req, res, next) {
  // Skip authentication if not enabled
  if (process.env.AUTH_ENABLED !== 'true') {
    return next();
  }

  return authenticateToken(req, res, next);
}

/**
 * Rate limiting middleware (basic implementation)
 */
const rateLimitMap = new Map();

function rateLimit(req, res, next) {
  try {
    const clientId = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    const windowMs = 15 * 60 * 1000; // 15 minutes
    const maxRequests = 100; // Max requests per window

    if (!rateLimitMap.has(clientId)) {
      rateLimitMap.set(clientId, { count: 1, resetTime: now + windowMs });
      return next();
    }

    const clientData = rateLimitMap.get(clientId);

    if (now > clientData.resetTime) {
      // Reset window
      rateLimitMap.set(clientId, { count: 1, resetTime: now + windowMs });
      return next();
    }

    if (clientData.count >= maxRequests) {
      return res.status(429).json({
        message: 'Too many requests',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: Math.ceil((clientData.resetTime - now) / 1000)
      });
    }

    clientData.count++;
    next();
  } catch (error) {
    console.error('Rate limit error:', error);
    next(); // Continue on error
  }
}

/**
 * Input validation middleware
 */
function validateInput(req, res, next) {
  try {
    // Basic input sanitization
    if (req.body && typeof req.body === 'object') {
      sanitizeObject(req.body);
    }

    // Check for suspicious patterns
    const suspiciousPatterns = [
      /<script/i,
      /javascript:/i,
      /on\w+\s*=/i,
      /eval\s*\(/i,
      /expression\s*\(/i
    ];

    const bodyString = JSON.stringify(req.body || {});
    for (const pattern of suspiciousPatterns) {
      if (pattern.test(bodyString)) {
        return res.status(400).json({
          message: 'Invalid input detected',
          code: 'INVALID_INPUT'
        });
      }
    }

    next();
  } catch (error) {
    console.error('Input validation error:', error);
    res.status(400).json({
      message: 'Input validation failed',
      code: 'VALIDATION_ERROR'
    });
  }
}

/**
 * Recursively sanitize object properties
 */
function sanitizeObject(obj) {
  for (const key in obj) {
    if (typeof obj[key] === 'string') {
      // Basic XSS prevention
      obj[key] = obj[key]
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;');
    } else if (typeof obj[key] === 'object' && obj[key] !== null) {
      sanitizeObject(obj[key]);
    }
  }
}

module.exports = {
  authenticateToken,
  optionalAuth,
  rateLimit,
  validateInput
};
