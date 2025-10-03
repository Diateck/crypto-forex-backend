const express = require('express');
const router = express.Router();

// Mock database for referrals (in production, use real database)
let referralData = [];
let referralStats = {};

// GET /api/referrals/:userId - Get user's referral data
router.get('/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    
    // Get user's referral stats
    const userStats = referralStats[userId] || {
      totalReferrals: 0,
      activeReferrals: 0,
      totalCommissions: 0,
      pendingCommissions: 0,
      tier: 'Bronze',
      nextTierProgress: 0,
      commissionRate: 5,
      nextPayoutDate: '2024-01-15'
    };

    // Get user's referrals
    const userReferrals = referralData.filter(ref => ref.referrerId === userId);

    res.json({
      success: true,
      data: {
        stats: userStats,
        referrals: userReferrals,
        referralLink: `https://elonbroker.com/ref/${userId}`,
        message: 'Referral data retrieved successfully'
      }
    });
  } catch (error) {
    console.error('Referral data fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch referral data',
      error: error.message
    });
  }
});

// POST /api/referrals/register - Register a new referral
router.post('/register', (req, res) => {
  try {
    const {
      referrerId,
      referredUserId,
      referredUserName,
      referredUserEmail,
      registrationDate
    } = req.body;

    // Validation
    if (!referrerId || !referredUserId) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: referrerId, referredUserId'
      });
    }

    // Check if referral already exists
    const existingReferral = referralData.find(
      ref => ref.referrerId === referrerId && ref.referredUserId === referredUserId
    );

    if (existingReferral) {
      return res.status(400).json({
        success: false,
        message: 'Referral already exists'
      });
    }

    // Create new referral
    const newReferral = {
      id: `ref_${Date.now()}`,
      referrerId,
      referredUserId,
      referredUserName,
      referredUserEmail,
      status: 'active',
      registrationDate: registrationDate || new Date().toISOString(),
      totalCommissionEarned: 0,
      lastActivityDate: new Date().toISOString(),
      createdAt: new Date().toISOString()
    };

    referralData.push(newReferral);

    // Update referrer's stats
    if (!referralStats[referrerId]) {
      referralStats[referrerId] = {
        totalReferrals: 0,
        activeReferrals: 0,
        totalCommissions: 0,
        pendingCommissions: 0,
        tier: 'Bronze',
        nextTierProgress: 0,
        commissionRate: 5,
        nextPayoutDate: '2024-01-15'
      };
    }

    referralStats[referrerId].totalReferrals += 1;
    referralStats[referrerId].activeReferrals += 1;

    // Update tier based on referrals
    const totalRefs = referralStats[referrerId].totalReferrals;
    if (totalRefs >= 50) {
      referralStats[referrerId].tier = 'Diamond';
      referralStats[referrerId].commissionRate = 15;
    } else if (totalRefs >= 20) {
      referralStats[referrerId].tier = 'Gold';
      referralStats[referrerId].commissionRate = 10;
    } else if (totalRefs >= 10) {
      referralStats[referrerId].tier = 'Silver';
      referralStats[referrerId].commissionRate = 7;
    }

    console.log(`👥 New Referral: ${referredUserName} referred by ${referrerId}`);

    res.status(201).json({
      success: true,
      data: {
        referral: newReferral,
        updatedStats: referralStats[referrerId],
        message: 'Referral registered successfully!'
      }
    });

  } catch (error) {
    console.error('Referral registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to register referral',
      error: error.message
    });
  }
});

// POST /api/referrals/commission - Add commission for referral
router.post('/commission', (req, res) => {
  try {
    const {
      referrerId,
      referredUserId,
      commissionAmount,
      transactionType,
      transactionId
    } = req.body;

    // Validation
    if (!referrerId || !commissionAmount) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: referrerId, commissionAmount'
      });
    }

    // Find referral
    const referral = referralData.find(
      ref => ref.referrerId === referrerId && 
      (referredUserId ? ref.referredUserId === referredUserId : true)
    );

    if (!referral) {
      return res.status(404).json({
        success: false,
        message: 'Referral not found'
      });
    }

    // Update commission
    referral.totalCommissionEarned += commissionAmount;
    referral.lastActivityDate = new Date().toISOString();

    // Update referrer's stats
    if (referralStats[referrerId]) {
      referralStats[referrerId].totalCommissions += commissionAmount;
      referralStats[referrerId].pendingCommissions += commissionAmount;
    }

    console.log(`💰 Commission Added: $${commissionAmount} for ${referrerId}`);

    res.json({
      success: true,
      data: {
        commission: {
          amount: commissionAmount,
          transactionType,
          transactionId,
          addedAt: new Date().toISOString()
        },
        updatedStats: referralStats[referrerId],
        message: 'Commission added successfully'
      }
    });

  } catch (error) {
    console.error('Commission addition error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add commission',
      error: error.message
    });
  }
});

// GET /api/referrals/leaderboard - Get referral leaderboard
router.get('/leaderboard', (req, res) => {
  try {
    const leaderboard = Object.entries(referralStats)
      .map(([userId, stats]) => ({
        userId,
        totalReferrals: stats.totalReferrals,
        totalCommissions: stats.totalCommissions,
        tier: stats.tier
      }))
      .sort((a, b) => b.totalReferrals - a.totalReferrals)
      .slice(0, 10); // Top 10

    res.json({
      success: true,
      data: {
        leaderboard,
        message: 'Referral leaderboard retrieved successfully'
      }
    });
  } catch (error) {
    console.error('Leaderboard fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch referral leaderboard',
      error: error.message
    });
  }
});

// GET /api/referrals/statistics - Get overall referral statistics (Admin)
router.get('/statistics', (req, res) => {
  try {
    const totalReferrals = referralData.length;
    const activeReferrals = referralData.filter(ref => ref.status === 'active').length;
    const totalCommissions = Object.values(referralStats)
      .reduce((sum, stats) => sum + stats.totalCommissions, 0);
    
    const tierDistribution = Object.values(referralStats)
      .reduce((dist, stats) => {
        dist[stats.tier] = (dist[stats.tier] || 0) + 1;
        return dist;
      }, {});

    res.json({
      success: true,
      data: {
        totalReferrals,
        activeReferrals,
        totalCommissions,
        tierDistribution,
        averageCommissionPerUser: totalCommissions / Object.keys(referralStats).length || 0,
        message: 'Referral statistics retrieved successfully'
      }
    });
  } catch (error) {
    console.error('Referral statistics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch referral statistics',
      error: error.message
    });
  }
});

module.exports = router;