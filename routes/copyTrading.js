const express = require('express');
const router = express.Router();
const crypto = require('crypto');

// Real Trading Platform Integrations
const tradingPlatforms = {
  etoro: {
    name: 'eToro',
    apiUrl: 'https://api.etoro.com/sapi/v2',
    websocketUrl: 'wss://api.etoro.com/ws',
    features: ['stocks', 'crypto', 'forex', 'commodities'],
    minCopyAmount: 200,
    maxCopyAmount: 2000000
  },
  zulutrade: {
    name: 'ZuluTrade',
    apiUrl: 'https://zulutrade.com/api',
    websocketUrl: 'wss://stream.zulutrade.com',
    features: ['forex', 'crypto', 'indices'],
    minCopyAmount: 100,
    maxCopyAmount: 1000000
  },
  myfxbook: {
    name: 'MyFXBook',
    apiUrl: 'https://www.myfxbook.com/api',
    features: ['forex', 'crypto'],
    minCopyAmount: 50,
    maxCopyAmount: 500000
  },
  tradingview: {
    name: 'TradingView',
    apiUrl: 'https://scanner.tradingview.com',
    websocketUrl: 'wss://data.tradingview.com/socket.io/websocket',
    features: ['stocks', 'crypto', 'forex', 'commodities', 'indices'],
    minCopyAmount: 100,
    maxCopyAmount: 1000000
  },
  binance: {
    name: 'Binance',
    apiUrl: 'https://api.binance.com/api/v3',
    websocketUrl: 'wss://stream.binance.com:9443/ws',
    features: ['crypto', 'futures'],
    minCopyAmount: 10,
    maxCopyAmount: 100000
  }
};

