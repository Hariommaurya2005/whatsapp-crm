const { validationResult } = require('express-validator');
const mongoose = require('mongoose');
const Reminder = require('../models/Reminder');
const Lead = require('../models/Lead');
const AICache = require('../services/AICache');

const getReminders = async (req, res) => {
  try {
    const { completed, upcoming } = req.query;
    // Strictly scoped to the requesting user — including admins. Admin is
    // a platform/user-management role only, not a data-visibility bypass.
    const filter = { userId: req.user._id };

    if (completed === 'true') filter.isCompleted = true;
    else if (completed === 'false') filter.isCompleted = false;

    if (upcoming === 'true') {
      filter.reminderDate = { $gte: new Date() };
      filter.isCompleted = false;
    }

    const reminders = await Reminder.find(filter)
      .populate('leadId', 'customerName phone status')
      .sort({ reminderDate: 1 });

    res.json({ success: true, count: reminders.length, data: reminders });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const createReminder = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const { leadId, message, reminderDate } = req.body;

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

    const parsedDate = new Date(reminderDate);
    if (isNaN(parsedDate.getTime())) {
      return res.status(400).json({ success: false, message: 'Invalid reminder date' });
    }
    if (parsedDate <= new Date()) {
      return res.status(400).json({ success: false, message: 'Reminder date must be in the future' });
    }

    const reminder = await Reminder.create({
      leadId,
      userId: req.user._id,
      message,
      reminderDate: parsedDate,
    });

    const populated = await Reminder.findById(reminder._id)
      .populate('leadId', 'customerName phone status');

    AICache.invalidateLeadContext(leadId);

    res.status(201).json({ success: true, data: populated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateReminder = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid reminder ID' });
    }

    const reminder = await Reminder.findById(req.params.id);
    if (!reminder) {
      return res.status(404).json({ success: false, message: 'Reminder not found' });
    }

    if (reminder.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    // Validate date if provided
    if (req.body.reminderDate) {
      const parsedDate = new Date(req.body.reminderDate);
      if (isNaN(parsedDate.getTime())) {
        return res.status(400).json({ success: false, message: 'Invalid reminder date' });
      }
      req.body.reminderDate = parsedDate;
    }

    delete req.body.userId; // prevent userId change

    const updated = await Reminder.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    }).populate('leadId', 'customerName phone status');

    AICache.invalidateLeadContext(reminder.leadId);

    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const deleteReminder = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid reminder ID' });
    }

    const reminder = await Reminder.findById(req.params.id);
    if (!reminder) {
      return res.status(404).json({ success: false, message: 'Reminder not found' });
    }

    if (reminder.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    await reminder.deleteOne();
    AICache.invalidateLeadContext(reminder.leadId);
    res.json({ success: true, message: 'Reminder deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Toggle completed status
const toggleComplete = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid reminder ID' });
    }

    const reminder = await Reminder.findById(req.params.id);
    if (!reminder) {
      return res.status(404).json({ success: false, message: 'Reminder not found' });
    }

    if (reminder.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    reminder.isCompleted = !reminder.isCompleted;
    await reminder.save();

    const populated = await Reminder.findById(reminder._id)
      .populate('leadId', 'customerName phone status');

    AICache.invalidateLeadContext(reminder.leadId);

    res.json({ success: true, data: populated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getReminders, createReminder, updateReminder, deleteReminder, toggleComplete };
