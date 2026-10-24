// Each builder takes a plain context object (as produced by ContextBuilder)
// and returns a prompt string ready to send through AIService.
// Builders are independent of each other and of any transport concerns.

// Bumped whenever any prompt's requested JSON schema changes in a way that
// would make older AIInsight.response records structurally different.
const PROMPT_VERSION = '1.0.0';

const formatLead = (lead) => {
  if (!lead) return 'No lead information available.';
  return [
    `Name: ${lead.customerName}`,
    `Phone: ${lead.phone}`,
    lead.company ? `Company: ${lead.company}` : null,
    `Source: ${lead.source}`,
    `Status: ${lead.status}`,
    `Priority: ${lead.priority}`,
    lead.notes ? `Notes: ${lead.notes}` : null,
  ].filter(Boolean).join('\n');
};

const formatMeeting = (meeting) => {
  if (!meeting) return 'No meeting information available.';
  return [
    `Title: ${meeting.title}`,
    `Date/Time: ${new Date(meeting.meetingDate).toLocaleString()}`,
    `Type: ${meeting.meetingType}`,
    `Platform: ${meeting.platform}`,
    meeting.agenda ? `Agenda: ${meeting.agenda}` : null,
    meeting.description ? `Description: ${meeting.description}` : null,
  ].filter(Boolean).join('\n');
};

const formatKnowledge = (knowledge) => {
  if (!knowledge || knowledge.length === 0) return 'No company knowledge base entries available.';
  return knowledge
    .map((k) => `[${k.category}] ${k.title}\n${k.content}`)
    .join('\n\n');
};

const formatConversation = (conversation) => {
  if (!conversation || conversation.length === 0) return 'No previous WhatsApp conversation with this customer.';
  return conversation
    .map((m) => `[${m.direction === 'customer' ? 'Customer' : 'Agent'}] ${m.message}`)
    .join('\n');
};

const formatMeetingHistory = (meetingHistory) => {
  if (!meetingHistory || meetingHistory.length === 0) return 'No previous meetings with this customer.';
  return meetingHistory
    .map((m) => `- ${m.title} (${m.meetingType}, ${m.status}) on ${new Date(m.meetingDate).toLocaleDateString()}${m.notes ? ` — Notes: ${m.notes}` : ''}`)
    .join('\n');
};

const formatReminderHistory = (reminderHistory) => {
  if (!reminderHistory || reminderHistory.length === 0) return 'No reminder history for this customer.';
  return reminderHistory
    .map((r) => `- ${r.message} (due ${new Date(r.reminderDate).toLocaleDateString()}, ${r.isCompleted ? 'completed' : 'pending'})`)
    .join('\n');
};

/**
 * AI Meeting Brief — full sales-prep briefing generated before a meeting.
 */
const buildMeetingBriefPrompt = (context) => {
  const { lead, meeting, knowledge, conversation } = context;

  return `You are an expert sales assistant preparing a sales representative for an upcoming meeting.

Using the customer information, meeting details, company knowledge base, and previous WhatsApp conversation below, produce a meeting preparation brief.

CUSTOMER INFORMATION:
${formatLead(lead)}

MEETING DETAILS:
${formatMeeting(meeting)}

COMPANY KNOWLEDGE BASE:
${formatKnowledge(knowledge)}

PREVIOUS WHATSAPP CONVERSATION:
${formatConversation(conversation)}

Reply ONLY with a JSON object (no markdown, no code fences) in exactly this shape:
{
  "customerSummary": "2-3 sentence summary of who this customer is and their situation",
  "previousInteractionSummary": "2-3 sentence summary of prior conversation history, or a note that there is none",
  "relevantProducts": ["short product/offer names relevant to this customer, from the knowledge base"],
  "relevantFaqs": ["short FAQ question and answer pairs relevant to this meeting, as single strings"],
  "talkingPoints": ["specific talking points for the meeting"],
  "suggestedQuestions": ["questions the rep should ask the customer"],
  "possibleObjections": ["objections this customer may raise"],
  "recommendedResponses": ["recommended responses to the objections above, in the same order"],
  "nextBestAction": "the single most important next step after this meeting",
  "preparationTips": ["practical tips for the rep to prepare before the meeting"]
}

Keep each list item concise (under 200 characters). Base every point on the information provided above — do not invent facts about the customer.`;
};

