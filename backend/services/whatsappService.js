const axios = require('axios');
const crypto = require('crypto');

const DEFAULT_API_VERSION = 'v18.0';

// Meta's inbound status strings map directly to almost all of our enum
// values already; this exists as one place to adjust if that ever changes.
const STATUS_MAP = {
  sent: 'sent',
  delivered: 'delivered',
  read: 'read',
  failed: 'failed',
};

/**
 * Reads and validates WhatsApp credentials from environment variables.
 * Never hardcode secrets — everything comes from process.env.
 * Returns { configured: false, missing: [...] } instead of throwing, so
 * callers can degrade gracefully instead of crashing the app.
 */
const getConfig = () => {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const apiVersion = process.env.WHATSAPP_API_VERSION || DEFAULT_API_VERSION;
  const appSecret = process.env.META_APP_SECRET;
  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;
  const businessAccountId = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID;
  const appId = process.env.META_APP_ID;

  const missing = [];
  if (!accessToken) missing.push('WHATSAPP_ACCESS_TOKEN');
  if (!phoneNumberId) missing.push('WHATSAPP_PHONE_NUMBER_ID');

  return {
    configured: missing.length === 0,
    missing,
    accessToken,
    phoneNumberId,
    apiVersion,
    appSecret,
    verifyToken,
    businessAccountId,
    appId,
  };
};

/** True if the minimum credentials needed to send/receive messages are set. */
const isConfigured = () => getConfig().configured;

const graphApiUrl = (config, path) =>
  `https://graph.facebook.com/${config.apiVersion}/${path}`;

/**
 * Sends a text message via the WhatsApp Cloud API.
 * Returns { success: true, waMessageId } or { success: false, error }.
 * Never throws for expected failure modes (missing config, Meta API error) —
 * callers decide how to persist/display the failure.
 */
const sendTextMessage = async (to, text) => {
  const config = getConfig();
  if (!config.configured) {
    return {
      success: false,
      error: `WhatsApp is not configured on the server (missing: ${config.missing.join(', ')})`,
    };
  }

  try {
    const response = await axios.post(
      graphApiUrl(config, `${config.phoneNumberId}/messages`),
      { messaging_product: 'whatsapp', to, type: 'text', text: { body: text } },
      {
        headers: { Authorization: `Bearer ${config.accessToken}`, 'Content-Type': 'application/json' },
        timeout: 15000,
      }
    );
    const waMessageId = response.data?.messages?.[0]?.id || null;
    if (!waMessageId) {
      return { success: false, error: 'WhatsApp API returned no message ID' };
    }
    return { success: true, waMessageId };
  } catch (error) {
    // Log full detail server-side only; never surface the token or raw
    // Meta payload to the client.
    console.error('WhatsApp send error:', error.response?.data || error.message);
    const metaMessage = error.response?.data?.error?.message;
    return { success: false, error: metaMessage || 'Failed to send WhatsApp message' };
  }
};

/**
 * Verifies a Meta webhook subscription (GET) challenge request.
 */
const verifySubscription = (mode, token, challenge) => {
  const config = getConfig();
  if (mode === 'subscribe' && config.verifyToken && token === config.verifyToken) {
    return { verified: true, challenge };
  }
  return { verified: false };
};

/**
 * Verifies the X-Hub-Signature-256 header Meta sends on every webhook POST,
 * using META_APP_SECRET. Requires the raw (unparsed) request body buffer —
 * server.js captures this via express.json's `verify` option.
 * If META_APP_SECRET isn't configured, verification is skipped (returns
 * true) so the integration still works during initial setup, but this
 * should always be set in production.
 */
const verifyWebhookSignature = (rawBody, signatureHeader) => {
  const config = getConfig();
  if (!config.appSecret) return true; // not configured — can't verify, don't block
  if (!signatureHeader || !rawBody) return false;

  const expected = 'sha256=' + crypto
    .createHmac('sha256', config.appSecret)
    .update(rawBody)
    .digest('hex');

  const expectedBuf = Buffer.from(expected);
  const receivedBuf = Buffer.from(signatureHeader);
  if (expectedBuf.length !== receivedBuf.length) return false;

  return crypto.timingSafeEqual(expectedBuf, receivedBuf);
};

/**
 * Normalizes a single raw Meta message object (from a webhook payload) into
 * the shape our ChatMessage model expects. Handles text and every media
 * type Meta can send; only stores media *metadata* (id/mimeType/caption/
 * filename) — never downloads or stores binary media content.
 */
const parseIncomingMessage = (message) => {
  let messageType = 'unknown';
  let body = '[Unsupported message type]';
  let media = null;

  if (message.text?.body) {
    messageType = 'text';
    body = message.text.body;
  } else if (message.image) {
    messageType = 'image';
    body = message.image.caption || '[Image]';
    media = { id: message.image.id, mimeType: message.image.mime_type, caption: message.image.caption || null };
  } else if (message.document) {
    messageType = 'document';
    body = message.document.filename || '[Document]';
    media = { id: message.document.id, mimeType: message.document.mime_type, filename: message.document.filename || null };
  } else if (message.audio) {
    messageType = 'audio';
    body = '[Audio message]';
    media = { id: message.audio.id, mimeType: message.audio.mime_type };
  } else if (message.video) {
    messageType = 'video';
    body = message.video.caption || '[Video]';
    media = { id: message.video.id, mimeType: message.video.mime_type, caption: message.video.caption || null };
  } else if (message.sticker) {
    messageType = 'sticker';
    body = '[Sticker]';
    media = { id: message.sticker.id, mimeType: message.sticker.mime_type };
  } else if (message.location) {
    messageType = 'location';
    const { latitude, longitude, name } = message.location;
    body = name || `[Location: ${latitude}, ${longitude}]`;
    media = { latitude, longitude, name: name || null };
  }

  return {
    messageType,
    body,
    media,
    waMessageId: message.id,
    sentAt: new Date(parseInt(message.timestamp, 10) * 1000),
  };
};

/** Maps a Meta status webhook event string to our ChatMessage.status enum. */
const mapMetaStatus = (metaStatus) => STATUS_MAP[metaStatus] || metaStatus;

module.exports = {
  getConfig,
  isConfigured,
  sendTextMessage,
  verifySubscription,
  verifyWebhookSignature,
  parseIncomingMessage,
  mapMetaStatus,
};
