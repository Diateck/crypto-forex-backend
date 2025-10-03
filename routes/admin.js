const express = require('express');
const router = express.Router();
const { verifyAdminToken } = require('./adminAuth');

// Import existing data from other routes (in real app, this would be from shared database)
// For demo purposes, we'll simulate admin access to all user data

// Mock user database (replace with real database)
let users = [
  {
    id: 'user_001',
    username: 'john_doe',
    email: 'john@example.com',
    fullName: 'John Doe',
    phone: '+1-555-0123',
    country: 'United States',
    status: 'active',
    kycStatus: 'verified',
    accountType: 'premium',
    balance: 15420.50,
    createdAt: '2025-08-15T10:30:00Z',
    lastLogin: '2025-09-30T14:20:00Z',
    totalDeposits: 5000,
    totalWithdrawals: 2000,
    totalTrades: 47,
    kycDocuments: {
      idDocument: 'passport_001.jpg',
      proofOfAddress: 'utility_bill_001.jpg',
      submittedAt: '2025-08-16T09:00:00Z',
      verifiedAt: '2025-08-17T11:30:00Z',
      verifiedBy: 'admin_001'
    }
  },
  {
    id: 'user_002',
    username: 'jane_smith',
    email: 'jane@example.com',
    fullName: 'Jane Smith',
    phone: '+1-555-0456',
    country: 'Canada',
    status: 'active',
    kycStatus: 'pending',
    accountType: 'standard',
    balance: 2850.75,
    createdAt: '2025-09-20T16:45:00Z',
    lastLogin: '2025-09-29T12:15:00Z',
    totalDeposits: 3000,
    totalWithdrawals: 150,
    totalTrades: 12,
    kycDocuments: {
      idDocument: 'license_002.jpg',
      proofOfAddress: 'bank_statement_002.jpg',
      submittedAt: '2025-09-22T14:20:00Z',
      verifiedAt: null,
      verifiedBy: null
    }
  },
  {
    id: 'user_003',
    username: 'mike_johnson',
    email: 'mike@example.com',
    fullName: 'Mike Johnson',
    phone: '+1-555-0789',
    country: 'United Kingdom',
    status: 'suspended',
    kycStatus: 'rejected',
    accountType: 'standard',
    balance: 500.00,
    createdAt: '2025-09-25T08:15:00Z',
    lastLogin: '2025-09-28T10:45:00Z',
    totalDeposits: 1000,
    totalWithdrawals: 500,
    totalTrades: 5,
    kycDocuments: {
      idDocument: 'id_card_003.jpg',
      proofOfAddress: 'lease_agreement_003.jpg',
      submittedAt: '2025-09-26T11:30:00Z',
      verifiedAt: null,
      verifiedBy: 'admin_001',
      rejectionReason: 'Document quality too low'
    }
  }
];

// Mock admin users (for authentication)
let adminUsers = [
  {
    id: 'admin_001',
    username: 'admin',
    email: 'admin@eloninvestment.com',
    fullName: 'System Administrator',
    role: 'super_admin',
    permissions: ['all'],
    createdAt: '2025-08-01T00:00:00Z',
    lastLogin: new Date().toISOString()
  }
];

