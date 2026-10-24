import React, { useState } from 'react';

const validate = (form) => {
  const errors = {};
  if (!form.leadId) errors.leadId = 'Please select a lead';
  if (!form.message.trim()) errors.message = 'Message is required';
  else if (form.message.trim().length > 500) errors.message = 'Message cannot exceed 500 characters';
  if (!form.reminderDate) errors.reminderDate = 'Reminder date is required';
  else if (new Date(form.reminderDate) <= new Date()) errors.reminderDate = 'Reminder date must be in the future';
  return errors;
};

/**
 * Shared reminder form.
 *
 * - Used standalone on the Reminders page: pass `leads` (array) so the user
 *   can pick which lead the reminder belongs to.
 * - Used inline on the Lead Detail page: pass a fixed `leadId` so the lead
 *   selector is hidden and the reminder is scoped to that lead automatically.
 */
const ReminderForm = ({ leadId = '', leads, initialValues, onSubmit, onCancel, loading, submitLabel = 'Set Reminder' }) => {
  const showLeadSelector = !leadId && Array.isArray(leads);
  const [form, setForm] = useState({
    leadId,
    message: initialValues?.message || '',
    reminderDate: initialValues?.reminderDate || '',
  });
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
    if (errors[name]) setErrors((p) => ({ ...p, [name]: '' }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = validate(form);
    if (Object.keys(errs).length) { setErrors(errs); return; }
    onSubmit(form);
  };

  const min = new Date();
  min.setMinutes(min.getMinutes() + 1);
  const minDateTime = min.toISOString().slice(0, 16);

  return (
    <form onSubmit={handleSubmit} noValidate style={{ padding: 0 }}>
      {showLeadSelector && (
        <div className="form-group">
          <label className="form-label">Lead *</label>
          <select
            className={`form-control ${errors.leadId ? 'input-error' : ''}`}
            name="leadId"
            value={form.leadId}
            onChange={handleChange}
          >
            <option value="">— Select a lead —</option>
            {leads.map((l) => (
              <option key={l._id} value={l._id}>{l.customerName} ({l.phone})</option>
            ))}
          </select>
          {errors.leadId && <span className="field-error">{errors.leadId}</span>}
        </div>
      )}

      <div className="form-group">
        <label className="form-label">Message *</label>
        <input
          className={`form-control ${errors.message ? 'input-error' : ''}`}
          name="message"
          value={form.message}
          onChange={handleChange}
          placeholder="e.g. Follow up on the demo call"
          maxLength={500}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          {errors.message && <span className="field-error">{errors.message}</span>}
          <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginLeft: 'auto' }}>
            {form.message.length}/500
          </span>
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Reminder Date & Time *</label>
        <input
          className={`form-control ${errors.reminderDate ? 'input-error' : ''}`}
          type="datetime-local"
          name="reminderDate"
          value={form.reminderDate}
          min={minDateTime}
          onChange={handleChange}
        />
        {errors.reminderDate && <span className="field-error">{errors.reminderDate}</span>}
      </div>

      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
        <button type="button" className="btn btn-sm" onClick={onCancel} disabled={loading}>Cancel</button>
        <button type="submit" className="btn btn-primary btn-sm" disabled={loading}>
          {loading ? <span className="spinner" /> : submitLabel}
        </button>
      </div>
    </form>
  );
};

export default ReminderForm;
