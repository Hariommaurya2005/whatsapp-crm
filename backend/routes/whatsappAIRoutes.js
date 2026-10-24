const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  generateConversationSummary, generateSuggestedReply, generateFollowUp,
} = require('../controllers/whatsappAIController');

router.post('/conversation-summary/:leadId', protect, generateConversationSummary);
router.post('/suggest-reply/:leadId', protect, generateSuggestedReply);
router.post('/follow-up/:leadId', protect, generateFollowUp);

module.exports = router;
