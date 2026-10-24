import React from 'react';

const Section = ({ icon, title, children }) => (
  <div style={{ marginBottom: '16px', paddingBottom: '16px', borderBottom: '1px solid var(--border)' }}>
    <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-primary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
      <span>{icon}</span> {title}
    </div>
    {children}
  </div>
);

const BulletList = ({ items }) => {
  if (!items || items.length === 0) {
    return <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Nothing to show.</div>;
  }
  return (
    <ul style={{ margin: 0, paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
      {items.map((item, i) => (
        <li key={i} style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{item}</li>
      ))}
    </ul>
  );
};

/**
 * Renders an AI-generated WhatsApp conversation summary
 * (see PromptBuilder.buildConversationSummaryPrompt for the response shape).
 */
const ConversationSummaryCard = ({ summary, onClose, onRegenerate, regenerating, onShowHistory }) => {
  if (!summary) return null;

  return (
    <div style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--blue)', borderRadius: '10px', padding: '16px', marginBottom: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)' }}>
          <span>✨</span> AI Conversation Summary
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {onShowHistory && <button className="btn btn-sm" onClick={onShowHistory}>🕒 History</button>}
          {onRegenerate && (
            <button className="btn btn-sm" onClick={onRegenerate} disabled={regenerating}>
              {regenerating ? <span className="spinner" /> : '🔄 Regenerate'}
            </button>
          )}
          {onClose && <button className="btn btn-sm" onClick={onClose}>✕</button>}
        </div>
      </div>

      <Section icon="👤" title="Customer Summary">
        <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{summary.customerSummary}</div>
      </Section>

      <Section icon="💬" title="Conversation Summary">
        <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{summary.conversationSummary}</div>
      </Section>

      <Section icon="🎯" title="Customer Intent">
        <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{summary.customerIntent}</div>
      </Section>

      <Section icon="📌" title="Important Topics">
        <BulletList items={summary.importantTopics} />
      </Section>

      <Section icon="❓" title="Pending Questions">
        <BulletList items={summary.pendingQuestions} />
      </Section>

      <div>
        <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-primary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span>✅</span> Recommendation
        </div>
        <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{summary.nextFollowUpRecommendation}</div>
      </div>
    </div>
  );
};

export default ConversationSummaryCard;
