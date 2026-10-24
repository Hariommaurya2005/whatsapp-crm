const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { protect } = require('../middleware/authMiddleware');
const {
  getMeetings, getMeetingsByLead, getMeetingById, createMeeting, updateMeeting, deleteMeeting,
} = require('../controllers/meetingController');

const MEETING_TYPES = ['Discovery Call', 'Demo', 'Follow-up', 'Negotiation', 'Onboarding', 'Other'];
const PLATFORMS = ['Google Meet', 'Zoom', 'Microsoft Teams', 'Phone Call', 'In Person', 'WhatsApp Call', 'Other'];
const STATUSES = ['Scheduled', 'Completed', 'Cancelled', 'Rescheduled', 'No Show'];

const meetingValidation = [
  body('leadId').notEmpty().withMessage('Lead is required'),
  body('title').trim().notEmpty().withMessage('Meeting title is required')
    .isLength({ min: 2, max: 150 }).withMessage('Title must be 2-150 characters'),
  body('meetingDate').notEmpty().withMessage('Meeting date & time is required')
    .isISO8601().withMessage('Valid date is required'),
  body('meetingType').optional().isIn(MEETING_TYPES).withMessage('Invalid meeting type'),
  body('platform').optional().isIn(PLATFORMS).withMessage('Invalid meeting platform'),
  body('meetingLink').optional({ checkFalsy: true }).trim().isURL().withMessage('Meeting link must be a valid URL')
    .isLength({ max: 500 }).withMessage('Meeting link cannot exceed 500 characters'),
  body('agenda').optional().isLength({ max: 2000 }).withMessage('Agenda cannot exceed 2000 characters'),
  body('description').optional().isLength({ max: 2000 }).withMessage('Description cannot exceed 2000 characters'),
  body('priority').optional().isIn(['Low', 'Medium', 'High']).withMessage('Invalid priority value'),
  body('status').optional().isIn(STATUSES).withMessage('Invalid status value'),
  body('notes').optional().isLength({ max: 2000 }).withMessage('Notes cannot exceed 2000 characters'),
  body('assignedTo').optional().notEmpty().withMessage('Assigned user cannot be empty'),
];

// Update allows all the same fields but without requiring leadId/meetingDate again
const meetingUpdateValidation = [
  body('title').optional().trim().isLength({ min: 2, max: 150 }).withMessage('Title must be 2-150 characters'),
  body('meetingDate').optional().isISO8601().withMessage('Valid date is required'),
  body('meetingType').optional().isIn(MEETING_TYPES).withMessage('Invalid meeting type'),
  body('platform').optional().isIn(PLATFORMS).withMessage('Invalid meeting platform'),
  body('meetingLink').optional({ checkFalsy: true }).trim().isURL().withMessage('Meeting link must be a valid URL')
    .isLength({ max: 500 }).withMessage('Meeting link cannot exceed 500 characters'),
  body('agenda').optional().isLength({ max: 2000 }).withMessage('Agenda cannot exceed 2000 characters'),
  body('description').optional().isLength({ max: 2000 }).withMessage('Description cannot exceed 2000 characters'),
  body('priority').optional().isIn(['Low', 'Medium', 'High']).withMessage('Invalid priority value'),
  body('status').optional().isIn(STATUSES).withMessage('Invalid status value'),
  body('notes').optional().isLength({ max: 2000 }).withMessage('Notes cannot exceed 2000 characters'),
];

router.route('/')
  .get(protect, getMeetings)
  .post(protect, meetingValidation, createMeeting);

router.get('/lead/:leadId', protect, getMeetingsByLead);

router.route('/:id')
  .get(protect, getMeetingById)
  .put(protect, meetingUpdateValidation, updateMeeting)
  .delete(protect, deleteMeeting);

module.exports = router;
