const express = require('express');
const { body, validationResult } = require('express-validator');
const { pinAuthManager, checkLockout } = require('../middleware/pinAuth');

const router = express.Router();

// Get master PIN hash from environment (in production, this would be in database)
const getMasterPinHash = () => {
    const masterPin = process.env.MASTER_PIN;
    if (!masterPin) {
        throw new Error('MASTER_PIN not configured in environment');
    }
    
    // In production, store the hash, not the plain PIN
    // For development, we hash it on the fly
    return pinAuthManager.hashPin(masterPin);
};

// POST /api/auth/verify-pin
// Verify PIN and create authenticated session
router.post('/verify-pin', 
    checkLockout,
    [
        body('pin')
            .isLength({ min: 4, max: 12 })
            .matches(/^\d+$/)
            .withMessage('PIN must be 4-12 digits'),
        body('challengeToken')
            .isLength({ min: 64, max: 64 })
            .isHexadecimal()
            .withMessage('Invalid challenge token format'),
        body('hmac')
            .isLength({ min: 64, max: 64 })
            .isHexadecimal()
            .withMessage('Invalid HMAC format')
    ],
    async (req, res) => {
        try {
            // Validate input
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    error: 'VALIDATION_ERROR',
                    details: errors.array()
                });
            }

            const { pin, challengeToken, hmac } = req.body;
            const ip = req.ip || req.connection.remoteAddress;
            const userAgent = req.get('User-Agent');

            // Validate challenge token (from previous session)
            // Note: This would integrate with your existing challenge token system
            // For now, we'll assume it's validated by earlier middleware

            // Validate HMAC (from previous session)
            // Note: This would integrate with your existing HMAC validation
            // For now, we'll assume it's validated by earlier middleware

            // Get master PIN hash
            let masterPinHash;
            try {
                masterPinHash = getMasterPinHash();
            } catch (error) {
                console.error('❌ Master PIN configuration error:', error.message);
                return res.status(500).json({
                    success: false,
                    error: 'SERVER_CONFIG_ERROR',
                    message: 'Server configuration error'
                });
            }

            // Verify PIN
            const pinValid = pinAuthManager.verifyPin(pin, masterPinHash);
            
            if (!pinValid) {
                // Record failed attempt
                pinAuthManager.recordFailedAttempt(ip, pin, userAgent);
                
                // Check if this attempt caused a lockout
                const isNowLockedOut = pinAuthManager.isLockedOut(ip);
                
                if (isNowLockedOut) {
                    const lockoutTime = pinAuthManager.getLockoutTimeRemaining(ip);
                    return res.status(429).json({
                        success: false,
                        error: 'IP_LOCKED_OUT',
                        message: 'Too many failed attempts - account locked',
                        lockoutRemaining: lockoutTime
                    });
                }
                
                return res.status(401).json({
                    success: false,
                    error: 'INVALID_PIN',
                    message: 'Invalid PIN'
                });
            }

            // PIN is valid - create session
            const sessionId = pinAuthManager.createSession(ip);
            
            res.json({
                success: true,
                message: 'PIN verified successfully',
                sessionId,
                expiresIn: 30 * 60, // 30 minutes in seconds
                timestamp: Date.now()
            });

        } catch (error) {
            console.error('❌ PIN verification error:', error);
            res.status(500).json({
                success: false,
                error: 'SERVER_ERROR',
                message: 'Internal server error'
            });
        }
    }
);

// POST /api/auth/logout
// Invalidate current session
router.post('/logout', (req, res) => {
    const sessionId = req.headers['x-session-id'];
    
    if (sessionId) {
        pinAuthManager.invalidateSession(sessionId);
    }
    
    res.json({
        success: true,
        message: 'Logged out successfully'
    });
});

// GET /api/auth/session-status
// Check current session status
router.get('/session-status', (req, res) => {
    const sessionId = req.headers['x-session-id'];
    const ip = req.ip || req.connection.remoteAddress;
    
    if (!sessionId) {
        return res.json({
            success: true,
            authenticated: false,
            message: 'No session'
        });
    }
    
    const valid = pinAuthManager.validateSession(sessionId, ip);
    
    res.json({
        success: true,
        authenticated: valid,
        message: valid ? 'Session valid' : 'Session expired'
    });
});

// GET /api/auth/lockout-status
// Check if current IP is locked out
router.get('/lockout-status', (req, res) => {
    const ip = req.ip || req.connection.remoteAddress;
    const isLockedOut = pinAuthManager.isLockedOut(ip);
    
    let lockoutRemaining = 0;
    if (isLockedOut) {
        lockoutRemaining = pinAuthManager.getLockoutTimeRemaining(ip);
    }
    
    res.json({
        success: true,
        lockedOut: isLockedOut,
        lockoutRemaining,
        retryAfter: Math.ceil(lockoutRemaining / 60) // minutes
    });
});

// GET /api/auth/stats (development only)
// Get authentication statistics
router.get('/stats', (req, res) => {
    if (process.env.NODE_ENV === 'production') {
        return res.status(404).json({
            success: false,
            error: 'NOT_FOUND',
            message: 'Endpoint not available in production'
        });
    }
    
    const sessionStats = pinAuthManager.getSessionStats();
    const failedStats = pinAuthManager.getFailedAttemptsStats();
    
    res.json({
        success: true,
        stats: {
            sessions: sessionStats,
            failedAttempts: failedStats,
            uptime: process.uptime(),
            timestamp: Date.now()
        }
    });
});

module.exports = router;