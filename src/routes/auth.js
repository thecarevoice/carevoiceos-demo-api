const express = require('express');
const bcrypt = require('bcryptjs');
const { generateToken } = require('../middleware/auth');
const { validateBody, schemas } = require('../middleware/validation');
const carevoiceService = require('../services/carevoiceService');

const router = express.Router();

// In-memory user storage (in production, use a database)
const users = new Map();

/**
 * @route POST /api/auth/register
 * @desc Register a new user
 * @access Public
 */
router.post('/register', validateBody(schemas.register), async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if user already exists
    if (users.has(email)) {
      return res.status(400).json({
        success: false,
        message: 'User already exists',
      });
    }

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Generate unique UDID
    const udid = `udid_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Create user
    const user = {
      id: Date.now().toString(),
      email,
      password: hashedPassword,
      name: email.split('@')[0], // 使用邮箱前缀作为默认名称
      udid: udid, // 生成唯一的UDID
      createdAt: new Date(),
    };

    users.set(email, user);

    // Generate JWT token
    const token = generateToken({
      userId: user.id,
      email: user.email,
    });

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
        token,
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

/**
 * @route POST /api/auth/login
 * @desc Login user
 * @access Public
 */
router.post('/login', validateBody(schemas.login), async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if user exists
    const user = users.get(email);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    // Authenticate with CareVoiceOS using user's UDID
    console.log(`[Login] 开始调用CareVoiceOS API，用户邮箱: ${email}，UDID: ${user.udid}`);
    const authResult = await carevoiceService.authenticateUser(user.udid);

    if (!authResult.success) {
      console.error(`[Login] CareVoiceOS认证失败，用户邮箱: ${email}，UDID: ${user.udid}`, authResult.error);
      return res.status(400).json({
        success: false,
        message: 'CareVoiceOS authentication failed',
        error: authResult.error,
      });
    }

    console.log(`[Login] CareVoiceOS认证成功，用户邮箱: ${email}，UDID: ${user.udid}，账户ID: ${authResult.data.accountId}`);

    // Generate JWT token for our API
    const token = generateToken({
      userId: user.id,
      email: user.email,
      accountId: authResult.data.accountId,
    });

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
        token, // Our API token
        sdk: {
          accessToken: authResult.data.userToken,
          refreshToken: authResult.data.refreshToken,
          expiresIn: authResult.data.expiresIn,
        },
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

/**
 * @route POST /api/auth/carevoice
 * @desc Authenticate with CareVoiceOS
 * @access Public
 */
router.post('/carevoice', validateBody(schemas.authenticate), async (req, res) => {
  try {
    const { uniqueId } = req.body;

    // Authenticate with CareVoiceOS
    const authResult = await carevoiceService.authenticateUser(uniqueId);

    if (!authResult.success) {
      return res.status(400).json({
        success: false,
        message: 'CareVoiceOS authentication failed',
        error: authResult.error,
      });
    }

    // Generate JWT token for our API
    const token = generateToken({
      uniqueId,
      accountId: authResult.data.accountId,
    });

    res.json({
      success: true,
      message: 'CareVoiceOS authentication successful',
      data: {
        sdk: {
          accessToken: authResult.data.userToken,
          refreshToken: authResult.data.refreshToken,
          expiresIn: authResult.data.expiresIn,
        },
        token, // Our API token
        accountId: authResult.data.accountId,
      },
    });
  } catch (error) {
    console.error('CareVoiceOS authentication error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

/**
 * @route GET /api/auth/profile
 * @desc Get user profile
 * @access Private
 */
router.get('/profile', (req, res) => {
  try {
    const user = users.get(req.user.email);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

module.exports = router; 