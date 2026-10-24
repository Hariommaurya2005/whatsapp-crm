const express = require('express');
const router = express.Router();
const { body, query } = require('express-validator');
const { protect, adminOnly } = require('../middleware/authMiddleware');
const {
  getLeads, createLead, getLeadById, updateLead, deleteLead, bulkUpdateStatus,
} = require('../controllers/leadController');

const leadValidation = [
  body('customerName').trim().notEmpty().withMessage('Customer name is required')
    .isLength({ min: 2, max: 150 }).withMessage('Name must be 2-150 characters'),
  body('phone').trim().notEmpty().withMessage('Phone number is required')
    .matches(/^\+?[\d\s\-()]{7,20}$/).withMessage('Invalid phone number format'),
  body('email').optional({ checkFalsy: true }).trim().isEmail().withMessage('Invalid email format').normalizeEmail(),
  body('status').optional().isIn(['New', 'Contacted', 'In Progress', 'Converted', 'Lost'])
    .withMessage('Invalid status value'),
  body('source').optional().isIn(['WhatsApp', 'Web', 'Manual', 'Referral', 'Social Media'])
    .withMessage('Invalid source value'),
  body('priority').optional().isIn(['Low', 'Medium', 'High']).withMessage('Invalid priority value'),
  body('value').optional().isFloat({ min: 0 }).withMessage('Value must be a positive number'),
  body('followUpDate').optional().isISO8601().withMessage('Invalid date format'),
  body('notes').optional().isLength({ max: 2000 }).withMessage('Notes cannot exceed 2000 characters'),
];

router.route('/')
  .get(protect, getLeads)
  .post(protect, leadValidation, createLead);

router.put('/bulk-status', protect, bulkUpdateStatus);

router.route('/:id')
  .get(protect, getLeadById)
  .put(protect, leadValidation, updateLead)
  .delete(protect, deleteLead); // users can delete their own, admin can delete any

module.exports = router;
