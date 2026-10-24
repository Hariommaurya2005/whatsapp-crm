// Normalizes raw AI JSON output before it's persisted or sent to the client.
// The model usually follows the requested schema, but LLM output should
// never be trusted blindly — a missing field here should never crash a
// controller or render a broken card on the frontend.

const normalizeString = (value, fallback = '') => {
  if (typeof value === 'string') return value.trim();
  if (value == null) return fallback;
  return String(value).trim();
};

const normalizeArray = (value) => {
  if (Array.isArray(value)) {
    return value
      .filter((item) => item !== null && item !== undefined && item !== '')
      .map((item) => (typeof item === 'string' ? item.trim() : item));
  }
  if (value === null || value === undefined || value === '') return [];
  return [value];
};

const normalizeNumber = (value, fallback = 0) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
};

const normalizeInteger = (value, fallback = 0, min = null, max = null) => {
  let num = Math.round(normalizeNumber(value, fallback));
  if (min !== null) num = Math.max(min, num);
  if (max !== null) num = Math.min(max, num);
  return num;
};

const normalizeBoolean = (value, fallback = false) => {
  if (typeof value === 'boolean') return value;
  if (value === 'true') return true;
  if (value === 'false') return false;
  return fallback;
};

const normalizeEnum = (value, allowed, fallback) => {
  const str = normalizeString(value);
  return allowed.includes(str) ? str : fallback;
};

/** Normalizes a raw AI Meeting Brief response. */
const normalizeMeetingBrief = (data = {}) => ({
  customerSummary: normalizeString(data.customerSummary),
  previousInteractionSummary: normalizeString(data.previousInteractionSummary),
  relevantProducts: normalizeArray(data.relevantProducts),
  relevantFaqs: normalizeArray(data.relevantFaqs),
  talkingPoints: normalizeArray(data.talkingPoints),
  suggestedQuestions: normalizeArray(data.suggestedQuestions),
  possibleObjections: normalizeArray(data.possibleObjections),
  recommendedResponses: normalizeArray(data.recommendedResponses),
  nextBestAction: normalizeString(data.nextBestAction),
  preparationTips: normalizeArray(data.preparationTips),
});

/** Normalizes a raw AI Conversation Summary response. */
const normalizeConversationSummary = (data = {}) => ({
  customerSummary: normalizeString(data.customerSummary),
  conversationSummary: normalizeString(data.conversationSummary),
  importantTopics: normalizeArray(data.importantTopics),
  pendingQuestions: normalizeArray(data.pendingQuestions),
  customerIntent: normalizeString(data.customerIntent),
  nextFollowUpRecommendation: normalizeString(data.nextFollowUpRecommendation),
});

/** Normalizes a raw AI Lead Intelligence response. */
const normalizeLeadIntelligence = (data = {}) => ({
  leadScore: normalizeInteger(data.leadScore, 0, 0, 100),
  scoreReason: normalizeString(data.scoreReason),
  leadTemperature: normalizeEnum(data.leadTemperature, ['Hot', 'Warm', 'Cold'], 'Cold'),
  customerIntent: normalizeEnum(data.customerIntent, ['High', 'Medium', 'Low'], 'Low'),
  sentiment: normalizeEnum(data.sentiment, ['Positive', 'Neutral', 'Negative'], 'Neutral'),
  conversionProbability: normalizeString(data.conversionProbability),
  riskFactors: normalizeArray(data.riskFactors),
  positiveSignals: normalizeArray(data.positiveSignals),
  negativeSignals: normalizeArray(data.negativeSignals),
  recommendedProducts: normalizeArray(data.recommendedProducts),
  recommendedActions: normalizeArray(data.recommendedActions),
  bestFollowUpTime: normalizeString(data.bestFollowUpTime),
  salesStrategy: normalizeString(data.salesStrategy),
  priorityLevel: normalizeEnum(data.priorityLevel, ['Critical', 'High', 'Medium', 'Low'], 'Medium'),
});

module.exports = {
  normalizeString,
  normalizeArray,
  normalizeNumber,
  normalizeInteger,
  normalizeBoolean,
  normalizeEnum,
  normalizeMeetingBrief,
  normalizeConversationSummary,
  normalizeLeadIntelligence,
};
