const express = require('express');
const router = express.Router();

// Mock database for deposits (replace with real database)
let deposits = [
  {
    id: 'dep_001',
    userId: 'user_001',
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
    amount: 500,
    currency: 'USD',
    method: 'Credit Card',
    status: 'pending',
    transactionId: 'TXN12346',
    paymentProof: 'proof_002.jpg',
    createdAt: '2025-09-29T14:20:00Z',
    completedAt: null,
    adminNotes: null
  },
  {
    id: 'dep_003',
    userId: 'user_001',
    amount: 2500,
    currency: 'USD',
    method: 'Cryptocurrency',
    status: 'processing',
    transactionId: 'TXN12347',
    paymentProof: 'proof_003.jpg',
    createdAt: '2025-09-30T09:15:00Z',
    completedAt: null,
    adminNotes: 'Waiting for blockchain confirmation'
  }
];

// Payment methods configuration
const paymentMethods = [
  {
    id: 'bank_transfer',
    name: 'Bank Transfer',
    type: 'bank',
    processingTime: '1-3 business days',
    minAmount: 100,
    maxAmount: 50000,
    fees: {
      percentage: 0,
      fixed: 0
    },
    details: {
      bankName: 'Elon Investment Bank',
      accountName: 'Elon Investment Broker Ltd',
      accountNumber: '1234567890',
      routingNumber: '123456789',
      swiftCode: 'EIBKUS33',
      instructions: 'Please include your username in the transfer reference'
    }
  },
  {
    id: 'credit_card',
    name: 'Credit/Debit Card',
    type: 'card',
    processingTime: '1-10 minutes',
    minAmount: 50,
    maxAmount: 10000,
    fees: {
      percentage: 3.5,
      fixed: 0
    },
    details: {
      supportedCards: ['Visa', 'Mastercard', 'American Express'],
      instructions: 'Card deposits are processed instantly'
    }
  },
  {
    id: 'crypto',
    name: 'Cryptocurrency',
    type: 'crypto',
    processingTime: '15-60 minutes',
    minAmount: 25,
    maxAmount: 100000,
    fees: {
      percentage: 1,
      fixed: 0
    },
    details: {
      supportedCoins: ['BTC', 'ETH', 'USDT', 'USDC'],
      btcAddress: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
      ethAddress: '0x742d35Cc6634C0532925a3b8D0FeC7dc2d1BB2A3',
      usdtAddress: '0x742d35Cc6634C0532925a3b8D0FeC7dc2d1BB2A3',
      instructions: 'Send exact amount to the address above and upload transaction proof'
    }
  },
  {
    id: 'wire_transfer',
    name: 'Wire Transfer',
    type: 'wire',
    processingTime: '1-5 business days',
    minAmount: 1000,
    maxAmount: 1000000,
    fees: {
      percentage: 0,
      fixed: 25
    },
    details: {
      bankName: 'Elon Investment Bank',
      accountName: 'Elon Investment Broker Ltd',
      accountNumber: '1234567890',
      routingNumber: '123456789',
      swiftCode: 'EIBKUS33',
      instructions: 'Please include your account ID in the wire reference'
    }
  }
];

// GET /api/deposits/history/:userId - Get user's deposit history
router.get('/history/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    const userDeposits = deposits.filter(deposit => deposit.userId === userId);
    
    res.json({
      success: true,
      data: {
        deposits: userDeposits,
        totalDeposits: userDeposits.length,
        totalAmount: userDeposits.reduce((sum, dep) => sum + dep.amount, 0),
        completedDeposits: userDeposits.filter(dep => dep.status === 'completed').length
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch deposit history'
    });
  }
});

// GET /api/deposits/payment-methods - Get available payment methods
router.get('/payment-methods', (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        paymentMethods: paymentMethods
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch payment methods'
    });
  }
});

