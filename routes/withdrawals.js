const express = require('express');
const router = express.Router();

// Mock database for withdrawals (replace with real database)
let withdrawals = [
  {
    id: 'with_001',
    userId: 'user_001',
    amount: 2000,
    currency: 'USD',
    method: 'Bank Transfer',
    status: 'completed',
    bankAccount: {
      accountName: 'John Doe',
      accountNumber: '****1234',
      bankName: 'Chase Bank',
      routingNumber: '****567'
    },
    fees: {
      percentage: 0,
      fixed: 25,
      total: 25
    },
    netAmount: 1975, // amount - fees
    createdAt: '2025-09-25T14:30:00Z',
    processedAt: '2025-09-26T10:15:00Z',
    adminNotes: 'Withdrawal processed successfully'
  },
  {
    id: 'with_002',
    userId: 'user_001',
    amount: 500,
    currency: 'USD',
    method: 'Cryptocurrency',
    status: 'pending',
    cryptoWallet: {
      address: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
      coin: 'BTC',
      network: 'Bitcoin'
    },
    fees: {
      percentage: 1,
      fixed: 0,
      total: 5
    },
    netAmount: 495,
    createdAt: '2025-09-29T16:45:00Z',
    processedAt: null,
    adminNotes: null
  },
  {
    id: 'with_003',
    userId: 'user_001',
    amount: 1000,
    currency: 'USD',
    method: 'Wire Transfer',
    status: 'processing',
    bankAccount: {
      accountName: 'John Doe',
      accountNumber: '****5678',
      bankName: 'Bank of America',
      swiftCode: 'BOFAUS3N'
    },
    fees: {
      percentage: 0,
      fixed: 35,
      total: 35
    },
    netAmount: 965,
    createdAt: '2025-09-30T08:20:00Z',
    processedAt: null,
    adminNotes: 'Processing wire transfer'
  }
];

// Withdrawal methods configuration
const withdrawalMethods = [
  {
    id: 'bank_transfer',
    name: 'Bank Transfer',
    type: 'bank',
    processingTime: '3-5 business days',
    minAmount: 100,
    maxAmount: 50000,
    fees: {
      percentage: 0,
      fixed: 25
    },
    requirements: ['Bank account verification', 'KYC completion'],
    fields: [
      { name: 'accountName', label: 'Account Holder Name', type: 'text', required: true },
      { name: 'accountNumber', label: 'Account Number', type: 'text', required: true },
      { name: 'bankName', label: 'Bank Name', type: 'text', required: true },
      { name: 'routingNumber', label: 'Routing Number', type: 'text', required: true },
      { name: 'accountType', label: 'Account Type', type: 'select', required: true, options: ['Checking', 'Savings'] }
    ]
  },
  {
    id: 'wire_transfer',
    name: 'Wire Transfer',
    type: 'wire',
    processingTime: '1-3 business days',
    minAmount: 1000,
    maxAmount: 1000000,
    fees: {
      percentage: 0,
      fixed: 35
    },
    requirements: ['Bank account verification', 'KYC completion', 'Enhanced verification'],
    fields: [
      { name: 'accountName', label: 'Account Holder Name', type: 'text', required: true },
      { name: 'accountNumber', label: 'Account Number', type: 'text', required: true },
      { name: 'bankName', label: 'Bank Name', type: 'text', required: true },
      { name: 'swiftCode', label: 'SWIFT Code', type: 'text', required: true },
      { name: 'bankAddress', label: 'Bank Address', type: 'text', required: true }
    ]
  },
  {
    id: 'crypto',
    name: 'Cryptocurrency',
    type: 'crypto',
    processingTime: '30 minutes - 2 hours',
    minAmount: 25,
    maxAmount: 100000,
    fees: {
      percentage: 1,
      fixed: 0
    },
    requirements: ['Wallet address verification'],
    fields: [
      { name: 'address', label: 'Wallet Address', type: 'text', required: true },
      { name: 'coin', label: 'Cryptocurrency', type: 'select', required: true, options: ['BTC', 'ETH', 'USDT', 'USDC'] },
      { name: 'network', label: 'Network', type: 'select', required: true, options: ['Bitcoin', 'Ethereum', 'Tron', 'BSC'] }
    ]
  },
  {
    id: 'paypal',
    name: 'PayPal',
    type: 'digital',
    processingTime: '1-2 business days',
    minAmount: 50,
    maxAmount: 10000,
    fees: {
      percentage: 2.5,
      fixed: 0
    },
    requirements: ['PayPal account verification'],
    fields: [
      { name: 'email', label: 'PayPal Email', type: 'email', required: true },
      { name: 'fullName', label: 'Full Name (as on PayPal)', type: 'text', required: true }
    ]
  }
];

