import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../api/axios';
import { formatDateTime, getKnowledgeStatusClass } from '../utils/helpers';

const Detail = ({ label, value }) => (
  <div>
    <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '4px' }}>{label}</div>
    <div style={{ fontSize: '0.9rem', wordBreak: 'break-word' }}>{value || '—'}</div>
  </div>
);

const KnowledgeDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [entry, setEntry] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  const fetchEntry = useCallback(async () => {
    try {
      const { data } = await api.get(`/knowledge-base/${id}`);
      setEntry(data.data);
    } catch {
      toast.error('Knowledge entry not found');
      navigate('/knowledge-base');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => { fetchEntry(); }, [fetchEntry]);

  const handleDelete = async () => {
    if (!window.confirm('Delete this knowledge entry? This cannot be undone.')) return;
    setDeleting(true);
    try {
      await api.delete(`/knowledge-base/${id}`);
      toast.success('Knowledge entry deleted');
      navigate('/knowledge-base');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete knowledge entry');
      setDeleting(false);
    }
  };

  if (loading) return <div className="loading-center" style={{ minHeight: '60vh' }}><span className="spinner spinner-lg" /></div>;
  if (!entry) return null;

  return (
    <div className="page-container">
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/knowledge-base')}>← Back</button>
          <div>
            <div className="page-title">{entry.title}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
              {entry.category} · Version {entry.version}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <span className={`badge ${getKnowledgeStatusClass(entry.status)}`}>{entry.status}</span>
          <button className="btn btn-sm" onClick={() => navigate(`/knowledge-base/${id}/edit`)}>✏️ Edit</button>
          <button className="btn btn-danger btn-sm" onClick={handleDelete} disabled={deleting}>
            {deleting ? '...' : '🗑️ Delete'}
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '20px', alignItems: 'start' }}>
        <div className="card">
          <div style={{ fontWeight: 600, marginBottom: '16px' }}>Content</div>
          <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)', whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>
            {entry.content}
          </div>

          {entry.tags?.length > 0 && (
            <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
              <div className="form-label" style={{ marginBottom: '8px' }}>Tags</div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {entry.tags.map((t) => (
                  <span key={t} style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)', borderRadius: '12px', padding: '2px 10px', fontSize: '12px', color: 'var(--text-secondary)' }}>{t}</span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="card">
          <div style={{ fontWeight: 600, marginBottom: '16px' }}>Details</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <Detail label="Category" value={entry.category} />
            <Detail label="Version" value={entry.version} />
            <Detail label="Created By" value={entry.createdBy?.name} />
            <Detail label="Created" value={formatDateTime(entry.createdAt)} />
            <Detail label="Last Updated By" value={entry.updatedBy?.name || '—'} />
            <Detail label="Last Updated" value={formatDateTime(entry.updatedAt)} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default KnowledgeDetail;