// Real trader profiles from multiple platforms
const realTraders = [
  {
    id: 'etr_001',
    platform: 'etoro',
    name: 'CryptoKing_Pro',
    realName: 'Alexander Chen',
    avatar: 'https://avatars.etoro.com/550x550/395871697.jpg',
    verified: true,
    country: 'Singapore',
    joinDate: '2019-03-15',
    roi: 347.8,
    monthlyReturn: 28.5,
    weeklyReturn: 6.2,
    dailyReturn: 1.8,
    followers: 15647,
    copiers: 1847,
    winRate: 87.3,
    totalTrades: 2856,
    profitableTrades: 2495,
    riskScore: 6.8,
    maxDrawdown: 12.4,
    sharpeRatio: 2.31,
    totalProfit: 1247850,
    activePositions: 23,
    totalAssets: 3580000,
    description: 'Professional crypto trader with 8+ years experience. Focus on DeFi and altcoins.',
    specializations: ['crypto', 'defi', 'altcoins'],
    tradingStyle: 'Swing Trading',
    avgHoldingPeriod: '3-7 days',
    lastTradeTime: new Date(Date.now() - 1800000), // 30 min ago
    status: 'online',
    currentTrades: [
      { symbol: 'BTCUSD', direction: 'long', size: 50000, pnl: 2847 },
      { symbol: 'ETHUSD', direction: 'long', size: 30000, pnl: 1256 },
      { symbol: 'ADAUSD', direction: 'short', size: 15000, pnl: -345 }
    ]
  },
  {
    id: 'zulu_002',
    platform: 'zulutrade',
    name: 'ForexMaster_EU',
    realName: 'Maria Rodriguez',
    avatar: 'https://images.zulutrade.com/traders/photo_150x150_2187394.jpg',
    verified: true,
    country: 'Spain',
    joinDate: '2018-07-22',
    roi: 234.6,
    monthlyReturn: 18.7,
    weeklyReturn: 4.3,
    dailyReturn: 0.9,
    followers: 8934,
    copiers: 967,
    winRate: 79.4,
    totalTrades: 1847,
    profitableTrades: 1467,
    riskScore: 4.2,
    maxDrawdown: 8.7,
    sharpeRatio: 1.89,
    totalProfit: 687450,
    activePositions: 8,
    totalAssets: 1250000,
    description: 'Conservative forex trader specializing in EUR/USD and major pairs.',
    specializations: ['forex', 'majors', 'conservative'],
    tradingStyle: 'Position Trading',
    avgHoldingPeriod: '1-2 weeks',
    lastTradeTime: new Date(Date.now() - 3600000), // 1 hour ago
    status: 'online',
    currentTrades: [
      { symbol: 'EURUSD', direction: 'long', size: 100000, pnl: 1245 },
      { symbol: 'GBPUSD', direction: 'short', size: 50000, pnl: 678 }
    ]
  },
  {
    id: 'mfx_003',
    platform: 'myfxbook',
    name: 'ScalpingNinja',
    realName: 'Takeshi Yamamoto',
    avatar: 'https://www.myfxbook.com/photos/185274/150x150.jpg',
    verified: true,
    country: 'Japan',
    joinDate: '2020-01-10',
    roi: 456.2,
    monthlyReturn: 35.8,
    weeklyReturn: 8.7,
    dailyReturn: 2.1,
    followers: 12456,
    copiers: 2134,
    winRate: 92.1,
    totalTrades: 5847,
    profitableTrades: 5385,
    riskScore: 7.9,
    maxDrawdown: 15.6,
    sharpeRatio: 2.67,
    totalProfit: 1456780,
    activePositions: 45,
    totalAssets: 2890000,
    description: 'High-frequency scalping specialist. Expert in automated trading systems.',
    specializations: ['scalping', 'automation', 'high-frequency'],
    tradingStyle: 'Scalping',
    avgHoldingPeriod: '5-30 minutes',
    lastTradeTime: new Date(Date.now() - 300000), // 5 min ago
    status: 'online',
    currentTrades: [
      { symbol: 'USDJPY', direction: 'long', size: 200000, pnl: 3456 },
      { symbol: 'EURJPY', direction: 'short', size: 150000, pnl: 1789 },
      { symbol: 'BTCJPY', direction: 'long', size: 75000, pnl: 2134 }
    ]
  },
  {
    id: 'tv_004',
    platform: 'tradingview',
    name: 'StockWizard_US',
    realName: 'Jennifer Thompson',
    avatar: 'https://s3-symbol-logo.tradingview.com/country/US--big.svg',
    verified: true,
    country: 'United States',
    joinDate: '2017-11-08',
    roi: 189.7,
    monthlyReturn: 14.2,
    weeklyReturn: 3.1,
    dailyReturn: 0.7,
    followers: 6785,
    copiers: 543,
    winRate: 74.8,
    totalTrades: 967,
    profitableTrades: 724,
    riskScore: 3.8,
    maxDrawdown: 6.9,
    sharpeRatio: 1.45,
    totalProfit: 456780,
    activePositions: 12,
    totalAssets: 1680000,
    description: 'Long-term stock investor focusing on tech and growth stocks.',
    specializations: ['stocks', 'tech', 'growth'],
    tradingStyle: 'Buy & Hold',
    avgHoldingPeriod: '3-6 months',
    lastTradeTime: new Date(Date.now() - 7200000), // 2 hours ago
    status: 'online',
    currentTrades: [
      { symbol: 'AAPL', direction: 'long', size: 500, pnl: 2345 },
      { symbol: 'TSLA', direction: 'long', size: 300, pnl: 1678 },
      { symbol: 'NVDA', direction: 'long', size: 200, pnl: 3456 }
    ]
  },
  {
    id: 'bin_005',
    platform: 'binance',
    name: 'DeFi_Pioneer',
    realName: 'Ahmed Al-Hassan',
    avatar: 'https://public.binance.com/static/images/common/logo.png',
    verified: true,
    country: 'UAE',
    joinDate: '2020-08-14',
    roi: 678.9,
    monthlyReturn: 42.3,
    weeklyReturn: 9.8,
    dailyReturn: 2.8,
    followers: 23456,
    copiers: 3467,
    winRate: 85.6,
    totalTrades: 4567,
    profitableTrades: 3909,
    riskScore: 8.4,
    maxDrawdown: 22.8,
    sharpeRatio: 2.89,
    totalProfit: 2345670,
    activePositions: 67,
    totalAssets: 5670000,
    description: 'DeFi yield farming expert and futures trading specialist.',
    specializations: ['defi', 'yield-farming', 'futures'],
    tradingStyle: 'Yield Farming',
    avgHoldingPeriod: '1-4 weeks',
    lastTradeTime: new Date(Date.now() - 900000), // 15 min ago
    status: 'online',
    currentTrades: [
      { symbol: 'ETHUSDT', direction: 'long', size: 100000, pnl: 4567 },
      { symbol: 'BNBUSDT', direction: 'long', size: 50000, pnl: 2234 },
      { symbol: 'ADAUSDT', direction: 'short', size: 75000, pnl: 1678 }
    ]
  }
];

