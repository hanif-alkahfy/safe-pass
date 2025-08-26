# 🔐 SafePass - Secure Password Generation System

[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=flat&logo=node.js&logoColor=white)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18+-61DAFB?style=flat&logo=react&logoColor=black)](https://reactjs.org/)
[![Express](https://img.shields.io/badge/Express-4+-000000?style=flat&logo=express&logoColor=white)](https://expressjs.com/)
[![Security](https://img.shields.io/badge/Security-First-red?style=flat&logo=shield&logoColor=white)](#security-features)
[![Development Status](https://img.shields.io/badge/Status-In%20Development-orange?style=flat)](#development-status)

> **A deterministic, secure password generation system that creates unique passwords for different platforms without storing them.**

SafePass generates strong, unique passwords for each platform using your master password and PIN, ensuring you never need to remember or store multiple passwords while maintaining maximum security.

## 🎯 **Project Overview**

SafePass implements a zero-storage password generation system where:
- **No passwords are stored** - Everything is generated deterministically
- **One master password + PIN** unlocks access to all your platform passwords
- **Each platform gets a unique password** - Generated using cryptographic hashing
- **Client-server architecture** with multiple security layers
- **Mobile-responsive** design with dark mode support

### 🏗️ **Architecture**

```
┌─────────────────┐    HTTPS/TLS     ┌─────────────────┐
│   React Client  │ ◄─────────────►  │  Express Server │
│                 │                  │                 │
│ • PIN Input     │   Encrypted      │ • Rate Limiting │
│ • Master Pass   │   Communication  │ • HMAC Verify   │
│ • Platform UI   │                  │ • PIN Auth      │
│ • SHA-256 Hash  │                  │ • Key Stretch   │
└─────────────────┘                  └─────────────────┘
```

## 🛠️ **Technology Stack**

### **Backend**
- **Framework:** Express.js 4.x
- **Security:** Helmet, bcryptjs, crypto-js, express-rate-limit
- **Validation:** express-validator
- **Environment:** dotenv configuration

### **Frontend**  
- **Framework:** React 18 with Vite
- **Styling:** Tailwind CSS with dark mode
- **HTTP Client:** Axios for API communication
- **Cryptography:** crypto-js for client-side hashing

### **Security**
- **Hashing:** bcrypt (PIN), SHA-256 (passwords), HMAC (integrity)
- **Key Stretching:** PBKDF2 for deterministic password generation
- **Session Management:** Cryptographically secure tokens
- **Rate Limiting:** Multi-layer protection against attacks

## 📁 **Project Structure**

```
SafePass/
├── backend/                   # Express.js API Server
│   ├── middleware/
│   ├── routes/
│   ├── server.js              # Main Express server
│   ├── package.json           # Backend dependencies
│   └── .env.example           # Environment configuration
│
├── frontend/                  # React + Vite Client
│   ├── src/
│   │   ├── components/        # UI components (ready for dev)
│   │   ├── hooks/             # Custom React hooks
│   │   ├── utils/             # Client-side utilities
│   │   ├── App.jsx            # Main app component
│   │   └── main.jsx           # React 18 root
│   ├── vite.config.js         # Vite configuration
│   ├── tailwind.config.js     # Tailwind with dark mode
│   └── package.json           # Frontend dependencies
│
└── docs/                      # Documentation
    └── development_log.md     # Detailed development log
```

## 🔒 **Security Features**

### **Multi-Layer Protection**
```
1. Rate Limiting (100 req/15min global)
2. Challenge Tokens (64-char hex, 5min TTL)
3. HMAC Verification (SHA-256 integrity)
4. PIN Authentication (bcrypt, IP lockout)
5. Session Management (256-bit entropy, timeout)
```

### **Authentication Flow**
```
Client Request
    ↓
Rate Limiting Check
    ↓
Challenge Token Generation
    ↓
HMAC Verification 
    ↓
PIN Authentication 
    ↓
Session Creation 
    ↓
Password Generation 
```

### **Implemented Security Measures**
- **🔒 PIN Protection:** bcrypt with 12 salt rounds
- **🛡️ Brute Force Prevention:** IP-based lockout after 5 failed attempts
- **⚡ Session Security:** 30-minute timeout with IP validation  
- **🔍 Request Monitoring:** Suspicious pattern detection (XSS, SQL injection)
- **📊 Memory Safety:** Automatic cleanup prevents resource exhaustion
- **🚫 Information Leakage:** Secure error handling without sensitive data exposure

## 🚀 **Quick Start**

### **Prerequisites**
- Node.js 18+ 
- npm or yarn
- Git

### **Installation**

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/SafePass.git
   cd SafePass
   ```

2. **Backend Setup**
   ```bash
   cd backend
   npm install
   cp .env.example .env
   # Edit .env with your configuration
   npm run dev
   ```

3. **Frontend Setup** (In new terminal)
   ```bash
   cd frontend  
   npm install
   cp .env.example .env
   npm run dev
   ```

4. **Access Application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3001
   - Health Check: http://localhost:3001/health

### **Environment Configuration**

#### **Backend (.env)**
```bash
# Server Configuration
PORT=3001
NODE_ENV=development
SERVER_SECRET=your-super-secret-key-here
CORS_ORIGIN=http://localhost:3000

# PIN Authentication
MASTER_PIN=123456
MAX_PIN_ATTEMPTS=5
PIN_LOCKOUT_DURATION=86400000
SESSION_TIMEOUT=1800000

# Security Settings  
CHALLENGE_TOKEN_EXPIRY=300000
CLEANUP_INTERVAL=60000
```

#### **Frontend (.env)**
```bash
VITE_API_URL=http://localhost:3001
VITE_APP_NAME=SafePass
```

# SafePass API Documentation

## Authentication Endpoints

### Get Challenge Token
```http
GET /api/challenge
```

**Request:**
```http
Method: GET
Headers: none
Body: none
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "a1b2c3d4e5f6789abcdef...64chars",
    "expiresAt": 1640995200000,
    "serverTime": 1640994900000
  }
}
```

**Features:**
- 64-character hex tokens (32 bytes entropy)
- 5-minute expiry with automatic cleanup
- One-time use validation
- IP-based token binding
- Rate limited: 20 requests/5 minutes

---

### Verify PIN (HMAC Protected)
```http
POST /api/auth/verify-pin
```

**Request:**
```http
Method: GET
Headers: Content-Type: application/json
Body: 
```
```json
{
  "pin": "12345"
}
```

**Success Response:**
```json
{
  "success": true,
  "message": "PIN verified successfully",
  "data": {
    "sessionId": "session-uuid",
    "expiresAt": 1690000300000
  }
}
```

**Error Responses:**
```json
// Invalid PIN
{
  "success": false,
  "error": "Invalid PIN",
  "code": "PIN_INCORRECT",
  "data": {
    "attemptsRemaining": 4,
    "lockoutTime": null
  }
}

// Account locked
{
  "success": false,
  "error": "Account locked due to too many failed attempts",
  "code": "ACCOUNT_LOCKED",
  "data": {
    "attemptsRemaining": 0,
    "lockoutTime": 1640995200000
  }
}

// HMAC verification failed
{
  "error": "Invalid HMAC signature",
  "code": "HMAC_INVALID"
}
```

**Security Features:**
- bcrypt PIN hashing with 12 salt rounds
- Failed attempt tracking (5 attempts → 24-hour lockout)
- HMAC request integrity verification
- Challenge token validation required
- Session creation with 30-minute timeout

---

### Check Session Status
```http
GET /api/auth/session-status
```

**Request:**
```http
Method: GET
Headers: X-Session-Id: session_id_from_login
Body: none
```

**Response:**
```json
{
  "success": true,
  "data": {
    "authenticated": true,
    "sessionId": "session_id_here",
    "serverTime": 1640994900000
  }
}
```

**Features:**
- No HMAC required (read-only endpoint)
- IP validation for session security
- Automatic timeout handling

---

### Logout (HMAC Protected)
```http
POST /api/auth/verify-pin
```

**Request:**
```http
Method: GET
Headers: Content-Type: application/json
Body: 
```
```json
{
  "sessionId": "session_id_to_invalidate"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

### Check Lockout Status
```http
GET /api/auth/lockout-status
```

**Request:**
```http
Method: GET
Headers: none
Body: none
```

**Response:**
```json
{
  "success": true,
  "data": {
    "isLocked": false,
    "attemptsRemaining": 5,
    "lockoutExpiresAt": null,
    "nextAttemptAllowedAt": null
  }
}
```

## Rate Limiting

### Global Rate Limits
- **All endpoints:** 100 requests per 15 minutes
- **Challenge endpoint:** 20 requests per 5 minutes  
- **Failed login attempts:** 5 attempts → 24-hour IP lockout

### Rate Limit Headers
All responses include:
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

## Security Headers

All responses include comprehensive security headers:
```http
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000; includeSubDomains
Content-Security-Policy: default-src 'self'
Referrer-Policy: strict-origin-when-cross-origin
X-Request-ID: unique-request-identifier
```

## Error Handling

### Standard Error Format
```json
{
  "error": "Human readable error message",
  "code": "MACHINE_READABLE_ERROR_CODE",
  "timestamp": 1640994900000,
  "requestId": "unique-request-id"
}
```

### Common Error Codes
- `RATE_LIMIT_EXCEEDED` - Too many requests
- `HMAC_MISSING` - Missing HMAC signature
- `HMAC_INVALID` - Invalid HMAC signature
- `TIMESTAMP_INVALID` - Invalid or missing timestamp
- `TIMESTAMP_EXPIRED` - Request outside time window
- `CHALLENGE_MISSING` - Missing challenge token
- `CHALLENGE_INVALID` - Invalid or expired challenge token
- `PIN_INVALID` - Invalid PIN format
- `PIN_INCORRECT` - Incorrect PIN
- `ACCOUNT_LOCKED` - Account locked due to failed attempts
- `SESSION_MISSING` - Missing session ID
- `SESSION_INVALID` - Invalid or expired session

### **Development Endpoints**
- `GET /api/challenge/stats` - Challenge token statistics
- `GET /api/auth/stats` - Authentication statistics
- `GET /health` - Server health check

## 🧪 **Testing**

### **Backend Testing**
```bash
cd backend

# Test health endpoint
curl http://localhost:3001/health

# Get challenge token
curl http://localhost:3001/api/challenge

# Test PIN verification (replace with actual tokens)
curl -X POST http://localhost:3001/api/auth/verify-pin \
  -H "Content-Type: application/json" \
  -d '{"pin":"123456","challengeToken":"...","hmac":"..."}'
```

### **Security Testing**
```bash
# Test rate limiting
for i in {1..150}; do curl http://localhost:3001/health; done

# Test PIN lockout
for i in {1..6}; do
  curl -X POST http://localhost:3001/api/auth/verify-pin \
    -H "Content-Type: application/json" \
    -d '{"pin":"wrong","challengeToken":"dummy","hmac":"dummy"}'
done
```

## 🤝 **Contributing**

This project is currently in active development. Contribution guidelines will be added once the core functionality is complete.

### **Development Workflow**
1. Follow the development log for current progress
2. Each feature is developed in dedicated sessions
3. Comprehensive testing before moving to next phase
4. Security-first approach in all implementations

## 📄 **License**

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔐 **Security Considerations**

### **Important Security Notes**
- **Never commit secrets** to version control
- **Use HTTPS in production** - HTTP is for development only
- **Change default PINs** before deployment
- **Regular security updates** - Keep dependencies updated
- **Rate limiting** prevents brute force attacks
- **Session management** prevents unauthorized access

### **Reporting Security Issues**
Please report security vulnerabilities privately to [security@yourproject.com] before public disclosure.

## 📞 **Support**

- **Documentation:** See `/docs/development_log.md` for detailed progress
- **Issues:** Use GitHub Issues for bug reports and feature requests
- **Development:** Follow the development log for current status

---

**⚠️ Development Notice:** This project is currently under active development. Features and APIs may change as development progresses. Check the development log for the most current status.

**🔒 Security Notice:** This is a security-focused application. Please review all security implementations and conduct proper testing before any production use.