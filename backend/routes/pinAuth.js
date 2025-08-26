const express = require('express');
const { pinAuthManager } = require('../middleware/pinAuth');
const { challengeManager } = require('../middleware/security');
const { verifyHMAC } = require('../middleware/hmacAuth');
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

/**
 * POST /api/auth/verify-pin - Verify PIN with HMAC and challenge token
 * Requires: HMAC verification, valid challenge token, PIN
 */
router.post('/verify-pin', verifyHMAC, pinAuthManager.isLockedOut, async (req, res) => {
    try {
        const { hashedPin } = req.body;
        const clientIP = req.ip || req.connection.remoteAddress;
        const challengeToken = req.challengeToken; // From HMAC middleware

        // Validate challenge token (from HMAC-verified request)
        if (!challengeManager.validateToken(challengeToken, clientIP)) {
            return res.status(400).json({
                error: 'Invalid or expired challenge token',
                code: 'CHALLENGE_INVALID'
            });
        }

        // Input validation
        if (!hashedPin || typeof hashedPin !== 'string') {
            return res.status(400).json({
                error: 'Missing or invalid hashed PIN',
                code: 'PIN_INVALID'
            });
        }

        // Verify PIN
        const result = await pinAuthManager.verifyPin(hashedPin, clientIP);

        if (result.success) {
            // PIN is correct, create session
            const sessionId = pinAuthManager.createSession(clientIP);
            
            res.json({
                success: true,
                message: 'PIN verified successfully',
                data: {
                    sessionId,
                    expiresAt: Date.now() + pinAuthManager.sessionTimeout
                }
            });
        } else {
            // PIN is incorrect
            res.status(401).json({
                success: false,
                error: result.message,
                code: result.code,
                data: {
                    attemptsRemaining: result.attemptsRemaining,
                    lockoutTime: result.lockoutTime
                }
            });
        }

    } catch (error) {
        console.error('PIN verification error:', error);
        res.status(500).json({
            error: 'PIN verification failed',
            code: 'VERIFY_ERROR'
        });
    }
});

/**
 * POST /api/auth/logout - Logout with HMAC verification
 */
router.post('/logout', verifyHMAC, (req, res) => {
    try {
        const { sessionId } = req.body;
        const clientIP = req.ip || req.connection.remoteAddress;

        if (!sessionId) {
            return res.status(400).json({
                error: 'Missing session ID',
                code: 'SESSION_MISSING'
            });
        }

        const result = pinAuthManager.logout(sessionId, clientIP);
        
        res.json({
            success: true,
            message: result ? 'Logged out successfully' : 'Session already invalid'
        });

    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({
            error: 'Logout failed',
            code: 'LOGOUT_ERROR'
        });
    }
});

/**
 * GET /api/auth/session-status - Check session status (no HMAC required for read-only)
 */
router.get('/session-status', (req, res) => {
    try {
        const sessionId = req.headers['x-session-id'];
        const clientIP = req.ip || req.connection.remoteAddress;

        if (!sessionId) {
            return res.json({
                success: true,
                data: {
                    authenticated: false,
                    reason: 'No session ID provided'
                }
            });
        }

        const isValid = pinAuthManager.validateSession(sessionId, clientIP);
        
        res.json({
            success: true,
            data: {
                authenticated: isValid,
                sessionId: isValid ? sessionId : null,
                serverTime: Date.now()
            }
        });

    } catch (error) {
        console.error('Session status error:', error);
        res.status(500).json({
            error: 'Session status check failed',
            code: 'SESSION_ERROR'
        });
    }
});

// Keep existing routes (lockout-status, stats) as they were...
router.get('/lockout-status', (req, res) => {
    try {
        const clientIP = req.ip || req.connection.remoteAddress;
        const lockoutInfo = pinAuthManager.getLockoutStatus(clientIP);
        
        res.json({
            success: true,
            data: lockoutInfo
        });
    } catch (error) {
        res.status(500).json({
            error: 'Lockout status check failed',
            code: 'LOCKOUT_ERROR'
        });
    }
});

router.get('/stats', (req, res) => {
    if (process.env.NODE_ENV === 'production') {
        return res.status(404).json({ error: 'Not found' });
    }

    const stats = pinAuthManager.getStats();
    res.json({
        success: true,
        data: stats
    });
});

module.exports = router;