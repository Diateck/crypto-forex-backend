const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const router = express.Router();

// Use User model for admin authentication
const User = require('../models/User');

// JWT secret (in production, use environment variable)
const JWT_SECRET = process.env.JWT_SECRET || 'admin_secret_key_2025_elon_investment';
const JWT_EXPIRES_IN = '24h';
const MAX_LOGIN_ATTEMPTS = 10;
const LOCK_TIME = 30 * 60 * 1000; // 30 minutes

// Middleware to verify admin JWT token
const verifyAdminToken = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Access denied. No token provided.'
    });
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.admin = decoded;
    next();
  } catch (error) {
    res.status(400).json({
      success: false,
      error: 'Invalid token.'
    });
  }
};

// Helper function to check if account is locked
const isAccountLocked = (admin) => {
  return admin.lockedUntil && admin.lockedUntil > Date.now();
};

// Helper function to increment login attempts
const incLoginAttempts = (admin) => {
  // Calculate when lock expires (if at max attempts)
  if (admin.loginAttempts + 1 >= MAX_LOGIN_ATTEMPTS && !isAccountLocked(admin)) {
    admin.lockedUntil = Date.now() + LOCK_TIME;
  }
  admin.loginAttempts += 1;
  return admin;
};

// Helper function to reset login attempts
const resetLoginAttempts = (admin) => {
  admin.loginAttempts = 0;
  admin.lockedUntil = null;
  return admin;
};

// POST /api/admin-auth/login - Admin login
  try {
    const { username, password } = req.body;

    // Validation
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: 'Username and password are required'
      });
    }

    // Find admin user in DB (by email or name)
    const admin = await User.findOne({
      where: {
        email: username
      }
    });

    if (!admin) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials',
        errorType: 'credentials'
      });
    }

    // Check if account is active
    if (admin.isActive === false) {
      return res.status(401).json({
        success: false,
        error: 'Account is deactivated'
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, admin.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials',
        errorType: 'credentials'
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        // Add more fields if needed
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    // Return success response (exclude password)
    const { password: _, ...adminData } = admin.toJSON();

    res.json({
      success: true,
      data: {
        admin: adminData,
        token,
        expiresIn: JWT_EXPIRES_IN
      },
      message: 'Login successful'
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// POST /api/admin-auth/logout - Admin logout
router.post('/logout', verifyAdminToken, (req, res) => {
  try {
    // In a real app, you might want to blacklist the token
    res.json({
      success: true,
      message: 'Logout successful'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// GET /api/admin-auth/profile - Get admin profile
router.get('/profile', verifyAdminToken, (req, res) => {
  try {
    const admin = adminUsers.find(a => a.id === req.admin.id);
    
    if (!admin) {
      return res.status(404).json({
        success: false,
        error: 'Admin not found'
      });
    }
    
    const { password: _, ...adminData } = admin;
    
    res.json({
      success: true,
      data: { admin: adminData }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// PUT /api/admin-auth/change-password - Change admin password
router.put('/change-password', verifyAdminToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    // Validation
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Current password and new password are required'
      });
    }
    
    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'New password must be at least 6 characters long'
      });
    }
    
    // Find admin
    const adminIndex = adminUsers.findIndex(a => a.id === req.admin.id);
    
    if (adminIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Admin not found'
      });
    }
    
    const admin = adminUsers[adminIndex];
    
    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, admin.password);
    
    if (!isCurrentPasswordValid) {
      return res.status(401).json({
        success: false,
        error: 'Current password is incorrect'
      });
    }
    
    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    
    // Update password
    adminUsers[adminIndex].password = hashedNewPassword;
    
    res.json({
      success: true,
      message: 'Password changed successfully'
    });
    
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// PUT /api/admin-auth/update-profile - Update admin profile
router.put('/update-profile', verifyAdminToken, async (req, res) => {
  try {
    const { fullName, email, username } = req.body;
    
    // Find admin
    const adminIndex = adminUsers.findIndex(a => a.id === req.admin.id);
    
    if (adminIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Admin not found'
      });
    }
    
    // Check if username/email already exists (for other admins)
    const existingAdmin = adminUsers.find(a => 
      a.id !== req.admin.id && (a.username === username || a.email === email)
    );
    
    if (existingAdmin) {
      return res.status(400).json({
        success: false,
        error: 'Username or email already exists'
      });
    }
    
    // Update profile
    if (fullName) adminUsers[adminIndex].fullName = fullName;
    if (email) adminUsers[adminIndex].email = email;
    if (username) adminUsers[adminIndex].username = username;
    
    const { password: _, ...adminData } = adminUsers[adminIndex];
    
    res.json({
      success: true,
      data: { admin: adminData },
      message: 'Profile updated successfully'
    });
    
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// POST /api/admin-auth/verify-token - Verify if token is valid
router.post('/verify-token', verifyAdminToken, (req, res) => {
  res.json({
    success: true,
    data: {
      admin: req.admin,
      valid: true
    }
  });
});

// GET /api/admin-auth/login-history - Get login history
router.get('/login-history', verifyAdminToken, (req, res) => {
  try {
    const admin = adminUsers.find(a => a.id === req.admin.id);
    
    // Mock login history (in real app, store in database)
    const loginHistory = [
      {
        id: 'login_001',
        timestamp: admin.lastLogin || new Date().toISOString(),
        ip: '192.168.1.100',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        status: 'success'
      }
    ];
    
    res.json({
      success: true,
      data: { loginHistory }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// -----------------------------------------------------------------------------
// TEMPORARY: Protected endpoint to reset an admin password in-memory
// Usage: POST /api/admin-auth/temp-reset
// Body: { username: string, newPassword: string, secret: string }
// This is intentionally short-lived: require setting the env RESET_ADMIN_SECRET
// before calling. Remove this endpoint after use or set RESET_ADMIN_SECRET to
// an unpredictable secret and keep it out of source control.
router.post('/temp-reset', async (req, res) => {
  try {
    const { username, newPassword, secret } = req.body || {};

    const RESET_SECRET = process.env.RESET_ADMIN_SECRET;
    if (!RESET_SECRET) {
      return res.status(403).json({ success: false, error: 'Temporary reset not enabled on this server.' });
    }

    if (!secret || secret !== RESET_SECRET) {
      return res.status(403).json({ success: false, error: 'Invalid reset secret.' });
    }

    if (!username || !newPassword) {
      return res.status(400).json({ success: false, error: 'username and newPassword are required' });
    }

    const adminIndex = adminUsers.findIndex(a => a.username === username || a.email === username);
    if (adminIndex === -1) {
      return res.status(404).json({ success: false, error: 'Admin user not found' });
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    adminUsers[adminIndex].password = hashed;
    // clear locks/attempts so you can login immediately
    adminUsers[adminIndex].loginAttempts = 0;
    adminUsers[adminIndex].lockedUntil = null;

    return res.json({ success: true, message: 'Admin password has been reset (in-memory). Please login and change it immediately.' });
  } catch (error) {
    console.error('Temp reset error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

module.exports = { router, verifyAdminToken };