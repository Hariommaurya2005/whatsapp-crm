const mongoose = require('mongoose');

const chatMessageSchema = new mongoose.Schema(
  {
    leadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lead',
      required: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    direction: {
      type: String,
      enum: ['inbound', 'outbound'],
      required: true,
    },
    messageType: {
      type: String,
      enum: ['text', 'image', 'document', 'audio', 'video', 'sticker', 'location', 'unknown'],
      default: 'text',
    },
    body: {
      type: String,
      default: '',
    },
    // Metadata only (id/mimeType/caption/filename, or lat/lng for location).
    // Binary media content is never downloaded or stored.
    media: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    waMessageId: {
      type: String, // WhatsApp message ID for tracking status
      default: null,
    },
    status: {
      type: String,
      enum: ['sending', 'sent', 'delivered', 'read', 'failed', 'received'],
      default: 'received',
    },
    aiSummary: {
      type: String,
      default: null,
    },
    scheduledAt: {
      type: Date,
      default: null, // null = not scheduled (sent immediately)
    },
    sentAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// Index for fast lookup by lead
chatMessageSchema.index({ leadId: 1, createdAt: 1 });
chatMessageSchema.index({ scheduledAt: 1, status: 1 }); // for scheduler
chatMessageSchema.index({ waMessageId: 1 }); // for status updates + webhook idempotency

module.exports = mongoose.model('ChatMessage', chatMessageSchema);
