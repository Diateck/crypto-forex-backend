const express = require('express');
const router = express.Router();

// Mock database for loans (in production, use real database)
let loanApplications = [];
let loanProducts = [
  {
    id: 'quick_loan',
    name: 'Quick Cash Loan',
    minAmount: 100,
    maxAmount: 5000,
    interestRate: 5,
    term: '30 days',
    processingTime: '24 hours',
    requirements: ['Verified account', 'Minimum $500 trading volume'],
    description: 'Fast approval for urgent financial needs'
  },
  {
    id: 'trading_loan',
    name: 'Trading Capital Loan',
    minAmount: 1000,
    maxAmount: 25000,
    interestRate: 7,
    term: '90 days',
    processingTime: '48 hours',
    requirements: ['KYC verified', 'Minimum 3 months trading history'],
    description: 'Boost your trading capital with flexible terms'
  },
  {
    id: 'investment_loan',
    name: 'Investment Expansion Loan',
    minAmount: 5000,
    maxAmount: 100000,
    interestRate: 10,
    term: '180 days',
    processingTime: '5-7 business days',
    requirements: ['Premium account', 'Minimum $10,000 portfolio value'],
    description: 'Large capital for serious investors'
  }
];

// GET /api/loans/products - Get available loan products
router.get('/products', (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        products: loanProducts,
        message: 'Loan products retrieved successfully'
      }
    });
  } catch (error) {
    console.error('Loan products fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch loan products',
      error: error.message
    });
  }
});

// GET /api/loans/user/:userId - Get user's loan applications
router.get('/user/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    const userLoans = loanApplications.filter(loan => loan.userId === userId);
    
    res.json({
      success: true,
      data: {
        loans: userLoans,
        totalApplications: userLoans.length,
        activeLoans: userLoans.filter(loan => loan.status === 'approved').length,
        pendingApplications: userLoans.filter(loan => loan.status === 'pending').length,
        message: 'User loans retrieved successfully'
      }
    });
  } catch (error) {
    console.error('User loans fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user loans',
      error: error.message
    });
  }
});

// POST /api/loans/apply - Apply for a loan
router.post('/apply', (req, res) => {
  try {
    const {
      userId,
      userName,
      userEmail,
      loanProductId,
      amount,
      purpose,
      income,
      employmentStatus,
      repaymentMethod,
      collateralType,
      collateralValue,
      additionalInfo
    } = req.body;

    // Validation
    if (!userId || !loanProductId || !amount || !purpose) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: userId, loanProductId, amount, purpose'
      });
    }

    // Find loan product
    const loanProduct = loanProducts.find(product => product.id === loanProductId);
    if (!loanProduct) {
      return res.status(404).json({
        success: false,
        message: 'Loan product not found'
      });
    }

    // Validate amount
    if (amount < loanProduct.minAmount || amount > loanProduct.maxAmount) {
      return res.status(400).json({
        success: false,
        message: `Loan amount must be between $${loanProduct.minAmount} and $${loanProduct.maxAmount}`
      });
    }

    // Calculate loan details
    const interestAmount = amount * (loanProduct.interestRate / 100);
    const totalRepayment = amount + interestAmount;

    // Create loan application
    const loanApplication = {
      id: `loan_${Date.now()}`,
      userId,
      userName,
      userEmail,
      loanProductId,
      loanProductName: loanProduct.name,
      amount,
      interestRate: loanProduct.interestRate,
      interestAmount,
      totalRepayment,
      term: loanProduct.term,
      purpose,
      income,
      employmentStatus,
      repaymentMethod,
      collateralType,
      collateralValue,
      additionalInfo,
      status: 'pending',
      submittedAt: new Date().toISOString(),
      reviewedAt: null,
      approvedAt: null,
      disbursedAt: null,
      adminNotes: '',
      creditScore: Math.floor(Math.random() * 300) + 500, // Mock credit score
      riskLevel: amount > 10000 ? 'high' : amount > 5000 ? 'medium' : 'low',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    loanApplications.push(loanApplication);

    // Log for admin monitoring
    console.log(`💰 Loan Application: ${userName} applied for $${amount} (${loanProduct.name})`);

    res.status(201).json({
      success: true,
      data: {
        application: {
          id: loanApplication.id,
          amount: loanApplication.amount,
          totalRepayment: loanApplication.totalRepayment,
          status: loanApplication.status,
          submittedAt: loanApplication.submittedAt,
          processingTime: loanProduct.processingTime
        },
        message: 'Loan application submitted successfully! You will receive updates via email.'
      }
    });

  } catch (error) {
    console.error('Loan application error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit loan application',
      error: error.message
    });
  }
});

// GET /api/loans/pending - Get pending loan applications (Admin only)
router.get('/pending', (req, res) => {
  try {
    const pendingLoans = loanApplications.filter(loan => loan.status === 'pending');
    
    res.json({
      success: true,
      data: {
        applications: pendingLoans,
        count: pendingLoans.length,
        message: 'Pending loan applications retrieved successfully'
      }
    });
  } catch (error) {
    console.error('Pending loans fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch pending loan applications',
      error: error.message
    });
  }
});

// POST /api/loans/review/:applicationId - Review loan application (Admin only)
router.post('/review/:applicationId', (req, res) => {
  try {
    const { applicationId } = req.params;
    const { status, adminNotes, reviewedBy, disbursementMethod } = req.body;

    // Validation
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status must be either "approved" or "rejected"'
      });
    }

    // Find application
    const application = loanApplications.find(loan => loan.id === applicationId);
    
    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Loan application not found'
      });
    }

    // Update application
    application.status = status;
    application.adminNotes = adminNotes || '';
    application.reviewedAt = new Date().toISOString();
    application.reviewedBy = reviewedBy;
    application.updatedAt = new Date().toISOString();

    if (status === 'approved') {
      application.approvedAt = new Date().toISOString();
      application.disbursementMethod = disbursementMethod;
    }

    // Log for monitoring
    console.log(`✅ Loan ${status}: ${application.userName} - $${application.amount}`);

    res.json({
      success: true,
      data: {
        application: {
          id: application.id,
          userId: application.userId,
          status: application.status,
          reviewedAt: application.reviewedAt,
          amount: application.amount
        },
        message: `Loan application ${status} successfully`
      }
    });

  } catch (error) {
    console.error('Loan review error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to review loan application',
      error: error.message
    });
  }
});

// GET /api/loans/statistics - Get loan statistics (Admin)
router.get('/statistics', (req, res) => {
  try {
    const stats = {
      totalApplications: loanApplications.length,
      pendingApplications: loanApplications.filter(loan => loan.status === 'pending').length,
      approvedLoans: loanApplications.filter(loan => loan.status === 'approved').length,
      rejectedApplications: loanApplications.filter(loan => loan.status === 'rejected').length,
      totalLoanAmount: loanApplications
        .filter(loan => loan.status === 'approved')
        .reduce((sum, loan) => sum + loan.amount, 0),
      averageLoanAmount: loanApplications.length > 0 ? 
        loanApplications.reduce((sum, loan) => sum + loan.amount, 0) / loanApplications.length : 0,
      productDistribution: loanProducts.map(product => ({
        productName: product.name,
        applications: loanApplications.filter(loan => loan.loanProductId === product.id).length,
        totalAmount: loanApplications
          .filter(loan => loan.loanProductId === product.id && loan.status === 'approved')
          .reduce((sum, loan) => sum + loan.amount, 0)
      }))
    };

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Loan statistics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch loan statistics',
      error: error.message
    });
  }
});

module.exports = router;