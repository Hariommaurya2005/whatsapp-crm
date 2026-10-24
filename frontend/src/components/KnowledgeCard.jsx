import React from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDate, getKnowledgeStatusClass } from '../utils/helpers';

const CATEGORY_ICONS = {
  'Company Profile': '🏢', 'Products': '📦', 'Compensation Plan': '💰', 'Training': '🎓',
  'FAQs': '❓', 'Sales Scripts': '🗣️', 'Meeting Guides': '📅', 'Price List': '🏷️',
  'Policies': '📜', 'Objection Handling': '🛡️', 'General Notes': '🗒️',
};

const KnowledgeCard = ({ entry }) => {
  const navigate = useNavigate();
  const snippet = entry.content.length > 140 ? `${entry.content.slice(0, 140)}…` : entry.content;

  return (
    <div
      onClick={() => navigate(`/knowledge-base/${entry._id}`)}
      className="card"
      style={{ cursor: 'pointer', transition: 'border-color 0.15s', padding: '18px' }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--border-hover)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {CATEGORY_ICONS[entry.category] || '📄'} {entry.title}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
            {entry.category} · v{entry.version}
          </div>
        </div>
        <span className={`badge ${getKnowledgeStatusClass(entry.status)}`} style={{ flexShrink: 0 }}>
          {entry.status}
        </span>
      </div>

      <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '10px', lineHeight: 1.5 }}>
        {snippet}
      </div>

      {entry.tags?.length > 0 && (
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '10px' }}>
          {entry.tags.map((t) => (
            <span key={t} style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)', borderRadius: '12px', padding: '2px 10px', fontSize: '11px', color: 'var(--text-secondary)' }}>{t}</span>
          ))}
        </div>
      )}

      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '10px' }}>
        Updated {formatDate(entry.updatedAt)} by {entry.updatedBy?.name || entry.createdBy?.name || 'Unknown'}
      </div>
    </div>
  );
};

export default KnowledgeCard;
