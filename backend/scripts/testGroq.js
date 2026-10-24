require('dotenv').config();
const axios = require('axios');

const url = 'https://api.groq.com/openai/v1/chat/completions';
const apiKey = process.env.GROQ_API_KEY;
const model = process.env.GROQ_MODEL || 'openai/gpt-oss-20b';

if (!apiKey || /YOUR_|PASTE_|PLACEHOLDER/i.test(apiKey)) {
  console.error('GROQ_API_KEY is missing or still a placeholder in backend/.env');
  process.exit(1);
}

(async () => {
  try {
    const response = await axios.post(url, {
      model: model === 'llama-3.3-70b-versatile' ? 'openai/gpt-oss-20b' : model,
      messages: [
        { role: 'user', content: 'Return only valid JSON with one field: {"ok": true}.' }
      ],
      response_format: { type: 'json_object' },
      max_completion_tokens: 1200,
      temperature: 0.2,
      ...(model.startsWith('openai/gpt-oss-') || model === 'llama-3.3-70b-versatile'
        ? { reasoning_effort: 'low', reasoning_format: 'hidden' }
        : {}),
    }, {
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      timeout: 30000,
    });
    const answer = response.data?.choices?.[0]?.message?.content;
    console.log(`Groq API OK (HTTP ${response.status}) | model: ${response.data?.model || model}`);
    console.log('Test response:', answer || '[empty response]');
  } catch (error) {
    const status = error.response?.status;
    const message = error.response?.data?.error?.message || error.response?.data?.message || error.message;
    console.error(`Groq API test FAILED${status ? ` (HTTP ${status})` : ''}: ${message}`);
    console.error('The API key is never printed by this script.');
    process.exit(1);
  }
})();
