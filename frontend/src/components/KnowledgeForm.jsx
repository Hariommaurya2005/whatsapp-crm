import React, { useState } from 'react';

const CATEGORIES = [
  'Company Profile', 'Products', 'Compensation Plan', 'Training', 'FAQs',
  'Sales Scripts', 'Meeting Guides', 'Price List', 'Policies', 'Objection Handling', 'General Notes',
];
const STATUSES = ['Draft', 'Published', 'Archived'];

const validate = (form) => {
  const errors = {};
  if (!form.title.trim()) errors.title = 'Title is required';
  else if (form.title.trim().length < 2) errors.title = 'Title must be at least 2 characters';
  if (!form.category) errors.category = 'Please select a category';
  if (!form.content.trim()) errors.content = 'Content is required';
  else if (form.content.trim().length > 20000) errors.content = 'Content cannot exceed 20000 characters';
  return errors;
};

const KnowledgeForm = ({ initialValues, onSubmit, onCancel, loading, submitLabel = 'Create Entry' }) => {
  const [form, setForm] = useState({
    title: initialValues?.title || '',
    category: initialValues?.category || '',
    content: initialValues?.content || '',
    tagsInput: initialValues?.tags?.join(', ') || '',
    status: initialValues?.status || 'Draft',
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

    const tags = form.tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    onSubmit({
      title: form.title.trim(),
      category: form.category,
      content: form.content.trim(),
      tags,
      status: form.status,
    });
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0 16px' }}>
        <div className="form-group">
          <label className="form-label">Title *</label>
          <input
            className={`form-control ${errors.title ? 'input-error' : ''}`}
            name="title"
            value={form.title}
            onChange={handleChange}
            placeholder="e.g. Standard Objection Responses"
            maxLength={150}
          />
          {errors.title && <span className="field-error">{errors.title}</span>}
        </div>

        <div className="form-group">
          <label className="form-label">Category *</label>
          <select className={`form-control ${errors.category ? 'input-error' : ''}`} name="category" value={form.category} onChange={handleChange}>
            <option value="">— Select a category —</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          {errors.category && <span className="field-error">{errors.category}</span>}
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Content *</label>
        <textarea
          className={`form-control ${errors.content ? 'input-error' : ''}`}
          name="content"
          value={form.content}
          onChange={handleChange}
          placeholder="Write the full knowledge entry content here..."
          rows={10}
          maxLength={20000}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          {errors.content && <span className="field-error">{errors.content}</span>}
          <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginLeft: 'auto' }}>
            {form.content.length}/20000
          </span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0 16px' }}>
        <div className="form-group">
          <label className="form-label">Tags</label>
          <input
            className="form-control"
            name="tagsInput"
            value={form.tagsInput}
            onChange={handleChange}
            placeholder="Comma-separated, e.g. pricing, onboarding, renewal"
          />
        </div>

        <div className="form-group">
          <label className="form-label">Status</label>
          <select className="form-control" name="status" value={form.status} onChange={handleChange}>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
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

export default KnowledgeForm;
