import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../api/axios';
import LeadForm from '../components/LeadForm';
import ReminderForm from '../components/ReminderForm';
import MeetingForm from '../components/MeetingForm';
import MeetingCard from '../components/MeetingCard';
import LeadIntelligenceCard from '../components/LeadIntelligenceCard';
import AIHistoryDrawer from '../components/AIHistoryDrawer';

const STATUS_COLORS = { New: '#3b82f6', Contacted: '#f59e0b', 'In Progress': '#8b5cf6', Converted: '#22c55e', Lost: '#ef4444' };
const PRIORITY_ICONS = { Low: '🔵', Medium: '🟡', High: '🔴' };

const Detail = ({ label, value, mono }) => (
  <div>
    <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '4px' }}>{label}</div>
    <div style={{ fontSize: '0.9rem', fontFamily: mono ? 'monospace' : 'inherit', wordBreak: 'break-word' }}>{value || '—'}</div>
  </div>
);

const LeadDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [lead, setLead] = useState(null);
  const [reminders, setReminders] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [showReminderForm, setShowReminderForm] = useState(false);
  const [savingReminder, setSavingReminder] = useState(false);
  const [showMeetingForm, setShowMeetingForm] = useState(false);
  const [savingMeeting, setSavingMeeting] = useState(false);
  const [intelligence, setIntelligence] = useState(null);
  const [generatingIntelligence, setGeneratingIntelligence] = useState(false);
  const [showIntelligenceHistory, setShowIntelligenceHistory] = useState(false);

  const fetchLead = useCallback(async () => {
    try {
      const { data } = await api.get(`/leads/${id}`);
      setLead(data.data);
    } catch {
      toast.error('Lead not found');
      navigate('/leads');
    }
  }, [id, navigate]);

  const fetchReminders = useCallback(async () => {
    try {
      const { data } = await api.get('/reminders');
      setReminders(data.data.filter(r => r.leadId?._id === id || r.leadId === id));
    } catch {}
  }, [id]);

  const fetchMeetings = useCallback(async () => {
    try {
      const { data } = await api.get(`/meetings/lead/${id}`);
      setMeetings(data.data);
    } catch {}
  }, [id]);

  useEffect(() => {
    Promise.all([fetchLead(), fetchReminders(), fetchMeetings()]).finally(() => setLoading(false));
  }, [fetchLead, fetchReminders, fetchMeetings]);

  const handleCreateMeeting = async (form) => {
    setSavingMeeting(true);
    try {
      await api.post('/meetings', form);
      toast.success('Meeting scheduled successfully');
      setShowMeetingForm(false);
      fetchMeetings();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to schedule meeting');
    } finally {
      setSavingMeeting(false);
    }
  };

  const handleCreateReminder = async (form) => {
    setSavingReminder(true);
    try {
      await api.post('/reminders', form);
      toast.success('Reminder created successfully');
      setShowReminderForm(false);
      fetchReminders();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create reminder');
    } finally {
      setSavingReminder(false);
    }
  };

  const handleGenerateIntelligence = async (regenerate = false) => {
    setGeneratingIntelligence(true);
    try {
      const { data } = await api.post(`/ai/lead-intelligence/${id}`, { regenerate });
      setIntelligence(data.data);
      if (regenerate) toast.success('Lead intelligence regenerated');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to generate AI lead intelligence');
    } finally {
      setGeneratingIntelligence(false);
    }
  };

  const toggleReminder = async (remId) => {
    try {
      const { data } = await api.patch(`/reminders/${remId}/toggle`);
      setReminders(p => p.map(r => r._id === remId ? data.data : r));
    } catch { toast.error('Failed to update'); }
  };

  const deleteReminder = async (remId) => {
    if (!window.confirm('Delete this reminder?')) return;
    try {
      await api.delete(`/reminders/${remId}`);
      setReminders(p => p.filter(r => r._id !== remId));
      toast.success('Deleted');
    } catch { toast.error('Failed'); }
  };

  if (loading) return <div className="loading-center" style={{ minHeight: '60vh' }}><span className="spinner spinner-lg" /></div>;
  if (!lead) return null;

  const statusColor = STATUS_COLORS[lead.status] || '#666';

  return (
    <div className="page-container">
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/leads')}>← Back</button>
          <div>
            <div className="page-title">{lead.customerName}</div>
            <div style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>{lead.phone}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <span style={{ background: statusColor + '20', color: statusColor, border: `1px solid ${statusColor}40`, borderRadius: '20px', padding: '4px 14px', fontSize: '13px', fontWeight: 500 }}>
            {lead.status}
          </span>
          <button className="btn btn-primary btn-sm" onClick={() => navigate(`/leads/${id}/chat`)}>💬 Chat</button>
          <button className="btn btn-sm" onClick={() => handleGenerateIntelligence(false)} disabled={generatingIntelligence}>
            {generatingIntelligence ? <span className="spinner" /> : '🧠 Generate AI Lead Intelligence'}
          </button>
          <button className="btn btn-sm" onClick={() => setEditMode(!editMode)}>
            {editMode ? '✕ Cancel' : '✏️ Edit'}
          </button>
        </div>
      </div>

      <div className="lead-detail-layout">
        {/* Left */}
        <div>
          {generatingIntelligence && !intelligence && (
            <div className="card" style={{ marginBottom: '20px', textAlign: 'center', padding: '30px' }}>
              <span className="spinner spinner-lg" />
              <div style={{ marginTop: '12px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                Generating AI lead intelligence — this may take a few seconds...
              </div>
            </div>
          )}

          {intelligence && (
            <div style={{ marginBottom: '20px' }}>
              <LeadIntelligenceCard
                intelligence={intelligence}
                onClose={() => setIntelligence(null)}
                onRegenerate={() => handleGenerateIntelligence(true)}
                regenerating={generatingIntelligence}
                onShowHistory={() => setShowIntelligenceHistory(true)}
              />
            </div>
          )}

          {showIntelligenceHistory && (
            <AIHistoryDrawer
              referenceType="Lead"
              referenceId={id}
              type="LeadIntelligence"
              onClose={() => setShowIntelligenceHistory(false)}
              onSelectVersion={(response) => { setIntelligence(response); setShowIntelligenceHistory(false); }}
            />
          )}

          {editMode ? (
            <div className="card">
              <div style={{ fontWeight: 600, marginBottom: '16px' }}>Edit Lead</div>
              <LeadForm lead={lead} onClose={() => setEditMode(false)}
                onSaved={() => { fetchLead(); setEditMode(false); }} />
            </div>
          ) : (
            <div className="card">
              <div style={{ fontWeight: 600, marginBottom: '20px' }}>Lead Details</div>
              <div className="lead-detail-fields">
                <Detail label="Customer Name" value={lead.customerName} />
                <Detail label="Phone" value={lead.phone} mono />
                <Detail label="Email" value={lead.email} />
                <Detail label="Company" value={lead.company} />
                <Detail label="Status" value={lead.status} />
                <Detail label="Priority" value={`${PRIORITY_ICONS[lead.priority] || ''} ${lead.priority || ''}`} />
                <Detail label="Source" value={lead.source} />
                <Detail label="Deal Value" value={lead.value ? `₹${Number(lead.value).toLocaleString()}` : null} />
                <Detail label="Follow-up Date" value={lead.followUpDate ? new Date(lead.followUpDate).toLocaleDateString() : null} />
                <Detail label="Created" value={new Date(lead.createdAt).toLocaleDateString()} />
              </div>
              {lead.tags?.length > 0 && (
                <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
                  <div className="form-label" style={{ marginBottom: '8px' }}>Tags</div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {lead.tags.map((t) => (
                      <span key={t} style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)', borderRadius: '12px', padding: '2px 10px', fontSize: '12px', color: 'var(--text-secondary)' }}>{t}</span>
                    ))}
                  </div>
                </div>
              )}
              {lead.notes && (
                <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
                  <div className="form-label" style={{ marginBottom: '8px' }}>Notes</div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-primary)', whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>{lead.notes}</div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right – Reminders & Meetings */}
        <div className="lead-detail-side-panel">
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ fontWeight: 600 }}>Reminders ({reminders.length})</div>
            <button className="btn btn-sm" onClick={() => setShowReminderForm(p => !p)}>
              {showReminderForm ? '✕' : '+ Add'}
            </button>
          </div>

          {showReminderForm && (
            <div style={{ marginBottom: '16px', paddingBottom: '16px', borderBottom: '1px solid var(--border)' }}>
              <ReminderForm
                leadId={id}
                onSubmit={handleCreateReminder}
                onCancel={() => setShowReminderForm(false)}
                loading={savingReminder}
              />
            </div>
          )}

          {reminders.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-secondary)', fontSize: '14px' }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>⏰</div>
              No reminders yet
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {reminders.map((r) => {
                const isOverdue = new Date(r.reminderDate) < new Date() && !r.isCompleted;
                return (
                  <div key={r._id} style={{ padding: '10px 12px', background: 'var(--bg-tertiary)', borderRadius: '6px', border: `1px solid ${r.isCompleted ? 'rgba(34,197,94,0.2)' : isOverdue ? 'rgba(239,68,68,0.2)' : 'var(--border)'}`, opacity: r.isCompleted ? 0.6 : 1 }}>
                    <div style={{ fontSize: '13px', fontWeight: 500, textDecoration: r.isCompleted ? 'line-through' : 'none', marginBottom: '4px' }}>{r.message}</div>
                    <div style={{ fontSize: '11px', color: isOverdue ? '#ef4444' : 'var(--text-muted)' }}>
                      {new Date(r.reminderDate).toLocaleString()}{isOverdue ? ' ⚠️' : ''}
                    </div>
                    <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                      <button className="btn btn-sm" style={{ fontSize: '11px', padding: '3px 8px', color: '#22c55e' }} onClick={() => toggleReminder(r._id)}>
                        {r.isCompleted ? 'Undo' : '✓ Done'}
                      </button>
                      <button className="btn btn-danger btn-sm" style={{ fontSize: '11px', padding: '3px 8px' }} onClick={() => deleteReminder(r._id)}>Del</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="card lead-meetings-card">
          <div className="lead-side-card-header">
            <div>
              <div className="lead-side-card-eyebrow">FOLLOW-UP PLANNER</div>
              <div className="lead-side-card-title">Meetings <span className="lead-side-count">{meetings.length}</span></div>
            </div>
            <button className="btn btn-primary btn-sm meeting-schedule-button" onClick={() => setShowMeetingForm(true)}>
              <span aria-hidden="true">＋</span> Schedule
            </button>
          </div>

          {meetings.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-secondary)', fontSize: '14px' }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>📅</div>
              No meetings yet
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {meetings.map((m) => (
                <MeetingCard key={m._id} meeting={m} showLead={false} />
              ))}
            </div>
          )}
        </div>
        </div>
      </div>

      {showMeetingForm && (
        <div
          className="modal-overlay meeting-modal-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setShowMeetingForm(false);
          }}
        >
          <section className="meeting-modal" role="dialog" aria-modal="true" aria-labelledby="meeting-modal-title">
            <header className="meeting-modal-header">
              <div className="meeting-modal-heading-copy">
                <span className="meeting-modal-eyebrow"><span className="meeting-modal-eyebrow-dot" /> MEETING PLANNER</span>
                <h2 id="meeting-modal-title">Schedule a meeting</h2>
                <p>Plan the next touchpoint with <strong>{lead.customerName}</strong>.</p>
              </div>
              <button
                type="button"
                className="meeting-modal-close"
                onClick={() => setShowMeetingForm(false)}
                aria-label="Close schedule meeting dialog"
              >
                ×
              </button>
            </header>
            <div className="meeting-modal-body">
              <MeetingForm
                leadId={id}
                onSubmit={handleCreateMeeting}
                onCancel={() => setShowMeetingForm(false)}
                loading={savingMeeting}
                submitLabel="Schedule Meeting"
              />
            </div>
          </section>
        </div>
      )}
    </div>
  );
};

export default LeadDetail;