// GET /api/withdrawals/history/:userId - Get user's withdrawal history
router.get('/history/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    const userWithdrawals = withdrawals.filter(withdrawal => withdrawal.userId === userId);
    
    res.json({
      success: true,
      data: {
        withdrawals: userWithdrawals,
        totalWithdrawals: userWithdrawals.length,
        totalAmount: userWithdrawals.reduce((sum, w) => sum + w.amount, 0),
        completedWithdrawals: userWithdrawals.filter(w => w.status === 'completed').length,
        pendingAmount: userWithdrawals.filter(w => w.status === 'pending' || w.status === 'processing')
          .reduce((sum, w) => sum + w.amount, 0)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch withdrawal history'
    });
  }
});

// GET /api/withdrawals/methods - Get available withdrawal methods
router.get('/methods', (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        withdrawalMethods: withdrawalMethods
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch withdrawal methods'
    });
  }
});

// POST /api/withdrawals/submit - Submit new withdrawal request
router.post('/submit', (req, res) => {
  try {
    const {
      amount,
      currency,
      method,
      withdrawalMethodId,
      bankAccount,
      cryptoWallet,
      paypalAccount,
      userNotes
    } = req.body;

    // Validation
    if (!amount || !currency || !method || !withdrawalMethodId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }

    if (amount < 1) {
      return res.status(400).json({
        success: false,
        error: 'Minimum withdrawal amount is $1'
      });
    }

    // Find withdrawal method
    const withdrawalMethod = withdrawalMethods.find(wm => wm.id === withdrawalMethodId);
    if (!withdrawalMethod) {
      return res.status(400).json({
        success: false,
        error: 'Invalid withdrawal method'
      });
    }

    // Check amount limits
    if (amount < withdrawalMethod.minAmount || amount > withdrawalMethod.maxAmount) {
      return res.status(400).json({
        success: false,
        error: `Amount must be between $${withdrawalMethod.minAmount} and $${withdrawalMethod.maxAmount}`
      });
    }

    // Check user balance (simulate balance check)
    const currentBalance = 15420.5; // In real app, get from database
    if (amount > currentBalance) {
      return res.status(400).json({
        success: false,
        error: 'Insufficient balance'
      });
    }

    // Calculate fees
    const fees = {
      percentage: withdrawalMethod.fees.percentage,
      fixed: withdrawalMethod.fees.fixed,
      total: (amount * withdrawalMethod.fees.percentage / 100) + withdrawalMethod.fees.fixed
    };

    const netAmount = amount - fees.total;

    // Create new withdrawal
    const newWithdrawal = {
      id: `with_${Date.now()}`,
      userId: 'user_001', // In real app, get from JWT token
      amount: parseFloat(amount),
      currency: currency.toUpperCase(),
      method: withdrawalMethod.name,
      withdrawalMethodId,
      status: 'pending',
      fees,
      netAmount,
      bankAccount: bankAccount || null,
      cryptoWallet: cryptoWallet || null,
      paypalAccount: paypalAccount || null,
      userNotes: userNotes || null,
      adminNotes: null,
      createdAt: new Date().toISOString(),
      processedAt: null,
      estimatedCompletion: new Date(Date.now() + getProcessingTime(withdrawalMethodId)).toISOString()
    };

    // Add to withdrawals array
    withdrawals.push(newWithdrawal);

    // IMPORTANT: Immediately deduct from balance (simulated)
    // In real app, this would update the user's balance in database
    const updatedBalance = currentBalance - amount;

    res.json({
      success: true,
      data: {
        withdrawal: newWithdrawal,
        balanceUpdate: {
          previousBalance: currentBalance,
          withdrawalAmount: amount,
          newBalance: updatedBalance,
          message: `$${amount} has been deducted from your account`
        },
        message: `Withdrawal request submitted successfully. Estimated completion: ${withdrawalMethod.processingTime}`
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to submit withdrawal request'
    });
  }
});

// Helper function to calculate processing time
function getProcessingTime(methodId) {
  const hours = {
    'bank_transfer': 72, // 3 days
    'wire_transfer': 24, // 1 day
    'crypto': 2, // 2 hours
    'paypal': 24 // 1 day
  };
  return (hours[methodId] || 24) * 60 * 60 * 1000; // Convert to milliseconds
}

// GET /api/withdrawals/status/:withdrawalId - Get withdrawal status
router.get('/status/:withdrawalId', (req, res) => {
  try {
    const { withdrawalId } = req.params;
    const withdrawal = withdrawals.find(w => w.id === withdrawalId);

    if (!withdrawal) {
      return res.status(404).json({
        success: false,
        error: 'Withdrawal not found'
      });
    }

    res.json({
      success: true,
      data: {
        withdrawal,
        statusHistory: [
          {
            status: 'pending',
            timestamp: withdrawal.createdAt,
            note: 'Withdrawal request submitted'
          },
          {
            status: withdrawal.status,
            timestamp: withdrawal.processedAt || new Date().toISOString(),
            note: withdrawal.adminNotes || 'Current status'
          }
        ]
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch withdrawal status'
    });
  }
});

// PUT /api/withdrawals/cancel/:withdrawalId - Cancel withdrawal (User)
router.put('/cancel/:withdrawalId', (req, res) => {
  try {
    const { withdrawalId } = req.params;
    const { reason } = req.body;

    const withdrawalIndex = withdrawals.findIndex(w => w.id === withdrawalId);
    if (withdrawalIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Withdrawal not found'
      });
    }

    const withdrawal = withdrawals[withdrawalIndex];

    // Can only cancel pending withdrawals
    if (withdrawal.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: 'Can only cancel pending withdrawals'
      });
    }

    // Update withdrawal status
    withdrawals[withdrawalIndex].status = 'cancelled';
    withdrawals[withdrawalIndex].adminNotes = reason || 'Cancelled by user';
    withdrawals[withdrawalIndex].processedAt = new Date().toISOString();

    // Refund the amount (simulate balance update)
    const refundAmount = withdrawal.amount;
    const currentBalance = 15420.5; // In real app, get current balance
    const newBalance = currentBalance + refundAmount;

    res.json({
      success: true,
      data: {
        withdrawal: withdrawals[withdrawalIndex],
        balanceUpdate: {
          refundAmount,
          newBalance,
          message: `$${refundAmount} has been refunded to your account`
        },
        message: 'Withdrawal cancelled successfully'
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to cancel withdrawal'
    });
  }
});

