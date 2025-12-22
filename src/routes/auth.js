const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { generateToken } = require('../middleware/auth');
const { validateBody, schemas } = require('../middleware/validation');
const carevoiceService = require('../services/carevoiceService');

const router = express.Router();

// In-memory user storage (in production, use a database)
const users = new Map();

/**
 * Generate PKCE code_verifier and code_challenge
 * @returns {Object} { codeVerifier, codeChallenge }
 */
function generatePKCE() {
  // Generate random code_verifier (43-128 characters, URL-safe)
  const codeVerifier = crypto.randomBytes(32)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
  
  // Calculate code_challenge = Base64URL(SHA256(code_verifier))
  const codeChallenge = crypto.createHash('sha256')
    .update(codeVerifier)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
  
  return { codeVerifier, codeChallenge };
}

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
 * @desc Generate deeplink for APP B (SSO flow) - 调用 CareVoiceOS API
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

    console.log(`[Deeplink] 开始生成 deeplink，用户邮箱: ${user.email}，UDID: ${user.udid}`);

    // Step 1: 获取 CareVoiceOS 账户（如果还没有）
    const authResult = await carevoiceService.authenticateUser(user.udid);
    if (!authResult.success) {
      console.error(`[Deeplink] CareVoiceOS 认证失败:`, authResult.error);
      return res.status(400).json({
        success: false,
        message: 'Failed to authenticate with CareVoiceOS',
        error: authResult.error,
      });
    }

    const accountId = authResult.data.accountId;
    const serverToken = authResult.data.serverToken;
    console.log(`[Deeplink] CareVoiceOS 认证成功，账户ID: ${accountId}`);

    // Step 2: 调用 CareVoiceOS API 生成 deeplink
    // 动态生成 PKCE 参数
    const { codeVerifier, codeChallenge } = generatePKCE();
    
    console.log(`[Deeplink] 生成 PKCE 参数`);
    console.log(`[Deeplink] code_verifier: ${codeVerifier}`);
    console.log(`[Deeplink] code_challenge: ${codeChallenge}`);
    
    const deeplinkResult = await carevoiceService.generateDeepLink(serverToken, {
      codeChallenge: codeChallenge,
      codeChallengeMethod: 'S256',
      cvUserUniqueId: accountId,
      redirectUri: 'carevoiceosdemo://callback',
      state: 'sso_from_app_a',
      codeVerifier: codeVerifier, // 传递 codeVerifier 用于后续验证
    });

    if (!deeplinkResult.success) {
      console.error(`[Deeplink] 生成 deeplink 失败:`, deeplinkResult.error);
      return res.status(400).json({
        success: false,
        message: 'Failed to generate deeplink',
        error: deeplinkResult.error,
      });
    }

    console.log(`[Deeplink] Deeplink 生成成功:`, deeplinkResult.data.deeplink);

    res.json({
      success: true,
      message: 'Deeplink generated successfully',
      data: {
        deeplink: deeplinkResult.data.deeplink,
        authorizationCode: deeplinkResult.data.authorizationCode,
        expiresIn: deeplinkResult.data.expiresIn,
        expiresAt: deeplinkResult.data.expiresAt,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
        carevoice: {
          accountId: accountId,
        },
      },
    });
  } catch (error) {
    console.error('Deeplink generation error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
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

    console.log(`[Exchange Token] 收到授权码: ${code}`);

    // 从存储中获取 code_verifier 和相关信息
    if (!global.codeVerifiers || !global.codeVerifiers.has(code)) {
      console.error(`[Exchange Token] 未找到对应的 code_verifier`);
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired authorization code',
      });
    }

    const storedData = global.codeVerifiers.get(code);
    const { codeVerifier, accountId, serverToken } = storedData;
    
    // 使用一次后立即删除 (防止重放攻击)
    global.codeVerifiers.delete(code);

    console.log(`[Exchange Token] 开始验证授权码，账户ID: ${accountId}`);

    // 调用 CareVoiceOS API 验证 authorization code
    const validateResult = await carevoiceService.validateDeepLink(
      serverToken,
      code,
      codeVerifier
    );

    if (!validateResult.success) {
      console.error(`[Exchange Token] CareVoiceOS 验证失败:`, validateResult.error);
      return res.status(401).json({
        success: false,
        message: 'Failed to validate authorization code with CareVoiceOS',
        error: validateResult.error,
      });
    }

    console.log(`[Exchange Token] CareVoiceOS 验证成功`);

    // 获取用户 token (validate API 返回的数据)
    const validateData = validateResult.data;
    
    console.log(`[Exchange Token] Validate data:`, JSON.stringify(validateData, null, 2));
    
    // 生成我们自己的 JWT token
    const token = generateToken({
      accountId: accountId,
      tenantCode: validateData.tenantCode,
    });

    console.log(`[Exchange Token] Token 交换成功，账户ID: ${accountId}`);

    // 返回完整的 token 信息 (按照 OAuth2 标准)
    res.json({
      success: true,
      message: 'Token exchange successful',
      data: {
        access_token: token, // Backend A 的 token
        token_type: 'Bearer',
        expires_in: 86400, // 24 hours
        user: {
          id: accountId,
          email: '',
          name: '',
        },
        sdk: {
          accessToken: validateData.access_token,
          refreshToken: validateData.refresh_token,
          expiresIn: validateData.expires_in,
          accountId: accountId,
          tenantCode: validateData.tenantCode,
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