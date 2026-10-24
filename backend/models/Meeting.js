const mongoose = require('mongoose');

const meetingSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    leadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lead',
      required: [true, 'Lead is required'],
      index: true,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Assigned user is required'],
    },
    title: {
      type: String,
      required: [true, 'Meeting title is required'],
      trim: true,
      minlength: [2, 'Title must be at least 2 characters'],
      maxlength: [150, 'Title cannot exceed 150 characters'],
    },
    meetingDate: {
      type: Date,
      required: [true, 'Meeting date is required'],
    },
    meetingType: {
      type: String,
      enum: {
        values: ['Discovery Call', 'Demo', 'Follow-up', 'Negotiation', 'Onboarding', 'Other'],
        message: 'Invalid meeting type',
      },
      default: 'Discovery Call',
    },
    platform: {
      type: String,
      enum: {
        values: ['Google Meet', 'Zoom', 'Microsoft Teams', 'Phone Call', 'In Person', 'WhatsApp Call', 'Other'],
        message: 'Invalid meeting platform',
      },
      default: 'Google Meet',
    },
    meetingLink: {
      type: String,
      trim: true,
      maxlength: [500, 'Meeting link cannot exceed 500 characters'],
    },
    agenda: {
      type: String,
      trim: true,
      maxlength: [2000, 'Agenda cannot exceed 2000 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
    },
    priority: {
      type: String,
      enum: { values: ['Low', 'Medium', 'High'], message: 'Invalid priority value' },
      default: 'Medium',
    },
    status: {
      type: String,
      enum: {
        values: ['Scheduled', 'Completed', 'Cancelled', 'Rescheduled', 'No Show'],
        message: 'Invalid status value',
      },
      default: 'Scheduled',
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [2000, 'Notes cannot exceed 2000 characters'],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

meetingSchema.index({ userId: 1, meetingDate: 1 });
meetingSchema.index({ status: 1 });

// Virtual: is this meeting overdue (still Scheduled but in the past)
meetingSchema.virtual('isOverdue').get(function () {
  return this.status === 'Scheduled' && this.meetingDate < new Date();
});

module.exports = mongoose.model('Meeting', meetingSchema);
