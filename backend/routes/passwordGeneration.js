const express = require("express");
const router = express.Router();
const passwordGeneration = require("../middleware/passwordGeneration");

// Import existing middleware
const { validateSession } = require("../middleware/pinAuth");
const { verifyHMAC } = require("../middleware/hmacAuth");

/**
 * POST /api/generate-password
 * Main password generation endpoint
 * Requires: Valid session, HMAC verification
 */
router.post("/generate-password", validateSession, verifyHMAC, async (req, res) => {
  try {
    console.log(`[${new Date().toISOString()}] Password generation request from IP: ${req.ip}`);

    // Extract and validate parameters
    const { masterPassword, platform, passwordLength, passwordRules, iterations } = req.body;

    // Validate input parameters
    if (!masterPassword || !platform) {
      return res.status(400).json({
        success: false,
        error: "Missing required parameters",
        details: "masterPassword and platform are required",
      });
    }

    const validation = passwordGeneration.validateParameters({
      masterPassword,
      platform,
      passwordLength,
      passwordRules,
    });

    if (!validation.valid) {
      console.log(`[${new Date().toISOString()}] Password generation validation failed:`, validation.errors);
      return res.status(400).json({
        success: false,
        error: "Invalid parameters",
        details: validation.errors,
      });
    }

    const result = await passwordGeneration
      .generatePassword(masterPassword, platform, {
        passwordLength: passwordLength ? parseInt(passwordLength) : undefined,
        passwordRules,
        iterations: iterations ? parseInt(iterations) : undefined,
      })
      .catch((error) => {
        console.error(`[${new Date().toISOString()}] Password generation error:`, error);
        return {
          success: false,
          error: "Password generation failed",
          details: error.message,
        };
      });

    if (!result || !result.success) {
      const error = result ? result.error : "Unknown error";
      console.log(`[${new Date().toISOString()}] Password generation failed:`, error);
      return res.status(500).json({
        success: false,
        error: "Password generation failed",
        details: error,
      });
    }

    console.log(`[${new Date().toISOString()}] Password generated successfully for platform: ${platform}`);

    // Return password and metadata (exclude sensitive data)
    res.json({
      success: true,
      password: result.password,
      metadata: {
        platform: result.metadata.platform,
        length: result.metadata.length,
        generationTime: result.metadata.generationTime,
        strength: result.metadata.strength,
      },
    });
  } catch (error) {
    console.error("Password generation endpoint error:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

/**
 * GET /api/password/platforms
 * Get available platform presets
 */
router.get("/platforms", (req, res) => {
  try {
    const platforms = [
      { name: "Gmail", key: "gmail", icon: "📧" },
      { name: "Discord", key: "discord", icon: "💬" },
      { name: "Facebook", key: "facebook", icon: "📘" },
      { name: "Instagram", key: "instagram", icon: "📷" },
      { name: "Twitter", key: "twitter", icon: "🐦" },
      { name: "GitHub", key: "github", icon: "💻" },
      { name: "LinkedIn", key: "linkedin", icon: "💼" },
      { name: "Netflix", key: "netflix", icon: "🎬" },
      { name: "Spotify", key: "spotify", icon: "🎵" },
      { name: "Amazon", key: "amazon", icon: "🛒" },
    ];

    res.json({
      success: true,
      platforms,
    });
  } catch (error) {
    console.error("Platform list endpoint error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to load platforms",
    });
  }
});

/**
 * GET /api/password/rules/:platform
 * Get password rules for specific platform
 */
router.get("/rules/:platform", (req, res) => {
  try {
    const { platform } = req.params;
    const rules = passwordGeneration.getPasswordRules(platform);

    res.json({
      success: true,
      platform,
      rules,
    });
  } catch (error) {
    console.error("Password rules endpoint error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get password rules",
    });
  }
});

/**
 * POST /api/password/validate-strength
 * Validate password strength
 */
router.post("/validate-strength", (req, res) => {
  try {
    const { password } = req.body;

    if (!password || typeof password !== "string") {
      return res.status(400).json({
        success: false,
        error: "Password is required",
      });
    }

    const strength = passwordGeneration.calculatePasswordStrength(password);

    res.json({
      success: true,
      strength,
    });
  } catch (error) {
    console.error("Password strength validation error:", error);
    res.status(500).json({
      success: false,
      error: "Strength validation failed",
    });
  }
});

/**
 * GET /api/password/stats
 * Get password generation statistics (development only)
 */
router.get("/stats", (req, res) => {
  if (process.env.NODE_ENV === "production") {
    return res.status(404).json({ error: "Not found" });
  }

  try {
    const stats = passwordGeneration.getStatistics();
    res.json({
      success: true,
      statistics: stats,
    });
  } catch (error) {
    console.error("Password statistics endpoint error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get statistics",
    });
  }
});

/**
 * DELETE /api/password/stats
 * Clear statistics (development only)
 */
router.delete("/stats", (req, res) => {
  if (process.env.NODE_ENV === "production") {
    return res.status(404).json({ error: "Not found" });
  }

  try {
    passwordGeneration.clearStatistics();
    res.json({
      success: true,
      message: "Statistics cleared",
    });
  } catch (error) {
    console.error("Clear statistics endpoint error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to clear statistics",
    });
  }
});

module.exports = router;
