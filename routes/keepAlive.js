const express = require('express');
const router = express.Router();

// Server statistics
let routeStats = {
  healthChecks: 0,
  pingChecks: 0,
  startTime: new Date(),
  lastPing: null,
  avgResponseTimes: []
};

// Enhanced health check with detailed server info
router.get('/health', (req, res) => {
  const startTime = Date.now();
  routeStats.healthChecks++;
  
  const uptime = Date.now() - routeStats.startTime.getTime();
  const responseTime = Date.now() - startTime;
  
  // Track response times (keep last 100)
  routeStats.avgResponseTimes.push(responseTime);
  if (routeStats.avgResponseTimes.length > 100) {
    routeStats.avgResponseTimes.shift();
  }
  
  const avgResponseTime = routeStats.avgResponseTimes.length > 0 
    ? Math.round(routeStats.avgResponseTimes.reduce((a, b) => a + b, 0) / routeStats.avgResponseTimes.length)
    : responseTime;

  res.status(200).json({
    status: 'OK',
    message: 'Crypto Forex Trading API - Keep Alive Active',
    timestamp: new Date().toISOString(),
    server: {
      uptime: Math.floor(uptime / 1000 / 60), // minutes
      startTime: routeStats.startTime.toISOString(),
      environment: process.env.NODE_ENV || 'development',
      nodeVersion: process.version
    },
    performance: {
      healthChecks: routeStats.healthChecks,
      pingChecks: routeStats.pingChecks,
      currentResponseTime: `${responseTime}ms`,
      avgResponseTime: `${avgResponseTime}ms`,
      lastPing: routeStats.lastPing
    },
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
      external: Math.round(process.memoryUsage().external / 1024 / 1024),
      unit: 'MB'
    },
    keepAlive: {
      status: 'active',
      strategy: 'aggressive',
      intervals: {
        normal: '5 minutes',
        active: '3 minutes', 
        emergency: '2 minutes'
      },
      purpose: 'Prevent cold starts on free hosting'
    }
  });
});

// Ultra-fast ping endpoint for frequent checks
router.get('/ping', (req, res) => {
  routeStats.pingChecks++;
  routeStats.lastPing = new Date().toISOString();
  
  res.status(200).json({
    pong: true,
    timestamp: Date.now(),
    count: routeStats.pingChecks
  });
});

// Keep-alive statistics endpoint
router.get('/stats', (req, res) => {
  const uptime = Date.now() - routeStats.startTime.getTime();
  
  res.status(200).json({
    server: {
      uptime: {
        milliseconds: uptime,
        minutes: Math.floor(uptime / 1000 / 60),
        hours: Math.floor(uptime / 1000 / 60 / 60),
        formatted: `${Math.floor(uptime / 1000 / 60)} minutes`
      },
      startTime: routeStats.startTime.toISOString(),
      lastPing: routeStats.lastPing
    },
    requests: {
      totalHealthChecks: routeStats.healthChecks,
      totalPings: routeStats.pingChecks,
      total: routeStats.healthChecks + routeStats.pingChecks
    },
    performance: {
      avgResponseTime: routeStats.avgResponseTimes.length > 0 
        ? Math.round(routeStats.avgResponseTimes.reduce((a, b) => a + b, 0) / routeStats.avgResponseTimes.length)
        : 0,
      responseTimeSamples: routeStats.avgResponseTimes.length
    },
    memory: process.memoryUsage(),
    keepAliveStatus: 'healthy'
  });
});

// Reset stats endpoint (for debugging)
router.post('/reset-stats', (req, res) => {
  routeStats = {
    healthChecks: 0,
    pingChecks: 0,
    startTime: new Date(),
    lastPing: null,
    avgResponseTimes: []
  };
  
  res.json({ 
    message: 'Keep-alive statistics reset',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;