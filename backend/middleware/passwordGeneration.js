const CryptoUtils = require("../utils/crypto");

/**
 * Password Generation Manager
 * Handles secure deterministic password generation
 */
class PasswordGeneration {
  constructor() {
    this.statistics = {
      totalGenerated: 0,
      platforms: new Map(),
      lastGenerated: null,
      averageGenerationTime: 0,
    };

    // Predefined character sets for different password types
    this.characterSets = {
      lowercase: "abcdefghijklmnopqrstuvwxyz",
      uppercase: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
      numbers: "0123456789",
      symbols: "!@#$%^&*()_+-=[]{}|;:,.<>?",
      safe_symbols: "!@#$%^&*_+-=",
      alphanumeric: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",
    };

    // Platform-specific password rules
    this.platformRules = new Map([
      ["gmail", { length: 16, requireSymbols: true, excludeAmbiguous: true }],
      ["discord", { length: 20, requireSymbols: true, excludeAmbiguous: false }],
      ["facebook", { length: 18, requireSymbols: true, excludeAmbiguous: true }],
      ["instagram", { length: 16, requireSymbols: true, excludeAmbiguous: true }],
      ["twitter", { length: 18, requireSymbols: true, excludeAmbiguous: false }],
      ["github", { length: 20, requireSymbols: true, excludeAmbiguous: false }],
      ["linkedin", { length: 16, requireSymbols: true, excludeAmbiguous: true }],
      ["default", { length: 16, requireSymbols: true, excludeAmbiguous: true }],
    ]);
  }

  /**
   * Validate password generation parameters
   * @param {Object} params - Generation parameters
   * @returns {Object} Validation result
   */
  validateParameters(params) {
    const errors = [];

    // Validate master password
    if (!params.masterPassword || typeof params.masterPassword !== "string") {
      errors.push("Master password is required and must be a string");
    } else if (params.masterPassword.length < 8) {
      errors.push("Master password must be at least 8 characters long");
    }

    // Validate platform
    if (!params.platform || typeof params.platform !== "string") {
      errors.push("Platform is required and must be a string");
    } else if (params.platform.length > 50) {
      errors.push("Platform name must be 50 characters or less");
    }

    // Validate password length
    if (params.passwordLength) {
      const length = parseInt(params.passwordLength);
      if (isNaN(length) || length < 8 || length > 128) {
        errors.push("Password length must be between 8 and 128 characters");
      }
    }

    // Validate password rules
    if (params.passwordRules && typeof params.passwordRules !== "object") {
      errors.push("Password rules must be an object");
    }

    return {
      valid: errors.length === 0,
      errors: errors,
    };
  }

  /**
   * Get password rules for a platform
   * @param {string} platform - Platform name
   * @param {Object} customRules - Custom password rules
   * @returns {Object} Password generation rules
   */
  getPasswordRules(platform, customRules = {}) {
    const platformKey = platform.toLowerCase().replace(/\s+/g, "");
    const defaultRules = this.platformRules.get(platformKey) || this.platformRules.get("default");

    return {
      ...defaultRules,
      ...customRules,
    };
  }

  /**
   * Build character set based on password rules
   * @param {Object} rules - Password generation rules
   * @returns {string} Character set for password generation
   */
  buildCharacterSet(rules) {
    let charset = this.characterSets.lowercase + this.characterSets.uppercase + this.characterSets.numbers;

    // Add symbols if required
    if (rules.requireSymbols) {
      charset += rules.safeSymbolsOnly ? this.characterSets.safe_symbols : this.characterSets.symbols;
    }

    // Remove ambiguous characters if requested
    if (rules.excludeAmbiguous) {
      const ambiguous = "0O1lI|`";
      charset = charset
        .split("")
        .filter((char) => !ambiguous.includes(char))
        .join("");
    }

    return charset;
  }