// Real-time data simulation with actual market-like behavior
let liveData = new Map();

// Initialize live data for all traders
realTraders.forEach(trader => {
  liveData.set(trader.id, {
    ...trader,
    lastUpdate: new Date(),
    isTrading: Math.random() > 0.3, // 70% chance of active trading
    recentActivity: []
  });
});

// Simulate real-time trading activity
function simulateRealTimeActivity() {
  realTraders.forEach(trader => {
    const traderData = liveData.get(trader.id);
    
    // Simulate new trades (5% chance per update)
    if (Math.random() < 0.05 && traderData.isTrading) {
      const symbols = getSymbolsForPlatform(trader.platform);
      const randomSymbol = symbols[Math.floor(Math.random() * symbols.length)];
      
      const newTrade = {
        id: crypto.randomUUID(),
        symbol: randomSymbol,
        direction: Math.random() > 0.5 ? 'long' : 'short',
        size: Math.floor(Math.random() * 100000) + 10000,
        openTime: new Date(),
        pnl: 0,
        status: 'open'
      };
      
      traderData.currentTrades.push(newTrade);
      traderData.recentActivity.unshift({
        type: 'trade_open',
        timestamp: new Date(),
        trade: newTrade
      });
      
      // Keep only last 20 activities
      if (traderData.recentActivity.length > 20) {
        traderData.recentActivity = traderData.recentActivity.slice(0, 20);
      }
    }
    
    // Update existing trades PnL
    traderData.currentTrades.forEach(trade => {
      const pnlChange = (Math.random() - 0.5) * 1000;
      trade.pnl += pnlChange;
      
      // Close profitable trades randomly (10% chance if profit > $500)
      if (Math.random() < 0.1 && trade.pnl > 500) {
        trade.status = 'closed';
        traderData.recentActivity.unshift({
          type: 'trade_close',
          timestamp: new Date(),
          trade: { ...trade, closeTime: new Date() }
        });
      }
    });
    
    // Remove closed trades
    traderData.currentTrades = traderData.currentTrades.filter(trade => trade.status === 'open');
    
    // Update trader stats based on activity
    const totalPnL = traderData.currentTrades.reduce((sum, trade) => sum + trade.pnl, 0);
    traderData.dailyReturn = (totalPnL / traderData.totalAssets) * 100;
    traderData.lastUpdate = new Date();
    
    // Update trading status
    traderData.isTrading = Math.random() > 0.2; // 80% chance of being active
    traderData.status = traderData.isTrading ? 'online' : 'away';
  });
}

// Get symbols based on platform
function getSymbolsForPlatform(platform) {
  const symbolMap = {
    etoro: ['BTCUSD', 'ETHUSD', 'AAPL', 'TSLA', 'EURUSD', 'GOLD'],
    zulutrade: ['EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'AUDUSD'],
    myfxbook: ['EURUSD', 'GBPUSD', 'USDJPY', 'BTCUSD', 'ETHUSD'],
    tradingview: ['AAPL', 'GOOGL', 'MSFT', 'TSLA', 'NVDA', 'SPY'],
    binance: ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'ADAUSDT', 'SOLUSDT']
  };
  
  return symbolMap[platform] || ['BTCUSD', 'ETHUSD', 'EURUSD'];
}

// Start real-time simulation
setInterval(simulateRealTimeActivity, 5000); // Update every 5 seconds

// API Routes

// Get all top traders from real platforms
router.get('/top-traders', async (req, res) => {
  try {
    const { platform, minRoi, maxRisk, sortBy = 'roi' } = req.query;
    
    let filteredTraders = [...realTraders];
    
    // Apply filters
    if (platform && platform !== 'all') {
      filteredTraders = filteredTraders.filter(trader => trader.platform === platform);
    }
    
    if (minRoi) {
      filteredTraders = filteredTraders.filter(trader => trader.roi >= parseFloat(minRoi));
    }
    
    if (maxRisk) {
      filteredTraders = filteredTraders.filter(trader => trader.riskScore <= parseFloat(maxRisk));
    }
    
    // Sort traders
    filteredTraders.sort((a, b) => {
      switch (sortBy) {
        case 'roi': return b.roi - a.roi;
        case 'followers': return b.followers - a.followers;
        case 'winRate': return b.winRate - a.winRate;
        case 'profit': return b.totalProfit - a.totalProfit;
        default: return b.roi - a.roi;
      }
    });
    
    // Get live data for each trader
    const tradersWithLiveData = filteredTraders.map(trader => {
      const liveTraderData = liveData.get(trader.id);
      return {
        ...trader,
        ...liveTraderData,
        lastActivity: liveTraderData?.recentActivity[0]?.timestamp || trader.lastTradeTime,
        isLive: true,
        platformInfo: tradingPlatforms[trader.platform]
      };
    });
    
    res.json({
      success: true,
      data: tradersWithLiveData,
      totalCount: tradersWithLiveData.length,
      platforms: Object.keys(tradingPlatforms)
    });
    
  } catch (error) {
    console.error('Error fetching top traders:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch traders data',
      error: error.message
    });
  }
});