/**
 * AI Meeting Summary — post-meeting recap (reserved for a future feature;
 * built now so it shares the same context shape and calling convention).
 */
const buildMeetingSummaryPrompt = (context) => {
  const { lead, meeting, conversation } = context;

  return `You are a sales assistant summarizing a completed sales meeting.

CUSTOMER INFORMATION:
${formatLead(lead)}

MEETING DETAILS:
${formatMeeting(meeting)}

PREVIOUS WHATSAPP CONVERSATION:
${formatConversation(conversation)}

Reply ONLY with a JSON object (no markdown, no code fences) in exactly this shape:
{
  "summary": "3-4 sentence summary of how the meeting likely went based on the available context",
  "keyOutcomes": ["key outcomes or decisions"],
  "followUpActions": ["recommended follow-up actions"],
  "nextBestAction": "the single most important next step"
}`;
};

/**
 * AI Lead Insights — reserved for a future Lead Intelligence feature.
 */
const buildLeadInsightsPrompt = (context) => {
  const { lead, knowledge, conversation } = context;

  return `You are a sales assistant analyzing a lead's potential.

CUSTOMER INFORMATION:
${formatLead(lead)}

COMPANY KNOWLEDGE BASE:
${formatKnowledge(knowledge)}

PREVIOUS WHATSAPP CONVERSATION:
${formatConversation(conversation)}

Reply ONLY with a JSON object (no markdown, no code fences) in exactly this shape:
{
  "conversionLikelihood": "Low|Medium|High",
  "reasoning": "2-3 sentence explanation of the assessment",
  "recommendedApproach": "recommended approach to move this lead forward",
  "riskFactors": ["factors that could cause this lead to be lost"]
}`;
};

/**
 * AI Suggested Reply — reserved for a future WhatsApp AI reply feature.
 */
const buildSuggestedReplyPrompt = (context) => {
  const { lead, knowledge, conversation } = context;

  return `You are a helpful sales agent replying to a customer on WhatsApp.

CUSTOMER INFORMATION:
${formatLead(lead)}

COMPANY KNOWLEDGE BASE:
${formatKnowledge(knowledge)}

CONVERSATION SO FAR:
${formatConversation(conversation)}

Reply ONLY with a JSON object (no markdown, no code fences) in exactly this shape:
{
  "replies": ["3 short, natural, friendly reply options, each under 100 characters"]
}`;
};

/**
 * AI Conversation Summary — WhatsApp Assistant feature (Day 6).
 * Summarizes the full conversation history for a lead ahead of the next
 * follow-up, using the same context shape as buildMeetingContext plus
 * meeting history.
 */
const buildConversationSummaryPrompt = (context) => {
  const { lead, knowledge, conversation, meetingHistory } = context;

  return `You are a sales assistant reviewing a customer's full WhatsApp conversation history.

CUSTOMER INFORMATION:
${formatLead(lead)}

PREVIOUS MEETINGS:
${formatMeetingHistory(meetingHistory)}

COMPANY KNOWLEDGE BASE:
${formatKnowledge(knowledge)}

WHATSAPP CONVERSATION:
${formatConversation(conversation)}

Reply ONLY with a JSON object (no markdown, no code fences) in exactly this shape:
{
  "customerSummary": "2-3 sentence summary of who this customer is and their situation",
  "conversationSummary": "3-4 sentence summary of the conversation so far",
  "importantTopics": ["key topics discussed"],
  "pendingQuestions": ["questions the customer asked that have not been answered yet"],
  "customerIntent": "the customer's main goal or intent right now",
  "nextFollowUpRecommendation": "the single most important next follow-up action"
}

Base every point only on the information provided above — do not invent facts about the customer.`;
};

/**
 * AI Follow-up Suggestion — WhatsApp Assistant feature (Day 6).
 */
