const Lead = require('../models/Lead');
const ChatMessage = require('../models/ChatMessage');
const AICache = require('../services/AICache');
const whatsappService = require('../services/whatsappService');
const { buildConversationContext } = require('../services/ContextBuilder');
const { buildLegacyChatSummaryPrompt, buildSuggestedReplyPrompt } = require('../services/PromptBuilder');
const { callClaudeForJSON } = require('../services/AIService');

// ─── WhatsApp API send is now centralized in services/whatsappService.js ─────

// ─── GET /api/chat/threads — inbox list ──────────────────────────────────────
const getThreads = async (req, res) => {
  try {
    const leads = await Lead.find({ userId: req.user._id }).lean();
    const leadIds = leads.map((l) => l._id);

    // Last message per lead
    const lastMsgs = await ChatMessage.aggregate([
      { $match: { leadId: { $in: leadIds } } },
      { $sort: { createdAt: -1 } },
      { $group: { _id: '$leadId', lastMsg: { $first: '$$ROOT' } } },
    ]);

    // Unread count per lead (inbound not yet marked read)
    const unreadCounts = await ChatMessage.aggregate([
      { $match: { leadId: { $in: leadIds }, direction: 'inbound', status: { $ne: 'read' } } },
      { $group: { _id: '$leadId', count: { $sum: 1 } } },
    ]);

    const lastMap = Object.fromEntries(lastMsgs.map((m) => [m._id.toString(), m.lastMsg]));
    const unreadMap = Object.fromEntries(unreadCounts.map((u) => [u._id.toString(), u.count]));

    const threads = leads
      .filter((l) => lastMap[l._id.toString()]) // only leads with messages
      .map((l) => ({
        leadId: l._id,
        customerName: l.customerName,
        phone: l.phone,
        status: l.status,
        lastMessage: lastMap[l._id.toString()]?.body || '',
        lastDirection: lastMap[l._id.toString()]?.direction,
        lastMessageAt: lastMap[l._id.toString()]?.createdAt,
        unread: unreadMap[l._id.toString()] || 0,
      }))
      .sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt));

    res.json({ success: true, data: threads });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── GET /api/chat/unread-count ───────────────────────────────────────────────