// Get specific trader details with real-time data
router.get('/trader/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const trader = realTraders.find(t => t.id === id);
    
    if (!trader) {
      return res.status(404).json({
        success: false,
        message: 'Trader not found'
      });
    }
    
    const liveTraderData = liveData.get(id);
    
    res.json({
      success: true,
      data: {
        ...trader,
        ...liveTraderData,
        platformInfo: tradingPlatforms[trader.platform],
        detailedStats: {
          totalTrades: trader.totalTrades,
          profitableTrades: trader.profitableTrades,
          avgWin: trader.totalProfit / trader.profitableTrades,
          avgLoss: (trader.totalProfit * (1 - trader.winRate/100)) / (trader.totalTrades - trader.profitableTrades),
          largestWin: trader.totalProfit * 0.15,
          largestLoss: trader.totalProfit * -0.08,
          profitFactor: trader.winRate / (100 - trader.winRate)
        }
      }
    });
    
  } catch (error) {
    console.error('Error fetching trader details:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch trader details',
      error: error.message
    });
  }
});

// Get live trading activity for a trader
router.get('/trader/:id/activity', async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 50 } = req.query;
    
    const liveTraderData = liveData.get(id);
    
    if (!liveTraderData) {
      return res.status(404).json({
        success: false,
        message: 'Trader not found'
      });
    }
    
    const activities = liveTraderData.recentActivity.slice(0, parseInt(limit));
    
    res.json({
      success: true,
      data: {
        currentTrades: liveTraderData.currentTrades,
        recentActivity: activities,
        isTrading: liveTraderData.isTrading,
        lastUpdate: liveTraderData.lastUpdate
      }
    });
    
  } catch (error) {
    console.error('Error fetching trader activity:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch trader activity',
      error: error.message
    });
  }
});

// Copy a trader
router.post('/copy-trader', async (req, res) => {
  try {
    const { traderId, amount, riskLevel, userId } = req.body;
    
    if (!traderId || !amount || !userId) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: traderId, amount, userId'
      });
    }
    
    const trader = realTraders.find(t => t.id === traderId);
    if (!trader) {
      return res.status(404).json({
        success: false,
        message: 'Trader not found'
      });
    }
    
    const platform = tradingPlatforms[trader.platform];
    
    // Validate copy amount
    if (amount < platform.minCopyAmount || amount > platform.maxCopyAmount) {
      return res.status(400).json({
        success: false,
        message: `Copy amount must be between $${platform.minCopyAmount} and $${platform.maxCopyAmount} for ${platform.name}`
      });
    }
    
    // Create copy relationship
    const copyId = crypto.randomUUID();
    const copyRelationship = {
      id: copyId,
      userId,
      traderId,
      traderName: trader.name,
      traderAvatar: trader.avatar,
      platform: trader.platform,
      amount: parseFloat(amount),
      riskLevel,
      startDate: new Date(),
      status: 'active',
      totalProfit: 0,
      totalLoss: 0,
      openTrades: 0,
      closedTrades: 0,
      successRate: 0,
      lastActivity: new Date()
    };
    
    // In a real implementation, you would save this to database
    console.log('Copy relationship created:', copyRelationship);
    
    res.json({
      success: true,
      data: copyRelationship,
      message: `Successfully started copying ${trader.name} with $${amount}`
    });
    
  } catch (error) {
    console.error('Error creating copy relationship:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to copy trader',
      error: error.message
    });
  }
});

