import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../api/axios';
import KnowledgeForm from '../components/KnowledgeForm';

const CreateKnowledge = () => {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (form) => {
    setSaving(true);
    try {
      const { data } = await api.post('/knowledge-base', form);
      toast.success('Knowledge entry created successfully');
      navigate(`/knowledge-base/${data.data._id}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create knowledge entry');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/knowledge-base')}>← Back</button>
          <div className="page-title">Add Knowledge Entry</div>
        </div>
      </div>

      <div className="card" style={{ maxWidth: '900px' }}>
        <KnowledgeForm
          onSubmit={handleSubmit}
          onCancel={() => navigate('/knowledge-base')}
          loading={saving}
          submitLabel="Create Entry"
        />
      </div>
    </div>
  );
};

export default CreateKnowledge;
