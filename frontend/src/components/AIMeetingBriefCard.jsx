import React from 'react';

const Section = ({ icon, title, children }) => (
  <div style={{ marginBottom: '20px', paddingBottom: '20px', borderBottom: '1px solid var(--border)' }}>
    <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-primary)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
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
    <ul style={{ margin: 0, paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {items.map((item, i) => (
        <li key={i} style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{item}</li>
      ))}
    </ul>
  );
};

/**
 * Renders an AI-generated meeting brief (see PromptBuilder.buildMeetingBriefPrompt
 * for the exact response shape this expects).
 */
const AIMeetingBriefCard = ({ brief, onRegenerate, regenerating, onShowHistory }) => {
  if (!brief) return null;

  return (
    <div className="card" style={{ border: '1px solid var(--blue)', background: 'var(--bg-tertiary)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '18px' }}>✨</span>
          <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text-primary)' }}>AI Meeting Brief</div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {onShowHistory && <button className="btn btn-sm" onClick={onShowHistory}>🕒 History</button>}
          {onRegenerate && (
            <button className="btn btn-sm" onClick={onRegenerate} disabled={regenerating}>
              {regenerating ? <span className="spinner" /> : '🔄 Regenerate'}
            </button>
          )}
        </div>
      </div>

      <Section icon="👤" title="Customer Summary">
        <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{brief.customerSummary}</div>
      </Section>

      <Section icon="💬" title="Previous Interaction Summary">
        <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{brief.previousInteractionSummary}</div>
      </Section>

      {brief.relevantProducts?.length > 0 && (
        <Section icon="📦" title="Relevant Company Products">
          <BulletList items={brief.relevantProducts} />
        </Section>
      )}

      {brief.relevantFaqs?.length > 0 && (
        <Section icon="❓" title="Relevant FAQs">
          <BulletList items={brief.relevantFaqs} />
        </Section>
      )}

      <Section icon="🗣️" title="Talking Points">
        <BulletList items={brief.talkingPoints} />
      </Section>

      <Section icon="🙋" title="Suggested Questions">
        <BulletList items={brief.suggestedQuestions} />
      </Section>

      <Section icon="🛡️" title="Possible Objections">
        <BulletList items={brief.possibleObjections} />
      </Section>

      <Section icon="✅" title="Recommended Responses">
        <BulletList items={brief.recommendedResponses} />
      </Section>

      <Section icon="🎯" title="Next Best Action">
        <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{brief.nextBestAction}</div>
      </Section>

      <div>
        <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-primary)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span>📋</span> Meeting Preparation Tips
        </div>
        <BulletList items={brief.preparationTips} />
      </div>
    </div>
  );
};

export default AIMeetingBriefCard;
