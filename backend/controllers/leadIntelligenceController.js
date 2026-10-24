const {
  buildLeadIntelligenceContext, ContextBuilderError, computeContextVersion,
} = require('../services/ContextBuilder');
const { buildLeadIntelligencePrompt, PROMPT_VERSION } = require('../services/PromptBuilder');
const { callClaudeForJSON } = require('../services/AIService');
const { normalizeLeadIntelligence } = require('../utils/normalizeAIResponse');
const { saveInsight } = require('../services/AIInsightService');

const LEAD_INTELLIGENCE_SYSTEM_PROMPT =
  'You are a precise, evidence-based sales analyst. You only use the information given to ' +
  'you in the prompt and the company knowledge base. You never invent company facts, ' +
  'pricing, or policies, and you never return a score or conclusion without explaining ' +
  'the evidence behind it. You always reply with valid JSON only — no markdown, no ' +
  'commentary, no code fences.';

// @desc    Generate an explainable AI lead intelligence report
// @route   POST /api/ai/lead-intelligence/:leadId
// @body    { regenerate: boolean } — true bypasses the context cache
const generateLeadIntelligence = async (req, res) => {
  try {
    const { leadId } = req.params;
    const bypassCache = Boolean(req.body?.regenerate);
    const { context } = await buildLeadIntelligenceContext(leadId, req.user, { bypassCache });

    const prompt = buildLeadIntelligencePrompt(context);
    const result = await callClaudeForJSON({
      prompt,
      system: LEAD_INTELLIGENCE_SYSTEM_PROMPT,
      maxTokens: 1600,
    });

    if (!result.success) {
      return res.status(502).json({ success: false, message: result.error });
    }

    const normalized = normalizeLeadIntelligence(result.data);

    const insight = await saveInsight({
      type: 'LeadIntelligence',
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
    if (error instanceof ContextBuilderError) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { generateLeadIntelligence };
