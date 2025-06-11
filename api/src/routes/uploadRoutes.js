const express = require('express');
const { upload } = require('../middleware/uploadMiddleware');
const { authenticate } = require('../middleware/authMiddleware');
const { uploadFiles, getAnalysis, healthCheck } = require('../controllers/uploadController');

const router = express.Router();

// Health check endpoint (public)
router.get('/health', healthCheck);

// Upload and process telemetry files (protected)
router.post('/upload', authenticate, upload.array('telemetryFiles', 2), uploadFiles);

// Get analysis data (public for now, but could be protected)
router.get('/analysis/:analysisId', getAnalysis);

module.exports = router; 