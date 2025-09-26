const express = require('express');
const router = express.Router();

/**
 * @route GET /api/bff/theme/configuration3
 * @desc Get theme configuration for CareVoice SDK
 * @access Public
 */
router.get('/theme/configuration3', (req, res) => {
  res.json({
    success: true,
    data: {
      theme: {
        primaryColor: "#007AFF",
        secondaryColor: "#5AC8FA",
        backgroundColor: "#F2F2F7",
        textColor: "#000000",
        accentColor: "#FF3B30"
      },
      branding: {
        logo: null,
        appName: "CareVoice Wellness"
      }
    }
  });
});

/**
 * @route GET /api/bff/config
 * @desc Get general BFF configuration
 * @access Public
 */
router.get('/config', (req, res) => {
  res.json({
    success: true,
    data: {
      version: "1.0.0",
      features: {
        notifications: true,
        analytics: true,
        darkMode: true
      }
    }
  });
});

module.exports = router;