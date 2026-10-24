const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { generateMeetingBrief } = require('../controllers/aiController');
const { getAIHistory } = require('../controllers/aiHistoryController');

router.post('/meeting-brief/:meetingId', protect, generateMeetingBrief);
router.get('/history/:referenceType/:referenceId', protect, getAIHistory);

module.exports = router;
