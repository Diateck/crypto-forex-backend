const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
// Connect to PostgreSQL using Sequelize
const sequelize = require('./db');
sequelize.authenticate()
  .then(() => {
    console.log('✅ Connected to PostgreSQL');
  })
  .catch((err) => {
    console.error('❌ PostgreSQL connection error:', err);
  });
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet());

// If running behind a proxy (Render, Vercel, etc.), trust proxy so express-rate-limit
// and other middleware can read the correct client IP from X-Forwarded-For.
app.set('trust proxy', true);

// Professional CORS configuration - run before rate limiting so preflight requests
// receive the proper CORS headers and are not blocked by rate limiter.
const corsOptions = {
  origin: [
    'https://crypto-forex-frontend.vercel.app',
    process.env.FRONTEND_URL || 'http://localhost:3000'
  ],
  credentials: true,
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'cache-control'],
  preflightContinue: false,
  optionsSuccessStatus: 204
};
app.use(cors(corsOptions));
// Handle OPTIONS preflight for all routes using same cors options
app.options('*', cors(corsOptions));

// Rate limiting
// Create a keyGenerator that uses the authenticated user's id (if present) to avoid
// punishing multiple users behind the same NAT/IP. Fallback to IP address.
const keyGenerator = (req /*, res*/) => {
  try {
    const auth = req.headers.authorization;
    if (auth && auth.startsWith('Bearer ')) {
      const token = auth.split(' ')[1];
      // Try to decode token payload without verifying to extract userId
      const parts = token.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
        if (payload && payload.userId) return `user:${payload.userId}`;
      }
    }
  } catch (e) {
    // ignore and fallback to IP
  }
  return req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown';
};

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit per keyGenerator (user or IP)
  keyGenerator,
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false,
  handler: (req, res) => {
    res.set('Retry-After', String(Math.ceil(15 * 60))); // advise client to retry after window
    return res.status(429).json({
      success: false,
      message: 'Too many requests. Please slow down and try again later.'
    });
  }
});

// Register admin routes BEFORE rate limiter so they are NOT rate limited
app.use('/api/admin-auth', require('./routes/adminAuth').router);
app.use('/api/admin', require('./routes/admin'));

// Apply rate limiter to all other /api/ routes
app.use('/api/', limiter);

// Lightweight limiter for health endpoints to ensure they remain responsive
const healthLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // allow up to 60 pings per minute
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    return res.status(429).json({ success: false, message: 'Too many health checks' });
  }
});
app.use(['/ping', '/health', '/keep-alive', '/api/keep-alive'], healthLimiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging middleware
app.use(morgan('combined'));

// Keep-alive and performance tracking
let serverStartTime = new Date();
let lastHealthCheck = null;
let healthCheckCount = 0;
let totalResponseTime = 0;

// Enhanced health check endpoint for keep-alive system
app.get('/health', (req, res) => {
  const startTime = Date.now();
  
  healthCheckCount++;
  lastHealthCheck = new Date();
  
  // Calculate server uptime
  const uptime = Date.now() - serverStartTime.getTime();
  const uptimeFormatted = Math.floor(uptime / 1000 / 60); // minutes
  
  // Response time tracking
  const responseTime = Date.now() - startTime;
  totalResponseTime += responseTime;
  const avgResponseTime = Math.round(totalResponseTime / healthCheckCount);
  
  res.status(200).json({
    status: 'OK',
    message: 'Crypto Forex Trading API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    uptime: `${uptimeFormatted} minutes`,
    healthChecks: healthCheckCount,
    avgResponseTime: `${avgResponseTime}ms`,
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB',
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + 'MB'
    },
    keepAlive: {
      lastCheck: lastHealthCheck,
      frequency: 'Every 5 minutes',
      purpose: 'Prevent server cold start'
    }
  });
});

// Lightweight keep-alive endpoint (faster response)
app.get('/ping', (req, res) => {
  res.status(200).json({
    status: 'alive',
    timestamp: Date.now(),
    pong: true
  });
});

// Keep-alive stats endpoint
app.get('/keep-alive-stats', (req, res) => {
  const uptime = Date.now() - serverStartTime.getTime();
  
  res.status(200).json({
    serverStartTime: serverStartTime.toISOString(),
    uptime: Math.floor(uptime / 1000 / 60), // minutes
    lastHealthCheck: lastHealthCheck,
    totalHealthChecks: healthCheckCount,
    avgResponseTime: healthCheckCount > 0 ? Math.round(totalResponseTime / healthCheckCount) : 0,
    memory: process.memoryUsage(),
    status: 'healthy'
  });
});

// API Routes
app.use('/api/auth', require('./routes/userAuth')); // User authentication routes
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/deposits', require('./routes/deposits'));
app.use('/api/withdrawals', require('./routes/withdrawals'));
app.use('/api/trading', require('./routes/trading'));
app.use('/api/market', require('./routes/market'));
app.use('/api/copy-trading', require('./routes/copyTrading'));
app.use('/api/plans', require('./routes/plans')); // Investment plans
app.use('/api/kyc', require('./routes/kyc')); // KYC verification
app.use('/api/referrals', require('./routes/referrals')); // Referral system
app.use('/api/loans', require('./routes/loans')); // Loan applications
// ...admin routes registered above, not rate limited...

// Keep-alive routes (both with and without /api prefix for flexibility)
app.use('/keep-alive', require('./routes/keepAlive'));
app.use('/api/keep-alive', require('./routes/keepAlive'));

// Keep-alive optimizations
setInterval(() => {
  // Keep event loop active
  const used = process.memoryUsage();
  console.log(`🔄 Keep-alive heartbeat - Memory: ${Math.round(used.heapUsed / 1024 / 1024)}MB`);
}, 4 * 60 * 1000); // Every 4 minutes

// Prevent process from sleeping
setInterval(() => {
  // Light CPU activity to prevent hibernation
  Date.now();
}, 30 * 1000); // Every 30 seconds

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found'
  });
});

// Global error handler - centralized JSON response middleware
const jsonErrorHandler = require('./middleware/jsonErrorHandler');
app.use(jsonErrorHandler);

// Start server
// Ensure database tables are created, then start server
sequelize.sync({ alter: true })
  .then(() => {
    console.log('✅ Database synchronized');
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔗 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
    });
  })
  .catch((err) => {
    console.error('❌ Database synchronization error:', err);
    // Still attempt to start server so health checks can show up; but registration/login will fail until DB is reachable
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT} (DB sync failed)`);
    });
  });

module.exports = app;