const getUnreadCount = async (req, res) => {
  try {
    const leads = await Lead.find({ userId: req.user._id }).select('_id');
    const leadIds = leads.map((l) => l._id);
    const count = await ChatMessage.countDocuments({
      leadId: { $in: leadIds },
      direction: 'inbound',
      status: { $ne: 'read' },
    });
    res.json({ success: true, count });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── GET /api/chat/:leadId ────────────────────────────────────────────────────
const getMessages = async (req, res) => {
  try {
    const { leadId } = req.params;
    const lead = await Lead.findOne({ _id: leadId, userId: req.user._id });
    if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });

    const messages = await ChatMessage.find({ leadId }).sort({ createdAt: 1 });

    // Mark inbound as read
    await ChatMessage.updateMany(
      { leadId, direction: 'inbound', status: { $ne: 'read' } },
      { status: 'read' }
    );

    res.json({ success: true, data: messages, lead });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── POST /api/chat/:leadId/send ──────────────────────────────────────────────
const sendMessage = async (req, res) => {
  try {
    const { leadId } = req.params;
    const { body, scheduledAt } = req.body;

    if (!body?.trim()) return res.status(400).json({ success: false, message: 'Message required' });

    const lead = await Lead.findOne({ _id: leadId, userId: req.user._id });
    if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });

    if (scheduledAt) {
      const msg = await ChatMessage.create({
        leadId, phone: lead.phone, direction: 'outbound',
        body: body.trim(), status: 'sending', scheduledAt: new Date(scheduledAt),
      });
      AICache.invalidateLeadContext(leadId);
      return res.json({ success: true, data: msg, scheduled: true });
    }

    const sendResult = await whatsappService.sendTextMessage(lead.phone, body.trim());
    if (!sendResult.success) {
      console.error(`WhatsApp send failed for lead ${leadId}:`, sendResult.error);
    }

    const msg = await ChatMessage.create({
      leadId, phone: lead.phone, direction: 'outbound',
      body: body.trim(), status: sendResult.success ? 'sent' : 'failed',
      waMessageId: sendResult.waMessageId || null, sentAt: new Date(),
    });

    AICache.invalidateLeadContext(leadId);

    res.json({
      success: true,
      data: msg,
      ...(sendResult.success ? {} : { warning: sendResult.error }),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── GET /api/chat/:leadId/summary — AI conversation summary (legacy shape) ──
// Kept as its own endpoint/response contract for the existing Chat.jsx
// "Summary" button. Uses the same AIService/ContextBuilder/PromptBuilder
// architecture as every other AI feature — no direct Anthropic call here.
const getAISummary = async (req, res) => {
  try {
    const { leadId } = req.params;
    const lead = await Lead.findOne({ _id: leadId, userId: req.user._id });
    if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });

    const messageCount = await ChatMessage.countDocuments({ leadId });
    if (messageCount === 0) return res.json({ success: true, data: null });

    const { context } = await buildConversationContext(leadId, req.user);
    const prompt = buildLegacyChatSummaryPrompt(context);
    const result = await callClaudeForJSON({ prompt, maxTokens: 400 });

    if (!result.success) {
      return res.json({ success: false, message: result.error });
    }
    res.json({ success: true, data: result.data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── GET /api/chat/:leadId/quick-replies — AI suggest 3 replies ──────────────
// Reuses buildSuggestedReplyPrompt as-is (Day 6) — no duplicate prompt.
const getQuickReplies = async (req, res) => {
  try {
    const { leadId } = req.params;
    const lead = await Lead.findOne({ _id: leadId, userId: req.user._id });
    if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });

    const { context } = await buildConversationContext(leadId, req.user);
    const prompt = buildSuggestedReplyPrompt(context);
    const result = await callClaudeForJSON({ prompt, maxTokens: 300 });

    // Graceful degradation preserved: missing key / AI failure just yields
    // no quick replies rather than surfacing an error for this feature.
    if (!result.success) {
      return res.json({ success: true, data: [] });
    }
    res.json({ success: true, data: result.data.replies || [] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Scheduler ────────────────────────────────────────────────────────────────
// SECURITY: ChatMessage has no userId of its own — ownership is via its Lead.
// Strictly scoped to leads the requesting user owns — including admins.
// Admin is a platform/user-management role only, not a data-visibility
// bypass, so this never processes another user's scheduled sends.
//
// NOTE ON METHOD: this remains a GET route for backward compatibility with
// whatever currently calls it (e.g. an external cron hitting this URL on a
// schedule). A mutating action on GET is not ideal REST practice — a POST
// alias should be introduced in a future pass without breaking this one.
const processScheduled = async (req, res) => {
  try {
    const ownedLeadIds = await Lead.find({ userId: req.user._id }).select('_id');
    const leadIds = ownedLeadIds.map((l) => l._id);

    const due = await ChatMessage.find({
      leadId: { $in: leadIds },
      scheduledAt: { $lte: new Date() }, status: 'sending', direction: 'outbound',
    });
    let sent = 0;
    for (const msg of due) {
      const result = await whatsappService.sendTextMessage(msg.phone, msg.body);
      msg.status = result.success ? 'sent' : 'failed';
      msg.waMessageId = result.waMessageId || null;
      msg.sentAt = new Date();
      await msg.save();
      if (result.success) sent++;
      else console.error(`Scheduled WhatsApp send failed for message ${msg._id}:`, result.error);
    }
    res.json({ success: true, processed: due.length, sent });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { getThreads, getUnreadCount, getMessages, sendMessage, getAISummary, getQuickReplies, processScheduled };
