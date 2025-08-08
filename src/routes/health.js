const express = require('express');
const carevoiceService = require('../services/carevoiceService');

const router = express.Router();

/**
 * @route GET /api/health
 * @desc Health check endpoint
 * @access Public
 */
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'CareVoiceOS Demo API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

/**
 * @route GET /api/health/carevoice
 * @desc CareVoiceOS API health check
 * @access Public
 */
router.get('/carevoice', async (req, res) => {
  try {
    const serverTokenResponse = await carevoiceService.getServerToken();
    
    if (serverTokenResponse.success) {
      res.json({
        success: true,
        message: 'CareVoiceOS API is accessible',
        timestamp: new Date().toISOString(),
      });
    } else {
      res.status(503).json({
        success: false,
        message: 'CareVoiceOS API is not accessible',
        error: serverTokenResponse.error,
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    res.status(503).json({
      success: false,
      message: 'CareVoiceOS API health check failed',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

module.exports = router; 