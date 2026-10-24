const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/authMiddleware');
const { getUsers, updateUserStatus } = require('../controllers/userController');

router.get('/', protect, adminOnly, getUsers);
router.put('/:id/status', protect, adminOnly, updateUserStatus);

module.exports = router;
