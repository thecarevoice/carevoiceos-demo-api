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
        console.log(`[CareVoice API] Request started: ${config.method?.toUpperCase()} ${config.url}`);
        console.log(`[CareVoice API] Request headers:`, {
          'X-Api-Key': config.headers['X-Api-Key'] ? '***' : 'Not set',
          'Authorization': config.headers['Authorization'] ? 'Bearer ***' : 'Not set',
          'Content-Type': config.headers['Content-Type'],
        });
        if (config.data) {
          console.log(`[CareVoice API] Request body:`, JSON.stringify(config.data, null, 2));
        }
        return config;
      },
      (error) => {
        console.error(`[CareVoice API] Request interceptor error:`, error);
        return Promise.reject(error);
      }
    );

    // 添加响应拦截器记录响应日志
    this.httpClient.interceptors.response.use(
      (response) => {
        console.log(`[CareVoice API] Response success: ${response.config.method?.toUpperCase()} ${response.config.url}`);
        console.log(`[CareVoice API] Status code: ${response.status}`);
        console.log(`[CareVoice API] Response body:`, JSON.stringify(response.data, null, 2));
        return response;
      },
      (error) => {
        console.error(`[CareVoice API] Response error: ${error.config?.method?.toUpperCase()} ${error.config?.url}`);
        console.error(`[CareVoice API] Error status code: ${error.response?.status}`);
        console.error(`[CareVoice API] Error response:`, error.response?.data);
        console.error(`[CareVoice API] Error message:`, error.message);
        return Promise.reject(error);
      }
    );
  }

  /**
   * Get server token from CareVoiceOS API
   * @returns {Promise<Object>} Token response
   */
  async getServerToken() {
    console.log(`[CareVoice Service] Starting to get server token...`);
    const startTime = Date.now();
    
    try {
      const response = await this.httpClient.post('/auth/token', {
        client_id: this.clientId,
        client_secret: this.clientSecret,
      });
      
      const duration = Date.now() - startTime;
      console.log(`[CareVoice Service] Get server token success, duration: ${duration}ms`);
      
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`[CareVoice Service] Get server token failed, duration: ${duration}ms`);
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
    console.log(`[CareVoice Service] Starting to create user account, uniqueId: ${uniqueId}`);
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
      console.log(`[CareVoice Service] Create user account success, duration: ${duration}ms, account ID: ${response.data.uid}`);
      
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`[CareVoice Service] Create user account failed, duration: ${duration}ms, uniqueId: ${uniqueId}`);
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
    console.log(`[CareVoice Service] Starting to get user token, account ID: ${accountId}`);
    const startTime = Date.now();
    
    try {
      const response = await this.httpClient.get(`/account/${accountId}/token`, {
        headers: {
          'Authorization': `Bearer ${serverToken}`,
        },
      });
      
      const duration = Date.now() - startTime;
      console.log(`[CareVoice Service] Get user token success, duration: ${duration}ms, account ID: ${accountId}`);
      
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`[CareVoice Service] Get user token failed, duration: ${duration}ms, account ID: ${accountId}`);
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
    console.log(`[CareVoice Service] Starting user authentication flow, uniqueId: ${uniqueId}`);
    const totalStartTime = Date.now();
    
    try {
      // Step 1: Get server token
      console.log(`[CareVoice Service] Step 1: Get server token`);
      const serverTokenResponse = await this.getServerToken();
      if (!serverTokenResponse.success) {
        console.error(`[CareVoice Service] Authentication flow failed - Step 1: Get server token failed`);
        return serverTokenResponse;
      }

      const serverToken = serverTokenResponse.data.access_token;
      console.log(`[CareVoice Service] Step 1 completed: Server token obtained successfully`);

      // Step 2: Create user
      console.log(`[CareVoice Service] Step 2: Create user account`);
      const createUserResponse = await this.createUser(serverToken, uniqueId);
      if (!createUserResponse.success) {
        console.error(`[CareVoice Service] Authentication flow failed - Step 2: Create user account failed`);
        return createUserResponse;
      }

      const accountId = createUserResponse.data.uid;
      console.log(`[CareVoice Service] Step 2 completed: User account created successfully, account ID: ${accountId}`);

      // Step 3: Get user token
      console.log(`[CareVoice Service] Step 3: Get user token`);
      const userTokenResponse = await this.getUserToken(serverToken, accountId);
      if (!userTokenResponse.success) {
        console.error(`[CareVoice Service] Authentication flow failed - Step 3: Get user token failed`);
        return userTokenResponse;
      }

      const totalDuration = Date.now() - totalStartTime;
      console.log(`[CareVoice Service] Authentication flow completed, total duration: ${totalDuration}ms, account ID: ${accountId}`);

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
      console.error(`[CareVoice Service] Authentication flow exception, total duration: ${totalDuration}ms, uniqueId: ${uniqueId}`);
      console.error('Error in authentication flow:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

module.exports = new CareVoiceService(); 