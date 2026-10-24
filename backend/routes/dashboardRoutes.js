const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { getStats } = require('../controllers/dashboardController');

router.get('/stats', protect, getStats);

module.exports = router;
