// backend/middleware/security.js
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');

// In-memory storage for failed attempts and tokens (production should use Redis)
const failedAttempts = new Map(); // IP -> { count, lastAttempt, lockedUntil }
const challengeTokens = new Map(); // token -> { ip, createdAt, expiresAt }

/**
 * Advanced Rate Limiting with IP Tracking
 */
const createAdvancedRateLimiter = (options = {}) => {
  const {
    windowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
    max = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    message = 'Too many requests from this IP',
    skipSuccessfulRequests = false,
    skipFailedRequests = false,
    keyGenerator = (req) => req.ip,
  } = options;

  return rateLimit({
    windowMs,
    max,
    message: {
      error: message,
      retryAfter: Math.ceil(windowMs / 1000 / 60),
      timestamp: new Date().toISOString()
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests,
    skipFailedRequests,
    keyGenerator,
    handler: (req, res) => {
      const clientIP = req.ip;
      console.log(`⚠️  Rate limit exceeded for IP: ${clientIP} at ${new Date().toISOString()}`);
      
      res.status(429).json({
        error: message,
        retryAfter: Math.ceil(windowMs / 1000 / 60),
        timestamp: new Date().toISOString(),
        ip: process.env.NODE_ENV === 'development' ? clientIP : undefined
      });
    }
  });
};

/**
 * Failed Attempt Tracking Middleware
 */
const trackFailedAttempts = (req, res, next) => {
  const clientIP = req.ip;
  const now = Date.now();
  
  // Check if IP is currently locked out
  const attempt = failedAttempts.get(clientIP);
  if (attempt && attempt.lockedUntil && now < attempt.lockedUntil) {
    const remainingTime = Math.ceil((attempt.lockedUntil - now) / 1000 / 60);
    return res.status(429).json({
      error: 'IP temporarily locked due to too many failed attempts',
      lockedUntil: new Date(attempt.lockedUntil).toISOString(),
      remainingMinutes: remainingTime,
      timestamp: new Date().toISOString()
    });
  }

  // Add method to increment failed attempts
  req.incrementFailedAttempt = () => {
    const maxAttempts = parseInt(process.env.MAX_FAILED_ATTEMPTS) || 5;
    const lockoutDuration = parseInt(process.env.LOCKOUT_DURATION) || 24 * 60 * 60 * 1000; // 24 hours
    
    const current = failedAttempts.get(clientIP) || { count: 0, lastAttempt: 0, lockedUntil: null };
    
    // Reset count if last attempt was more than 1 hour ago
    if (now - current.lastAttempt > 60 * 60 * 1000) {
      current.count = 0;
    }
    
    current.count += 1;
    current.lastAttempt = now;
    
    if (current.count >= maxAttempts) {
      current.lockedUntil = now + lockoutDuration;
      console.log(`🔒 IP ${clientIP} locked out until ${new Date(current.lockedUntil).toISOString()}`);
    }
    
    failedAttempts.set(clientIP, current);
    
    console.log(`⚠️  Failed attempt ${current.count}/${maxAttempts} for IP: ${clientIP}`);
    return current;
  };

  // Add method to clear failed attempts (on successful auth)
  req.clearFailedAttempts = () => {
    const attempt = failedAttempts.get(clientIP);
    if (attempt && attempt.lockedUntil && Date.now() < attempt.lockedUntil) {
      console.log(`⛔ Tidak bisa reset karena IP ${clientIP} masih terkunci`);
      return;
    }
    failedAttempts.delete(clientIP);
  };

  next();
};

/**
 * CSRF Token Middleware
 */
const csrfProtection = (req, res, next) => {
  // Skip CSRF for GET requests and health checks
  if (req.method === 'GET' || req.path === '/health') {
    return next();
  }

  const token = req.headers['x-csrf-token'];
  const sessionToken = req.headers['x-session-token'];

  if (!token || !sessionToken) {
    return res.status(403).json({
      error: 'CSRF token required',
      message: 'Missing x-csrf-token or x-session-token header',
      timestamp: new Date().toISOString()
    });
  }

  // Verify CSRF token format (should be base64 encoded 32 bytes)
  try {
    const decoded = Buffer.from(token, 'base64');
    if (decoded.length !== 32) {
      throw new Error('Invalid token length');
    }
  } catch (error) {
    return res.status(403).json({
      error: 'Invalid CSRF token format',
      timestamp: new Date().toISOString()
    });
  }

  // In a real application, you would verify the token against session storage
  // For this implementation, we'll accept any properly formatted token
  req.csrfToken = token;
  next();
};

/**
 * Generate CSRF Token
 */
const generateCSRFToken = () => {
  return crypto.randomBytes(32).toString('base64');
};

/**
 * Security Headers Enhancement
 */
const enhancedSecurityHeaders = (req, res, next) => {
  // Additional security headers beyond helmet
  res.setHeader('X-Request-ID', crypto.randomBytes(16).toString('hex'));
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  
  // Remove server information
  res.removeHeader('X-Powered-By');
  
  next();
};

/**
 * Request Logging Middleware (Security-focused)
 */
const securityLogger = (req, res, next) => {
  const startTime = Date.now();
  const clientIP = req.ip;
  const userAgent = req.get('User-Agent') || 'Unknown';
  const requestId = res.getHeader('X-Request-ID');

  // Enhanced suspicious patterns
  const suspiciousPatterns = [
    /\.\./,  // Directory traversal
    /<script/i,  // XSS attempts
    /<iframe/i,  // XSS iframe injection
    /javascript:/i,  // XSS javascript protocol
    /on\w+\s*=/i,  // Event handler XSS (onclick=, onload=, etc.)
    /union.*select/i,  // SQL injection
    /'.*or.*1.*=.*1/i,  // SQL injection
    /exec\s*\(/i,  // Command injection
    /eval\s*\(/i,  // Code injection
    /\bselect\b.*\bfrom\b/i,  // SQL SELECT statements
    /\binsert\b.*\binto\b/i,  // SQL INSERT statements
    /\bupdate\b.*\bset\b/i,  // SQL UPDATE statements
    /\bdelete\b.*\bfrom\b/i,  // SQL DELETE statements
    /\bdrop\b.*\btable\b/i,  // SQL DROP statements
    /(\/etc\/passwd|\/etc\/shadow)/i,  // Linux system file access
    /(cmd\.exe|powershell)/i,  // Windows command execution
    /\b(wget|curl)\b.*http/i,  // Remote file download attempts
  ];

  // Check multiple sources for suspicious content
  const checkSources = [
    req.url,  // Original URL
    decodeURIComponent(req.url),  // URL decoded
    JSON.stringify(req.query),  // Query parameters
    JSON.stringify(req.params),  // Route parameters
    req.method !== 'GET' ? JSON.stringify(req.body) : '{}',  // Request body
    req.get('Referer') || '',  // Referer header
    req.get('X-Forwarded-For') || '',  // Forwarded headers
  ].filter(source => source && source.length > 0);

  // Check for suspicious patterns in any source
  const suspiciousFindings = [];
  
  checkSources.forEach((source, index) => {
    suspiciousPatterns.forEach(pattern => {
      if (pattern.test(source)) {
        const sourceNames = ['URL', 'Decoded URL', 'Query', 'Params', 'Body', 'Referer', 'X-Forwarded-For'];
        suspiciousFindings.push({
          source: sourceNames[index] || 'Unknown',
          pattern: pattern.toString(),
          content: source.substring(0, 100) // Limit content length for logging
        });
      }
    });
  });

  // Log suspicious activity with details
  if (suspiciousFindings.length > 0) {
    console.log(`🚨 SUSPICIOUS REQUEST detected:`, {
      timestamp: new Date().toISOString(),
      requestId,
      ip: clientIP,
      method: req.method,
      url: req.url,
      userAgent: userAgent.substring(0, 200),
      findings: suspiciousFindings,
      severity: suspiciousFindings.length > 2 ? 'HIGH' : 'MEDIUM'
    });

    // Log to security audit file in production (if configured)
    if (process.env.SECURITY_AUDIT_LOG && process.env.NODE_ENV === 'production') {
      // In production, you would log to a security audit file
      // For now, we'll just add a marker for security monitoring
      console.log(`🔐 SECURITY_AUDIT: ${clientIP} - ${req.method} ${req.url} - ${suspiciousFindings.length} violations`);
    }
  }

  // Log all requests in development, only important ones in production
  if (process.env.NODE_ENV === 'development') {
    const emoji = suspiciousFindings.length > 0 ? '🚨' : '📡';
    console.log(`${emoji} ${req.method} ${req.url} - IP: ${clientIP} - ID: ${requestId}`);
  }

  // Capture response details
  const originalSend = res.send;
  res.send = function(data) {
    const duration = Date.now() - startTime;
    
    // Log slow requests, errors, or suspicious activity responses
    if (duration > 1000 || res.statusCode >= 400 || suspiciousFindings.length > 0) {
      const emoji = res.statusCode >= 400 ? '❌' : suspiciousFindings.length > 0 ? '🔍' : '⏱️';
      console.log(`${emoji} ${req.method} ${req.url}`, {
        status: res.statusCode,
        duration: `${duration}ms`,
        ip: clientIP,
        requestId,
        ...(suspiciousFindings.length > 0 && { suspiciousActivity: true, findings: suspiciousFindings.length })
      });
    }
    
    originalSend.call(this, data);
  };

  next();
};

/**
 * Challenge Token System
 */
class ChallengeTokenManager {
  constructor() {
    this.tokens = challengeTokens;
    this.cleanup();
  }

  /**
   * Generate a new challenge token
   */
  generateToken(req) {
    const token = crypto.randomBytes(32).toString('hex');
    const clientIP = req.ip;
    const expiryTime = parseInt(process.env.CHALLENGE_TOKEN_EXPIRY) || 5 * 60 * 1000; // 5 minutes
    
    const tokenData = {
      ip: clientIP,
      createdAt: Date.now(),
      expiresAt: Date.now() + expiryTime,
      used: false
    };

    this.tokens.set(token, tokenData);
    
    console.log(`🎫 Generated challenge token for IP: ${clientIP}`);
    
    return {
      token,
      expiresAt: tokenData.expiresAt,
      expiresIn: expiryTime / 1000 // seconds
    };
  }

  /**
   * Validate and consume a challenge token
   */
  validateToken(token, req) {
    const tokenData = this.tokens.get(token);
    const clientIP = req.ip;
    
    if (!tokenData) {
      console.log(`❌ Invalid challenge token attempted from IP: ${clientIP}`);
      return { valid: false, reason: 'Token not found' };
    }

    if (tokenData.used) {
      console.log(`❌ Used challenge token attempted from IP: ${clientIP}`);
      return { valid: false, reason: 'Token already used' };
    }

    if (Date.now() > tokenData.expiresAt) {
      this.tokens.delete(token);
      console.log(`❌ Expired challenge token attempted from IP: ${clientIP}`);
      return { valid: false, reason: 'Token expired' };
    }

    if (tokenData.ip !== clientIP) {
      console.log(`❌ Challenge token IP mismatch. Token IP: ${tokenData.ip}, Request IP: ${clientIP}`);
      return { valid: false, reason: 'IP mismatch' };
    }

    // Mark token as used
    tokenData.used = true;
    this.tokens.set(token, tokenData);
    
    console.log(`✅ Valid challenge token consumed for IP: ${clientIP}`);
    return { valid: true, tokenData };
  }

  /**
   * Clean up expired tokens
   */
  cleanup() {
    setInterval(() => {
      const now = Date.now();
      let cleanedCount = 0;
      
      for (const [token, data] of this.tokens.entries()) {
        if (now > data.expiresAt) {
          this.tokens.delete(token);
          cleanedCount++;
        }
      }
      
      if (cleanedCount > 0) {
        console.log(`🧹 Cleaned up ${cleanedCount} expired challenge tokens`);
      }
    }, 60 * 1000); // Clean every minute
  }

  /**
   * Get token statistics
   */
  getStats() {
    const now = Date.now();
    const active = Array.from(this.tokens.values()).filter(t => 
      !t.used && now <= t.expiresAt
    ).length;
    
    return {
      total: this.tokens.size,
      active,
      expired: this.tokens.size - active
    };
  }
}

// Create singleton instance
const challengeTokenManager = new ChallengeTokenManager();

/**
 * Challenge Token Validation Middleware
 */
const validateChallengeToken = (req, res, next) => {
  const token = req.headers['x-challenge-token'];
  
  if (!token) {
    return res.status(400).json({
      error: 'Challenge token required',
      message: 'Missing x-challenge-token header',
      timestamp: new Date().toISOString()
    });
  }

  const validation = challengeTokenManager.validateToken(token, req);
  
  if (!validation.valid) {
    req.incrementFailedAttempt();
    return res.status(401).json({
      error: 'Invalid challenge token',
      reason: validation.reason,
      timestamp: new Date().toISOString()
    });
  }

  req.challengeToken = validation.tokenData;
  next();
};

module.exports = {
  createAdvancedRateLimiter,
  trackFailedAttempts,
  csrfProtection,
  generateCSRFToken,
  enhancedSecurityHeaders,
  securityLogger,
  challengeTokenManager,
  validateChallengeToken
};