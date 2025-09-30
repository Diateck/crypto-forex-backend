const express = require('express');
const router = express.Router();

// In-memory storage for demo purposes (replace with database in production)
let tradingData = {
  trades: [],
  positions: [],
  marketData: {}
};

// Middleware for request logging
router.use((req, res, next) => {
  console.log(`Trading API: ${req.method} ${req.path}`, {
    timestamp: new Date().toISOString(),
    body: req.body
  });
  next();
});

// Submit a new trade order
router.post('/submit-order', async (req, res) => {
  try {
    const {
      symbol,
      type,
      multiplier,
      multiplierLabel,
      amount,
      entryPrice,
      userId,
      userName,
      userEmail,
      assetName,
      assetType,
      assetCategory,
      potentialProfit,
      potentialLoss,
      riskRewardRatio,
      marketPrice,
      leverage,
      marginRequired
    } = req.body;

    // Validate required fields
    if (!symbol || !type || !amount || !entryPrice || !userId) {
      return res.status(400).json({
        success: false,
        message: 'Missing required trade parameters'
      });
    }

    // Generate trade ID
    const tradeId = `trade_${Date.now()}_${userId}`;

    // Create trade object
    const newTrade = {
      id: tradeId,
      symbol,
      type: type.toUpperCase(),
      multiplier,
      multiplierLabel,
      amount: parseFloat(amount),
      entryPrice: parseFloat(entryPrice),
      
      // User information
      userId,
      userName: userName || 'Unknown User',
      userEmail: userEmail || '',
      
      // Asset information
      assetName: assetName || symbol,
      assetType: assetType || 'unknown',
      assetCategory: assetCategory || 'Trading',
      
      // Risk management
      potentialProfit: parseFloat(potentialProfit) || 0,
      potentialLoss: parseFloat(potentialLoss) || 0,
      riskRewardRatio: parseFloat(riskRewardRatio) || 1,
      
      // Trading details
      marketPrice: parseFloat(marketPrice) || entryPrice,
      leverage: parseFloat(leverage) || 1,
      marginRequired: parseFloat(marginRequired) || amount,
      
      // Status and timestamps
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      
      // P&L tracking
      currentPrice: entryPrice,
      unrealizedPnl: 0,
      realizedPnl: null,
      
      // Additional metadata
      serverTimestamp: new Date().toISOString(),
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    };

    // Store trade in memory (replace with database in production)
    tradingData.trades.push(newTrade);
    tradingData.positions.push(newTrade);

    // Log trade for admin monitoring
    console.log('New trade submitted:', {
      tradeId,
      userId,
      symbol,
      type,
      amount,
      timestamp: newTrade.createdAt
    });

    res.status(201).json({
      success: true,
      message: `${type} ${multiplierLabel} ${symbol} trade executed successfully!`,
      data: {
        tradeId,
        symbol,
        type,
        amount,
        entryPrice,
        status: 'ACTIVE',
        timestamp: newTrade.createdAt
      }
    });

  } catch (error) {
    console.error('Error submitting trade:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while submitting trade',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Close a trade position
router.post('/close-position', async (req, res) => {
  try {
    const { tradeId, closePrice } = req.body;

    if (!tradeId || !closePrice) {
      return res.status(400).json({
        success: false,
        message: 'Missing tradeId or closePrice'
      });
    }

    // Find the trade
    const tradeIndex = tradingData.positions.findIndex(trade => trade.id === tradeId);
    
    if (tradeIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Trade not found'
      });
    }

    const trade = tradingData.positions[tradeIndex];

    // Calculate P&L
    const priceDifference = trade.type === 'BUY' 
      ? parseFloat(closePrice) - trade.entryPrice
      : trade.entryPrice - parseFloat(closePrice);
    
    const pnl = (priceDifference / trade.entryPrice) * trade.amount * trade.multiplier;

    // Update trade with close information
    const updatedTrade = {
      ...trade,
      exitPrice: parseFloat(closePrice),
      realizedPnl: Math.round(pnl * 100) / 100,
      status: 'CLOSED',
      closedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      closingReason: 'manual',
      holdingPeriod: new Date() - new Date(trade.createdAt)
    };

    // Remove from active positions
    tradingData.positions.splice(tradeIndex, 1);

    // Update in trades history
    const tradeHistoryIndex = tradingData.trades.findIndex(t => t.id === tradeId);
    if (tradeHistoryIndex !== -1) {
      tradingData.trades[tradeHistoryIndex] = updatedTrade;
    }

    // Log trade closure
    console.log('Trade closed:', {
      tradeId,
      symbol: trade.symbol,
      pnl: updatedTrade.realizedPnl,
      closePrice,
      timestamp: updatedTrade.closedAt
    });

    res.json({
      success: true,
      message: `Trade closed with ${pnl >= 0 ? 'profit' : 'loss'} of $${Math.abs(pnl).toFixed(2)}`,
      data: {
        tradeId,
        symbol: trade.symbol,
        entryPrice: trade.entryPrice,
        exitPrice: parseFloat(closePrice),
        pnl: updatedTrade.realizedPnl,
        status: 'CLOSED',
        closedAt: updatedTrade.closedAt
      }
    });

  } catch (error) {
    console.error('Error closing trade:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while closing trade',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get user's trading history
router.get('/history/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 50, offset = 0, status } = req.query;

    // Filter trades by userId
    let userTrades = tradingData.trades.filter(trade => trade.userId === userId);

    // Filter by status if provided
    if (status) {
      userTrades = userTrades.filter(trade => trade.status === status.toUpperCase());
    }

    // Sort by creation date (newest first)
    userTrades.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Apply pagination
    const paginatedTrades = userTrades.slice(parseInt(offset), parseInt(offset) + parseInt(limit));

    // Calculate summary statistics
    const totalTrades = userTrades.length;
    const activeTrades = userTrades.filter(t => t.status === 'ACTIVE').length;
    const closedTrades = userTrades.filter(t => t.status === 'CLOSED');
    const totalPnl = closedTrades.reduce((sum, trade) => sum + (trade.realizedPnl || 0), 0);
    const winningTrades = closedTrades.filter(t => (t.realizedPnl || 0) > 0).length;
    const winRate = closedTrades.length > 0 ? (winningTrades / closedTrades.length) * 100 : 0;

    res.json({
      success: true,
      data: paginatedTrades,
      meta: {
        total: totalTrades,
        activeTrades,
        closedTrades: closedTrades.length,
        totalPnl: Math.round(totalPnl * 100) / 100,
        winRate: Math.round(winRate * 100) / 100,
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });

  } catch (error) {
    console.error('Error fetching trading history:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while fetching trading history',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get active trading positions
router.get('/positions/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    // Filter active positions by userId
    const userPositions = tradingData.positions.filter(
      position => position.userId === userId && position.status === 'ACTIVE'
    );

    // Sort by creation date (newest first)
    userPositions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Calculate total exposure and margin
    const totalExposure = userPositions.reduce((sum, pos) => sum + pos.amount, 0);
    const totalMargin = userPositions.reduce((sum, pos) => sum + pos.marginRequired, 0);
    const totalUnrealizedPnl = userPositions.reduce((sum, pos) => sum + (pos.unrealizedPnl || 0), 0);

    res.json({
      success: true,
      data: userPositions,
      meta: {
        totalPositions: userPositions.length,
        totalExposure: Math.round(totalExposure * 100) / 100,
        totalMargin: Math.round(totalMargin * 100) / 100,
        totalUnrealizedPnl: Math.round(totalUnrealizedPnl * 100) / 100
      }
    });

  } catch (error) {
    console.error('Error fetching active positions:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while fetching active positions',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Verify trading account and balance
router.post('/verify-account', async (req, res) => {
  try {
    const { userId, tradeAmount } = req.body;

    if (!userId || !tradeAmount) {
      return res.status(400).json({
        success: false,
        message: 'Missing userId or tradeAmount'
      });
    }

    // Mock account verification (replace with real database check)
    const mockAccountBalance = 12547.83; // This should come from database
    const minimumTradeAmount = 10;
    const maximumTradeAmount = 10000;

    // Validation checks
    if (parseFloat(tradeAmount) < minimumTradeAmount) {
      return res.status(400).json({
        success: false,
        message: `Minimum trade amount is $${minimumTradeAmount}`
      });
    }

    if (parseFloat(tradeAmount) > maximumTradeAmount) {
      return res.status(400).json({
        success: false,
        message: `Maximum trade amount is $${maximumTradeAmount}`
      });
    }

    if (parseFloat(tradeAmount) > mockAccountBalance) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient account balance'
      });
    }

    res.json({
      success: true,
      message: 'Account verified for trading',
      data: {
        userId,
        accountBalance: mockAccountBalance,
        availableBalance: mockAccountBalance,
        tradeAmount: parseFloat(tradeAmount),
        verified: true
      }
    });

  } catch (error) {
    console.error('Error verifying trading account:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during account verification',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get trading overview/statistics
router.get('/overview/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    // Filter user's trades
    const userTrades = tradingData.trades.filter(trade => trade.userId === userId);
    const activeTrades = userTrades.filter(t => t.status === 'ACTIVE');
    const closedTrades = userTrades.filter(t => t.status === 'CLOSED');

    // Calculate statistics
    const totalTrades = userTrades.length;
    const totalPnl = closedTrades.reduce((sum, trade) => sum + (trade.realizedPnl || 0), 0);
    const winningTrades = closedTrades.filter(t => (t.realizedPnl || 0) > 0);
    const losingTrades = closedTrades.filter(t => (t.realizedPnl || 0) < 0);
    const winRate = closedTrades.length > 0 ? (winningTrades.length / closedTrades.length) * 100 : 0;

    // Today's trading statistics
    const today = new Date().toDateString();
    const todayTrades = closedTrades.filter(t => new Date(t.closedAt).toDateString() === today);
    const todayPnl = todayTrades.reduce((sum, trade) => sum + (trade.realizedPnl || 0), 0);

    // Asset distribution
    const assetTypes = {};
    userTrades.forEach(trade => {
      const assetType = trade.assetType || 'unknown';
      assetTypes[assetType] = (assetTypes[assetType] || 0) + 1;
    });

    res.json({
      success: true,
      data: {
        overview: {
          totalTrades,
          activeTrades: activeTrades.length,
          closedTrades: closedTrades.length,
          totalPnl: Math.round(totalPnl * 100) / 100,
          winRate: Math.round(winRate * 100) / 100,
          winningTrades: winningTrades.length,
          losingTrades: losingTrades.length
        },
        today: {
          trades: todayTrades.length,
          pnl: Math.round(todayPnl * 100) / 100
        },
        assetDistribution: assetTypes,
        recentTrades: userTrades
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          .slice(0, 5)
      }
    });

  } catch (error) {
    console.error('Error fetching trading overview:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while fetching trading overview',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get all trades (admin endpoint)
router.get('/admin/all-trades', async (req, res) => {
  try {
    const { limit = 100, offset = 0, status, userId } = req.query;

    let filteredTrades = [...tradingData.trades];

    // Filter by status if provided
    if (status) {
      filteredTrades = filteredTrades.filter(trade => trade.status === status.toUpperCase());
    }

    // Filter by userId if provided
    if (userId) {
      filteredTrades = filteredTrades.filter(trade => trade.userId === userId);
    }

    // Sort by creation date (newest first)
    filteredTrades.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Apply pagination
    const paginatedTrades = filteredTrades.slice(parseInt(offset), parseInt(offset) + parseInt(limit));

    // Calculate overall statistics
    const totalVolume = filteredTrades.reduce((sum, trade) => sum + trade.amount, 0);
    const totalPnl = filteredTrades
      .filter(t => t.status === 'CLOSED')
      .reduce((sum, trade) => sum + (trade.realizedPnl || 0), 0);

    res.json({
      success: true,
      data: paginatedTrades,
      meta: {
        total: filteredTrades.length,
        totalVolume: Math.round(totalVolume * 100) / 100,
        totalPnl: Math.round(totalPnl * 100) / 100,
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });

  } catch (error) {
    console.error('Error fetching all trades:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while fetching trades',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Health check for trading service
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Trading service is operational',
    data: {
      totalTrades: tradingData.trades.length,
      activePositions: tradingData.positions.length,
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    }
  });
});

module.exports = router;