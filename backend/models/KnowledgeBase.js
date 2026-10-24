const mongoose = require('mongoose');

const CATEGORIES = [
  'Company Profile', 'Products', 'Compensation Plan', 'Training', 'FAQs',
  'Sales Scripts', 'Meeting Guides', 'Price List', 'Policies', 'Objection Handling', 'General Notes',
];

const knowledgeBaseSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      minlength: [2, 'Title must be at least 2 characters'],
      maxlength: [150, 'Title cannot exceed 150 characters'],
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: { values: CATEGORIES, message: 'Invalid category' },
    },
    content: {
      type: String,
      required: [true, 'Content is required'],
      trim: true,
      maxlength: [20000, 'Content cannot exceed 20000 characters'],
    },
    tags: [{ type: String, trim: true }],
    version: {
      type: Number,
      default: 1,
      min: [1, 'Version must be at least 1'],
    },
    status: {
      type: String,
      enum: { values: ['Draft', 'Published', 'Archived'], message: 'Invalid status value' },
      default: 'Draft',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Created by user is required'],
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

knowledgeBaseSchema.index({ category: 1, status: 1 });
knowledgeBaseSchema.index({ isDeleted: 1 });
knowledgeBaseSchema.index({ title: 'text', content: 'text', tags: 'text' });

module.exports = mongoose.model('KnowledgeBase', knowledgeBaseSchema);
module.exports.CATEGORIES = CATEGORIES;
