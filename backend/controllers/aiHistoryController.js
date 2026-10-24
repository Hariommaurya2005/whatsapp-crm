const mongoose = require('mongoose');
const { loadAuthorizedMeeting, loadAuthorizedLead, ContextBuilderError } = require('../services/ContextBuilder');
const { getHistory } = require('../services/AIInsightService');

const VALID_REFERENCE_TYPES = ['Meeting', 'Lead'];

// @desc    Get AI generation history for a Meeting or a Lead, newest first
// @route   GET /api/ai/history/:referenceType/:referenceId?type=LeadIntelligence
const getAIHistory = async (req, res) => {
  try {
    const { referenceType, referenceId } = req.params;
    const { type } = req.query;

    if (!VALID_REFERENCE_TYPES.includes(referenceType)) {
      return res.status(400).json({ success: false, message: 'Invalid reference type. Must be Meeting or Lead.' });
    }
    if (!mongoose.isValidObjectId(referenceId)) {
      return res.status(400).json({ success: false, message: 'Invalid reference ID format' });
    }

    // Reuse the exact same authorization rules as every other AI feature —
    // a user can only see AI history for records they're allowed to see.
    if (referenceType === 'Meeting') {
      await loadAuthorizedMeeting(referenceId, req.user);
    } else {
      await loadAuthorizedLead(referenceId, req.user);
    }

    const history = await getHistory(referenceType, referenceId, type);

    res.json({ success: true, count: history.length, data: history });
  } catch (error) {
    if (error instanceof ContextBuilderError) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getAIHistory };
