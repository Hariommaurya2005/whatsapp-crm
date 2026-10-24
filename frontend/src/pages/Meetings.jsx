import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../api/axios';
import MeetingCard from '../components/MeetingCard';

const Meetings = () => {
  const navigate = useNavigate();
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ status: '', meetingType: '', priority: '', search: '' });
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });

  const fetchMeetings = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = { page, limit: 20, sort: 'meetingDate', ...filters };
      Object.keys(params).forEach((k) => !params[k] && delete params[k]);
      const { data } = await api.get('/meetings', { params });
      setMeetings(data.data);
      setPagination({ page: data.page, pages: data.pages, total: data.total });
    } catch {
      toast.error('Failed to load meetings');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { fetchMeetings(1); }, [fetchMeetings]);

  const filterChange = (e) => {
    const { name, value } = e.target;
    setFilters((p) => ({ ...p, [name]: value }));
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Meetings</h1>
          <p className="page-subtitle">{pagination.total} total meetings</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/meetings/new')}>
          + Schedule Meeting
        </button>
      </div>

      {/* Filters */}
      <div className="filters-bar" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '16px' }}>
        <input
          className="form-control"
          style={{ maxWidth: '220px' }}
          name="search"
          value={filters.search}
          onChange={filterChange}
          placeholder="🔍 Search title, agenda..."
        />
        {[
          { name: 'status', options: ['', 'Scheduled', 'Completed', 'Cancelled', 'Rescheduled', 'No Show'] },
          { name: 'meetingType', options: ['', 'Discovery Call', 'Demo', 'Follow-up', 'Negotiation', 'Onboarding', 'Other'] },
          { name: 'priority', options: ['', 'Low', 'Medium', 'High'] },
        ].map(({ name, options }) => (
          <select key={name} className="form-control" style={{ maxWidth: '170px' }}
            name={name} value={filters[name]} onChange={filterChange}>
            {options.map((o) => (
              <option key={o} value={o}>{o || `All ${name === 'meetingType' ? 'types' : name + 's'}`}</option>
            ))}
          </select>
        ))}
        {Object.values(filters).some(Boolean) && (
          <button className="btn" onClick={() => setFilters({ status: '', meetingType: '', priority: '', search: '' })}>
            ✕ Clear
          </button>
        )}
      </div>

      {loading ? (
        <div className="loading-spinner" />
      ) : meetings.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📅</div>
          <h3>No meetings found</h3>
          <p>Schedule your first meeting or adjust filters</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '14px' }}>
          {meetings.map((m) => (
            <MeetingCard key={m._id} meeting={m} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginTop: '20px' }}>
          {Array.from({ length: pagination.pages }, (_, i) => i + 1).map((p) => (
            <button key={p} className={`btn ${p === pagination.page ? 'btn-primary' : ''}`}
              style={{ minWidth: '36px' }} onClick={() => fetchMeetings(p)}>{p}</button>
          ))}
        </div>
      )}
    </div>
  );
};

export default Meetings;
