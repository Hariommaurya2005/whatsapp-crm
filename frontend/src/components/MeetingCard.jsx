import React from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDateTime, getMeetingStatusClass } from '../utils/helpers';

const TYPE_ICONS = {
  'Discovery Call': '🔍', 'Demo': '🖥️', 'Follow-up': '🔁',
  'Negotiation': '🤝', 'Onboarding': '🚀', 'Other': '📌',
};

const PRIORITY_ICONS = { Low: '🔵', Medium: '🟡', High: '🔴' };

/**
 * Compact meeting summary card.
 * `showLead` controls whether the customer name/phone line is shown —
 * hide it when the card already lives inside that lead's own page.
 */
const MeetingCard = ({ meeting, showLead = true }) => {
  const navigate = useNavigate();
  const isOverdue = meeting.status === 'Scheduled' && new Date(meeting.meetingDate) < new Date();

  return (
    <div
      onClick={() => navigate(`/meetings/${meeting._id}`)}
      style={{
        padding: '14px', background: 'var(--bg-tertiary)', borderRadius: '8px',
        border: `1px solid ${isOverdue ? 'rgba(239,68,68,0.25)' : 'var(--border)'}`,
        cursor: 'pointer', transition: 'border-color 0.15s',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--border-hover)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = isOverdue ? 'rgba(239,68,68,0.25)' : 'var(--border)'; }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {TYPE_ICONS[meeting.meetingType] || '📌'} {meeting.title}
          </div>
          {showLead && meeting.leadId && (
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              👤 {meeting.leadId.customerName} · 📞 {meeting.leadId.phone}
            </div>
          )}
        </div>
        <span className={`badge ${getMeetingStatusClass(meeting.status)}`} style={{ flexShrink: 0 }}>
          {meeting.status}
        </span>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '10px', fontSize: '12px', color: isOverdue ? '#ef4444' : 'var(--text-muted)' }}>
        <span>🗓️ {formatDateTime(meeting.meetingDate)}{isOverdue ? ' ⚠️' : ''}</span>
        <span>📍 {meeting.platform}</span>
        <span>{PRIORITY_ICONS[meeting.priority]} {meeting.priority}</span>
      </div>
    </div>
  );
};

export default MeetingCard;