const buildFollowUpPrompt = (context) => {
  const { lead, conversation, meetingHistory } = context;

  return `You are a sales assistant recommending the next follow-up action for a customer.

CUSTOMER INFORMATION:
${formatLead(lead)}

PREVIOUS MEETINGS:
${formatMeetingHistory(meetingHistory)}

WHATSAPP CONVERSATION:
${formatConversation(conversation)}

Today's date is ${new Date().toISOString().slice(0, 10)}.

Reply ONLY with a JSON object (no markdown, no code fences) in exactly this shape:
{
  "recommendedDate": "YYYY-MM-DD, a realistic future date for the next follow-up",
  "reminderText": "a short reminder message describing what to do (under 150 characters)",
  "reason": "1-2 sentence explanation of why this follow-up and timing is recommended"
}`;
};

/**
 * AI Lead Intelligence — full explainable scoring engine (Day 7).
 * Distinct from buildLeadInsightsPrompt (Day 5, reserved/unused) — that
 * function is left untouched; this is the prompt actually wired to the
 * Lead Intelligence feature.
 */
const buildLeadIntelligencePrompt = (context) => {
  const { lead, knowledge, conversation, meetingHistory, reminderHistory } = context;

  return `You are an expert sales analyst producing an explainable lead intelligence report.

Every conclusion you reach must be justified by the information provided below. Do not invent facts, products, or company policies that are not present in the knowledge base or CRM data.

CUSTOMER INFORMATION:
${formatLead(lead)}

COMPANY KNOWLEDGE BASE:
${formatKnowledge(knowledge)}

WHATSAPP CONVERSATION HISTORY:
${formatConversation(conversation)}

MEETING HISTORY:
${formatMeetingHistory(meetingHistory)}

REMINDER HISTORY:
${formatReminderHistory(reminderHistory)}

Today's date is ${new Date().toISOString().slice(0, 10)}.

Reply ONLY with a JSON object (no markdown, no code fences) in exactly this shape:
{
  "leadScore": 0,
  "scoreReason": "explanation of why this score was given, referencing specific evidence above",
  "leadTemperature": "Hot|Warm|Cold",
  "customerIntent": "High|Medium|Low",
  "sentiment": "Positive|Neutral|Negative",
  "conversionProbability": "a percentage or qualitative estimate with brief justification",
  "riskFactors": ["specific risk factors that could cause this lead to be lost"],
  "positiveSignals": ["specific positive signals from the conversation or history"],
  "negativeSignals": ["specific negative signals from the conversation or history"],
  "recommendedProducts": ["products/offers from the knowledge base relevant to this customer"],
  "recommendedActions": ["specific next actions the sales rep should take"],
  "bestFollowUpTime": "recommended timing for the next follow-up, with brief reasoning",
  "salesStrategy": "2-3 sentence recommended overall strategy for converting this lead",
  "priorityLevel": "Critical|High|Medium|Low"
}

leadScore must be an integer from 0 to 100. Every field must be explainable by evidence in the context above — if evidence is limited, say so explicitly in scoreReason rather than guessing.`;
};

/**
 * Legacy Chat Summary — Day 10 refactor target.
 * The original Chat.jsx "✦ Summary" button predates buildConversationSummaryPrompt
 * and expects a smaller, differently-shaped response ({summary, intent,
 * nextAction, sentiment}). Rather than change that frontend contract, this
 * kept-minimal prompt preserves it while still routing through AIService like
 * everything else. New AI work should use buildConversationSummaryPrompt —
 * this one exists only for backward compatibility with the legacy button.
 */
const buildLegacyChatSummaryPrompt = (context) => {
  const { conversation } = context;

  return `Analyze this WhatsApp sales conversation.

CONVERSATION:
${formatConversation(conversation)}

Reply ONLY with a JSON object (no markdown, no code fences) in exactly this shape:
{
  "summary": "2-3 sentence summary",
  "intent": "customer's main goal",
  "nextAction": "recommended next step",
  "sentiment": "positive|neutral|negative"
}`;
};

module.exports = {
  PROMPT_VERSION,
  buildMeetingBriefPrompt,
  buildMeetingSummaryPrompt,
  buildLeadInsightsPrompt,
  buildSuggestedReplyPrompt,
  buildConversationSummaryPrompt,
  buildFollowUpPrompt,
  buildLeadIntelligencePrompt,
  buildLegacyChatSummaryPrompt,
};
