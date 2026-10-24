const { validationResult } = require('express-validator');
const mongoose = require('mongoose');
const Lead = require('../models/Lead');
const AICache = require('../services/AICache');

// Every Lead is scoped strictly to its owner. Admin is a platform/user-
// management role only — it does NOT grant visibility into other users'
// private CRM data. Admin sees only their own leads, same as anyone else.
const buildUserFilter = (user) => ({ userId: user._id });

const getLeads = async (req, res) => {
  try {
    const filter = buildUserFilter(req.user);
    const {
      status, source, priority, search, overdue,
      page = 1, limit = 20, sort = '-createdAt',
    } = req.query;

    if (status) filter.status = status;
    if (source) filter.source = source;
    if (priority) filter.priority = priority;
    if (overdue === 'true') {
      filter.followUpDate = { $lt: new Date() };
      filter.$and = [...(filter.$and || []), { status: { $nin: ['Converted', 'Lost'] } }];
    }
    if (search) {
      filter.$or = [
        { customerName: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { company: { $regex: search, $options: 'i' } },
      ];
    }

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, parseInt(limit));
    const skip = (pageNum - 1) * limitNum;

    const [leads, total] = await Promise.all([
      Lead.find(filter)
        .populate('userId', 'name email')
        .sort(sort)
        .skip(skip)
        .limit(limitNum),
      Lead.countDocuments(filter),
    ]);

    res.json({
      success: true,
      count: leads.length,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum),
      data: leads,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const createLead = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const { customerName, phone, email, company, status, source, priority, value, followUpDate, notes, tags } = req.body;

  try {
    // Check duplicate phone for this user
    const existing = await Lead.findOne({ phone: phone.trim(), userId: req.user._id });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'A lead with this phone number already exists',
        existingId: existing._id,
      });
    }

    const lead = await Lead.create({
      userId: req.user._id,
      customerName,
      phone,
      email,
      company,
      status: status || 'New',
      source: source || 'Manual',
      priority: priority || 'Medium',
      value,
      followUpDate,
      notes,
      tags,
    });

    res.status(201).json({ success: true, data: lead });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getLeadById = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid lead ID format' });
    }

    const lead = await Lead.findById(req.params.id).populate('userId', 'name email');
    if (!lead) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }

    if (lead.userId._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to view this lead' });
    }

    res.json({ success: true, data: lead });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateLead = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid lead ID format' });
    }

    const lead = await Lead.findById(req.params.id);
    if (!lead) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }

    if (lead.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to update this lead' });
    }

    // Prevent userId change
    delete req.body.userId;

    const updated = await Lead.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    }).populate('userId', 'name email');

    AICache.invalidateLeadContext(req.params.id);

    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const deleteLead = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid lead ID format' });
    }

    const lead = await Lead.findById(req.params.id);
    if (!lead) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }

    // Every user (including admin) may only delete their own leads.
    if (lead.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this lead' });
    }

    await lead.deleteOne();
    res.json({ success: true, message: 'Lead deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Bulk status update (admin)
const bulkUpdateStatus = async (req, res) => {
  const { ids, status } = req.body;
  const validStatuses = ['New', 'Contacted', 'In Progress', 'Converted', 'Lost'];

  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ success: false, message: 'ids array is required' });
  }
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ success: false, message: 'Invalid status value' });
  }

  try {
    const filter = { _id: { $in: ids }, userId: req.user._id };

    const result = await Lead.updateMany(filter, { status });
    res.json({ success: true, updated: result.modifiedCount });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getLeads, createLead, getLeadById, updateLead, deleteLead, bulkUpdateStatus };
