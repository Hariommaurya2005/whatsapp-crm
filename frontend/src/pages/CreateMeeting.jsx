import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../api/axios';
import MeetingForm from '../components/MeetingForm';

const CreateMeeting = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const presetLeadId = searchParams.get('leadId') || '';

  const [leads, setLeads] = useState([]);
  const [users, setUsers] = useState([]);
  const [loadingLists, setLoadingLists] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get('/leads', { params: { limit: 100 } }),
      api.get('/auth/users'),
    ])
      .then(([leadsRes, usersRes]) => {
        setLeads(leadsRes.data.data);
        setUsers(usersRes.data.data);
      })
      .catch(() => toast.error('Failed to load leads/users'))
      .finally(() => setLoadingLists(false));
  }, []);

  const handleSubmit = async (form) => {
    setSaving(true);
    try {
      const { data } = await api.post('/meetings', form);
      toast.success('Meeting scheduled successfully');
      navigate(`/meetings/${data.data._id}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to schedule meeting');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/meetings')}>← Back</button>
          <div className="page-title">Schedule Meeting</div>
        </div>
      </div>

      <div className="card" style={{ maxWidth: '760px' }}>
        {loadingLists ? (
          <div className="loading-center"><span className="spinner spinner-lg" /></div>
        ) : (
          <MeetingForm
            leadId={presetLeadId}
            leads={leads}
            users={users}
            onSubmit={handleSubmit}
            onCancel={() => navigate('/meetings')}
            loading={saving}
            submitLabel="Schedule Meeting"
          />
        )}
      </div>
    </div>
  );
};

export default CreateMeeting;
