const crypto = require('crypto');

class HMACManager {
    constructor() {
        this.serverSecret = process.env.SERVER_SECRET || 'default-secret-key-change-in-production';
        this.hmacAlgorithm = 'sha256';
        this.requestWindow = parseInt(process.env.HMAC_WINDOW) || 300000; // 5 minutes default
        this.statistics = {
            totalRequests: 0,
            validHMACs: 0,
            invalidHMACs: 0,
            expiredRequests: 0,
            malformedRequests: 0
        };
    }

    /**
     * Generate HMAC for given data
     * @param {string} data - Data to be hashed
     * @param {string} challengeToken - Challenge token from client
     * @param {number} timestamp - Request timestamp
     * @returns {string} HMAC signature
     */
    generateHMAC(data, challengeToken, timestamp) {
        const message = `${data}|${challengeToken}|${timestamp}`;
        return crypto
            .createHmac(this.hmacAlgorithm, this.serverSecret)
            .update(message)
            .digest('hex');
    }

    /**
     * Verify HMAC signature
     * @param {string} signature - Client provided HMAC
     * @param {string} data - Request data
     * @param {string} challengeToken - Challenge token
     * @param {number} timestamp - Request timestamp
     * @returns {boolean} Verification result
     */
    verifyHMAC(signature, data, challengeToken, timestamp) {
        try {
            // Generate expected HMAC
            const expectedHMAC = this.generateHMAC(data, challengeToken, timestamp);
            
            // Use constant-time comparison to prevent timing attacks
            return crypto.timingSafeEqual(
                Buffer.from(signature, 'hex'),
                Buffer.from(expectedHMAC, 'hex')
            );
        } catch (error) {
            console.error('HMAC verification error:', error.message);
            return false;
        }
    }

    /**
     * Check if timestamp is within acceptable window
     * @param {number} timestamp - Request timestamp
     * @returns {boolean} Whether timestamp is valid
     */
    isTimestampValid(timestamp) {
        const now = Date.now();
        const diff = Math.abs(now - timestamp);
        return diff <= this.requestWindow;
    }

    /**
     * Update statistics
     * @param {string} result - Result type (valid, invalid, expired, malformed)
     */
    updateStats(result) {
        this.statistics.totalRequests++;
        this.statistics[result]++;
    }

    /**
     * Get current statistics
     * @returns {object} Statistics object
     */
    getStats() {
        return {
            ...this.statistics,
            successRate: this.statistics.totalRequests > 0 
                ? (this.statistics.validHMACs / this.statistics.totalRequests * 100).toFixed(2) + '%'
                : '0%'
        };
    }
}

// Singleton instance
const hmacManager = new HMACManager();

/**
 * Middleware to verify HMAC signatures on protected routes
 */
function verifyHMAC(req, res, next) {
    try {
        // Extract HMAC components from request
        const signature = req.headers['x-hmac-signature'];
        const timestamp = parseInt(req.headers['x-timestamp']);
        const challengeToken = req.headers['x-challenge-token'];

        // Validate required headers
        if (!signature) {
            hmacManager.updateStats('malformedRequests');
            return res.status(400).json({
                error: 'Missing HMAC signature',
                code: 'HMAC_MISSING'
            });
        }

        if (!timestamp || isNaN(timestamp)) {
            hmacManager.updateStats('malformedRequests');
            return res.status(400).json({
                error: 'Invalid timestamp',
                code: 'TIMESTAMP_INVALID'
            });
        }

        if (!challengeToken) {
            hmacManager.updateStats('malformedRequests');
            return res.status(400).json({
                error: 'Missing challenge token',
                code: 'CHALLENGE_MISSING'
            });
        }

        // Check timestamp validity
        if (!hmacManager.isTimestampValid(timestamp)) {
            hmacManager.updateStats('expiredRequests');
            return res.status(400).json({
                error: 'Request timestamp outside acceptable window',
                code: 'TIMESTAMP_EXPIRED'
            });
        }

        // Prepare data for HMAC verification
        const requestData = req.method === 'GET' 
            ? req.originalUrl 
            : JSON.stringify(req.body || {});

        // Verify HMAC signature
        const isValid = hmacManager.verifyHMAC(
            signature,
            requestData,
            challengeToken,
            timestamp
        );

        if (!isValid) {
            hmacManager.updateStats('invalidHMACs');
            return res.status(401).json({
                error: 'Invalid HMAC signature',
                code: 'HMAC_INVALID'
            });
        }

        // HMAC is valid, store verification info in request
        req.hmacVerified = true;
        req.challengeToken = challengeToken;
        req.requestTimestamp = timestamp;
        
        hmacManager.updateStats('validHMACs');
        next();

    } catch (error) {
        console.error('HMAC middleware error:', error);
        hmacManager.updateStats('malformedRequests');
        res.status(500).json({
            error: 'HMAC verification failed',
            code: 'HMAC_ERROR'
        });
    }
}

/**
 * Middleware to optionally verify HMAC (for endpoints that can work with/without HMAC)
 */
function optionalHMAC(req, res, next) {
    const signature = req.headers['x-hmac-signature'];
    
    if (signature) {
        // If HMAC is provided, verify it
        verifyHMAC(req, res, next);
    } else {
        // If no HMAC, proceed without verification
        req.hmacVerified = false;
        next();
    }
}

module.exports = {
    HMACManager,
    hmacManager,
    verifyHMAC,
    optionalHMAC
};