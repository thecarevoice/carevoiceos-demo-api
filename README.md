# CareVoiceOS Demo API

BFF (Backend for Frontend) API service for CareVoiceOS demo applications. This service provides a simplified API layer that communicates with the CareVoiceOS OpenAPI and serves React Native demo applications.

## Features

- 🔐 **Authentication**: User registration, login, and CareVoiceOS integration
- 🛡️ **Security**: JWT tokens, rate limiting, CORS protection
- 📊 **Health Checks**: API health monitoring
- 🔄 **CareVoiceOS Integration**: Seamless integration with CareVoiceOS OpenAPI
- 📝 **Request Validation**: Input validation using Joi
- 🚀 **Production Ready**: Error handling, logging, and security middleware

## Quick Start

### Prerequisites

- Node.js >= 18.0.0
- npm or yarn

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Copy environment variables:
   ```bash
   cp env.example .env
   ```

4. Configure your environment variables in `.env`:
   ```env
   # Server Configuration
   PORT=3000
   NODE_ENV=development

   # CareVoiceOS OpenAPI Configuration
   CAREVOICE_API_BASE_URL=https://gravitee-gateway.kangyu.info/os3/api/open/v1
   CAREVOICE_API_KEY=your-api-key
   CAREVOICE_CLIENT_ID=your-client-id
   CAREVOICE_CLIENT_SECRET=your-client-secret
   CAREVOICE_GROUP=your-group-id

   # JWT Configuration
   JWT_SECRET=your-jwt-secret-key
   JWT_EXPIRES_IN=24h
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

## API Endpoints

### Authentication

#### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe"
}
```

#### Login User
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

#### CareVoiceOS Authentication
```http
POST /api/auth/carevoice
Content-Type: application/json

{
  "uniqueId": "user-unique-id"
}
```

#### Get User Profile
```http
GET /api/auth/profile
Authorization: Bearer <jwt-token>
```

### Health Checks

#### API Health
```http
GET /api/health
```

#### CareVoiceOS Health
```http
GET /api/health/carevoice
```

## Integration with React Native Demo

Update your React Native demo's HTTP configuration to use this API:

```typescript
// src/utils/http.ts
export enum ApiChannel {
  api = 'http://localhost:3000/api', // Your demo API server
}
```

## Development

### Available Scripts

- `npm start` - Start production server
- `npm run dev` - Start development server with hot reload
- `npm test` - Run tests

### Project Structure

```
src/
├── app.js              # Main application file
├── config/             # Configuration files
│   └── index.js
├── middleware/         # Express middleware
│   ├── auth.js
│   └── validation.js
├── routes/            # API routes
│   ├── auth.js
│   └── health.js
└── services/          # Business logic services
    └── carevoiceService.js
```

## Security Features

- **Helmet**: Security headers
- **CORS**: Cross-origin resource sharing protection
- **Rate Limiting**: Request rate limiting
- **JWT**: JSON Web Token authentication
- **Input Validation**: Request validation using Joi
- **Password Hashing**: bcrypt password hashing

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | 3000 |
| `NODE_ENV` | Environment | development |
| `CAREVOICE_API_BASE_URL` | CareVoiceOS API base URL | - |
| `CAREVOICE_API_KEY` | CareVoiceOS API key | - |
| `CAREVOICE_CLIENT_ID` | CareVoiceOS client ID | - |
| `CAREVOICE_CLIENT_SECRET` | CareVoiceOS client secret | - |
| `CAREVOICE_GROUP` | CareVoiceOS group ID | - |
| `JWT_SECRET` | JWT secret key | - |
| `JWT_EXPIRES_IN` | JWT expiration time | 24h |

## License

MIT
