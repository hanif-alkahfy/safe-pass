const bcrypt = require('bcryptjs');
const crypto = require('crypto');

class PinAuthManager {
    constructor() {
        this.failedAttempts = new Map(); // IP -> { count, lockoutUntil, attempts: [] }
        this.activeSessions = new Map(); // sessionId -> { ip, createdAt, lastActivity }
        
        // Configuration
        this.MAX_ATTEMPTS = parseInt(process.env.MAX_PIN_ATTEMPTS) || 5;
        this.LOCKOUT_DURATION = parseInt(process.env.PIN_LOCKOUT_DURATION) || 24 * 60 * 60 * 1000; // 24 hours
        this.SESSION_TIMEOUT = parseInt(process.env.SESSION_TIMEOUT) || 30 * 60 * 1000; // 30 minutes
        
        // Cleanup intervals
        this.startCleanupScheduler();
        
        console.log('🔐 PinAuthManager initialized:', {
            maxAttempts: this.MAX_ATTEMPTS,
            lockoutHours: this.LOCKOUT_DURATION / (60 * 60 * 1000),
            sessionTimeoutMinutes: this.SESSION_TIMEOUT / (60 * 1000)
        });
    }

    // Hash the PIN using bcrypt
    hashPin(pin) {
        const saltRounds = 12;
        return bcrypt.hashSync(pin.toString(), saltRounds);
    }

    // Verify hashed PIN (HMAC-SHA256)
    verifyHashedPin(hashedPinFromClient) {
        const expectedHash = crypto
            .createHmac('sha256', process.env.SERVER_SECRET)
            .update(process.env.MASTER_PIN.toString())
            .digest('hex');

        return expectedHash === hashedPinFromClient;
    }

    // Check if IP is locked out
    getLockoutStatus(ip) {
        const attempts = this.failedAttempts.get(ip);
        if (!attempts) return false;
        
        if (attempts.lockoutUntil && Date.now() < attempts.lockoutUntil) {
            return true;
        }
        
        // Lockout expired, reset
        if (attempts.lockoutUntil && Date.now() >= attempts.lockoutUntil) {
            this.failedAttempts.delete(ip);
            return false;
        }
        
        return false;
    }

    // Get lockout remaining time in seconds
    getLockoutTimeRemaining(ip) {
        const attempts = this.failedAttempts.get(ip);
        if (!attempts || !attempts.lockoutUntil) return 0;
        
        const remaining = Math.max(0, attempts.lockoutUntil - Date.now());
        return Math.ceil(remaining / 1000);
    }

    // Record failed PIN attempt
    recordFailedAttempt(ip, pin, userAgent) {
        const now = Date.now();
        let attempts = this.failedAttempts.get(ip) || { 
            count: 0, 
            lockoutUntil: null, 
            attempts: [] 
        };
        
        attempts.count += 1;
        attempts.attempts.push({
            timestamp: now,
            pinLength: pin ? pin.length : 0,
            userAgent: userAgent || 'unknown'
        });
        
        // Keep only last 10 attempts for memory efficiency
        if (attempts.attempts.length > 10) {
            attempts.attempts = attempts.attempts.slice(-10);
        }
        
        // Lock out after max attempts
        if (attempts.count >= this.MAX_ATTEMPTS) {
            attempts.lockoutUntil = now + this.LOCKOUT_DURATION;
            console.log(`🚫 IP ${ip} locked out for ${this.LOCKOUT_DURATION/1000/60/60} hours after ${attempts.count} failed attempts`);
        }
        
        this.failedAttempts.set(ip, attempts);
        
        console.log(`❌ Failed PIN attempt from ${ip}: ${attempts.count}/${this.MAX_ATTEMPTS}`);
    }

    // Generate secure session ID
    generateSessionId() {
        return crypto.randomBytes(32).toString('hex');
    }

    // Create new authenticated session
    createSession(ip) {
        const sessionId = this.generateSessionId();
        const now = Date.now();
        
        this.activeSessions.set(sessionId, {
            ip,
            createdAt: now,
            lastActivity: now
        });
        
        // Clear failed attempts on successful auth
        this.failedAttempts.delete(ip);
        
        console.log(`✅ New session created for ${ip}: ${sessionId.substring(0, 8)}...`);
        return sessionId;
    }

