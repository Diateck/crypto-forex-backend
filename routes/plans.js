const express = require('express');
const router = express.Router();

// Mock database for plans (in production, use real database)
let userPlans = [];
let availablePlans = [
  {
    id: 'starter',
    name: 'Starter Plan',
    minimumDeposit: 100,
    maximumDeposit: 999,
    profitPercentage: 15,
    duration: '7 days',
    features: ['Basic trading signals', 'Email support', 'Market analysis'],
    popular: false
  },
  {
    id: 'professional',
    name: 'Professional Plan',
    minimumDeposit: 1000,
    maximumDeposit: 4999,
    profitPercentage: 25,
    duration: '14 days',
    features: ['Advanced trading signals', 'Priority support', 'Daily market updates', 'Risk management tools'],
    popular: true
  },
  {
    id: 'premium',
    name: 'Premium Plan',
    minimumDeposit: 5000,
    maximumDeposit: 19999,
    profitPercentage: 35,
    duration: '21 days',
    features: ['Premium signals', '24/7 support', 'Personal account manager', 'Exclusive webinars'],
    popular: false
  },
  {
    id: 'vip',
    name: 'VIP Plan',
    minimumDeposit: 20000,
    maximumDeposit: 100000,
    profitPercentage: 50,
    duration: '30 days',
    features: ['VIP signals', 'Dedicated support', 'Custom strategies', 'Direct broker contact'],
    popular: false
  }
];

// GET /api/plans - Get all available plans
router.get('/', (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        plans: availablePlans,
        message: 'Available investment plans retrieved successfully'
      }
    });
  } catch (error) {
    console.error('Plans fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch investment plans',
      error: error.message
    });
  }
});

// GET /api/plans/user/:userId - Get user's active plans
router.get('/user/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    const userActivePlans = userPlans.filter(plan => plan.userId === userId);
    
    res.json({
      success: true,
      data: {
        plans: userActivePlans,
        totalInvestment: userActivePlans.reduce((sum, plan) => sum + plan.amount, 0),
        message: 'User plans retrieved successfully'
      }
    });
  } catch (error) {
    console.error('User plans fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user plans',
      error: error.message
    });
  }
});

// POST /api/plans/purchase - Purchase a plan
router.post('/purchase', (req, res) => {
  try {
    const {
      userId,
      userName,
      userEmail,
      planId,
      planName,
      amount,
      paymentMethod,
      expectedProfit,
      duration
    } = req.body;

    // Validation
    if (!userId || !planId || !amount) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: userId, planId, amount'
      });
    }

    // Find the plan
    const selectedPlan = availablePlans.find(plan => plan.id === planId);
    if (!selectedPlan) {
      return res.status(404).json({
        success: false,
        message: 'Investment plan not found'
      });
    }

    // Validate amount
    if (amount < selectedPlan.minimumDeposit || amount > selectedPlan.maximumDeposit) {
      return res.status(400).json({
        success: false,
        message: `Amount must be between $${selectedPlan.minimumDeposit} and $${selectedPlan.maximumDeposit}`
      });
    }

    // Create new plan purchase
    const newPlanPurchase = {
      id: `plan_${Date.now()}`,
      userId,
      userName,
      userEmail,
      planId,
      planName: selectedPlan.name,
      amount,
      paymentMethod,
      expectedProfit: amount * (selectedPlan.profitPercentage / 100),
      actualProfit: 0,
      status: 'active',
      duration: selectedPlan.duration,
      profitPercentage: selectedPlan.profitPercentage,
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + (parseInt(selectedPlan.duration) * 24 * 60 * 60 * 1000)).toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Store the plan purchase
    userPlans.push(newPlanPurchase);

    // Log for admin monitoring
    console.log(`📊 Plan Purchase: ${userName} bought ${selectedPlan.name} for $${amount}`);

    res.status(201).json({
      success: true,
      data: {
        planPurchase: newPlanPurchase,
        message: 'Investment plan purchased successfully!'
      }
    });

  } catch (error) {
    console.error('Plan purchase error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to purchase investment plan',
      error: error.message
    });
  }
});

// GET /api/plans/statistics - Get plan statistics for admin
router.get('/statistics', (req, res) => {
  try {
    const stats = {
      totalPlans: userPlans.length,
      totalInvestment: userPlans.reduce((sum, plan) => sum + plan.amount, 0),
      totalExpectedProfit: userPlans.reduce((sum, plan) => sum + plan.expectedProfit, 0),
      activePlans: userPlans.filter(plan => plan.status === 'active').length,
      completedPlans: userPlans.filter(plan => plan.status === 'completed').length,
      planDistribution: availablePlans.map(plan => ({
        planName: plan.name,
        purchases: userPlans.filter(userPlan => userPlan.planId === plan.id).length,
        totalAmount: userPlans
          .filter(userPlan => userPlan.planId === plan.id)
          .reduce((sum, userPlan) => sum + userPlan.amount, 0)
      }))
    };

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Plan statistics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch plan statistics',
      error: error.message
    });
  }
});

module.exports = router;