const {
  buildMeetingContext, ContextBuilderError, computeContextVersion,
} = require('../services/ContextBuilder');
const { buildMeetingBriefPrompt, PROMPT_VERSION } = require('../services/PromptBuilder');
const { callClaudeForJSON } = require('../services/AIService');
const { normalizeMeetingBrief } = require('../utils/normalizeAIResponse');
const { saveInsight } = require('../services/AIInsightService');

const MEETING_BRIEF_SYSTEM_PROMPT =
  'You are a precise, factual sales-enablement assistant. You only use the information ' +
  'given to you in the prompt. You always reply with valid JSON only — no markdown, no ' +
  'commentary, no code fences.';

// @desc    Generate an AI meeting preparation brief for a meeting
// @route   POST /api/ai/meeting-brief/:meetingId
// @body    { regenerate: boolean } — true bypasses the context cache and
//          forces a fresh generation (used by the "Regenerate" button)
const generateMeetingBrief = async (req, res) => {
  try {
    const { meetingId } = req.params;
    const bypassCache = Boolean(req.body?.regenerate);

    const { context } = await buildMeetingContext(meetingId, req.user, { bypassCache });

    const prompt = buildMeetingBriefPrompt(context);

    const result = await callClaudeForJSON({
      prompt,
      system: MEETING_BRIEF_SYSTEM_PROMPT,
      maxTokens: 1500,
    });

    if (!result.success) {
      return res.status(502).json({ success: false, message: result.error });
    }

    const normalized = normalizeMeetingBrief(result.data);

    const insight = await saveInsight({
      type: 'MeetingBrief',
      referenceType: 'Meeting',
      referenceId: meetingId,
      generatedBy: req.user._id,
      promptVersion: PROMPT_VERSION,
      contextVersion: computeContextVersion(context),
      response: normalized,
      metadata: { regenerated: bypassCache },
    });

    res.json({ success: true, data: normalized, insightId: insight._id, generatedAt: insight.generatedAt });
  } catch (error) {
    if (error instanceof ContextBuilderError) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { generateMeetingBrief };
