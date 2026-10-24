const mongoose = require('mongoose');

const leadSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    customerName: {
      type: String,
      required: [true, 'Customer name is required'],
      trim: true,
      minlength: [2, 'Customer name must be at least 2 characters'],
      maxlength: [150, 'Customer name cannot exceed 150 characters'],
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
      match: [/^\+?[\d\s\-()]{7,20}$/, 'Please enter a valid phone number'],
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
    },
    company: {
      type: String,
      trim: true,
      maxlength: [100, 'Company name cannot exceed 100 characters'],
    },
    status: {
      type: String,
      enum: {
        values: ['New', 'Contacted', 'In Progress', 'Converted', 'Lost'],
        message: 'Invalid status value',
      },
      default: 'New',
    },
    source: {
      type: String,
      enum: {
        values: ['WhatsApp', 'Web', 'Manual', 'Referral', 'Social Media'],
        message: 'Invalid source value',
      },
      default: 'Manual',
    },
    priority: {
      type: String,
      enum: { values: ['Low', 'Medium', 'High'], message: 'Invalid priority value' },
      default: 'Medium',
    },
    value: {
      type: Number,
      min: [0, 'Deal value cannot be negative'],
    },
    followUpDate: {
      type: Date,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [2000, 'Notes cannot exceed 2000 characters'],
    },
    tags: [{ type: String, trim: true }],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

leadSchema.index({ userId: 1, status: 1 });
leadSchema.index({ phone: 1 });
leadSchema.index({ createdAt: -1 });

// Virtual for follow-up status
leadSchema.virtual('isOverdue').get(function () {
  return this.followUpDate && this.followUpDate < new Date() && this.status !== 'Converted' && this.status !== 'Lost';
});

module.exports = mongoose.model('Lead', leadSchema);
