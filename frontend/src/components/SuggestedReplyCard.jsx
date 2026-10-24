import React from 'react';
import { toast } from 'react-toastify';

/**
 * Renders an AI-generated WhatsApp reply suggestion.
 * `onUse` should place the text into the message input WITHOUT sending it.
 */
const SuggestedReplyCard = ({ reply, loading, onRegenerate, onUse, onClose }) => {
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(reply);
      toast.success('Reply copied to clipboard');
    } catch {
      toast.error('Failed to copy');
    }
  };

  return (
    <div style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--blue)', borderRadius: '10px', padding: '16px', marginBottom: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)' }}>
          <span>💬</span> AI Suggested Reply
        </div>
        {onClose && <button className="btn btn-sm" onClick={onClose}>✕</button>}
      </div>

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '13px', padding: '8px 0' }}>
          <span className="spinner" /> Generating reply...
        </div>
      ) : (
        <>
          <div style={{ fontSize: '13px', color: 'var(--text-primary)', lineHeight: 1.6, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px', marginBottom: '12px' }}>
            {reply}
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button className="btn btn-primary btn-sm" onClick={() => onUse(reply)}>✓ Use</button>
            <button className="btn btn-sm" onClick={handleCopy}>📋 Copy</button>
            <button className="btn btn-sm" onClick={onRegenerate}>🔄 Regenerate</button>
          </div>
        </>
      )}
    </div>
  );
};

export default SuggestedReplyCard;
