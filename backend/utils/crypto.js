const crypto = require('crypto');

/**
 * SafePass Cryptographic Utilities
 * Provides secure cryptographic functions for password generation
 */
class CryptoUtils {
    /**
     * Generate cryptographically secure random bytes
     * @param {number} length - Number of bytes to generate
     * @returns {Buffer} Random bytes
     */
    static generateSecureRandom(length) {
        return crypto.randomBytes(length);
    }

    /**
     * Perform PBKDF2 key derivation with high iteration count
     * @param {string} password - Master password
     * @param {string} salt - Salt value (platform + identifier)
     * @param {number} iterations - Number of iterations (default: 100000)
     * @param {number} keyLength - Derived key length in bytes (default: 32)
     * @returns {Promise<Buffer>} Derived key
     */
    static async deriveKey(password, salt, iterations = 100000, keyLength = 32) {
        return new Promise((resolve, reject) => {
            crypto.pbkdf2(password, salt, iterations, keyLength, 'sha256', (err, derivedKey) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(derivedKey);
                }
            });
        });
    }

    /**
     * Generate SHA-256 hash
     * @param {string} input - Input to hash
     * @returns {string} Hex-encoded hash
     */
    static sha256(input) {
        return crypto.createHash('sha256').update(input).digest('hex');
    }

    /**
     * Convert bytes to base64 with custom character set
     * @param {Buffer} bytes - Input bytes
     * @param {string} charset - Character set for password generation
     * @returns {string} Encoded string using charset
     */
    static bytesToCharset(bytes, charset) {
        let result = '';
        for (let i = 0; i < bytes.length; i++) {
            result += charset[bytes[i] % charset.length];
        }
        return result;
    }

    /**
     * Timing-safe string comparison
     * @param {string} a - First string
     * @param {string} b - Second string
     * @returns {boolean} True if strings are equal
     */
    static timingSafeEqual(a, b) {
        if (a.length !== b.length) return false;
        return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
    }
}

module.exports = CryptoUtils;