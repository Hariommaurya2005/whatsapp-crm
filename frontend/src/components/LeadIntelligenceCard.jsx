import React from 'react';
import { getTemperatureClass, getSentimentClass, getPriorityClass, getLeadScoreColor } from '../utils/helpers';

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
 * Renders an AI-generated Lead Intelligence report
 * (see PromptBuilder.buildLeadIntelligencePrompt for the response shape).
 */
const LeadIntelligenceCard = ({ intelligence, onClose, onRegenerate, regenerating, onShowHistory }) => {
  if (!intelligence) return null;

  const score = Math.max(0, Math.min(100, Number(intelligence.leadScore) || 0));
  const scoreColor = getLeadScoreColor(score);

  return (
    <div className="card" style={{ border: '1px solid var(--blue)', background: 'var(--bg-tertiary)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '15px', color: 'var(--text-primary)' }}>
          <span>🧠</span> AI Lead Intelligence
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

      {/* Score + badges */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '6px' }}>
          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>Lead Score</span>
          <span style={{ fontSize: '20px', fontWeight: 700, color: scoreColor }}>{score}<span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>/100</span></span>
        </div>
        <div className="lead-score-track">
          <div className="lead-score-fill" style={{ width: `${score}%`, background: scoreColor }} />
        </div>
        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '8px', lineHeight: 1.5 }}>{intelligence.scoreReason}</div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '12px' }}>
          <span className={`badge ${getTemperatureClass(intelligence.leadTemperature)}`}>🌡️ {intelligence.leadTemperature}</span>
          <span className={`badge ${getSentimentClass(intelligence.sentiment)}`}>💭 {intelligence.sentiment}</span>
          <span className={`badge ${getPriorityClass(intelligence.priorityLevel)}`}>🚩 {intelligence.priorityLevel} Priority</span>
          <span className="badge">🎯 Intent: {intelligence.customerIntent}</span>
        </div>
      </div>

      <Section icon="📈" title="Conversion Probability">
        <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{intelligence.conversionProbability}</div>
      </Section>

      <Section icon="✅" title="Positive Signals">
        <BulletList items={intelligence.positiveSignals} />
      </Section>

      <Section icon="⚠️" title="Negative Signals">
        <BulletList items={intelligence.negativeSignals} />
      </Section>

      <Section icon="🛡️" title="Risk Factors">
        <BulletList items={intelligence.riskFactors} />
      </Section>

      <Section icon="📦" title="Recommended Products">
        <BulletList items={intelligence.recommendedProducts} />
      </Section>

      <Section icon="🗣️" title="Recommended Actions">
        <BulletList items={intelligence.recommendedActions} />
      </Section>

      <Section icon="📅" title="Best Follow-up Time">
        <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{intelligence.bestFollowUpTime}</div>
      </Section>

      <div>
        <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-primary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span>♟️</span> Sales Strategy
        </div>
        <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{intelligence.salesStrategy}</div>
      </div>
    </div>
  );
};

export default LeadIntelligenceCard;
