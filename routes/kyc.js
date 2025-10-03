const express = require('express');
const router = express.Router();

// Mock database for KYC applications (in production, use real database)
let kycApplications = [];

// GET /api/kyc/status/:userId - Get user's KYC status
router.get('/status/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    const userKYC = kycApplications.find(kyc => kyc.userId === userId);
    
    if (!userKYC) {
      return res.json({
        success: true,
        data: {
          status: 'not_submitted',
          message: 'No KYC application found'
        }
      });
    }

    res.json({
      success: true,
      data: {
        status: userKYC.status,
        submittedAt: userKYC.submittedAt,
        reviewedAt: userKYC.reviewedAt,
        adminNotes: userKYC.adminNotes,
        documents: userKYC.documents ? userKYC.documents.map(doc => ({
          type: doc.type,
          filename: doc.filename,
          uploadedAt: doc.uploadedAt
        })) : [],
        message: 'KYC status retrieved successfully'
      }
    });
  } catch (error) {
    console.error('KYC status fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch KYC status',
      error: error.message
    });
  }
});

// POST /api/kyc/submit - Submit KYC application
router.post('/submit', (req, res) => {
  try {
    const {
      userId,
      userName,
      userEmail,
      personalInfo,
      documents,
      verificationLevel
    } = req.body;

    // Validation
    if (!userId || !personalInfo) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: userId, personalInfo'
      });
    }

    // Check if user already has a KYC application
    const existingKYC = kycApplications.find(kyc => kyc.userId === userId);
    
    if (existingKYC && existingKYC.status === 'verified') {
      return res.status(400).json({
        success: false,
        message: 'User is already verified'
      });
    }

    // Create new KYC application
    const newKYCApplication = {
      id: `kyc_${Date.now()}`,
      userId,
      userName,
      userEmail,
      personalInfo: {
        fullName: personalInfo.fullName,
        dateOfBirth: personalInfo.dateOfBirth,
        nationality: personalInfo.nationality,
        address: personalInfo.address,
        phoneNumber: personalInfo.phoneNumber,
        occupation: personalInfo.occupation,
        sourceOfFunds: personalInfo.sourceOfFunds
      },
      documents: documents || [],
      verificationLevel: verificationLevel || 'basic',
      status: 'pending',
      submittedAt: new Date().toISOString(),
      reviewedAt: null,
      adminNotes: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Update existing or add new
    if (existingKYC) {
      const index = kycApplications.findIndex(kyc => kyc.userId === userId);
      kycApplications[index] = newKYCApplication;
    } else {
      kycApplications.push(newKYCApplication);
    }

    // Log for admin monitoring
    console.log(`📋 KYC Submitted: ${userName} (${userEmail})`);

    res.status(201).json({
      success: true,
      data: {
        application: {
          id: newKYCApplication.id,
          status: newKYCApplication.status,
          submittedAt: newKYCApplication.submittedAt
        },
        message: 'KYC application submitted successfully! Review will be completed within 24-48 hours.'
      }
    });

  } catch (error) {
    console.error('KYC submission error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit KYC application',
      error: error.message
    });
  }
});

// POST /api/kyc/upload-document - Upload KYC document
router.post('/upload-document', (req, res) => {
  try {
    const {
      userId,
      documentType,
      filename,
      fileData // In production, handle file upload properly
    } = req.body;

    // Find user's KYC application
    const userKYC = kycApplications.find(kyc => kyc.userId === userId);
    
    if (!userKYC) {
      return res.status(404).json({
        success: false,
        message: 'No KYC application found for user'
      });
    }

    // Add document to application
    const newDocument = {
      id: `doc_${Date.now()}`,
      type: documentType,
      filename,
      uploadedAt: new Date().toISOString(),
      fileSize: fileData ? fileData.length : 0
    };

    if (!userKYC.documents) {
      userKYC.documents = [];
    }
    userKYC.documents.push(newDocument);
    userKYC.updatedAt = new Date().toISOString();

    res.json({
      success: true,
      data: {
        document: newDocument,
        message: 'Document uploaded successfully'
      }
    });

  } catch (error) {
    console.error('Document upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload document',
      error: error.message
    });
  }
});

// GET /api/kyc/pending - Get all pending KYC applications (Admin only)
router.get('/pending', (req, res) => {
  try {
    const pendingApplications = kycApplications.filter(kyc => kyc.status === 'pending');
    
    res.json({
      success: true,
      data: {
        applications: pendingApplications,
        count: pendingApplications.length,
        message: 'Pending KYC applications retrieved successfully'
      }
    });
  } catch (error) {
    console.error('Pending KYC fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch pending KYC applications',
      error: error.message
    });
  }
});

// POST /api/kyc/review/:applicationId - Review KYC application (Admin only)
router.post('/review/:applicationId', (req, res) => {
  try {
    const { applicationId } = req.params;
    const { status, adminNotes, reviewedBy } = req.body;

    // Validation
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status must be either "approved" or "rejected"'
      });
    }

    // Find application
    const application = kycApplications.find(kyc => kyc.id === applicationId);
    
    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'KYC application not found'
      });
    }

    // Update application
    application.status = status === 'approved' ? 'verified' : 'rejected';
    application.adminNotes = adminNotes || '';
    application.reviewedAt = new Date().toISOString();
    application.reviewedBy = reviewedBy;
    application.updatedAt = new Date().toISOString();

    // Log for monitoring
    console.log(`✅ KYC ${status}: ${application.userName} (${application.userEmail})`);

    res.json({
      success: true,
      data: {
        application: {
          id: application.id,
          userId: application.userId,
          status: application.status,
          reviewedAt: application.reviewedAt
        },
        message: `KYC application ${status} successfully`
      }
    });

  } catch (error) {
    console.error('KYC review error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to review KYC application',
      error: error.message
    });
  }
});

module.exports = router;