// Dashboard Overview - Get all platform statistics
router.get('/dashboard', verifyAdminToken, (req, res) => {
  try {
    // Import data from other modules (in real app, this would be database queries)
    const deposits = require('./deposits'); // This won't work in real code, just for demo
    const withdrawals = require('./withdrawals');
    
    // Calculate statistics
    const totalUsers = users.length;
    const activeUsers = users.filter(u => u.status === 'active').length;
    const pendingKyc = users.filter(u => u.kycStatus === 'pending').length;
    const verifiedUsers = users.filter(u => u.kycStatus === 'verified').length;
    
    // Simulate getting data from other routes
    const totalBalance = users.reduce((sum, user) => sum + user.balance, 0);
    const totalDeposits = users.reduce((sum, user) => sum + user.totalDeposits, 0);
    const totalWithdrawals = users.reduce((sum, user) => sum + user.totalWithdrawals, 0);
    const totalTrades = users.reduce((sum, user) => sum + user.totalTrades, 0);
    
    // Recent activity (last 7 days)
    const last7Days = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentUsers = users.filter(u => new Date(u.createdAt) > last7Days);
    
    res.json({
      success: true,
      data: {
        overview: {
          totalUsers,
          activeUsers,
          suspendedUsers: users.filter(u => u.status === 'suspended').length,
          newUsersToday: recentUsers.length,
          totalBalance,
          totalDeposits,
          totalWithdrawals,
          totalTrades,
          netFlow: totalDeposits - totalWithdrawals
        },
        kyc: {
          total: totalUsers,
          verified: verifiedUsers,
          pending: pendingKyc,
          rejected: users.filter(u => u.kycStatus === 'rejected').length,
          verificationRate: ((verifiedUsers / totalUsers) * 100).toFixed(1)
        },
        financial: {
          pendingDeposits: 3, // Simulated
          pendingWithdrawals: 2, // Simulated
          processingDeposits: 1, // Simulated
          processingWithdrawals: 1, // Simulated
          totalPendingAmount: 3500, // Simulated
          dailyVolume: 15750 // Simulated
        },
        recentActivity: {
          newUsers: recentUsers.length,
          recentTrades: 23, // Simulated
          recentDeposits: 8, // Simulated
          recentWithdrawals: 5 // Simulated
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch admin dashboard data'
    });
  }
});

// User Management Routes
router.get('/users', verifyAdminToken, (req, res) => {
  try {
    const { 
      status, 
      kycStatus, 
      accountType,
      search,
      page = 1, 
      limit = 10 
    } = req.query;
    
    let filteredUsers = users;
    
    // Apply filters
    if (status) {
      filteredUsers = filteredUsers.filter(u => u.status === status);
    }
    if (kycStatus) {
      filteredUsers = filteredUsers.filter(u => u.kycStatus === kycStatus);
    }
    if (accountType) {
      filteredUsers = filteredUsers.filter(u => u.accountType === accountType);
    }
    if (search) {
      const searchLower = search.toLowerCase();
      filteredUsers = filteredUsers.filter(u => 
        u.username.toLowerCase().includes(searchLower) ||
        u.email.toLowerCase().includes(searchLower) ||
        u.fullName.toLowerCase().includes(searchLower)
      );
    }
    
    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedUsers = filteredUsers.slice(startIndex, endIndex);
    
    res.json({
      success: true,
      data: {
        users: paginatedUsers,
        pagination: {
          total: filteredUsers.length,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(filteredUsers.length / limit)
        },
        statistics: {
          total: users.length,
          active: users.filter(u => u.status === 'active').length,
          suspended: users.filter(u => u.status === 'suspended').length,
          verified: users.filter(u => u.kycStatus === 'verified').length,
          pending: users.filter(u => u.kycStatus === 'pending').length,
          rejected: users.filter(u => u.kycStatus === 'rejected').length
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch users'
    });
  }
});

// Get specific user details
router.get('/users/:userId', verifyAdminToken, (req, res) => {
  try {
    const { userId } = req.params;
    const user = users.find(u => u.id === userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    // Get additional user data (simulated)
    const userActivity = {
      loginHistory: [
        { timestamp: '2025-09-30T14:20:00Z', ip: '192.168.1.100', location: 'New York, US' },
        { timestamp: '2025-09-29T09:15:00Z', ip: '192.168.1.100', location: 'New York, US' },
        { timestamp: '2025-09-28T16:30:00Z', ip: '10.0.0.50', location: 'California, US' }
      ],
      recentTrades: [
        { id: 'trade_001', pair: 'EUR/USD', amount: 1000, type: 'buy', profit: 25.50, timestamp: '2025-09-30T10:30:00Z' },
        { id: 'trade_002', pair: 'GBP/USD', amount: 500, type: 'sell', profit: -12.25, timestamp: '2025-09-29T15:45:00Z' }
      ],
      recentDeposits: [
        { id: 'dep_001', amount: 1000, method: 'Bank Transfer', status: 'completed', timestamp: '2025-09-28T10:30:00Z' }
      ],
      recentWithdrawals: [
        { id: 'with_001', amount: 500, method: 'Bank Transfer', status: 'completed', timestamp: '2025-09-25T14:30:00Z' }
      ]
    };
    
    res.json({
      success: true,
      data: {
        user,
        activity: userActivity
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user details'
    });
  }
});

// Update user status
router.put('/users/:userId/status', verifyAdminToken, (req, res) => {
  try {
    const { userId } = req.params;
    const { status, reason } = req.body;
    
    const userIndex = users.findIndex(u => u.id === userId);
    if (userIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    const validStatuses = ['active', 'suspended', 'banned'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status'
      });
    }
    
    // Update user status
    users[userIndex].status = status;
    users[userIndex].statusUpdatedAt = new Date().toISOString();
    users[userIndex].statusReason = reason || null;
    
    res.json({
      success: true,
      data: {
        user: users[userIndex],
        message: `User status updated to ${status}`
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to update user status'
    });
  }
});

// KYC Management Routes
router.get('/kyc', verifyAdminToken, (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    
    let filteredUsers = users;
    if (status) {
      filteredUsers = users.filter(u => u.kycStatus === status);
    }
    
    // Sort by submission date (pending first)
    filteredUsers.sort((a, b) => {
      if (a.kycStatus === 'pending' && b.kycStatus !== 'pending') return -1;
      if (b.kycStatus === 'pending' && a.kycStatus !== 'pending') return 1;
      return new Date(b.kycDocuments.submittedAt) - new Date(a.kycDocuments.submittedAt);
    });
    
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedUsers = filteredUsers.slice(startIndex, endIndex);
    
    res.json({
      success: true,
      data: {
        applications: paginatedUsers.map(user => ({
          id: user.id,
          username: user.username,
          fullName: user.fullName,
          email: user.email,
          kycStatus: user.kycStatus,
          submittedAt: user.kycDocuments.submittedAt,
          verifiedAt: user.kycDocuments.verifiedAt,
          verifiedBy: user.kycDocuments.verifiedBy,
          rejectionReason: user.kycDocuments.rejectionReason,
          documents: {
            idDocument: user.kycDocuments.idDocument,
            proofOfAddress: user.kycDocuments.proofOfAddress
          }
        })),
        pagination: {
          total: filteredUsers.length,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(filteredUsers.length / limit)
        },
        statistics: {
          total: users.length,
          pending: users.filter(u => u.kycStatus === 'pending').length,
          verified: users.filter(u => u.kycStatus === 'verified').length,
          rejected: users.filter(u => u.kycStatus === 'rejected').length
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch KYC applications'
    });
  }
});

// Approve KYC
router.put('/kyc/:userId/approve', verifyAdminToken, (req, res) => {
  try {
    const { userId } = req.params;
    const { adminNotes } = req.body;
    
    const userIndex = users.findIndex(u => u.id === userId);
    if (userIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    // Update KYC status
    users[userIndex].kycStatus = 'verified';
    users[userIndex].kycDocuments.verifiedAt = new Date().toISOString();
    users[userIndex].kycDocuments.verifiedBy = 'admin_001'; // In real app, get from JWT
    users[userIndex].kycDocuments.adminNotes = adminNotes || 'KYC approved';
    
    res.json({
      success: true,
      data: {
        user: users[userIndex],
        message: 'KYC approved successfully'
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to approve KYC'
    });
  }
});

// Reject KYC
router.put('/kyc/:userId/reject', verifyAdminToken, (req, res) => {
  try {
    const { userId } = req.params;
    const { rejectionReason, adminNotes } = req.body;
    
    if (!rejectionReason) {
      return res.status(400).json({
        success: false,
        error: 'Rejection reason is required'
      });
    }
    
    const userIndex = users.findIndex(u => u.id === userId);
    if (userIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    // Update KYC status
    users[userIndex].kycStatus = 'rejected';
    users[userIndex].kycDocuments.rejectionReason = rejectionReason;
    users[userIndex].kycDocuments.adminNotes = adminNotes || 'KYC rejected';
    users[userIndex].kycDocuments.verifiedBy = 'admin_001'; // In real app, get from JWT
    
    res.json({
      success: true,
      data: {
        user: users[userIndex],
        message: 'KYC rejected'
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to reject KYC'
    });
  }
});

// Financial Management - Get all deposits (proxy to deposits route with admin data)
router.get('/deposits', verifyAdminToken, (req, res) => {
  try {
    // This would normally call the deposits route or query the database directly
    // For now, simulate admin access to all deposits
    res.json({
      success: true,
      data: {
        deposits: [
          {
            id: 'dep_001',
            userId: 'user_001',
            username: 'john_doe',
            fullName: 'John Doe',
            amount: 1000,
            currency: 'USD',
            method: 'Bank Transfer',
            status: 'completed',
            transactionId: 'TXN12345',
            paymentProof: 'proof_001.jpg',
            createdAt: '2025-09-28T10:30:00Z',
            completedAt: '2025-09-28T11:45:00Z',
            adminNotes: 'Deposit verified and approved'
          },
          {
            id: 'dep_002',
            userId: 'user_001',
            username: 'john_doe',
            fullName: 'John Doe',
            amount: 500,
            currency: 'USD',
            method: 'Credit Card',
            status: 'pending',
            transactionId: 'TXN12346',
            paymentProof: 'proof_002.jpg',
            createdAt: '2025-09-29T14:20:00Z',
            completedAt: null,
            adminNotes: null
          }
        ],
        statistics: {
          total: 5,
          pending: 2,
          processing: 1,
          completed: 2,
          rejected: 0,
          totalAmount: 8500,
          pendingAmount: 1500
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch deposits'
    });
  }
});

// Financial Management - Get all withdrawals (proxy to withdrawals route with admin data)
router.get('/withdrawals', verifyAdminToken, (req, res) => {
  try {
    // This would normally call the withdrawals route or query the database directly
    res.json({
      success: true,
      data: {
        withdrawals: [
          {
            id: 'with_001',
            userId: 'user_001',
            username: 'john_doe',
            fullName: 'John Doe',
            amount: 2000,
            currency: 'USD',
            method: 'Bank Transfer',
            status: 'completed',
            netAmount: 1975,
            createdAt: '2025-09-25T14:30:00Z',
            processedAt: '2025-09-26T10:15:00Z',
            adminNotes: 'Withdrawal processed successfully'
          },
          {
            id: 'with_002',
            userId: 'user_001',
            username: 'john_doe',
            fullName: 'John Doe',
            amount: 500,
            currency: 'USD',
            method: 'Cryptocurrency',
            status: 'pending',
            netAmount: 495,
            createdAt: '2025-09-29T16:45:00Z',
            processedAt: null,
            adminNotes: null
          }
        ],
        statistics: {
          total: 4,
          pending: 1,
          processing: 1,
          completed: 2,
          rejected: 0,
          cancelled: 0,
          totalAmount: 3500,
          pendingAmount: 1500
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch withdrawals'
    });
  }
});

// Trading Management - Get all trading activity
router.get('/trading', verifyAdminToken, (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    
    // Simulate trading data
    const trades = [
      {
        id: 'trade_001',
        userId: 'user_001',
        username: 'john_doe',
        fullName: 'John Doe',
        pair: 'EUR/USD',
        type: 'buy',
        amount: 1000,
        openPrice: 1.0850,
        closePrice: 1.0875,
        status: 'closed',
        profit: 25.00,
        openTime: '2025-09-30T10:30:00Z',
        closeTime: '2025-09-30T11:15:00Z'
      },
      {
        id: 'trade_002',
        userId: 'user_002',
        username: 'jane_smith',
        fullName: 'Jane Smith',
        pair: 'GBP/USD',
        type: 'sell',
        amount: 500,
        openPrice: 1.2650,
        closePrice: null,
        status: 'open',
        profit: -5.50,
        openTime: '2025-09-30T14:45:00Z',
        closeTime: null
      }
    ];
    
    let filteredTrades = trades;
    if (status) {
      filteredTrades = trades.filter(t => t.status === status);
    }
    
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedTrades = filteredTrades.slice(startIndex, endIndex);
    
    res.json({
      success: true,
      data: {
        trades: paginatedTrades,
        pagination: {
          total: filteredTrades.length,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(filteredTrades.length / limit)
        },
        statistics: {
          total: trades.length,
          open: trades.filter(t => t.status === 'open').length,
          closed: trades.filter(t => t.status === 'closed').length,
          totalVolume: trades.reduce((sum, t) => sum + t.amount, 0),
          totalProfit: trades.filter(t => t.status === 'closed').reduce((sum, t) => sum + t.profit, 0)
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch trading data'
    });
  }
});

// System Settings and Configuration
router.get('/settings', verifyAdminToken, (req, res) => {
  try {
    const settings = {
      platform: {
        maintenanceMode: false,
        registrationEnabled: true,
        tradingEnabled: true,
        depositsEnabled: true,
        withdrawalsEnabled: true
      },
      trading: {
        maxLeverage: 500,
        minTradeAmount: 10,
        maxTradeAmount: 100000,
        allowedPairs: ['EUR/USD', 'GBP/USD', 'USD/JPY', 'AUD/USD', 'USD/CHF'],
        spreadMarkup: 0.5
      },
      kyc: {
        autoApprovalEnabled: false,
        requiredDocuments: ['id', 'address'],
        maxDocumentSize: 5242880, // 5MB
        allowedFormats: ['jpg', 'jpeg', 'png', 'pdf']
      },
      financial: {
        minDepositAmount: 10,
        maxDepositAmount: 100000,
        minWithdrawalAmount: 10,
        maxWithdrawalAmount: 50000,
        withdrawalFees: {
          bankTransfer: 25,
          crypto: 1,
          wire: 35
        }
      }
    };
    
    res.json({
      success: true,
      data: { settings }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch settings'
    });
  }
});

// Update system settings
router.put('/settings', verifyAdminToken, (req, res) => {
  try {
    const { settings } = req.body;
    
    // In real app, validate and save settings to database
    
    res.json({
      success: true,
      data: {
        settings,
        message: 'Settings updated successfully'
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to update settings'
    });
  }
});

// Activity Logs
router.get('/logs', verifyAdminToken, (req, res) => {
  try {
    const { type, page = 1, limit = 20 } = req.query;
    
    // Simulate activity logs
    const logs = [
      {
        id: 'log_001',
        type: 'kyc_approval',
        userId: 'user_001',
        username: 'john_doe',
        adminId: 'admin_001',
        adminUsername: 'admin',
        description: 'KYC documents approved',
        timestamp: '2025-09-30T15:30:00Z',
        details: { previousStatus: 'pending', newStatus: 'verified' }
      },
      {
        id: 'log_002',
        type: 'deposit_approval',
        userId: 'user_002',
        username: 'jane_smith',
        adminId: 'admin_001',
        adminUsername: 'admin',
        description: 'Deposit of $1000 approved',
        timestamp: '2025-09-30T14:20:00Z',
        details: { depositId: 'dep_003', amount: 1000 }
      },
      {
        id: 'log_003',
        type: 'user_suspension',
        userId: 'user_003',
        username: 'mike_johnson',
        adminId: 'admin_001',
        adminUsername: 'admin',
        description: 'User account suspended for suspicious activity',
        timestamp: '2025-09-30T12:45:00Z',
        details: { reason: 'Multiple failed login attempts' }
      }
    ];
    
    let filteredLogs = logs;
    if (type) {
      filteredLogs = logs.filter(l => l.type === type);
    }
    
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedLogs = filteredLogs.slice(startIndex, endIndex);
    
    res.json({
      success: true,
      data: {
        logs: paginatedLogs,
        pagination: {
          total: filteredLogs.length,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(filteredLogs.length / limit)
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch activity logs'
    });
  }
});

module.exports = router;