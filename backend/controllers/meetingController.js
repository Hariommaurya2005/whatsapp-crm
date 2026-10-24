const { validationResult } = require('express-validator');
const mongoose = require('mongoose');
const Meeting = require('../models/Meeting');
const Lead = require('../models/Lead');
const User = require('../models/User');
const AICache = require('../services/AICache');

// Every Meeting is scoped strictly to its owner. Admin does not see other
// users' meetings — same corrected policy as Leads/Reminders/Chat.
const buildUserFilter = (user) => ({ userId: user._id });

const populateFields = [
  { path: 'leadId', select: 'customerName phone status company' },
  { path: 'assignedTo', select: 'name email' },
  { path: 'userId', select: 'name email' },
];

// @desc    Get all meetings (paginated, searchable, filterable)
// @route   GET /api/meetings
const getMeetings = async (req, res) => {
  try {
    const filter = buildUserFilter(req.user);
    const {
      status, meetingType, platform, priority, leadId,
      from, to, search,
      page = 1, limit = 20, sort = 'meetingDate',
    } = req.query;

    if (status) filter.status = status;
    if (meetingType) filter.meetingType = meetingType;
    if (platform) filter.platform = platform;
    if (priority) filter.priority = priority;

    if (leadId) {
      if (!mongoose.isValidObjectId(leadId)) {
        return res.status(400).json({ success: false, message: 'Invalid lead ID' });
      }
      filter.leadId = leadId;
    }

    if (from || to) {
      filter.meetingDate = {};
      if (from) filter.meetingDate.$gte = new Date(from);
      if (to) filter.meetingDate.$lte = new Date(to);
    }

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { agenda: { $regex: search, $options: 'i' } },
      ];
    }

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, parseInt(limit));
    const skip = (pageNum - 1) * limitNum;

    const [meetings, total] = await Promise.all([
      Meeting.find(filter)
        .populate(populateFields)
        .sort(sort)
        .skip(skip)
        .limit(limitNum),
      Meeting.countDocuments(filter),
    ]);

    res.json({
      success: true,
      count: meetings.length,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum),
      data: meetings,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get meetings for a specific lead (used by Lead Details page)
// @route   GET /api/meetings/lead/:leadId
const getMeetingsByLead = async (req, res) => {
  try {
    const { leadId } = req.params;
    if (!mongoose.isValidObjectId(leadId)) {
      return res.status(400).json({ success: false, message: 'Invalid lead ID' });
    }

    const lead = await Lead.findById(leadId);
    if (!lead) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }
    if (lead.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized for this lead' });
    }

    const meetings = await Meeting.find({ leadId })
      .populate(populateFields)
      .sort('-meetingDate');

    res.json({ success: true, count: meetings.length, data: meetings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get single meeting by ID
// @route   GET /api/meetings/:id
const getMeetingById = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid meeting ID format' });
    }

    const meeting = await Meeting.findById(req.params.id).populate(populateFields);
    if (!meeting) {
      return res.status(404).json({ success: false, message: 'Meeting not found' });
    }

    if (meeting.userId._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to view this meeting' });
    }

    res.json({ success: true, data: meeting });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create a meeting
// @route   POST /api/meetings
const createMeeting = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const {
    leadId, assignedTo, title, meetingDate, meetingType, platform,
    meetingLink, agenda, description, priority, status, notes,
  } = req.body;

  try {
    if (!mongoose.isValidObjectId(leadId)) {
      return res.status(400).json({ success: false, message: 'Invalid lead ID' });
    }

    const lead = await Lead.findById(leadId);
    if (!lead) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }
    if (lead.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized for this lead' });
    }

    // Default assignee to the creator if not provided
    const assigneeId = assignedTo || req.user._id.toString();
    if (!mongoose.isValidObjectId(assigneeId)) {
      return res.status(400).json({ success: false, message: 'Invalid assigned user ID' });
    }
    const assignee = await User.findById(assigneeId);
    if (!assignee) {
      return res.status(404).json({ success: false, message: 'Assigned user not found' });
    }

    const parsedDate = new Date(meetingDate);
    if (isNaN(parsedDate.getTime())) {
      return res.status(400).json({ success: false, message: 'Invalid meeting date/time' });
    }

    const meeting = await Meeting.create({
      userId: req.user._id,
      leadId,
      assignedTo: assigneeId,
      title,
      meetingDate: parsedDate,
      meetingType,
      platform,
      meetingLink,
      agenda,
      description,
      priority,
      status,
      notes,
    });

    const populated = await Meeting.findById(meeting._id).populate(populateFields);
    AICache.invalidateLeadContext(leadId);
    res.status(201).json({ success: true, data: populated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update a meeting
// @route   PUT /api/meetings/:id
const updateMeeting = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid meeting ID format' });
    }

    const meeting = await Meeting.findById(req.params.id);
    if (!meeting) {
      return res.status(404).json({ success: false, message: 'Meeting not found' });
    }
    if (meeting.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to update this meeting' });
    }

    if (req.body.meetingDate) {
      const parsedDate = new Date(req.body.meetingDate);
      if (isNaN(parsedDate.getTime())) {
        return res.status(400).json({ success: false, message: 'Invalid meeting date/time' });
      }
      req.body.meetingDate = parsedDate;
    }

    if (req.body.assignedTo && !mongoose.isValidObjectId(req.body.assignedTo)) {
      return res.status(400).json({ success: false, message: 'Invalid assigned user ID' });
    }

    // Prevent ownership / lead reassignment through this endpoint
    delete req.body.userId;
    delete req.body.leadId;

    const updated = await Meeting.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    }).populate(populateFields);

    AICache.invalidateMeetingContext(req.params.id);
    AICache.invalidateLeadContext(meeting.leadId);

    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete a meeting
// @route   DELETE /api/meetings/:id
const deleteMeeting = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid meeting ID format' });
    }

    const meeting = await Meeting.findById(req.params.id);
    if (!meeting) {
      return res.status(404).json({ success: false, message: 'Meeting not found' });
    }
    if (meeting.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this meeting' });
    }

    await meeting.deleteOne();
    AICache.invalidateMeetingContext(req.params.id);
    AICache.invalidateLeadContext(meeting.leadId);
    res.json({ success: true, message: 'Meeting deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getMeetings,
  getMeetingsByLead,
  getMeetingById,
  createMeeting,
  updateMeeting,
  deleteMeeting,
};
