const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { generateLeadIntelligence } = require('../controllers/leadIntelligenceController');

router.post('/lead-intelligence/:leadId', protect, generateLeadIntelligence);

module.exports = router;