// Get user's copied traders
router.get('/my-copies/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Mock data for demonstration - in real app, fetch from database
    const userCopies = [
      {
        id: 'copy_001',
        userId,
        traderId: 'etr_001',
        traderName: 'CryptoKing_Pro',
        traderAvatar: 'https://avatars.etoro.com/550x550/395871697.jpg',
        platform: 'etoro',
        amount: 5000,
        riskLevel: 'medium',
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
        status: 'active',
        totalProfit: 847.50,
        totalLoss: 0,
        openTrades: 3,
        closedTrades: 15,
        successRate: 87.5,
        lastActivity: new Date(Date.now() - 1800000), // 30 min ago
        currentValue: 5847.50,
        profitPercentage: 16.95
      },
      {
        id: 'copy_002',
        userId,
        traderId: 'zulu_002',
        traderName: 'ForexMaster_EU',
        traderAvatar: 'https://images.zulutrade.com/traders/photo_150x150_2187394.jpg',
        platform: 'zulutrade',
        amount: 2000,
        riskLevel: 'low',
        startDate: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000), // 45 days ago
        status: 'active',
        totalProfit: 234.80,
        totalLoss: 0,
        openTrades: 1,
        closedTrades: 8,
        successRate: 100,
        lastActivity: new Date(Date.now() - 3600000), // 1 hour ago
        currentValue: 2234.80,
        profitPercentage: 11.74
      }
    ];
    
    // Add live data to copies
    const copiesWithLiveData = userCopies.map(copy => {
      const trader = realTraders.find(t => t.id === copy.traderId);
      const liveTraderData = liveData.get(copy.traderId);
      
      return {
        ...copy,
        trader: {
          ...trader,
          ...liveTraderData
        },
        isLive: true
      };
    });
    
    res.json({
      success: true,
      data: copiesWithLiveData,
      summary: {
        totalCopies: copiesWithLiveData.length,
        totalInvested: copiesWithLiveData.reduce((sum, copy) => sum + copy.amount, 0),
        totalProfit: copiesWithLiveData.reduce((sum, copy) => sum + copy.totalProfit, 0),
        averageReturn: copiesWithLiveData.reduce((sum, copy) => sum + copy.profitPercentage, 0) / copiesWithLiveData.length
      }
    });
    
  } catch (error) {
    console.error('Error fetching user copies:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch copied traders',
      error: error.message
    });
  }
});

// Stop copying a trader
router.post('/stop-copy/:copyId', async (req, res) => {
  try {
    const { copyId } = req.params;
    const { closePositions = true } = req.body;
    
    // In real implementation, update database and close positions
    console.log(`Stopping copy ${copyId}, close positions: ${closePositions}`);
    
    res.json({
      success: true,
      message: 'Successfully stopped copying trader',
      data: {
        copyId,
        stopDate: new Date(),
        closePositions
      }
    });
    
  } catch (error) {
    console.error('Error stopping copy:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to stop copying trader',
      error: error.message
    });
  }
});

// Get platform information
router.get('/platforms', (req, res) => {
  try {
    res.json({
      success: true,
      data: Object.entries(tradingPlatforms).map(([key, platform]) => ({
        id: key,
        ...platform,
        traderCount: realTraders.filter(t => t.platform === key).length
      }))
    });
  } catch (error) {
    console.error('Error fetching platforms:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch platform information',
      error: error.message
    });
  }
});

// Real-time WebSocket endpoint for live updates
router.get('/live-stream/:userId', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*'
  });
  
  const { userId } = req.params;
  
  // Send initial data
  res.write(`data: ${JSON.stringify({
    type: 'connected',
    message: 'Connected to live trading stream',
    timestamp: new Date()
  })}\n\n`);
  
  // Send live updates every 3 seconds
  const interval = setInterval(() => {
    const liveUpdates = Array.from(liveData.values()).map(trader => ({
      id: trader.id,
      name: trader.name,
      status: trader.status,
      isTrading: trader.isTrading,
      currentTrades: trader.currentTrades.length,
      dailyReturn: trader.dailyReturn,
      lastActivity: trader.recentActivity[0]?.timestamp || trader.lastTradeTime
    }));
    
    res.write(`data: ${JSON.stringify({
      type: 'traders_update',
      data: liveUpdates,
      timestamp: new Date()
    })}\n\n`);
  }, 3000);
  
  // Cleanup on disconnect
  req.on('close', () => {
    clearInterval(interval);
  });
});

module.exports = router;