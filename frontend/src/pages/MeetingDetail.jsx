import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../api/axios';
import { formatDateTime, getMeetingStatusClass } from '../utils/helpers';
import AIMeetingBriefCard from '../components/AIMeetingBriefCard';
import AIHistoryDrawer from '../components/AIHistoryDrawer';

const Detail = ({ label, value }) => (
  <div>
    <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '4px' }}>{label}</div>
    <div style={{ fontSize: '0.9rem', wordBreak: 'break-word' }}>{value || '—'}</div>
  </div>
);

const STATUSES = ['Scheduled', 'Completed', 'Cancelled', 'Rescheduled', 'No Show'];

const MeetingDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [meeting, setMeeting] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [brief, setBrief] = useState(null);
  const [generatingBrief, setGeneratingBrief] = useState(false);
  const [showBriefHistory, setShowBriefHistory] = useState(false);

  const fetchMeeting = useCallback(async () => {
    try {
      const { data } = await api.get(`/meetings/${id}`);
      setMeeting(data.data);
    } catch {
      toast.error('Meeting not found');
      navigate('/meetings');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => { fetchMeeting(); }, [fetchMeeting]);

  const handleStatusChange = async (status) => {
    setUpdatingStatus(true);
    try {
      const { data } = await api.put(`/meetings/${id}`, { status });
      setMeeting(data.data);
      toast.success('Meeting status updated');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleGenerateBrief = async (regenerate = false) => {
    setGeneratingBrief(true);
    try {
      const { data } = await api.post(`/ai/meeting-brief/${id}`, { regenerate });
      setBrief(data.data);
      if (regenerate) toast.success('Meeting brief regenerated');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to generate AI meeting brief');
    } finally {
      setGeneratingBrief(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this meeting? This cannot be undone.')) return;
    setDeleting(true);
    try {
      await api.delete(`/meetings/${id}`);
      toast.success('Meeting deleted');
      navigate('/meetings');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete meeting');
      setDeleting(false);
    }
  };

  if (loading) return <div className="loading-center" style={{ minHeight: '60vh' }}><span className="spinner spinner-lg" /></div>;
  if (!meeting) return null;

  const isOverdue = meeting.status === 'Scheduled' && new Date(meeting.meetingDate) < new Date();

  return (
    <div className="page-container">
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/meetings')}>← Back</button>
          <div>
            <div className="page-title">{meeting.title}</div>
            {meeting.leadId && (
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                <Link to={`/leads/${meeting.leadId._id}`} className="lead-name-link">
                  {meeting.leadId.customerName}
                </Link> · {meeting.leadId.phone}
              </div>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <span className={`badge ${getMeetingStatusClass(meeting.status)}`}>{meeting.status}</span>
          <button className="btn btn-sm" onClick={() => handleGenerateBrief(false)} disabled={generatingBrief}>
            {generatingBrief ? <span className="spinner" /> : '✨ Generate AI Meeting Brief'}
          </button>
          <button className="btn btn-sm" onClick={() => navigate(`/meetings/${id}/edit`)}>✏️ Edit</button>
          <button className="btn btn-danger btn-sm" onClick={handleDelete} disabled={deleting}>
            {deleting ? '...' : '🗑️ Delete'}
          </button>
        </div>
      </div>

      {generatingBrief && !brief && (
        <div className="card" style={{ marginBottom: '20px', textAlign: 'center', padding: '30px' }}>
          <span className="spinner spinner-lg" />
          <div style={{ marginTop: '12px', fontSize: '13px', color: 'var(--text-secondary)' }}>
            Generating AI meeting brief — this may take a few seconds...
          </div>
        </div>
      )}

      {brief && (
        <div style={{ marginBottom: '20px' }}>
          <AIMeetingBriefCard
            brief={brief}
            onRegenerate={() => handleGenerateBrief(true)}
            regenerating={generatingBrief}
            onShowHistory={() => setShowBriefHistory(true)}
          />
        </div>
      )}

      {showBriefHistory && (
        <AIHistoryDrawer
          referenceType="Meeting"
          referenceId={id}
          type="MeetingBrief"
          onClose={() => setShowBriefHistory(false)}
          onSelectVersion={(response) => { setBrief(response); setShowBriefHistory(false); }}
        />
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '20px', alignItems: 'start' }}>
        <div className="card">
          <div style={{ fontWeight: 600, marginBottom: '20px' }}>Meeting Details</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <Detail label="Date & Time" value={formatDateTime(meeting.meetingDate) + (isOverdue ? ' ⚠️ Overdue' : '')} />
            <Detail label="Meeting Type" value={meeting.meetingType} />
            <Detail label="Platform" value={meeting.platform} />
            <Detail label="Priority" value={meeting.priority} />
            <Detail label="Assigned To" value={meeting.assignedTo?.name} />
            <Detail label="Created By" value={meeting.userId?.name} />
            <Detail
              label="Meeting Link"
              value={meeting.meetingLink ? <a href={meeting.meetingLink} target="_blank" rel="noreferrer" style={{ color: 'var(--accent)' }}>{meeting.meetingLink}</a> : null}
            />
          </div>

          {meeting.agenda && (
            <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
              <div className="form-label" style={{ marginBottom: '8px' }}>Agenda</div>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-primary)', whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>{meeting.agenda}</div>
            </div>
          )}

          {meeting.description && (
            <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
              <div className="form-label" style={{ marginBottom: '8px' }}>Description</div>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-primary)', whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>{meeting.description}</div>
            </div>
          )}

          {meeting.notes && (
            <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
              <div className="form-label" style={{ marginBottom: '8px' }}>Notes</div>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-primary)', whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>{meeting.notes}</div>
            </div>
          )}
        </div>

        <div className="card">
          <div style={{ fontWeight: 600, marginBottom: '12px' }}>Update Status</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {STATUSES.map((s) => (
              <button
                key={s}
                className={`btn btn-sm ${s === meeting.status ? 'btn-primary' : ''}`}
                style={{ justifyContent: 'flex-start' }}
                disabled={updatingStatus || s === meeting.status}
                onClick={() => handleStatusChange(s)}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MeetingDetail;
