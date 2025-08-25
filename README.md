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

## 🚀 **Current Development Status**

### ✅ **Completed Features (Day 1-2)**

#### **Backend Core (100% Complete)**
- [x] **Express Server Setup** - Security-hardened with Helmet, CORS, Rate Limiting
- [x] **Challenge Token System** - Cryptographically secure tokens with TTL cleanup
- [x] **PIN Authentication** - bcrypt hashing with IP-based lockout protection
- [x] **Session Management** - Secure 64-character session IDs with timeout
- [x] **Security Middleware** - CSRF protection, request logging, suspicious pattern detection
- [x] **Rate Limiting** - Multi-layer protection (global + endpoint-specific)

#### **Security Features (100% Complete)**
- [x] **IP Lockout Protection** - 5 failed attempts → 24-hour lockout
- [x] **Session Timeout** - 30-minute automatic logout
- [x] **Request Validation** - Comprehensive input sanitization
- [x] **Memory Management** - Automatic cleanup of expired tokens/sessions
- [x] **Security Headers** - CSP, frame options, content type protection

#### **Frontend Setup (100% Complete)**
- [x] **Vite + React 18** - Modern build system with HMR
- [x] **Tailwind CSS** - Utility-first styling with dark mode
- [x] **Project Structure** - Component-based architecture ready
- [x] **Backend Connectivity** - Real-time connection status monitoring

### 🚧 **In Progress (Day 2)**

#### **Next Implementation: HMAC Verification System**
- [ ] HMAC verification function with SHA-256
- [ ] HMAC middleware for protected routes  
- [ ] Challenge token integration in HMAC validation
- [ ] Complete authentication flow integration
- [ ] Password generation core logic

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
├── backend/                    # Express.js API Server
│   ├── middleware/
│   │   ├── security.js        # ✅ Security middleware & challenge tokens
│   │   └── pinAuth.js         # ✅ PIN authentication & session mgmt
│   ├── routes/
│   │   ├── challenge.js       # ✅ Challenge token endpoints
│   │   └── pinAuth.js         # ✅ PIN authentication endpoints
│   ├── server.js              # ✅ Main Express server
│   ├── package.json           # ✅ Backend dependencies
│   └── .env.example           # ✅ Environment configuration
│
├── frontend/                   # React + Vite Client
│   ├── src/
│   │   ├── components/        # 🚧 UI components (ready for dev)
│   │   ├── hooks/            # 🚧 Custom React hooks
│   │   ├── utils/            # 🚧 Client-side utilities
│   │   ├── App.jsx           # ✅ Main app component
│   │   └── main.jsx          # ✅ React 18 root
│   ├── vite.config.js        # ✅ Vite configuration
│   ├── tailwind.config.js    # ✅ Tailwind with dark mode
│   └── package.json          # ✅ Frontend dependencies
│
└── docs/                      # 📚 Documentation
    └── development_log.md     # ✅ Detailed development log
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
HMAC Verification (🚧 Next)
    ↓
PIN Authentication ✅
    ↓
Session Creation ✅
    ↓
Password Generation (🚧 Coming)
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

## 📡 **API Documentation**

### **Authentication Endpoints**

#### **Get Challenge Token**
```http
GET /api/challenge
```
**Response:**
```json
{
  "success": true,
  "token": "a1b2c3...64chars",
  "expiresIn": 300,
  "csrfToken": "csrf_token_here"
}
```

#### **Verify PIN**
```http
POST /api/auth/verify-pin
Content-Type: application/json

{
  "pin": "123456",
  "challengeToken": "challenge_token_here",
  "hmac": "hmac_signature_here"
}
```

**Success Response:**
```json
{
  "success": true,
  "message": "PIN verified successfully",
  "sessionId": "session_id_here",
  "expiresIn": 1800
}
```

#### **Check Session Status**
```http
GET /api/auth/session-status
X-Session-Id: your_session_id_here
```

#### **Logout**
```http
POST /api/auth/logout  
X-Session-Id: your_session_id_here
```

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

## 📋 **Development Roadmap**

### **Week 1 Sprint Progress**

#### **Days 1-2: Backend Foundation ✅ COMPLETED**
- [x] Project setup and structure
- [x] Security middleware implementation  
- [x] Challenge token system
- [x] PIN authentication with session management

#### **Day 2 (Afternoon): HMAC Verification 🚧 IN PROGRESS**
- [ ] HMAC verification middleware
- [ ] Protected route integration
- [ ] Complete authentication flow

#### **Days 3-4: Frontend & Integration 📅 PLANNED**
- [ ] React UI components (PIN input, platform selector)
- [ ] Frontend authentication flow
- [ ] Password generation integration
- [ ] Mobile-responsive design

#### **Days 5-6: Advanced Features 📅 PLANNED**
- [ ] Password strength indicators
- [ ] Platform presets (Gmail, Discord, etc.)
- [ ] Export functionality
- [ ] Comprehensive testing

#### **Day 7: Deployment Prep 📅 PLANNED**
- [ ] Production configuration
- [ ] Security audit
- [ ] Documentation completion
- [ ] Deployment setup

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