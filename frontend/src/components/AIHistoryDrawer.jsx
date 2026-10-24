import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import api from '../api/axios';
import { formatDateTime } from '../utils/helpers';

const TYPE_LABELS = {
  MeetingBrief: '✨ Meeting Brief',
  ConversationSummary: '✨ Conversation Summary',
  LeadIntelligence: '🧠 Lead Intelligence',
};

/** Builds a short one-line preview from whichever summary field the insight type has. */
const getPreview = (insight) => {
  const r = insight.response || {};
  const text = r.customerSummary || r.scoreReason || r.conversationSummary || '';
  return text.length > 120 ? `${text.slice(0, 120)}…` : text || 'No preview available.';
};

/**
 * Slide-in style history panel. Pass `referenceType` ('Meeting' | 'Lead'),
 * `referenceId`, and optionally `type` to filter to one AI feature
 * (e.g. 'LeadIntelligence') when the same Lead has multiple insight types.
 */
const AIHistoryDrawer = ({ referenceType, referenceId, type, onClose, onSelectVersion }) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const params = type ? { type } : {};
      const { data } = await api.get(`/ai/history/${referenceType}/${referenceId}`, { params });
      setHistory(data.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load AI history');
    } finally {
      setLoading(false);
    }
  }, [referenceType, referenceId, type]);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  return (
    <div
      style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: '380px', maxWidth: '90vw',
        background: 'var(--bg-card)', borderLeft: '1px solid var(--border)',
        boxShadow: '-8px 0 24px rgba(0,0,0,0.35)', zIndex: 1000,
        display: 'flex', flexDirection: 'column',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)' }}>🕒 AI Generation History</div>
        <button className="btn btn-sm" onClick={onClose}>✕</button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
        {loading ? (
          <div className="loading-center" style={{ minHeight: '120px' }}><span className="spinner spinner-lg" /></div>
        ) : history.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-secondary)', fontSize: '13px' }}>
            No previous AI generations yet.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {history.map((insight) => (
              <div key={insight._id} style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>{TYPE_LABELS[insight.type] || insight.type}</span>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>v{insight.promptVersion}</span>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '8px' }}>
                  {getPreview(insight)}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    {formatDateTime(insight.generatedAt)} · {insight.generatedBy?.name || 'Unknown'}
                  </span>
                  <button className="btn btn-sm" onClick={() => onSelectVersion(insight.response)}>Open Previous Version</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AIHistoryDrawer;
