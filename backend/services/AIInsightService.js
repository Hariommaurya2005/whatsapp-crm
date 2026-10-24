const mongoose = require('mongoose');
const AIInsight = require('../models/AIInsight');

/**
 * Persists one AI generation. Called by every controller that generates a
 * Meeting Brief, Conversation Summary, or Lead Intelligence report — this
 * is the single place that writes to the AIInsight collection.
 */
const saveInsight = async ({
  type, referenceType, referenceId, generatedBy, promptVersion, contextVersion, response, metadata,
}) => {
  return AIInsight.create({
    type,
    referenceType,
    referenceId,
    generatedBy,
    promptVersion,
    contextVersion,
    response,
    metadata: metadata || {},
  });
};

/**
 * Returns the generation history for a reference (a Meeting or a Lead),
 * newest first. Optionally filtered to one insight `type` — useful since a
 * Lead can have both ConversationSummary and LeadIntelligence history.
 */
const getHistory = async (referenceType, referenceId, type) => {
  const filter = { referenceType, referenceId };
  if (type) filter.type = type;

  return AIInsight.find(filter)
    .sort('-generatedAt')
    .populate('generatedBy', 'name email')
    .select('type referenceType referenceId generatedBy generatedAt promptVersion contextVersion response metadata');
};

/** Fetches a single historical insight by its own ID (for "Open Previous Version"). */
const getInsightById = async (insightId) => {
  if (!mongoose.isValidObjectId(insightId)) return null;
  return AIInsight.findById(insightId).populate('generatedBy', 'name email');
};

module.exports = { saveInsight, getHistory, getInsightById };
