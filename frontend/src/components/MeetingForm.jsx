import React, { useState } from 'react';

const MEETING_TYPES = ['Discovery Call', 'Demo', 'Follow-up', 'Negotiation', 'Onboarding', 'Other'];
const PLATFORMS = ['Google Meet', 'Zoom', 'Microsoft Teams', 'Phone Call', 'In Person', 'WhatsApp Call', 'Other'];
const STATUSES = ['Scheduled', 'Completed', 'Cancelled', 'Rescheduled', 'No Show'];
const PRIORITIES = ['Low', 'Medium', 'High'];

const toDateTimeLocal = (value) => {
  if (!value) return '';
  const d = new Date(value);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const validate = (form, requireFutureDate) => {
  const errors = {};
  if (!form.leadId) errors.leadId = 'Please select a lead';
  if (!form.title.trim()) errors.title = 'Meeting title is required';
  else if (form.title.trim().length < 2) errors.title = 'Title must be at least 2 characters';
  if (!form.meetingDate) errors.meetingDate = 'Meeting date & time is required';
  else if (requireFutureDate && new Date(form.meetingDate) <= new Date()) {
    errors.meetingDate = 'Meeting date must be in the future';
  }
  if (form.meetingLink && !/^https?:\/\/.+/.test(form.meetingLink.trim())) {
    errors.meetingLink = 'Meeting link must be a valid URL (starting with http:// or https://)';
  }
  return errors;
};

/**
 * Shared meeting form.
 *
 * - Standalone "Create Meeting" / "Edit Meeting" pages: pass `leads` and
 *   `users` arrays for full dropdowns, plus `initialValues` when editing.
 * - Lead Details inline quick-create: pass a fixed `leadId` to hide the
 *   lead selector, scoping the meeting to that lead automatically.
 */
const MeetingForm = ({
  leadId = '',
  leads,
  users = [],
  initialValues,
  onSubmit,
  onCancel,
  loading,
  submitLabel = 'Schedule Meeting',
  isEdit = false,
}) => {
  const showLeadSelector = !leadId && Array.isArray(leads);

  const [form, setForm] = useState({
    leadId: leadId || initialValues?.leadId?._id || initialValues?.leadId || '',
    assignedTo: initialValues?.assignedTo?._id || initialValues?.assignedTo || '',
    title: initialValues?.title || '',
    meetingDate: toDateTimeLocal(initialValues?.meetingDate),
    meetingType: initialValues?.meetingType || 'Discovery Call',
    platform: initialValues?.platform || 'Google Meet',
    meetingLink: initialValues?.meetingLink || '',
    agenda: initialValues?.agenda || '',
    description: initialValues?.description || '',
    priority: initialValues?.priority || 'Medium',
    status: initialValues?.status || 'Scheduled',
    notes: initialValues?.notes || '',
  });
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
    if (errors[name]) setErrors((p) => ({ ...p, [name]: '' }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = validate(form, !isEdit);
    if (Object.keys(errs).length) { setErrors(errs); return; }
    const payload = { ...form };
    if (!payload.assignedTo) delete payload.assignedTo;
    onSubmit(payload);
  };

  return (
    <form className="meeting-form" onSubmit={handleSubmit} noValidate>
      <div className="meeting-form-assignment-grid">
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
          <label className="form-label">Assigned User</label>
          <select className="form-control" name="assignedTo" value={form.assignedTo} onChange={handleChange}>
            <option value="">— Assign to me —</option>
            {users.map((u) => (
              <option key={u._id} value={u._id}>{u.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Meeting Title *</label>
        <input
          className={`form-control ${errors.title ? 'input-error' : ''}`}
          name="title"
          value={form.title}
          onChange={handleChange}
          placeholder="e.g. Product demo with Acme Corp"
          maxLength={150}
        />
        {errors.title && <span className="field-error">{errors.title}</span>}
      </div>

      <div className="meeting-date-type-grid">
        <div className="form-group meeting-date-time-field">
          <label className="form-label">Date & Time *</label>
          <input
            className={`form-control ${errors.meetingDate ? 'input-error' : ''}`}
            type="datetime-local"
            name="meetingDate"
            value={form.meetingDate}
            onChange={handleChange}
          />
          {errors.meetingDate && <span className="field-error">{errors.meetingDate}</span>}
        </div>

        <div className="form-group">
          <label className="form-label">Meeting Type</label>
          <select className="form-control" name="meetingType" value={form.meetingType} onChange={handleChange}>
            {MEETING_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Platform</label>
          <select className="form-control" name="platform" value={form.platform} onChange={handleChange}>
            {PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Meeting Link</label>
        <input
          className={`form-control ${errors.meetingLink ? 'input-error' : ''}`}
          name="meetingLink"
          value={form.meetingLink}
          onChange={handleChange}
          placeholder="https://meet.google.com/..."
        />
        {errors.meetingLink && <span className="field-error">{errors.meetingLink}</span>}
      </div>

      <div className="form-group">
        <label className="form-label">Agenda</label>
        <textarea
          className="form-control"
          name="agenda"
          value={form.agenda}
          onChange={handleChange}
          placeholder="What will be covered in this meeting?"
          rows={3}
          maxLength={2000}
        />
      </div>

      <div className="form-group">
        <label className="form-label">Description</label>
        <textarea
          className="form-control"
          name="description"
          value={form.description}
          onChange={handleChange}
          placeholder="Additional context for this meeting"
          rows={2}
          maxLength={2000}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
        <div className="form-group">
          <label className="form-label">Priority</label>
          <select className="form-control" name="priority" value={form.priority} onChange={handleChange}>
            {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>

        {isEdit && (
          <div className="form-group">
            <label className="form-label">Status</label>
            <select className="form-control" name="status" value={form.status} onChange={handleChange}>
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        )}
      </div>

      <div className="form-group">
        <label className="form-label">Notes</label>
        <textarea
          className="form-control"
          name="notes"
          value={form.notes}
          onChange={handleChange}
          placeholder="Internal notes (not shared with the customer)"
          rows={2}
          maxLength={2000}
        />
      </div>

      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
        <button type="button" className="btn" onClick={onCancel} disabled={loading}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? <span className="spinner" /> : submitLabel}
        </button>
      </div>
    </form>
  );
};

export default MeetingForm;
