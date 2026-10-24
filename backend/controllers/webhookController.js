const Lead = require('../models/Lead');
const User = require('../models/User');
const ChatMessage = require('../models/ChatMessage');
const AICache = require('../services/AICache');
const whatsappService = require('../services/whatsappService');

/**
 * Resolves who a brand-new WhatsApp-originated Lead should be owned by.
 *
 * This only runs when NO Lead already exists for the incoming phone number
 * (see receiveMessage below) — an existing Lead's owner is never touched,
 * regardless of who this function would pick.
 *
 * Strategy (deterministic, documented, explicitly not "first admin found"):
 *   1. If WHATSAPP_DEFAULT_OWNER_EMAIL is set, use that active user. This is
 *      the configurable override — set it to route all fresh WhatsApp leads
 *      to a specific inbox/rep.
 *   2. Otherwise, fall back to the oldest active admin account (sorted by
 *      createdAt ascending), so the choice is stable and reproducible
 *      instead of depending on MongoDB's undefined default query order.
 *   3. If neither exists, fail loudly (caller returns 500) rather than
 *      silently assigning the lead to an arbitrary user.
 *
 * This is intentionally simple. It is NOT round-robin assignment — it's a
 * safe placeholder that a future round-robin/team-routing strategy can
 * replace by changing only this function.
 */
const resolveDefaultLeadOwner = async () => {
  const overrideEmail = process.env.WHATSAPP_DEFAULT_OWNER_EMAIL;
  if (overrideEmail) {
    const configuredOwner = await User.findOne({ email: overrideEmail, isActive: true });
    if (configuredOwner) return configuredOwner;
    console.error(
      `WHATSAPP_DEFAULT_OWNER_EMAIL is set to "${overrideEmail}" but no matching active user was found — falling back to the oldest admin.`
    );
  }

  return User.findOne({ role: 'admin', isActive: true }).sort('createdAt');
};

// GET - Meta webhook verification (subscription handshake)
const verifyWebhook = (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  const result = whatsappService.verifySubscription(mode, token, challenge);
  if (result.verified) {
    console.log('WhatsApp webhook verified');
    res.status(200).send(result.challenge);
  } else {
    res.status(403).json({ success: false, message: 'Verification failed' });
  }
};

// POST - Receive WhatsApp messages, auto-create leads, save chat messages.
// Every POST is signature-verified against META_APP_SECRET before any data
// is touched, so arbitrary/forged webhook calls are rejected outright.
const receiveMessage = async (req, res) => {
  try {
    const signature = req.headers['x-hub-signature-256'];
    if (!whatsappService.verifyWebhookSignature(req.rawBody, signature)) {
      console.error('Webhook signature verification failed');
      return res.status(401).json({ success: false, message: 'Invalid webhook signature' });
    }

    const body = req.body;

    if (body.object !== 'whatsapp_business_account') {
      return res.status(400).json({ success: false, message: 'Not a WhatsApp event' });
    }

    const entry = body.entry?.[0];
    const change = entry?.changes?.[0];
    const value = change?.value;
    const messages = value?.messages;

    // ── Delivery / read / failed status updates ──────────────────────────
    const statuses = value?.statuses;
    if (statuses && statuses.length > 0) {
      for (const statusUpdate of statuses) {
        const { id: waMessageId, status } = statusUpdate;
        if (waMessageId && status) {
          // Idempotent by construction: repeated identical status events
          // just set the same status again, never create a new document.
          await ChatMessage.findOneAndUpdate(
            { waMessageId },
            { status: whatsappService.mapMetaStatus(status) }
          );
        }
      }
    }

    if (!messages || messages.length === 0) {
      return res.status(200).json({ success: true, message: 'No messages to process' });
    }

    const message = messages[0];
    const phone = message.from;

    // Meta retries webhook delivery on timeout/non-2xx responses, which can
    // resend the exact same message event. Skip it if we've already saved
    // this waMessageId so retries never create duplicate ChatMessages.
    const existing = await ChatMessage.findOne({ waMessageId: message.id });
    if (existing) {
      return res.status(200).json({ success: true, message: 'Duplicate webhook event ignored' });
    }

    const contacts = value?.contacts;
    const customerName = contacts?.[0]?.profile?.name || `WA-${phone}`;

    const parsed = whatsappService.parseIncomingMessage(message);

    // MULTI-USER OWNERSHIP (Fix — Day 10):
    // A phone number that already has a Lead keeps its existing owner,
    // regardless of who that owner is. This is a global lookup (not scoped
    // to any one user) precisely because the previous version scoped it to
    // "the first admin", which meant a lead owned by a non-admin sales rep
    // would never be found here — silently creating a duplicate Lead for
    // the same phone number owned by the admin instead. Only when there is
    // truly no existing Lead do we resolve a default owner.
    let lead = await Lead.findOne({ phone });

    if (!lead) {
      const defaultOwner = await resolveDefaultLeadOwner();
      if (!defaultOwner) {
        console.error('No default WhatsApp lead owner could be resolved (no active admin, no WHATSAPP_DEFAULT_OWNER_EMAIL match).');
        return res.status(500).json({ success: false, message: 'No default lead owner configured' });
      }

      lead = await Lead.create({
        userId: defaultOwner._id,
        customerName,
        phone,
        status: 'New',
        source: 'WhatsApp',
        notes: parsed.body ? `First message: ${parsed.body}` : 'Incoming WhatsApp message',
      });
      console.log(`New WhatsApp lead created: ${phone} (owner: ${defaultOwner.email})`);
    }

    // Save message to chat history
    await ChatMessage.create({
      leadId: lead._id,
      phone,
      direction: 'inbound',
      messageType: parsed.messageType,
      body: parsed.body,
      media: parsed.media,
      waMessageId: parsed.waMessageId,
      status: 'received',
      sentAt: parsed.sentAt,
    });

    AICache.invalidateLeadContext(lead._id);

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Webhook error:', error.message);
    res.status(200).json({ success: false, message: error.message });
  }
};

module.exports = { verifyWebhook, receiveMessage, resolveDefaultLeadOwner };
