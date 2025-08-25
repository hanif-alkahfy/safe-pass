// backend/routes/challenge.js
const express = require('express');
const { challengeTokenManager, generateCSRFToken, createAdvancedRateLimiter } = require('../middleware/security');

const router = express.Router();

// Rate limiter specifically for challenge endpoint - more restrictive
const challengeRateLimiter = createAdvancedRateLimiter({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 20, // 20 requests per 5 minutes per IP
  message: 'Too many challenge token requests',
  skipSuccessfulRequests: false
});

/**
 * GET /api/challenge
 * Generate a new challenge token for secure operations
 * 
 * Response format:
 * {
 *   "token": "hex-encoded-challenge-token",
 *   "csrf": "base64-csrf-token", 
 *   "expiresAt": "ISO-timestamp",
 *   "expiresIn": seconds,
 *   "stats": { "active": number, "total": number }
 * }
 */
router.get('/challenge', challengeRateLimiter, (req, res) => {
  try {
    // Generate challenge token
    const challengeResult = challengeTokenManager.generateToken(req);
    
    // Generate CSRF token
    const csrfToken = generateCSRFToken();
    
    // Get token statistics (development only)
    const stats = process.env.NODE_ENV === 'development' 
      ? challengeTokenManager.getStats() 
      : undefined;

    const response = {
      success: true,
      token: challengeResult.token,
      csrf: csrfToken,
      expiresAt: new Date(challengeResult.expiresAt).toISOString(),
      expiresIn: challengeResult.expiresIn,
      timestamp: new Date().toISOString(),
      ...(stats && { stats })
    };

    // Set security headers
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    res.status(200).json(response);
    
  } catch (error) {
    console.error('❌ Error generating challenge token:', error);
    
    res.status(500).json({
      error: 'Failed to generate challenge token',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/challenge/stats
 * Get challenge token statistics (development only)
 */
router.get('/challenge/stats', (req, res) => {
  if (process.env.NODE_ENV !== 'development') {
    return res.status(404).json({ error: 'Not found' });
  }

  try {
    const stats = challengeTokenManager.getStats();
    
    res.status(200).json({
      success: true,
      stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Error getting token stats:', error);
    
    res.status(500).json({
      error: 'Failed to get token statistics',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;