const mongoose = require('mongoose');
const crypto = require('crypto');
const Meeting = require('../models/Meeting');
const Lead = require('../models/Lead');
const KnowledgeBase = require('../models/KnowledgeBase');
const ChatMessage = require('../models/ChatMessage');
const Reminder = require('../models/Reminder');
const AICache = require('./AICache');

// Categories most relevant to preparing for a sales meeting.
// (No semantic/vector search in this phase — plain category + status filtering.)
const MEETING_RELEVANT_CATEGORIES = [
  'Products', 'Compensation Plan', 'FAQs', 'Sales Scripts',
  'Meeting Guides', 'Price List', 'Objection Handling',
];

const KNOWLEDGE_ENTRY_LIMIT = 12;
const CONVERSATION_MESSAGE_LIMIT = 20;
const MEETING_HISTORY_LIMIT = 5;
const REMINDER_HISTORY_LIMIT = 10;

class ContextBuilderError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
  }
}

/**
 * Loads a meeting the requesting user is authorized to see, populated with
 * its lead and assignee. Throws a ContextBuilderError (404/403) otherwise.
 * The raw document fetch is cached (5 min TTL); the authorization check
 * always runs fresh against whatever document is returned.
 *
 * OWNERSHIP POLICY: strictly the meeting's own userId — including for
 * admins. Admin is a platform/user-management role only; it does not grant
 * access to other users' private CRM data or AI context.
 */
const loadAuthorizedMeeting = async (meetingId, user, { bypassCache = false } = {}) => {
  if (!mongoose.isValidObjectId(meetingId)) {
    throw new ContextBuilderError('Invalid meeting ID format', 400);
  }

  const meeting = await AICache.getOrSet(
    `meetingDoc:${meetingId}`,
    () => Meeting.findById(meetingId).populate('leadId').populate('assignedTo', 'name email'),
    { bypass: bypassCache }
  );

  if (!meeting) {
    throw new ContextBuilderError('Meeting not found', 404);
  }
  if (meeting.userId.toString() !== user._id.toString()) {
    throw new ContextBuilderError('Not authorized to access this meeting', 403);
  }

  return meeting;
};

/** Shapes a Lead document down to the fields useful for AI context. */
const shapeLead = (lead) => {
  if (!lead) return null;
  return {
    customerName: lead.customerName,
    phone: lead.phone,
    company: lead.company,
    source: lead.source,
    status: lead.status,
    priority: lead.priority,
    notes: lead.notes,
  };
};

/** Shapes a Meeting document down to the fields useful for AI context. */
const shapeMeeting = (meeting) => ({
  title: meeting.title,
  meetingDate: meeting.meetingDate,
  meetingType: meeting.meetingType,
  platform: meeting.platform,
  agenda: meeting.agenda,
  description: meeting.description,
  priority: meeting.priority,
  status: meeting.status,
  notes: meeting.notes,
});

/** Fetches published knowledge entries relevant to preparing for a meeting. */
const getKnowledgeContext = async ({ bypassCache = false } = {}) => {
  return AICache.getOrSet(
    'knowledge:global',
    async () => {
      const entries = await KnowledgeBase.find({
        isDeleted: false,
        status: 'Published',
        category: { $in: MEETING_RELEVANT_CATEGORIES },
      })
        .select('title category content tags')
        .sort('-updatedAt')
        .limit(KNOWLEDGE_ENTRY_LIMIT);

      return entries.map((e) => ({
        title: e.title,
        category: e.category,
        content: e.content,
        tags: e.tags,
      }));
    },
    { bypass: bypassCache }
  );
};

/** Fetches the most recent WhatsApp messages for a lead, oldest first. */
const getConversationContext = async (leadId, { bypassCache = false } = {}) => {
  return AICache.getOrSet(
    `conversation:${leadId}`,
    async () => {
      const messages = await ChatMessage.find({ leadId })
        .sort({ createdAt: -1 })
        .limit(CONVERSATION_MESSAGE_LIMIT)
        .select('direction body createdAt');

      return messages.reverse().map((m) => ({
        direction: m.direction === 'inbound' ? 'customer' : 'agent',
        message: m.body,
        at: m.createdAt,
      }));
    },
    { bypass: bypassCache }
  );
};

/**
 * Builds the full AI context for a Meeting Brief:
 * { lead, meeting, knowledge, conversation }
 */
const buildMeetingContext = async (meetingId, user, { bypassCache = false } = {}) => {
  const meeting = await loadAuthorizedMeeting(meetingId, user, { bypassCache });
  const lead = meeting.leadId;

  const [knowledge, conversation] = await Promise.all([
    getKnowledgeContext({ bypassCache }),
    lead ? getConversationContext(lead._id, { bypassCache }) : Promise.resolve([]),
  ]);

  return {
    meetingRecord: meeting, // full doc, kept for the controller to use if needed
    context: {
      lead: shapeLead(lead),
      meeting: shapeMeeting(meeting),
      knowledge,
      conversation,
    },
  };
};

