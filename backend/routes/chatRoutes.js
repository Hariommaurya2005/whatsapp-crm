const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  getThreads, getUnreadCount, getMessages,
  sendMessage, getAISummary, getQuickReplies, processScheduled
} = require('../controllers/chatController');

router.get('/threads', protect, getThreads);
router.get('/unread-count', protect, getUnreadCount);
router.get('/scheduled/process', protect, processScheduled);
router.get('/:leadId', protect, getMessages);
router.post('/:leadId/send', protect, sendMessage);
router.get('/:leadId/summary', protect, getAISummary);
router.get('/:leadId/quick-replies', protect, getQuickReplies);

module.exports = router;
