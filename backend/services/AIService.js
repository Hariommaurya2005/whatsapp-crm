const axios = require('axios');

// Groq exposes an OpenAI-compatible Chat Completions API.
// Keep the existing exported function names as aliases so controller imports,
// prompt construction, response normalization, and API contracts do not change.
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const DEFAULT_MODEL = 'openai/gpt-oss-20b';
const RETIRED_MODELS = new Set(['llama-3.3-70b-versatile', 'llama-3.1-8b-instant']);
const DEFAULT_TIMEOUT_MS = 30000;
const DEFAULT_MAX_RETRIES = 2;
const RETRY_DELAY_MS = 800;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Retry network failures, throttling, and transient server failures only.
const isRetryable = (error) => {
  if (!error.response) return true;
  return error.response.status === 429 || error.response.status >= 500;
};

/**
 * Low-level call to Groq Chat Completions API.
 * Prompt construction and CRM business logic remain in existing services.
 * @returns {Promise<{success: boolean, text?: string, error?: string}>}
 */
const callGroq = async ({
  prompt,
  system,
  model,
  maxTokens = 1000,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  maxRetries = DEFAULT_MAX_RETRIES,
} = {}) => {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return { success: false, error: 'GROQ_API_KEY is not configured on the server' };
  }
  if (!prompt || !prompt.trim()) {
    return { success: false, error: 'Prompt is required' };
  }

  const requestedModel = model || process.env.GROQ_MODEL || DEFAULT_MODEL;
  // Groq retired these models for free/developer usage on 2026-08-16.
  // Auto-migrate old local .env values so legacy configuration does not keep failing.
  const selectedModel = RETIRED_MODELS.has(requestedModel) ? DEFAULT_MODEL : requestedModel;
  if (selectedModel !== requestedModel) {
    console.warn(`[AIService] GROQ_MODEL '${requestedModel}' is retired; using '${selectedModel}'. Update backend/.env.`);
  }
  const messages = [];
  if (system && system.trim()) messages.push({ role: 'system', content: system });
  messages.push({ role: 'user', content: prompt });

  const isGptOss = selectedModel.startsWith('openai/gpt-oss-');
  const payload = {
    model: selectedModel,
    messages,
    // GPT-OSS uses a reasoning budget as part of completion tokens. Keep enough
    // output budget for a short JSON answer and explicitly hide reasoning text.
    max_completion_tokens: isGptOss ? Math.max(maxTokens, 1200) : maxTokens,
    response_format: { type: 'json_object' },
    temperature: 0.2,
    ...(isGptOss ? { reasoning_effort: 'low', reasoning_format: 'hidden' } : {}),
  };

  let lastError = null;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await axios.post(GROQ_URL, payload, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: timeoutMs,
      });

      const choice = response.data?.choices?.[0];
      const text = choice?.message?.content || '';
      if (!text.trim() && choice?.finish_reason === 'length') {
        return { success: false, error: 'AI response reached its token limit before producing the JSON reply. Try again or increase the completion limit.' };
      }
      if (!text.trim()) {
        return { success: false, error: 'AI service returned an empty response' };
      }
      return { success: true, text: text.trim() };
    } catch (error) {
      lastError = error;
      if (attempt < maxRetries && isRetryable(error)) {
        await sleep(RETRY_DELAY_MS * (attempt + 1));
        continue;
      }
      break;
    }
  }

  if (lastError?.code === 'ECONNABORTED') {
    return { success: false, error: 'AI request timed out. Please try again.' };
  }
  if (lastError?.response) {
    const status = lastError.response.status;
    const apiMessage = lastError.response.data?.error?.message;
    if (status === 401 || status === 403) {
      return { success: false, error: 'Groq authentication failed. Check GROQ_API_KEY and account access.' };
    }
    if (status === 429) {
      return { success: false, error: 'Groq free-tier rate limit reached. Wait and try again, or check your model limits.' };
    }
    return { success: false, error: apiMessage || `AI service error (status ${status})` };
  }
  return { success: false, error: lastError?.message || 'AI service is unavailable' };
};

/** Parse model output for existing endpoints that expect JSON data. */
const callGroqForJSON = async (options) => {
  const result = await callGroq(options);
  if (!result.success) return result;

  const cleaned = result.text
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
  try {
    return { success: true, data: JSON.parse(cleaned) };
  } catch {
    return { success: false, error: 'AI response could not be parsed as JSON. Please try again.' };
  }
};

// Backward-compatible names: no controller/API changes needed for the provider switch.
module.exports = {
  callGroq,
  callGroqForJSON,
  callClaude: callGroq,
  callClaudeForJSON: callGroqForJSON,
};
