import React, { useState } from 'react';
import { formatDate } from '../utils/helpers';
import ReminderForm from './ReminderForm';

/**
 * Renders an AI-generated follow-up suggestion and lets the user create a
 * reminder from it in one click, pre-filling the existing ReminderForm.
 */
const FollowUpCard = ({ followUp, leadId, onClose, onCreateReminder, creatingReminder }) => {
  const [showReminderForm, setShowReminderForm] = useState(false);

  if (!followUp) return null;

  // AI returns "YYYY-MM-DD"; default the reminder time to 10:00 AM that day.
  const prefillDate = followUp.recommendedDate ? `${followUp.recommendedDate}T10:00` : '';

  const handleSubmit = async (form) => {
    const success = await onCreateReminder(form);
    if (success) setShowReminderForm(false);
  };

  return (
    <div style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--blue)', borderRadius: '10px', padding: '16px', marginBottom: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)' }}>
          <span>📅</span> AI Follow-up Suggestion
        </div>
        {onClose && <button className="btn btn-sm" onClick={onClose}>✕</button>}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '14px' }}>
        <div>
          <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '4px' }}>Recommended Date</div>
          <div style={{ fontSize: '13px', color: 'var(--text-primary)' }}>
            🗓️ {followUp.recommendedDate ? formatDate(followUp.recommendedDate) : '—'}
          </div>
        </div>
        <div>
          <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '4px' }}>Reminder Text</div>
          <div style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{followUp.reminderText}</div>
        </div>
        <div>
          <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '4px' }}>Reason</div>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{followUp.reason}</div>
        </div>
      </div>

      {!showReminderForm ? (
        <button className="btn btn-primary btn-sm" onClick={() => setShowReminderForm(true)}>
          + Create Reminder
        </button>
      ) : (
        <div style={{ paddingTop: '12px', borderTop: '1px solid var(--border)' }}>
          <ReminderForm
            leadId={leadId}
            initialValues={{ message: followUp.reminderText, reminderDate: prefillDate }}
            onSubmit={handleSubmit}
            onCancel={() => setShowReminderForm(false)}
            loading={creatingReminder}
            submitLabel="Create Reminder"
          />
        </div>
      )}
    </div>
  );
};

export default FollowUpCard;
