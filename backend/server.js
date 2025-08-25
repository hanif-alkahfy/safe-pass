// backend/server.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

// Import security middleware
const {
  createAdvancedRateLimiter,
  trackFailedAttempts,
  enhancedSecurityHeaders,
  securityLogger
} = require('./middleware/security');

// Import routes
const challengeRoutes = require('./routes/challenge');

const app = express();
const PORT = process.env.PORT || 3001;

// Trust proxy for accurate IP addresses
app.set('trust proxy', 1);

// Enhanced Security Headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "http://localhost:3000", "ws://localhost:3000"],
      fontSrc: ["'self'", "https:", "data:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false, // Allow for development
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// Additional custom security headers
app.use(enhancedSecurityHeaders);

// CORS configuration for Vite dev server
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-Challenge-Token', 
    'X-HMAC-Signature',
    'X-CSRF-Token',
    'X-Session-Token'
  ],
  exposedHeaders: [
    'X-Request-ID',
    'X-Rate-Limit-Limit',
    'X-Rate-Limit-Remaining',
    'X-Rate-Limit-Reset'
  ],
  optionsSuccessStatus: 200
}));

// Security logging middleware
app.use(securityLogger);

// Failed attempt tracking
app.use(trackFailedAttempts);

// Global rate limiting (less restrictive for general endpoints)
const globalRateLimiter = createAdvancedRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per 15 minutes
  message: 'Too many requests from this IP, please try again later',
  skipSuccessfulRequests: false,
  skipFailedRequests: false
});

app.use(globalRateLimiter);

// Body parser middleware with size limits
app.use(express.json({ 
  limit: '10kb',
  strict: true,
  type: 'application/json'
}));

app.use(express.urlencoded({ 
  extended: true, 
  limit: '10kb',
  parameterLimit: 20 
}));

// Health check endpoint (before rate limiting for monitoring)
app.get('/health', (req, res) => {
  const uptime = process.uptime();
  const memoryUsage = process.memoryUsage();
  
  res.status(200).json({ 
    status: 'OK',
    uptime: `${Math.floor(uptime / 60)}m ${Math.floor(uptime % 60)}s`,
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV,
    memory: {
      used: Math.round(memoryUsage.heapUsed / 1024 / 1024) + 'MB',
      total: Math.round(memoryUsage.heapTotal / 1024 / 1024) + 'MB'
    },
    // Include token stats in development
    ...(process.env.NODE_ENV === 'development' && {
      tokenStats: require('./middleware/security').challengeTokenManager.getStats()
    })
  });
});

// API Routes
app.use('/api', challengeRoutes);

// Catch-all for undefined API routes
app.use('/api/*', (req, res) => {
  console.log(`❌ 404 - API route not found: ${req.method} ${req.path} from IP: ${req.ip}`);
  
  res.status(404).json({
    error: 'API endpoint not found',
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString(),
    suggestion: 'Check the API documentation for available endpoints'
  });
});

// Global error handler
app.use((err, req, res, next) => {
  const requestId = res.getHeader('X-Request-ID');
  
  console.error(`💥 Global Error Handler [${requestId}]:`, {
    error: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    url: req.url,
    method: req.method,
    ip: req.ip,
    timestamp: new Date().toISOString()
  });

  // Don't leak error details in production
  const errorResponse = {
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : err.message,
    requestId,
    timestamp: new Date().toISOString(),
    ...(process.env.NODE_ENV === 'development' && {
      stack: err.stack,
      details: err
    })
  };

  res.status(err.status || 500).json(errorResponse);
});

// 404 handler for non-API routes
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString(),
    message: 'This is an API server. Use /api/* endpoints.'
  });
});

// Graceful shutdown handling
process.on('SIGTERM', () => {
  console.log('🔄 SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🔄 SIGINT received, shutting down gracefully...');
  process.exit(0);
});

// Start server
app.listen(PORT, () => {
  console.log('🚀 SafePass backend server started successfully!');
  console.log(`📡 Port: ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
  console.log(`🔒 CORS origin: ${process.env.CORS_ORIGIN}`);
  console.log(`⚡ Ready for Vite frontend connection`);
  console.log(`🛡️  Security middleware active:`);
  console.log(`   • Rate limiting: ${process.env.RATE_LIMIT_MAX_REQUESTS || 100} req/15min`);
  console.log(`   • Failed attempt tracking: ${process.env.MAX_FAILED_ATTEMPTS || 5} attempts`);
  console.log(`   • Challenge token expiry: ${(process.env.CHALLENGE_TOKEN_EXPIRY || 300000) / 1000}s`);
  console.log(`   • Request size limit: 10kb`);
  console.log(`   • Enhanced security headers active`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
});

module.exports = app;