// Admin routes for managing withdrawals
// PUT /api/withdrawals/admin/approve/:withdrawalId - Approve withdrawal (Admin only)
router.put('/admin/approve/:withdrawalId', (req, res) => {
  try {
    const { withdrawalId } = req.params;
    const { adminNotes } = req.body;

    const withdrawalIndex = withdrawals.findIndex(w => w.id === withdrawalId);
    if (withdrawalIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Withdrawal not found'
      });
    }

    // Update withdrawal status
    withdrawals[withdrawalIndex].status = 'completed';
    withdrawals[withdrawalIndex].processedAt = new Date().toISOString();
    withdrawals[withdrawalIndex].adminNotes = adminNotes || 'Withdrawal approved and processed by admin';

    const withdrawal = withdrawals[withdrawalIndex];

    res.json({
      success: true,
      data: {
        withdrawal: withdrawals[withdrawalIndex],
        message: 'Withdrawal approved and processed successfully'
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to approve withdrawal'
    });
  }
});

// PUT /api/withdrawals/admin/reject/:withdrawalId - Reject withdrawal (Admin only)
router.put('/admin/reject/:withdrawalId', (req, res) => {
  try {
    const { withdrawalId } = req.params;
    const { adminNotes } = req.body;

    const withdrawalIndex = withdrawals.findIndex(w => w.id === withdrawalId);
    if (withdrawalIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Withdrawal not found'
      });
    }

    const withdrawal = withdrawals[withdrawalIndex];

    // Update withdrawal status
    withdrawals[withdrawalIndex].status = 'rejected';
    withdrawals[withdrawalIndex].processedAt = new Date().toISOString();
    withdrawals[withdrawalIndex].adminNotes = adminNotes || 'Withdrawal rejected by admin';

    // Refund the amount (simulate balance update)
    const refundAmount = withdrawal.amount;
    const currentBalance = 15420.5; // In real app, get current balance
    const newBalance = currentBalance + refundAmount;

    res.json({
      success: true,
      data: {
        withdrawal: withdrawals[withdrawalIndex],
        balanceUpdate: {
          refundAmount,
          newBalance,
          message: `$${refundAmount} has been refunded due to rejection`
        },
        message: 'Withdrawal rejected and amount refunded'
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to reject withdrawal'
    });
  }
});

// GET /api/withdrawals/admin/all - Get all withdrawals for admin
router.get('/admin/all', (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    
    let filteredWithdrawals = withdrawals;
    if (status) {
      filteredWithdrawals = withdrawals.filter(w => w.status === status);
    }

    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedWithdrawals = filteredWithdrawals.slice(startIndex, endIndex);

    res.json({
      success: true,
      data: {
        withdrawals: paginatedWithdrawals,
        pagination: {
          total: filteredWithdrawals.length,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(filteredWithdrawals.length / limit)
        },
        statistics: {
          total: withdrawals.length,
          pending: withdrawals.filter(w => w.status === 'pending').length,
          processing: withdrawals.filter(w => w.status === 'processing').length,
          completed: withdrawals.filter(w => w.status === 'completed').length,
          rejected: withdrawals.filter(w => w.status === 'rejected').length,
          cancelled: withdrawals.filter(w => w.status === 'cancelled').length,
          totalAmount: withdrawals.filter(w => w.status === 'completed').reduce((sum, w) => sum + w.amount, 0),
          pendingAmount: withdrawals.filter(w => w.status === 'pending' || w.status === 'processing').reduce((sum, w) => sum + w.amount, 0)
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

module.exports = router;