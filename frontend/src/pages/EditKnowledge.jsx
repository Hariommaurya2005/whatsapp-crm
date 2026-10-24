import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../api/axios';
import KnowledgeForm from '../components/KnowledgeForm';

const EditKnowledge = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [entry, setEntry] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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

  const handleSubmit = async (form) => {
    setSaving(true);
    try {
      await api.put(`/knowledge-base/${id}`, form);
      toast.success('Knowledge entry updated successfully');
      navigate(`/knowledge-base/${id}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update knowledge entry');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="loading-center" style={{ minHeight: '60vh' }}><span className="spinner spinner-lg" /></div>;
  if (!entry) return null;

  return (
    <div className="page-container">
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/knowledge-base/${id}`)}>← Back</button>
          <div className="page-title">Edit Knowledge Entry</div>
        </div>
      </div>

      <div className="card" style={{ maxWidth: '900px' }}>
        <KnowledgeForm
          initialValues={entry}
          onSubmit={handleSubmit}
          onCancel={() => navigate(`/knowledge-base/${id}`)}
          loading={saving}
          submitLabel="Save Changes"
        />
      </div>
    </div>
  );
};

export default EditKnowledge;
