const express = require('express');
const { hmacManager } = require('../middleware/hmacAuth');
const router = express.Router();

/**
 * GET /api/hmac/stats - Get HMAC verification statistics (development only)
 */
router.get('/stats', (req, res) => {
    if (process.env.NODE_ENV === 'production') {
        return res.status(404).json({ error: 'Not found' });
    }

    const stats = hmacManager.getStats();
    res.json({
        success: true,
        data: {
            hmacStats: stats,
            serverTime: Date.now(),
            windowSize: process.env.HMAC_WINDOW || 300000
        }
    });
});

/**
 * POST /api/hmac/test - Test HMAC generation and verification (development only)
 */
router.post('/test', (req, res) => {
    if (process.env.NODE_ENV === 'production') {
        return res.status(404).json({ error: 'Not found' });
    }

    try {
        const { data, challengeToken, timestamp } = req.body;

        if (!data || !challengeToken || !timestamp) {
            return res.status(400).json({
                error: 'Missing required parameters: data, challengeToken, timestamp'
            });
        }

        const hmac = hmacManager.generateHMAC(data, challengeToken, timestamp);
        const isValid = hmacManager.verifyHMAC(hmac, data, challengeToken, timestamp);

        res.json({
            success: true,
            data: {
                originalData: data,
                challengeToken,
                timestamp,
                generatedHMAC: hmac,
                verificationResult: isValid,
                timestampValid: hmacManager.isTimestampValid(timestamp),
                serverTime: Date.now()
            }
        });
    } catch (error) {
        res.status(500).json({
            error: 'HMAC test failed',
            message: error.message
        });
    }
});

module.exports = router;