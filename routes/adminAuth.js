const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const router = express.Router();

// Mock admin database (in real app, use proper database)
let adminUsers = [
  {
    id: 'admin_001',
    username: 'admin',
    email: 'admin@eloninvestment.com',
    password: '$2a$10$Q9QwQwQwQwQwQwQwQwQwQeQwQwQwQwQwQwQwQwQwQwQwQwQwQwQwQwQwQwQwQwQw', // password: "admin123"
    fullName: 'System Administrator',
    role: 'super_admin',
    permissions: ['all'],
    createdAt: '2025-08-01T00:00:00Z',
    lastLogin: null,
    isActive: true,
    loginAttempts: 0,
    lockedUntil: null
  },
  {
    id: 'admin_002',
    username: 'isrealgabriel5@gmail.com',
    email: 'isrealgabriel5@gmail.com',
    password: '$2a$10$Q9QwQwQwQwQwQwQwQwQwQeQwQwQwQwQwQwQwQwQwQwQwQwQwQwQwQwQwQwQwQwQw', // password: "Isreal5161"
    fullName: 'Isreal Gabriel',
    role: 'admin',
    permissions: ['dashboard', 'notifications'],
    createdAt: '2025-10-08T00:00:00Z',
    lastLogin: null,
    isActive: true,
    loginAttempts: 0,
    lockedUntil: null
  }
];

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
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // Validation
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: 'Username and password are required'
      });
    }
    
    // Find admin user
    const adminIndex = adminUsers.findIndex(admin => 
      admin.username === username || admin.email === username
    );
    
    if (adminIndex === -1) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials',
        errorType: 'credentials' // Add error type for frontend
      });
    }
    
    const admin = adminUsers[adminIndex];
    
    // Check if account is active
    if (!admin.isActive) {
      return res.status(401).json({
        success: false,
        error: 'Account is deactivated'
      });
    }
    
    // Check if account is locked
    if (isAccountLocked(admin)) {
      const lockTimeRemaining = Math.ceil((admin.lockedUntil - Date.now()) / 60000);
      return res.status(423).json({
        success: false,
        error: `Account is locked. Try again in ${lockTimeRemaining} minutes.`
      });
    }
    
    // Verify password
    const isPasswordValid = await bcrypt.compare(password, admin.password);
    
    if (!isPasswordValid) {
      // Increment login attempts
      adminUsers[adminIndex] = incLoginAttempts(admin);
      
      const attemptsLeft = MAX_LOGIN_ATTEMPTS - admin.loginAttempts;
      return res.status(401).json({
        success: false,
        error: attemptsLeft > 0 
          ? `Invalid credentials. ${attemptsLeft} attempts remaining.`
          : 'Account locked due to multiple failed attempts.',
        errorType: 'credentials' // Add error type for frontend
      });
    }
    
    // Successful login - reset attempts and update last login
    adminUsers[adminIndex] = resetLoginAttempts(admin);
    adminUsers[adminIndex].lastLogin = new Date().toISOString();
    
    // Generate JWT token
    const token = jwt.sign(
      {
        id: admin.id,
        username: admin.username,
        role: admin.role,
        permissions: admin.permissions
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );
    
    // Return success response (exclude password)
    const { password: _, ...adminData } = admin;
    
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

module.exports = { router, verifyAdminToken };
