const {
  buildConversationContext, ContextBuilderError, computeContextVersion,
} = require('../services/ContextBuilder');
const {
  buildConversationSummaryPrompt,
  buildSuggestedReplyPrompt,
  buildFollowUpPrompt,
  PROMPT_VERSION,
} = require('../services/PromptBuilder');
const { callClaudeForJSON } = require('../services/AIService');
const { normalizeConversationSummary } = require('../utils/normalizeAIResponse');
const { saveInsight } = require('../services/AIInsightService');

const WHATSAPP_AI_SYSTEM_PROMPT =
  'You are a precise, factual sales-enablement assistant. You only use the information ' +
  'given to you in the prompt and the company knowledge base. You never invent company ' +
  'facts, pricing, or policies. You always reply with valid JSON only — no markdown, no ' +
  'commentary, no code fences.';

const handleContextError = (error, res) => {
  if (error instanceof ContextBuilderError) {
    return res.status(error.statusCode).json({ success: false, message: error.message });
  }
  return res.status(500).json({ success: false, message: error.message });
};

// @desc    Generate an AI summary of a customer's WhatsApp conversation history
// @route   POST /api/ai/conversation-summary/:leadId
// @body    { regenerate: boolean } — true bypasses the context cache
const generateConversationSummary = async (req, res) => {
  try {
    const { leadId } = req.params;
    const bypassCache = Boolean(req.body?.regenerate);
    const { context } = await buildConversationContext(leadId, req.user, { bypassCache });

    const prompt = buildConversationSummaryPrompt(context);
    const result = await callClaudeForJSON({
      prompt,
      system: WHATSAPP_AI_SYSTEM_PROMPT,
      maxTokens: 1200,
    });

    if (!result.success) {
      return res.status(502).json({ success: false, message: result.error });
    }

    const normalized = normalizeConversationSummary(result.data);

    const insight = await saveInsight({
      type: 'ConversationSummary',
      referenceType: 'Lead',
      referenceId: leadId,
      generatedBy: req.user._id,
      promptVersion: PROMPT_VERSION,
      contextVersion: computeContextVersion(context),
      response: normalized,
      metadata: { regenerated: bypassCache },
    });

    res.json({ success: true, data: normalized, insightId: insight._id, generatedAt: insight.generatedAt });
  } catch (error) {
    handleContextError(error, res);
  }
};

// @desc    Generate a suggested WhatsApp reply for a customer
// @route   POST /api/ai/suggest-reply/:leadId
const generateSuggestedReply = async (req, res) => {
  try {
    const { leadId } = req.params;
    const { context } = await buildConversationContext(leadId, req.user);

    // Reuses the exact prompt built on Day 5 — no duplicated prompt logic.
    const prompt = buildSuggestedReplyPrompt(context);
    const result = await callClaudeForJSON({
      prompt,
      system: WHATSAPP_AI_SYSTEM_PROMPT,
      maxTokens: 500,
    });

    if (!result.success) {
      return res.status(502).json({ success: false, message: result.error });
    }
    res.json({ success: true, data: result.data });
  } catch (error) {
    handleContextError(error, res);
  }
};

// @desc    Generate a recommended follow-up (date, reminder text, reason)
// @route   POST /api/ai/follow-up/:leadId
const generateFollowUp = async (req, res) => {
  try {
    const { leadId } = req.params;
    const { context } = await buildConversationContext(leadId, req.user);

    const prompt = buildFollowUpPrompt(context);
    const result = await callClaudeForJSON({
      prompt,
      system: WHATSAPP_AI_SYSTEM_PROMPT,
      maxTokens: 400,
    });

    if (!result.success) {
      return res.status(502).json({ success: false, message: result.error });
    }
    res.json({ success: true, data: result.data });
  } catch (error) {
    handleContextError(error, res);
  }
};

module.exports = { generateConversationSummary, generateSuggestedReply, generateFollowUp };
