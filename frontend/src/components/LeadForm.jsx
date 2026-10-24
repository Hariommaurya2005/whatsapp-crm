import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import api from '../api/axios';

const INITIAL_FORM = {
  customerName: '', phone: '', email: '', company: '',
  status: 'New', source: 'Manual', priority: 'Medium',
  value: '', followUpDate: '', notes: '', tags: '',
};

const validate = (form) => {
  const errors = {};
  if (!form.customerName.trim()) errors.customerName = 'Customer name is required';
  else if (form.customerName.trim().length < 2) errors.customerName = 'Min 2 characters';

  if (!form.phone.trim()) errors.phone = 'Phone is required';
  else if (!/^\+?[\d\s\-()]{7,20}$/.test(form.phone.trim()))
    errors.phone = 'Invalid phone format (e.g. +1234567890)';

  if (form.email && !/^\S+@\S+\.\S+$/.test(form.email))
    errors.email = 'Invalid email format';

  if (form.value && (isNaN(form.value) || Number(form.value) < 0))
    errors.value = 'Value must be a positive number';

  if (form.notes && form.notes.length > 2000)
    errors.notes = 'Notes cannot exceed 2000 characters';

  return errors;
};

const Field = ({ label, name, type = 'text', placeholder, options, required, value, error, onChange }) => (
  <div className="form-group">
    <label className="form-label">{label}{required && ' *'}</label>
    {options ? (
      <select className={`form-control ${error ? 'input-error' : ''}`}
        name={name} value={value} onChange={onChange}>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    ) : (
      <input className={`form-control ${error ? 'input-error' : ''}`}
        type={type} name={name} value={value} onChange={onChange}
        placeholder={placeholder} />
    )}
    {error && <span className="field-error">{error}</span>}
  </div>
);

const LeadForm = ({ lead, onClose, onSaved }) => {
  const isEdit = Boolean(lead);
  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (lead) {
      setForm({
        customerName: lead.customerName || '',
        phone: lead.phone || '',
        email: lead.email || '',
        company: lead.company || '',
        status: lead.status || 'New',
        source: lead.source || 'Manual',
        priority: lead.priority || 'Medium',
        value: lead.value ?? '',
        followUpDate: lead.followUpDate ? lead.followUpDate.slice(0, 10) : '',
        notes: lead.notes || '',
        tags: Array.isArray(lead.tags) ? lead.tags.join(', ') : '',
      });
    }
  }, [lead]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
    if (errors[name]) setErrors((p) => ({ ...p, [name]: '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = validate(form);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);
    try {
      const payload = {
        ...form,
        value: form.value ? Number(form.value) : undefined,
        tags: form.tags ? form.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
        followUpDate: form.followUpDate || undefined,
      };

      if (isEdit) {
        await api.put(`/leads/${lead._id}`, payload);
        toast.success('Lead updated successfully');
      } else {
        await api.post('/leads', payload);
        toast.success('Lead created successfully');
      }
      onSaved();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to save lead';
      toast.error(msg);
      if (err.response?.status === 409) {
        setErrors({ phone: 'A lead with this phone already exists' });
      }
      if (err.response?.data?.errors) {
        const serverErrors = {};
        err.response.data.errors.forEach((e) => { serverErrors[e.path] = e.msg; });
        setErrors(serverErrors);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="modal-header">
          <h2>{isEdit ? 'Edit Lead' : 'Add New Lead'}</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
            <Field label="Customer Name" name="customerName" placeholder="John Doe" required
              value={form.customerName} error={errors.customerName} onChange={handleChange} />
            <Field label="Phone" name="phone" placeholder="+1234567890" required
              value={form.phone} error={errors.phone} onChange={handleChange} />
            <Field label="Email" name="email" type="email" placeholder="john@example.com"
              value={form.email} error={errors.email} onChange={handleChange} />
            <Field label="Company" name="company" placeholder="Acme Corp"
              value={form.company} error={errors.company} onChange={handleChange} />
            <Field label="Status" name="status" options={['New', 'Contacted', 'In Progress', 'Converted', 'Lost']}
              value={form.status} error={errors.status} onChange={handleChange} />
            <Field label="Priority" name="priority" options={['Low', 'Medium', 'High']}
              value={form.priority} error={errors.priority} onChange={handleChange} />
            <Field label="Source" name="source" options={['Manual', 'WhatsApp', 'Web', 'Referral', 'Social Media']}
              value={form.source} error={errors.source} onChange={handleChange} />
            <Field label="Deal Value (₹)" name="value" type="number" placeholder="50000"
              value={form.value} error={errors.value} onChange={handleChange} />
            <Field label="Follow Up Date" name="followUpDate" type="date"
              value={form.followUpDate} error={errors.followUpDate} onChange={handleChange} />
            <Field label="Tags (comma-separated)" name="tags" placeholder="hot, enterprise"
              value={form.tags} error={errors.tags} onChange={handleChange} />
          </div>

          <div className="form-group">
            <label className="form-label">Notes</label>
            <textarea
              className={`form-control ${errors.notes ? 'input-error' : ''}`}
              name="notes" value={form.notes} onChange={handleChange}
              placeholder="Additional notes about this lead..."
              rows={3} style={{ resize: 'vertical' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              {errors.notes && <span className="field-error">{errors.notes}</span>}
              <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginLeft: 'auto' }}>
                {form.notes.length}/2000
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
            <button type="button" className="btn" onClick={onClose} disabled={loading}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <span className="spinner" /> : isEdit ? 'Update Lead' : 'Create Lead'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LeadForm;
