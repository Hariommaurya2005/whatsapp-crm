const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { protect } = require('../middleware/authMiddleware');
const {
  getReminders, createReminder, updateReminder, deleteReminder, toggleComplete,
} = require('../controllers/reminderController');

const reminderValidation = [
  body('leadId').notEmpty().withMessage('Lead ID is required'),
  body('message').trim().notEmpty().withMessage('Message is required')
    .isLength({ max: 500 }).withMessage('Message cannot exceed 500 characters'),
  body('reminderDate').isISO8601().withMessage('Valid date is required'),
];

router.route('/')
  .get(protect, getReminders)
  .post(protect, reminderValidation, createReminder);

router.route('/:id')
  .put(protect, updateReminder)
  .delete(protect, deleteReminder);

router.patch('/:id/toggle', protect, toggleComplete);

module.exports = router;