// POST /api/deposits/submit - Submit new deposit request
router.post('/submit', (req, res) => {
  try {
    const {
      amount,
      currency,
      method,
      paymentMethodId,
      transactionId,
      userNotes
    } = req.body;

    // Validation
    if (!amount || !currency || !method || !paymentMethodId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }

    if (amount < 1) {
      return res.status(400).json({
        success: false,
        error: 'Minimum deposit amount is $1'
      });
    }

    // Find payment method
    const paymentMethod = paymentMethods.find(pm => pm.id === paymentMethodId);
    if (!paymentMethod) {
      return res.status(400).json({
        success: false,
        error: 'Invalid payment method'
      });
    }

    // Check amount limits
    if (amount < paymentMethod.minAmount || amount > paymentMethod.maxAmount) {
      return res.status(400).json({
        success: false,
        error: `Amount must be between $${paymentMethod.minAmount} and $${paymentMethod.maxAmount}`
      });
    }

    // Calculate fees
    const fees = {
      percentage: paymentMethod.fees.percentage,
      fixed: paymentMethod.fees.fixed,
      total: (amount * paymentMethod.fees.percentage / 100) + paymentMethod.fees.fixed
    };

    // Create new deposit
    const newDeposit = {
      id: `dep_${Date.now()}`,
      userId: 'user_001', // In real app, get from JWT token
      amount: parseFloat(amount),
      currency: currency.toUpperCase(),
      method: paymentMethod.name,
      paymentMethodId,
      status: paymentMethodId === 'credit_card' ? 'processing' : 'pending',
      transactionId: transactionId || null,
      paymentProof: null,
      fees,
      userNotes: userNotes || null,
      adminNotes: null,
      createdAt: new Date().toISOString(),
      completedAt: null,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
    };

    // Add to deposits array
    deposits.push(newDeposit);

    // Simulate instant processing for credit cards
    if (paymentMethodId === 'credit_card') {
      setTimeout(() => {
        const depositIndex = deposits.findIndex(d => d.id === newDeposit.id);
        if (depositIndex !== -1) {
          deposits[depositIndex].status = 'completed';
          deposits[depositIndex].completedAt = new Date().toISOString();
          deposits[depositIndex].adminNotes = 'Card payment processed successfully';
        }
      }, 2000); // 2 second delay to simulate processing
    }

    res.json({
      success: true,
      data: {
        deposit: newDeposit,
        paymentInstructions: paymentMethod.details,
        message: `Deposit request created successfully. ${paymentMethod.details.instructions || ''}`
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to submit deposit request'
    });
  }
});

// POST /api/deposits/upload-proof - Upload payment proof
router.post('/upload-proof', (req, res) => {
  try {
    const { depositId, file } = req.body;

    if (!depositId) {
      return res.status(400).json({
        success: false,
        error: 'Deposit ID is required'
      });
    }

    // Find deposit
    const depositIndex = deposits.findIndex(d => d.id === depositId);
    if (depositIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Deposit not found'
      });
    }

    // In real app, handle file upload to cloud storage
    const filename = `proof_${depositId}_${Date.now()}.jpg`;
    
    // Update deposit with proof
    deposits[depositIndex].paymentProof = filename;
    deposits[depositIndex].status = 'processing';
    deposits[depositIndex].adminNotes = 'Payment proof uploaded, awaiting verification';

    res.json({
      success: true,
      data: {
        deposit: deposits[depositIndex],
        filename,
        message: 'Payment proof uploaded successfully'
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to upload payment proof'
    });
  }
});

// GET /api/deposits/status/:depositId - Get deposit status
router.get('/status/:depositId', (req, res) => {
  try {
    const { depositId } = req.params;
    const deposit = deposits.find(d => d.id === depositId);

    if (!deposit) {
      return res.status(404).json({
        success: false,
        error: 'Deposit not found'
      });
    }

    res.json({
      success: true,
      data: {
        deposit,
        statusHistory: [
          {
            status: 'pending',
            timestamp: deposit.createdAt,
            note: 'Deposit request created'
          },
          {
            status: deposit.status,
            timestamp: deposit.completedAt || new Date().toISOString(),
            note: deposit.adminNotes || 'Current status'
          }
        ]
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch deposit status'
    });
  }
});

// Admin routes for managing deposits
// PUT /api/deposits/admin/approve/:depositId - Approve deposit (Admin only)
router.put('/admin/approve/:depositId', (req, res) => {
  try {
    const { depositId } = req.params;
    const { adminNotes } = req.body;

    const depositIndex = deposits.findIndex(d => d.id === depositId);
    if (depositIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Deposit not found'
      });
    }

    // Update deposit status
    deposits[depositIndex].status = 'completed';
    deposits[depositIndex].completedAt = new Date().toISOString();
    deposits[depositIndex].adminNotes = adminNotes || 'Deposit approved by admin';

    // In real app: Update user balance in database
    // This is where the cross-page integration happens
    const deposit = deposits[depositIndex];

    res.json({
      success: true,
      data: {
        deposit: deposits[depositIndex],
        message: 'Deposit approved successfully',
        balanceUpdate: {
          amount: deposit.amount,
          currency: deposit.currency,
          newBalance: 15420.5 + deposit.amount // Simulate balance update
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to approve deposit'
    });
  }
});

// PUT /api/deposits/admin/reject/:depositId - Reject deposit (Admin only)
router.put('/admin/reject/:depositId', (req, res) => {
  try {
    const { depositId } = req.params;
    const { adminNotes } = req.body;

    const depositIndex = deposits.findIndex(d => d.id === depositId);
    if (depositIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Deposit not found'
      });
    }

    // Update deposit status
    deposits[depositIndex].status = 'rejected';
    deposits[depositIndex].adminNotes = adminNotes || 'Deposit rejected by admin';

    res.json({
      success: true,
      data: {
        deposit: deposits[depositIndex],
        message: 'Deposit rejected'
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to reject deposit'
    });
  }
});

// GET /api/deposits/admin/all - Get all deposits for admin
router.get('/admin/all', (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    
    let filteredDeposits = deposits;
    if (status) {
      filteredDeposits = deposits.filter(d => d.status === status);
    }

    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedDeposits = filteredDeposits.slice(startIndex, endIndex);

    res.json({
      success: true,
      data: {
        deposits: paginatedDeposits,
        pagination: {
          total: filteredDeposits.length,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(filteredDeposits.length / limit)
        },
        statistics: {
          total: deposits.length,
          pending: deposits.filter(d => d.status === 'pending').length,
          processing: deposits.filter(d => d.status === 'processing').length,
          completed: deposits.filter(d => d.status === 'completed').length,
          rejected: deposits.filter(d => d.status === 'rejected').length,
          totalAmount: deposits.filter(d => d.status === 'completed').reduce((sum, d) => sum + d.amount, 0)
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

module.exports = router;