/**
 * Loads a lead the requesting user is authorized to see. Throws a
 * ContextBuilderError (404/403) otherwise. Reused by every WhatsApp AI
 * endpoint so the ownership check only lives in one place.
 *
 * OWNERSHIP POLICY: strictly the lead's own userId — including for admins.
 * Admin is a platform/user-management role only; it does not grant access
 * to other users' private CRM data or AI context.
 */
const loadAuthorizedLead = async (leadId, user) => {
  if (!mongoose.isValidObjectId(leadId)) {
    throw new ContextBuilderError('Invalid lead ID format', 400);
  }

  const lead = await Lead.findById(leadId);
  if (!lead) {
    throw new ContextBuilderError('Lead not found', 404);
  }
  if (lead.userId.toString() !== user._id.toString()) {
    throw new ContextBuilderError('Not authorized to access this lead', 403);
  }

  return lead;
};

/** Fetches this lead's past meetings (most recent first) for AI context. */
const getMeetingHistoryForLead = async (leadId, { bypassCache = false } = {}) => {
  return AICache.getOrSet(
    `meetingHistory:${leadId}`,
    async () => {
      const meetings = await Meeting.find({ leadId })
        .sort('-meetingDate')
        .limit(MEETING_HISTORY_LIMIT)
        .select('title meetingDate meetingType status notes');

      return meetings.map((m) => ({
        title: m.title,
        meetingDate: m.meetingDate,
        meetingType: m.meetingType,
        status: m.status,
        notes: m.notes,
      }));
    },
    { bypass: bypassCache }
  );
};

/**
 * Builds the shared AI context for WhatsApp conversation features
 * (Conversation Summary, Suggested Reply, Follow-up Suggestion):
 * { lead, knowledge, conversation, meetingHistory }
 */
const buildConversationContext = async (leadId, user, { bypassCache = false } = {}) => {
  const lead = await loadAuthorizedLead(leadId, user);

  const [knowledge, conversation, meetingHistory] = await Promise.all([
    getKnowledgeContext({ bypassCache }),
    getConversationContext(leadId, { bypassCache }),
    getMeetingHistoryForLead(leadId, { bypassCache }),
  ]);

  return {
    leadRecord: lead, // full doc, kept for the controller to use if needed
    context: {
      lead: shapeLead(lead),
      knowledge,
      conversation,
      meetingHistory,
    },
  };
};

/** Fetches this lead's reminder history (most recent first) for AI context. */
const getReminderHistoryForLead = async (leadId, { bypassCache = false } = {}) => {
  return AICache.getOrSet(
    `reminderHistory:${leadId}`,
    async () => {
      const reminders = await Reminder.find({ leadId })
        .sort('-reminderDate')
        .limit(REMINDER_HISTORY_LIMIT)
        .select('message reminderDate isCompleted');

      return reminders.map((r) => ({
        message: r.message,
        reminderDate: r.reminderDate,
        isCompleted: r.isCompleted,
      }));
    },
    { bypass: bypassCache }
  );
};

/**
 * Builds the full AI context for Lead Intelligence:
 * { lead, knowledge, conversation, meetingHistory, reminderHistory }
 */
const buildLeadIntelligenceContext = async (leadId, user, { bypassCache = false } = {}) => {
  const lead = await loadAuthorizedLead(leadId, user);

  const [knowledge, conversation, meetingHistory, reminderHistory] = await Promise.all([
    getKnowledgeContext({ bypassCache }),
    getConversationContext(leadId, { bypassCache }),
    getMeetingHistoryForLead(leadId, { bypassCache }),
    getReminderHistoryForLead(leadId, { bypassCache }),
  ]);

  return {
    leadRecord: lead, // full doc, kept for the controller to use if needed
    context: {
      lead: shapeLead(lead),
      knowledge,
      conversation,
      meetingHistory,
      reminderHistory,
    },
  };
};

/**
 * Produces a short, stable hash of a context object so an AIInsight record
 * can note exactly which context snapshot it was generated from.
 */
const computeContextVersion = (context) => {
  const json = JSON.stringify(context);
  return crypto.createHash('sha256').update(json).digest('hex').slice(0, 12);
};

module.exports = {
  ContextBuilderError,
  loadAuthorizedMeeting,
  loadAuthorizedLead,
  getKnowledgeContext,
  getConversationContext,
  getMeetingHistoryForLead,
  getReminderHistoryForLead,
  buildMeetingContext,
  buildConversationContext,
  buildLeadIntelligenceContext,
  computeContextVersion,
};
