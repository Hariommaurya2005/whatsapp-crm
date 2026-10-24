const mongoose = require('mongoose');

const reminderSchema = new mongoose.Schema(
  {
    leadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lead',
      required: [true, 'Lead ID is required'],
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
    },
    message: {
      type: String,
      required: [true, 'Message is required'],
      trim: true,
      maxlength: [500, 'Message cannot exceed 500 characters'],
    },
    reminderDate: {
      type: Date,
      required: [true, 'Reminder date is required'],
    },
    isCompleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

reminderSchema.index({ userId: 1, isCompleted: 1, reminderDate: 1 });

module.exports = mongoose.model('Reminder', reminderSchema);
