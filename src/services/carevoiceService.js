const axios = require('axios');
const config = require('../config');

class CareVoiceService {
  constructor() {
    this.baseURL = config.carevoice.apiBaseUrl;
    this.apiKey = config.carevoice.apiKey;
    this.clientId = config.carevoice.clientId;
    this.clientSecret = config.carevoice.clientSecret;
    this.group = config.carevoice.group;
    
    this.httpClient = axios.create({
      baseURL: this.baseURL,
      timeout: 30000,
      headers: {
        'X-Api-Key': this.apiKey,
        'Content-Type': 'application/json',
      },
    });

    // 添加请求拦截器记录请求日志
    this.httpClient.interceptors.request.use(
      (config) => {
        console.log(`[CareVoice API] 请求开始: ${config.method?.toUpperCase()} ${config.url}`);
        console.log(`[CareVoice API] 请求头:`, {
          'X-Api-Key': config.headers['X-Api-Key'] ? '***' : '未设置',
          'Authorization': config.headers['Authorization'] ? 'Bearer ***' : '未设置',
          'Content-Type': config.headers['Content-Type'],
        });
        if (config.data) {
          console.log(`[CareVoice API] 请求体:`, JSON.stringify(config.data, null, 2));
        }
        return config;
      },
      (error) => {
        console.error(`[CareVoice API] 请求拦截器错误:`, error);
        return Promise.reject(error);
      }
    );

    // 添加响应拦截器记录响应日志
    this.httpClient.interceptors.response.use(
      (response) => {
        console.log(`[CareVoice API] 响应成功: ${response.config.method?.toUpperCase()} ${response.config.url}`);
        console.log(`[CareVoice API] 状态码: ${response.status}`);
        console.log(`[CareVoice API] 响应体:`, JSON.stringify(response.data, null, 2));
        return response;
      },
      (error) => {
        console.error(`[CareVoice API] 响应错误: ${error.config?.method?.toUpperCase()} ${error.config?.url}`);
        console.error(`[CareVoice API] 错误状态码: ${error.response?.status}`);
        console.error(`[CareVoice API] 错误响应:`, error.response?.data);
        console.error(`[CareVoice API] 错误信息:`, error.message);
        return Promise.reject(error);
      }
    );
  }

  /**
   * Get server token from CareVoiceOS API
   * @returns {Promise<Object>} Token response
   */
  async getServerToken() {
    console.log(`[CareVoice Service] 开始获取服务器令牌...`);
    const startTime = Date.now();
    
    try {
      const response = await this.httpClient.post('/auth/token', {
        client_id: this.clientId,
        client_secret: this.clientSecret,
      });
      
      const duration = Date.now() - startTime;
      console.log(`[CareVoice Service] 获取服务器令牌成功，耗时: ${duration}ms`);
      
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`[CareVoice Service] 获取服务器令牌失败，耗时: ${duration}ms`);
      console.error('Error getting server token:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data || error.message,
      };
    }
  }

  /**
   * Create a new user account
   * @param {string} serverToken - Server token
   * @param {string} uniqueId - Unique identifier for the user
   * @returns {Promise<Object>} User creation response
   */
  async createUser(serverToken, uniqueId) {
    console.log(`[CareVoice Service] 开始创建用户账户，uniqueId: ${uniqueId}`);
    const startTime = Date.now();
    
    try {
      const response = await this.httpClient.post('/account', {
        group: this.group,
        uniqueId: uniqueId,
      }, {
        headers: {
          'Authorization': `Bearer ${serverToken}`,
        },
      });
      
      const duration = Date.now() - startTime;
      console.log(`[CareVoice Service] 创建用户账户成功，耗时: ${duration}ms，账户ID: ${response.data.uid}`);
      
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`[CareVoice Service] 创建用户账户失败，耗时: ${duration}ms，uniqueId: ${uniqueId}`);
      console.error('Error creating user:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data || error.message,
      };
    }
  }

  /**
   * Get user token
   * @param {string} serverToken - Server token
   * @param {string} accountId - Account ID
   * @returns {Promise<Object>} User token response
   */
  async getUserToken(serverToken, accountId) {
    console.log(`[CareVoice Service] 开始获取用户令牌，账户ID: ${accountId}`);
    const startTime = Date.now();
    
    try {
      const response = await this.httpClient.get(`/account/${accountId}/token`, {
        headers: {
          'Authorization': `Bearer ${serverToken}`,
        },
      });
      
      const duration = Date.now() - startTime;
      console.log(`[CareVoice Service] 获取用户令牌成功，耗时: ${duration}ms，账户ID: ${accountId}`);
      
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`[CareVoice Service] 获取用户令牌失败，耗时: ${duration}ms，账户ID: ${accountId}`);
      console.error('Error getting user token:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data || error.message,
      };
    }
  }

  /**
   * Complete authentication flow
   * @param {string} uniqueId - Unique identifier for the user
   * @returns {Promise<Object>} Complete auth response
   */
  async authenticateUser(uniqueId) {
    console.log(`[CareVoice Service] 开始用户认证流程，uniqueId: ${uniqueId}`);
    const totalStartTime = Date.now();
    
    try {
      // Step 1: Get server token
      console.log(`[CareVoice Service] 步骤1: 获取服务器令牌`);
      const serverTokenResponse = await this.getServerToken();
      if (!serverTokenResponse.success) {
        console.error(`[CareVoice Service] 认证流程失败 - 步骤1: 获取服务器令牌失败`);
        return serverTokenResponse;
      }

      const serverToken = serverTokenResponse.data.access_token;
      console.log(`[CareVoice Service] 步骤1完成: 服务器令牌获取成功`);

      // Step 2: Create user
      console.log(`[CareVoice Service] 步骤2: 创建用户账户`);
      const createUserResponse = await this.createUser(serverToken, uniqueId);
      if (!createUserResponse.success) {
        console.error(`[CareVoice Service] 认证流程失败 - 步骤2: 创建用户账户失败`);
        return createUserResponse;
      }

      const accountId = createUserResponse.data.uid;
      console.log(`[CareVoice Service] 步骤2完成: 用户账户创建成功，账户ID: ${accountId}`);

      // Step 3: Get user token
      console.log(`[CareVoice Service] 步骤3: 获取用户令牌`);
      const userTokenResponse = await this.getUserToken(serverToken, accountId);
      if (!userTokenResponse.success) {
        console.error(`[CareVoice Service] 认证流程失败 - 步骤3: 获取用户令牌失败`);
        return userTokenResponse;
      }

      const totalDuration = Date.now() - totalStartTime;
      console.log(`[CareVoice Service] 认证流程完成，总耗时: ${totalDuration}ms，账户ID: ${accountId}`);

      return {
        success: true,
        data: {
          accountId: accountId,
          serverToken: serverToken,
          userToken: userTokenResponse.data.access_token,
          refreshToken: userTokenResponse.data.refresh_token,
          expiresIn: userTokenResponse.data.expires_in,
        },
      };
    } catch (error) {
      const totalDuration = Date.now() - totalStartTime;
      console.error(`[CareVoice Service] 认证流程异常，总耗时: ${totalDuration}ms，uniqueId: ${uniqueId}`);
      console.error('Error in authentication flow:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

module.exports = new CareVoiceService(); 