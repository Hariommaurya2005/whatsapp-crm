const { validationResult } = require('express-validator');
const mongoose = require('mongoose');
const KnowledgeBase = require('../models/KnowledgeBase');
const AICache = require('../services/AICache');

const populateFields = [
  { path: 'createdBy', select: 'name email' },
  { path: 'updatedBy', select: 'name email' },
];

// @desc    Get knowledge base entries (paginated, searchable, filterable)
// @route   GET /api/knowledge-base
const getKnowledgeEntries = async (req, res) => {
  try {
    const {
      category, status, search,
      page = 1, limit = 20, sort = '-updatedAt',
    } = req.query;

    const filter = { isDeleted: false };
    if (category) filter.category = category;
    if (status) filter.status = status;

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } },
        { tags: { $regex: search, $options: 'i' } },
      ];
    }

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, parseInt(limit));
    const skip = (pageNum - 1) * limitNum;

    const [entries, total] = await Promise.all([
      KnowledgeBase.find(filter)
        .populate(populateFields)
        .sort(sort)
        .skip(skip)
        .limit(limitNum),
      KnowledgeBase.countDocuments(filter),
    ]);

    res.json({
      success: true,
      count: entries.length,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum),
      data: entries,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get single knowledge base entry
// @route   GET /api/knowledge-base/:id
const getKnowledgeEntryById = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid knowledge entry ID format' });
    }

    const entry = await KnowledgeBase.findOne({ _id: req.params.id, isDeleted: false }).populate(populateFields);
    if (!entry) {
      return res.status(404).json({ success: false, message: 'Knowledge entry not found' });
    }

    res.json({ success: true, data: entry });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create a knowledge base entry
// @route   POST /api/knowledge-base
const createKnowledgeEntry = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const { title, category, content, tags, status } = req.body;

  try {
    const entry = await KnowledgeBase.create({
      title,
      category,
      content,
      tags,
      status: status || 'Draft',
      createdBy: req.user._id,
    });

    const populated = await KnowledgeBase.findById(entry._id).populate(populateFields);
    AICache.invalidateKnowledgeContext();
    res.status(201).json({ success: true, data: populated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update a knowledge base entry (bumps version by 1)
// @route   PUT /api/knowledge-base/:id
const updateKnowledgeEntry = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid knowledge entry ID format' });
    }

    const entry = await KnowledgeBase.findOne({ _id: req.params.id, isDeleted: false });
    if (!entry) {
      return res.status(404).json({ success: false, message: 'Knowledge entry not found' });
    }

    if (req.user.role !== 'admin' && entry.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to update this knowledge entry' });
    }

    // Prevent direct tampering of ownership/version/soft-delete fields via body
    delete req.body.createdBy;
    delete req.body.isDeleted;
    delete req.body.deletedAt;
    delete req.body.version;

    const updated = await KnowledgeBase.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedBy: req.user._id, $inc: { version: 1 } },
      { new: true, runValidators: true }
    ).populate(populateFields);

    AICache.invalidateKnowledgeContext();

    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Soft-delete a knowledge base entry
// @route   DELETE /api/knowledge-base/:id
const deleteKnowledgeEntry = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid knowledge entry ID format' });
    }

    const entry = await KnowledgeBase.findOne({ _id: req.params.id, isDeleted: false });
    if (!entry) {
      return res.status(404).json({ success: false, message: 'Knowledge entry not found' });
    }

    if (req.user.role !== 'admin' && entry.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this knowledge entry' });
    }

    entry.isDeleted = true;
    entry.deletedAt = new Date();
    entry.updatedBy = req.user._id;
    await entry.save();

    AICache.invalidateKnowledgeContext();

    res.json({ success: true, message: 'Knowledge entry deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getKnowledgeEntries,
  getKnowledgeEntryById,
  createKnowledgeEntry,
  updateKnowledgeEntry,
  deleteKnowledgeEntry,
};
