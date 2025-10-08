const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const router = express.Router();

// Use PostgreSQL User model
const User = require('../models/User');

// JWT Secret (use environment variable in production)
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Simple request logger for auth routes (masks passwords)
router.use((req, res, next) => {
  try {
    const safeBody = Object.assign({}, req.body || {});
    if (safeBody.password) safeBody.password = '[REDACTED]';
    if (safeBody.currentPassword) safeBody.currentPassword = '[REDACTED]';
    if (safeBody.newPassword) safeBody.newPassword = '[REDACTED]';

    console.log(`[Auth] ${new Date().toISOString()} ${req.method} ${req.originalUrl} - body:`, safeBody);
  } catch (err) {
    // don't break requests if logging fails
    console.error('[Auth] Request logging failed', err);
  }
  next();
});

// User registration
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body || {};

    // Validation
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and password are required'
      });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid email address'
      });
    }

    // Password strength validation
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long'
      });
    }

    // Normalize email and check if user already exists in PostgreSQL
    const normalizedEmail = email && typeof email === 'string' ? email.toLowerCase().trim() : null;
    const existingUser = normalizedEmail
      ? await User.findOne({ where: { email: normalizedEmail } })
      : null;
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create new user in PostgreSQL
    const newUser = await User.create({
      name: name ? name.trim() : null,
      email: normalizedEmail,
      password: hashedPassword,
      isActive: true
    });

    // Create JWT token
    const token = jwt.sign(
      { userId: newUser.id, email: newUser.email },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Return user data without password
    const { password: _, ...userWithoutPassword } = newUser.toJSON();

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: userWithoutPassword,
        token,
        expiresIn: '24h'
      }
    });

  } catch (error) {
    console.error('Registration error:', error && error.stack ? error.stack : error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during registration',
      error: error && error.message ? error.message : 'Internal server error'
    });
  }
});

// User login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    // Find user in PostgreSQL
    const user = await User.findOne({ where: { email: email.toLowerCase().trim() } });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Check if account is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account has been deactivated. Please contact support.'
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Create JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Return user data without password
    const { password: _, ...userWithoutPassword } = user.toJSON();

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: userWithoutPassword,
        token,
        expiresIn: '24h'
      }
    });

  } catch (error) {
    console.error('Login error:', error && error.stack ? error.stack : error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during login',
      error: error && error.message ? error.message : 'Internal server error'
    });
  }
});

// Verify token middleware
const verifyUserToken = (req, res, next) => {
  (async () => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        return res.status(401).json({
          success: false,
          message: 'Access token is required'
        });
      }
      const token = authHeader.split(' ')[1]; // Bearer <token>
      if (!token) {
        return res.status(401).json({
          success: false,
          message: 'Access token is required'
        });
      }
      // Verify JWT
      const decoded = jwt.verify(token, JWT_SECRET);
      // Check if user exists in PostgreSQL
      const user = await User.findByPk(decoded.userId);
      if (!user || !user.isActive) {
        return res.status(401).json({
          success: false,
          message: 'Invalid or expired token'
        });
      }
      // Add user to request
      req.user = user;
      req.userId = user.id;
      next();
    } catch (error) {
      console.error('Token verification error:', error);
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token'
      });
    }
  })();
};

// Get current user profile
router.get('/profile', verifyUserToken, (req, res) => {
  try {
    const userObj = req.user && typeof req.user.toJSON === 'function' ? req.user.toJSON() : (req.user || {});
    const { password: _, ...userWithoutPassword } = userObj;

    res.json({
      success: true,
      data: userWithoutPassword
    });
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching user profile'
    });
  }
});

// Update user profile
router.put('/profile', verifyUserToken, async (req, res) => {
  try {
    const { name } = req.body || {};

    const user = req.user;

    // Only allow updating safe top-level fields that exist on the model
    if (name) user.name = name.trim();

    // Persist changes
    if (typeof user.save === 'function') {
      await user.save();
    }

    const userObj = typeof user.toJSON === 'function' ? user.toJSON() : (user || {});
    const { password: _, ...userWithoutPassword } = userObj;

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: userWithoutPassword
    });

  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating user profile'
    });
  }
});

// Change password
router.put('/change-password', verifyUserToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required'
      });
    }
    
    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long'
      });
    }
    
    const user = req.user;
    
    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }
    
    // Hash new password
    const saltRounds = 12;
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);
    
    // Update password
    user.password = hashedNewPassword;
    user.updatedAt = new Date().toISOString();
    
    // Invalidate sessions if you have a session store (no-op here)
    // TODO: integrate a session store (Redis) to support session invalidation
    // ... no in-memory session map in this build
    
    // Persist updated password
    if (typeof user.save === 'function') {
      await user.save();
    }
    
    res.json({
      success: true,
      message: 'Password changed successfully. Please login again.'
    });
    
  } catch (error) {
    console.error('Password change error:', error);
    res.status(500).json({
      success: false,
      message: 'Error changing password'
    });
  }
});

// Logout
router.post('/logout', verifyUserToken, (req, res) => {
  try {
    // No in-memory session store in this deployment; if you add one, invalidate here.
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Error during logout'
    });
  }
});

// Verify token endpoint
router.get('/verify-token', verifyUserToken, (req, res) => {
  res.json({
    success: true,
    message: 'Token is valid',
    data: {
      userId: req.userId,
      email: req.user.email
    }
  });
});

// Get user's balance
router.get('/balance', verifyUserToken, (req, res) => {
  try {
    const userObj = req.user && typeof req.user.toJSON === 'function' ? req.user.toJSON() : (req.user || {});
    const balance = userObj.balance !== undefined ? userObj.balance : 0;
    res.json({
      success: true,
      data: balance
    });
  } catch (error) {
    console.error('Balance fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching balance'
    });
  }
});

// Get user's activities
router.get('/activities', verifyUserToken, (req, res) => {
  try {
    const { limit = 50, offset = 0, type } = req.query;

    const userObj = req.user && typeof req.user.toJSON === 'function' ? req.user.toJSON() : (req.user || {});
    let activities = Array.isArray(userObj.activities) ? userObj.activities.slice() : [];

    // Filter by type if provided
    if (type) {
      activities = activities.filter(activity => activity.type === type);
    }

    // Sort by date (newest first)
    activities.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Apply pagination
    const start = parseInt(offset, 10) || 0;
    const lim = parseInt(limit, 10) || 50;
    const paginatedActivities = activities.slice(start, start + lim);

    res.json({
      success: true,
      data: {
        activities: paginatedActivities,
        total: activities.length,
        offset: start,
        limit: lim
      }
    });
  } catch (error) {
    console.error('Activities fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching activities'
    });
  }
});

// Helper function to generate referral code
function generateReferralCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Export middleware for use in other routes
router.verifyUserToken = verifyUserToken;

module.exports = router;