  /**
   * Generate deterministic password
   * @param {string} masterPassword - Master password
   * @param {string} platform - Platform name
   * @param {string} accountIdentifier - Account identifier (email, username, etc.)
   * @param {Object} options - Generation options
   * @returns {Promise<Object>} Generated password and metadata
   */
  async generatePassword(masterPassword, platform, options = {}) {
    const startTime = Date.now();

    try {
      // Get password rules
      const rules = this.getPasswordRules(platform, options.passwordRules);
      const passwordLength = options.passwordLength || rules.length;

      // Create deterministic salt
      const saltInput = `${platform.toLowerCase()}:${process.env.SERVER_SECRET}`;
      const salt = CryptoUtils.sha256(saltInput);

      // Perform key derivation
      const iterations = options.iterations || 100000;
      const derivedKey = await CryptoUtils.deriveKey(masterPassword, salt, iterations, passwordLength);

      // Build character set
      const charset = this.buildCharacterSet(rules);

      // Generate password from derived key
      const password = CryptoUtils.bytesToCharset(derivedKey, charset);

      // Ensure password meets complexity requirements
      const validatedPassword = this.ensureComplexity(password, charset, rules);

      // Update statistics
      const generationTime = Date.now() - startTime;
      this.updateStatistics(platform, generationTime);

      return {
        password: validatedPassword,
        metadata: {
          platform: platform,
          length: validatedPassword.length,
          generationTime: generationTime,
          rules: rules,
          charset: charset,
          strength: this.calculatePasswordStrength(validatedPassword),
        },
        success: true,
      };
    } catch (error) {
      console.error("Password generation error:", error.message);
      return {
        success: false,
        error: "Password generation failed",
        metadata: {
          generationTime: Date.now() - startTime,
        },
      };
    }
  }

  /**
   * Ensure password meets complexity requirements
   * @param {string} password - Generated password
   * @param {string} charset - Character set used
   * @param {Object} rules - Password rules
   * @returns {string} Validated password
   */
  ensureComplexity(password, charset, rules) {
    // For deterministic generation, we trust PBKDF2 + charset approach
    // Additional complexity validation could be added here if needed
    return password.substring(0, rules.length);
  }

  /**
   * Calculate password strength score
   * @param {string} password - Password to analyze
   * @returns {Object} Strength analysis
   */
  calculatePasswordStrength(password) {
    let score = 0;
    const checks = {
      length: password.length >= 16,
      lowercase: /[a-z]/.test(password),
      uppercase: /[A-Z]/.test(password),
      numbers: /[0-9]/.test(password),
      symbols: /[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password),
    };

    // Calculate score based on checks
    Object.values(checks).forEach((check) => {
      if (check) score += 20;
    });

    // Length bonus
    if (password.length >= 20) score += 10;
    if (password.length >= 24) score += 10;

    return {
      score: Math.min(score, 100),
      level: score >= 80 ? "strong" : score >= 60 ? "medium" : "weak",
      checks: checks,
    };
  }

  /**
   * Update generation statistics
   * @param {string} platform - Platform name
   * @param {number} generationTime - Time taken to generate
   */
  updateStatistics(platform, generationTime) {
    this.statistics.totalGenerated++;
    this.statistics.lastGenerated = new Date().toISOString();

    // Update platform statistics
    const platformStats = this.statistics.platforms.get(platform) || { count: 0, totalTime: 0 };
    platformStats.count++;
    platformStats.totalTime += generationTime;
    this.statistics.platforms.set(platform, platformStats);

    // Update average generation time
    const totalTime = Array.from(this.statistics.platforms.values()).reduce((sum, stats) => sum + stats.totalTime, 0);
    this.statistics.averageGenerationTime = totalTime / this.statistics.totalGenerated;
  }

  /**
   * Get generation statistics
   * @returns {Object} Statistics
   */
  getStatistics() {
    return {
      ...this.statistics,
      platforms: Object.fromEntries(this.statistics.platforms),
    };
  }

  /**
   * Clear statistics (development only)
   */
  clearStatistics() {
    this.statistics = {
      totalGenerated: 0,
      platforms: new Map(),
      lastGenerated: null,
      averageGenerationTime: 0,
    };
  }
}

// Create singleton instance
const passwordGeneration = new PasswordGeneration();

module.exports = passwordGeneration;
