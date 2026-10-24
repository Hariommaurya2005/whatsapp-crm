# Switch AutoCRM AI from Anthropic to Groq

The existing AI controllers still call the AI service using their current exported names. `backend/services/AIService.js` now sends those requests to the Groq OpenAI-compatible Chat Completions API, so the existing REST routes, prompt builders, response normalizers, and frontend contracts remain unchanged.

## 1. Create a Groq API key

1. Sign in at https://console.groq.com/keys
2. Create a key and copy it once.
3. Never paste the key into frontend code, source control, or chat.

## 2. Configure backend/.env

Add these lines to `backend/.env` (keep the rest of your existing values):

```env
GROQ_API_KEY=your_actual_groq_api_key
GROQ_MODEL=openai/gpt-oss-20b
```

Use your actual key locally. Do not commit `.env`. `ANTHROPIC_API_KEY` is not required by this provider implementation.

## 3. Restart backend

From the backend directory:

```powershell
npm run dev
```

No additional npm package is required; this project already uses `axios`.

## 4. Test

Trigger an existing AI feature from the CRM, such as an AI Meeting Brief, conversation summary, suggested reply, follow-up, or Lead Intelligence. Check the backend terminal if the UI shows an error. The free plan is rate-limited; a `429` means you should wait and retry or check the model-specific limits at https://console.groq.com/docs/rate-limits.

## Notes

- The frontend still communicates with the existing backend routes.
- Existing controllers import `callClaudeForJSON`; that name is retained as a compatibility alias but now calls Groq.
- The default model is `openai/gpt-oss-20b`, which supports JSON mode. Legacy `.env` values `llama-3.3-70b-versatile` and `llama-3.1-8b-instant` are automatically mapped to this replacement, but update `GROQ_MODEL` in `backend/.env` too. GPT-OSS JSON calls set `reasoning_format=hidden` and `reasoning_effort=low`. See https://console.groq.com/docs/deprecations and https://console.groq.com/docs/model/openai/gpt-oss-20b.
- Cloud API provider policies and retention terms differ. Avoid sending sensitive real customer information until you have reviewed Groq's current terms and data controls.
