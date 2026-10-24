import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../api/axios';
import MeetingForm from '../components/MeetingForm';

const EditMeeting = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [meeting, setMeeting] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [meetingRes, usersRes] = await Promise.all([
        api.get(`/meetings/${id}`),
        api.get('/auth/users'),
      ]);
      setMeeting(meetingRes.data.data);
      setUsers(usersRes.data.data);
    } catch {
      toast.error('Meeting not found');
      navigate('/meetings');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSubmit = async (form) => {
    setSaving(true);
    try {
      await api.put(`/meetings/${id}`, form);
      toast.success('Meeting updated successfully');
      navigate(`/meetings/${id}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update meeting');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="loading-center" style={{ minHeight: '60vh' }}><span className="spinner spinner-lg" /></div>;
  if (!meeting) return null;

  return (
    <div className="page-container">
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/meetings/${id}`)}>← Back</button>
          <div className="page-title">Edit Meeting</div>
        </div>
      </div>

      <div className="card" style={{ maxWidth: '760px' }}>
        <MeetingForm
          leadId={meeting.leadId?._id || meeting.leadId}
          users={users}
          initialValues={meeting}
          isEdit
          onSubmit={handleSubmit}
          onCancel={() => navigate(`/meetings/${id}`)}
          loading={saving}
          submitLabel="Save Changes"
        />
      </div>
    </div>
  );
};

export default EditMeeting;
