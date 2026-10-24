import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import api from '../api/axios';
import ReminderForm from '../components/ReminderForm';

const Reminders = () => {
  const [reminders, setReminders] = useState([]);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState('upcoming'); // all | upcoming | completed
  const [saving, setSaving] = useState(false);

  const fetchReminders = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filter === 'upcoming') params.upcoming = 'true';
      else if (filter === 'completed') params.completed = 'true';
      const { data } = await api.get('/reminders', { params });
      setReminders(data.data);
    } catch {
      toast.error('Failed to load reminders');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { fetchReminders(); }, [fetchReminders]);

  useEffect(() => {
    api.get('/leads', { params: { limit: 100 } })
      .then(({ data }) => setLeads(data.data))
      .catch(() => {});
  }, []);

  const handleCreateReminder = async (form) => {
    setSaving(true);
    try {
      await api.post('/reminders', form);
      toast.success('Reminder created successfully');
      setShowForm(false);
      fetchReminders();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create reminder');
    } finally {
      setSaving(false);
    }
  };

  const toggleComplete = async (id) => {
    try {
      const { data } = await api.patch(`/reminders/${id}/toggle`);
      setReminders((p) => p.map((r) => r._id === id ? data.data : r));
      toast.success(data.data.isCompleted ? 'Marked complete' : 'Marked pending');
    } catch {
      toast.error('Failed to update reminder');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this reminder?')) return;
    try {
      await api.delete(`/reminders/${id}`);
      toast.success('Reminder deleted');
      fetchReminders();
    } catch {
      toast.error('Delete failed');
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Reminders</h1>
          <p className="page-subtitle">Stay on top of your follow-ups</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm((p) => !p)}>
          {showForm ? '✕ Close' : '+ New Reminder'}
        </button>
      </div>

      {/* Add Form */}
      {showForm && (
        <div className="card" style={{ marginBottom: '20px' }}>
          <h3 style={{ marginBottom: '16px', color: 'var(--text-primary)' }}>Create Reminder</h3>
          <ReminderForm
            leads={leads}
            onSubmit={handleCreateReminder}
            onCancel={() => setShowForm(false)}
            loading={saving}
            submitLabel="Create Reminder"
          />
        </div>
      )}

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        {[['upcoming', '⏰ Upcoming'], ['all', '📋 All'], ['completed', '✅ Completed']].map(([v, label]) => (
          <button key={v} className={`btn ${filter === v ? 'btn-primary' : ''}`}
            style={{ fontSize: '13px' }} onClick={() => setFilter(v)}>{label}</button>
        ))}
      </div>

      {loading ? (
        <div className="loading-spinner" />
      ) : reminders.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🔔</div>
          <h3>No reminders found</h3>
          <p>{filter === 'upcoming' ? 'No upcoming reminders. Create one!' : 'Nothing here yet.'}</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {reminders.map((r) => {
            const isPast = new Date(r.reminderDate) < new Date();
            return (
              <div key={r._id} className="card" style={{
                display: 'flex', alignItems: 'flex-start', gap: '14px',
                opacity: r.isCompleted ? 0.6 : 1,
                borderLeft: `3px solid ${r.isCompleted ? '#22c55e' : isPast ? '#ef4444' : '#3b82f6'}`,
              }}>
                <button onClick={() => toggleComplete(r._id)}
                  style={{
                    width: '22px', height: '22px', borderRadius: '50%', flexShrink: 0,
                    border: `2px solid ${r.isCompleted ? '#22c55e' : 'var(--border-hover)'}`,
                    background: r.isCompleted ? '#22c55e' : 'transparent', cursor: 'pointer',
                    color: '#fff', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    marginTop: '2px',
                  }}
                  aria-label="Toggle complete"
                >
                  {r.isCompleted ? '✓' : ''}
                </button>

                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)', textDecoration: r.isCompleted ? 'line-through' : 'none' }}>
                    {r.message}
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    👤 {r.leadId?.customerName || 'Unknown'} · 📞 {r.leadId?.phone}
                    <span style={{
                      marginLeft: '10px', color: isPast && !r.isCompleted ? '#ef4444' : 'var(--text-secondary)'
                    }}>
                      📅 {new Date(r.reminderDate).toLocaleString()}
                      {isPast && !r.isCompleted && ' ⚠️ Overdue'}
                    </span>
                  </div>
                </div>

                <button className="btn btn-danger" style={{ fontSize: '12px', padding: '4px 8px', flexShrink: 0 }}
                  onClick={() => handleDelete(r._id)}>Del</button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Reminders;