    // Validate existing session
    validateSession(sessionId, ip) {
        const session = this.activeSessions.get(sessionId);
        if (!session) return false;
        
        // Check IP match
        if (session.ip !== ip) {
            console.log(`🚫 Session IP mismatch: expected ${session.ip}, got ${ip}`);
            this.activeSessions.delete(sessionId);
            return false;
        }
        
        // Check timeout
        const now = Date.now();
        if (now - session.lastActivity > this.SESSION_TIMEOUT) {
            console.log(`⏰ Session expired: ${sessionId.substring(0, 8)}...`);
            this.activeSessions.delete(sessionId);
            return false;
        }
        
        // Update last activity
        session.lastActivity = now;
        return true;
    }

    // Invalidate session
    invalidateSession(sessionId) {
        const deleted = this.activeSessions.delete(sessionId);
        if (deleted) {
            console.log(`🗑️ Session invalidated: ${sessionId.substring(0, 8)}...`);
        }
        return deleted;
    }

    // Get session statistics
    getSessionStats() {
        const now = Date.now();
        const sessions = Array.from(this.activeSessions.values());
        
        return {
            totalSessions: sessions.length,
            recentSessions: sessions.filter(s => now - s.lastActivity < 5 * 60 * 1000).length,
            oldestSession: sessions.length > 0 ? Math.min(...sessions.map(s => s.createdAt)) : null,
            newestSession: sessions.length > 0 ? Math.max(...sessions.map(s => s.createdAt)) : null
        };
    }

    // Get failed attempts statistics
    getFailedAttemptsStats() {
        const stats = {
            totalIpsTracked: this.failedAttempts.size,
            currentlyLockedOut: 0,
            totalFailedAttempts: 0
        };
        
        const now = Date.now();
        for (const [ip, attempts] of this.failedAttempts.entries()) {
            stats.totalFailedAttempts += attempts.count;
            if (attempts.lockoutUntil && now < attempts.lockoutUntil) {
                stats.currentlyLockedOut += 1;
            }
        }
        
        return stats;
    }

    // Cleanup expired sessions and lockouts
    cleanup() {
        const now = Date.now();
        let cleanedSessions = 0;
        let cleanedLockouts = 0;
        
        // Clean expired sessions
        for (const [sessionId, session] of this.activeSessions.entries()) {
            if (now - session.lastActivity > this.SESSION_TIMEOUT) {
                this.activeSessions.delete(sessionId);
                cleanedSessions++;
            }
        }
        
        // Clean expired lockouts
        for (const [ip, attempts] of this.failedAttempts.entries()) {
            if (attempts.lockoutUntil && now >= attempts.lockoutUntil) {
                this.failedAttempts.delete(ip);
                cleanedLockouts++;
            }
        }
        
        if (cleanedSessions > 0 || cleanedLockouts > 0) {
            console.log(`🧹 Cleanup: ${cleanedSessions} expired sessions, ${cleanedLockouts} expired lockouts`);
        }
    }

    // Start periodic cleanup
    startCleanupScheduler() {
        setInterval(() => {
            this.cleanup();
        }, 60 * 1000); // Every minute
    }
}

// Create singleton instance
const pinAuthManager = new PinAuthManager();

// Middleware to check if IP is locked out
const checkLockout = (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress;
    
    if (pinAuthManager.getLockoutStatus(ip)) {
        const remainingTime = pinAuthManager.getLockoutTimeRemaining(ip);
        
        return res.status(429).json({
            success: false,
            error: 'IP_LOCKED_OUT',
            message: 'Too many failed PIN attempts',
            lockoutRemaining: remainingTime,
            retryAfter: Math.ceil(remainingTime / 60) // minutes
        });
    }
    
    next();
};

// Middleware to validate existing session
const validateSession = (req, res, next) => {
    const sessionId = req.headers['x-session-id'];
    const ip = req.ip || req.connection.remoteAddress;
    
    if (!sessionId) {
        return res.status(401).json({
            success: false,
            error: 'SESSION_REQUIRED',
            message: 'Valid session required'
        });
    }
    
    if (!pinAuthManager.validateSession(sessionId, ip)) {
        return res.status(401).json({
            success: false,
            error: 'INVALID_SESSION',
            message: 'Session expired or invalid'
        });
    }
    
    req.sessionId = sessionId;
    next();
};

module.exports = {
    pinAuthManager,
    checkLockout,
    validateSession
};