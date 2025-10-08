const express = require('express');
const router = express.Router();

// Dashboard Overview - Main dashboard data
router.get('/overview', async (req, res) => {
  try {
    // Mock data for now - will connect to database later
    const dashboardData = {
      success: true,
      data: {
        user: {
          name: "John Doe",
          email: "john@example.com",
          joinDate: "2024-01-15"
        },
        totalBalance: 15420.50,
        availableBalance: 12380.75,
        lockedBalance: 3039.75,
        totalProfit: 2150.30,
        totalLoss: 890.20,
        profitPercentage: 8.2,
        accountStatus: "verified",
        lastLogin: new Date().toISOString()
      }
    };

    res.status(200).json(dashboardData);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching dashboard overview',
      error: error.message
    });
  }
});

// Account Balance - Detailed balance information
router.get('/balance', async (req, res) => {
  try {
    const balanceData = {
      success: true,
      data: {
        totalBalance: 15420.50,
        availableBalance: 12380.75,
        lockedInTrades: 2150.30,
        pendingWithdrawals: 889.45,
        currencies: {
          USD: 8420.50,
          EUR: 3200.75,
          BTC: 0.15,
          ETH: 2.5
        },
        recentTransactions: [
          {
            id: 1,
            type: "deposit",
            amount: 1000.00,
            currency: "USD",
            date: "2024-09-29",
            status: "completed"
          },
          {
            id: 2,
            type: "trade",
            amount: -250.00,
            currency: "USD",
            date: "2024-09-29",
            status: "completed"
          }
        ]
      }
    };

    res.status(200).json(balanceData);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching balance data',
      error: error.message
    });
  }
});

// KYC Status - Know Your Customer verification status
router.get('/kyc-status', async (req, res) => {
  try {
    const kycData = {
      success: true,
      data: {
        kycStatus: "verified", // "pending", "verified", "rejected", "incomplete"
        verificationLevel: 2, // 0-3 levels
        submittedDocuments: {
          identity: {
            status: "approved",
            documentType: "passport",
            submittedDate: "2024-09-20"
          },
          address: {
            status: "approved", 
            documentType: "utility_bill",
            submittedDate: "2024-09-21"
          },
          selfie: {
            status: "approved",
            submittedDate: "2024-09-21"
          }
        },
        withdrawalLimits: {
          daily: 10000,
          monthly: 50000,
          used: {
            daily: 2500,
            monthly: 8750
          }
        },
        nextSteps: []
      }
    };

    res.status(200).json(kycData);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching KYC status',
      error: error.message
    });
  }
});

// Trading Overview - Trading summary and statistics
router.get('/trading-overview', async (req, res) => {
  try {
    const tradingData = {
      success: true,
      data: {
        totalTrades: 45,
        activeTrades: 3,
        successfulTrades: 32,
        failedTrades: 10,
        winRate: 71.1,
        totalVolume: 125600.00,
        todayPnL: 245.80,
        weeklyPnL: 1150.30,
        monthlyPnL: 2890.45,
        openPositions: [
          {
            id: 1,
            pair: "BTC/USD",
            type: "buy",
            amount: 0.05,
            entryPrice: 43250.00,
            currentPrice: 43180.00,
            pnl: -3.50,
            timestamp: "2024-09-29T10:30:00Z"
          },
          {
            id: 2,
            pair: "EUR/USD",
            type: "sell",
            amount: 1000,
            entryPrice: 1.0850,
            currentPrice: 1.0845,
            pnl: 5.00,
            timestamp: "2024-09-29T14:15:00Z"
          }
        ],
        recentTrades: [
          {
            id: 3,
            pair: "ETH/USD",
            type: "buy",
            amount: 1.5,
            entryPrice: 2650.00,
            exitPrice: 2680.00,
            pnl: 45.00,
            status: "closed",
            timestamp: "2024-09-29T09:45:00Z"
          }
        ]
      }
    };

    res.status(200).json(tradingData);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching trading overview',
      error: error.message
    });
  }
});

// Dashboard Statistics - Key metrics and charts data
router.get('/stats', async (req, res) => {
  try {
    const statsData = {
      success: true,
      data: {
        accountGrowth: {
          labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
          data: [10000, 10500, 12000, 11800, 13500, 15420]
        },
        tradingPerformance: {
          wins: 32,
          losses: 13,
          winRate: 71.1,
          avgWin: 125.50,
          avgLoss: 68.40,
          profitFactor: 2.84
        },
        assetAllocation: [
          { name: 'USD', value: 8420.50, percentage: 54.6 },
          { name: 'EUR', value: 3200.75, percentage: 20.8 },
          { name: 'BTC', value: 2150.30, percentage: 13.9 },
          { name: 'ETH', value: 1648.95, percentage: 10.7 }
        ],
        monthlyActivity: {
          deposits: 5,
          withdrawals: 2,
          trades: 23,
          totalVolume: 45600.00
        }
      }
    };

    res.status(200).json(statsData);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching dashboard statistics',
      error: error.message
    });
  }
});

// User Notifications
router.get('/notifications', async (req, res) => {
  try {
    // Return notifications as an array for frontend compatibility
    const notifications = [
      {
        id: 1,
        type: "trade",
        title: "Trade Executed",
        message: "Your BTC/USD buy order has been executed",
        read: false,
        timestamp: "2024-09-29T15:30:00Z"
      },
      {
        id: 2,
        type: "deposit",
        title: "Deposit Confirmed", 
        message: "Your $1,000 deposit has been confirmed",
        read: false,
        timestamp: "2024-09-29T12:15:00Z"
      },
      {
        id: 3,
        type: "kyc",
        title: "KYC Approved",
        message: "Your identity verification has been approved",
        read: false,
        timestamp: "2024-09-29T09:00:00Z"
      },
      {
        id: 4,
        type: "system",
        title: "Maintenance Notice",
        message: "Scheduled maintenance on Oct 1st, 2:00 AM UTC",
        read: true,
        timestamp: "2024-09-28T16:00:00Z"
      }
    ];
  // Return a plain array — frontend expects an array to map over
  res.status(200).json(notifications);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching notifications',
      error: error.message
    });
  }
});

module.exports = router;