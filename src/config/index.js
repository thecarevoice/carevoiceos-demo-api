require('dotenv').config({ path: '.env' });

const config = {
  server: {
    port: process.env.PORT || 3000,
    nodeEnv: process.env.NODE_ENV || 'development',
  },
  
  carevoice: {
    apiBaseUrl: process.env.CAREVOICE_API_BASE_URL || 'https://gravitee-gateway.kangyu.info/os3/api/open/v1',
    apiKey: process.env.CAREVOICE_API_KEY,
    clientId: process.env.CAREVOICE_CLIENT_ID,
    clientSecret: process.env.CAREVOICE_CLIENT_SECRET,
    group: process.env.CAREVOICE_GROUP,
  },
  
  jwt: {
    secret: process.env.JWT_SECRET || 'default-secret-key',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
  },
  
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000, // 15 minutes
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  },
  
  cors: {
    origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : ['http://localhost:3000', 'http://localhost:8081'],
  },
};

module.exports = config; 