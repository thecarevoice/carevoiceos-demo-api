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

    console.log(`[Login] 登录成功，用户邮箱: ${email}`);

    // Generate JWT token for our API
    const token = generateToken({
      userId: user.id,
      email: user.email,
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

/**
 * @route POST /api/auth/deeplink
 * @desc Generate deeplink for APP B (SSO flow)
 * @access Public
 */
router.post('/deeplink', async (req, res) => {
  try {
    const { userId, email } = req.body;

    if (!userId && !email) {
      return res.status(400).json({
        success: false,
        message: 'userId or email is required',
      });
    }

    // Find user by email or userId
    let user = null;
    if (email) {
      user = users.get(email);
    } else if (userId) {
      // Find user by id
      for (const [, u] of users) {
        if (u.id === userId) {
          user = u;
          break;
        }
      }
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Generate authorization code for SSO (模拟 IdP 生成的 authorization code)
    // 这个 code 将被 APP B 用来交换真正的 token
    const authorizationCode = `auth_code_${Date.now()}_${Math.random().toString(36).substr(2, 16)}`;
    
    // 存储 code 和用户信息的映射 (有效期5分钟)
    const codeData = {
      code: authorizationCode,
      userId: user.id,
      email: user.email,
      udid: user.udid,
      createdAt: Date.now(),
      expiresIn: 300000, // 5 minutes
    };
    
    // 临时存储 (生产环境应该用 Redis)
    if (!global.authorizationCodes) {
      global.authorizationCodes = new Map();
    }
    global.authorizationCodes.set(authorizationCode, codeData);
    
    // 5分钟后自动清理
    setTimeout(() => {
      global.authorizationCodes.delete(authorizationCode);
      console.log(`[Deeplink] Authorization code expired: ${authorizationCode}`);
    }, 300000);

    console.log(`[Deeplink] 生成授权码，用户邮箱: ${user.email}，code: ${authorizationCode}`);

    // Generate deeplink with authorization code (按照 OIDC 标准)
    const deeplink = `carevoiceosdemo://callback?code=${encodeURIComponent(authorizationCode)}&state=sso_from_app_a`;

    res.json({
      success: true,
      message: 'Deeplink generated successfully',
      data: {
        deeplink,
        authorizationCode, // 仅用于测试/调试
        expiresIn: 300, // seconds
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
      },
    });
  } catch (error) {
    console.error('Deeplink generation error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

/**
 * @route POST /api/auth/exchange-token
 * @desc Exchange authorization code for tokens (模拟 OAuth2 token endpoint)
 * @desc 这是 APP B 的 Backend B 会调用的接口
 * @access Public
 */
router.post('/exchange-token', async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        message: 'Authorization code is required',
      });
    }

    // 验证 authorization code
    if (!global.authorizationCodes || !global.authorizationCodes.has(code)) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired authorization code',
      });
    }

    const codeData = global.authorizationCodes.get(code);
    
    // 检查是否过期
    if (Date.now() - codeData.createdAt > codeData.expiresIn) {
      global.authorizationCodes.delete(code);
      return res.status(401).json({
        success: false,
        message: 'Authorization code expired',
      });
    }

    // 找到对应的用户
    let user = null;
    for (const [, u] of users) {
      if (u.id === codeData.userId) {
        user = u;
        break;
      }
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // 使用一次后立即删除 code (防止重放攻击)
    global.authorizationCodes.delete(code);

    // 现在调用 CareVoiceOS API 获取真正的 token
    console.log(`[Exchange Token] 开始调用CareVoiceOS API，用户邮箱: ${user.email}，UDID: ${user.udid}`);
    const authResult = await carevoiceService.authenticateUser(user.udid);

    if (!authResult.success) {
      console.error(`[Exchange Token] CareVoiceOS认证失败，用户邮箱: ${user.email}，UDID: ${user.udid}`, authResult.error);
      return res.status(400).json({
        success: false,
        message: 'CareVoiceOS authentication failed',
        error: authResult.error,
      });
    }

    console.log(`[Exchange Token] CareVoiceOS认证成功，用户邮箱: ${user.email}，账户ID: ${authResult.data.accountId}`);

    // 生成我们自己的 JWT token
    const token = generateToken({
      userId: user.id,
      email: user.email,
      accountId: authResult.data.accountId,
    });

    // 返回完整的 token 信息 (按照 OAuth2 标准)
    res.json({
      success: true,
      message: 'Token exchange successful',
      data: {
        access_token: token, // Backend A 的 token
        token_type: 'Bearer',
        expires_in: 86400, // 24 hours
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
        sdk: {
          accessToken: authResult.data.userToken,
          refreshToken: authResult.data.refreshToken,
          expiresIn: authResult.data.expiresIn,
          accountId: authResult.data.accountId,
        },
      },
    });
  } catch (error) {
    console.error('Token exchange error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

module.exports = router; 