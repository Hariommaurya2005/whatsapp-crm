const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { protect } = require('../middleware/authMiddleware');
const {
  getKnowledgeEntries, getKnowledgeEntryById, createKnowledgeEntry, updateKnowledgeEntry, deleteKnowledgeEntry,
} = require('../controllers/knowledgeBaseController');

const CATEGORIES = [
  'Company Profile', 'Products', 'Compensation Plan', 'Training', 'FAQs',
  'Sales Scripts', 'Meeting Guides', 'Price List', 'Policies', 'Objection Handling', 'General Notes',
];
const STATUSES = ['Draft', 'Published', 'Archived'];

const knowledgeValidation = [
  body('title').trim().notEmpty().withMessage('Title is required')
    .isLength({ min: 2, max: 150 }).withMessage('Title must be 2-150 characters'),
  body('category').notEmpty().withMessage('Category is required')
    .isIn(CATEGORIES).withMessage('Invalid category'),
  body('content').trim().notEmpty().withMessage('Content is required')
    .isLength({ max: 20000 }).withMessage('Content cannot exceed 20000 characters'),
  body('tags').optional().isArray().withMessage('Tags must be an array'),
  body('status').optional().isIn(STATUSES).withMessage('Invalid status value'),
];

const knowledgeUpdateValidation = [
  body('title').optional().trim().isLength({ min: 2, max: 150 }).withMessage('Title must be 2-150 characters'),
  body('category').optional().isIn(CATEGORIES).withMessage('Invalid category'),
  body('content').optional().trim().isLength({ max: 20000 }).withMessage('Content cannot exceed 20000 characters'),
  body('tags').optional().isArray().withMessage('Tags must be an array'),
  body('status').optional().isIn(STATUSES).withMessage('Invalid status value'),
];

router.route('/')
  .get(protect, getKnowledgeEntries)
  .post(protect, knowledgeValidation, createKnowledgeEntry);

router.route('/:id')
  .get(protect, getKnowledgeEntryById)
  .put(protect, knowledgeUpdateValidation, updateKnowledgeEntry)
  .delete(protect, deleteKnowledgeEntry);

module.exports = router;
