import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../api/axios';
import KnowledgeCard from '../components/KnowledgeCard';

const CATEGORIES = [
  'Company Profile', 'Products', 'Compensation Plan', 'Training', 'FAQs',
  'Sales Scripts', 'Meeting Guides', 'Price List', 'Policies', 'Objection Handling', 'General Notes',
];

const KnowledgeBase = () => {
  const navigate = useNavigate();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ category: '', status: '', search: '' });
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });

  const fetchEntries = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = { page, limit: 20, ...filters };
      Object.keys(params).forEach((k) => !params[k] && delete params[k]);
      const { data } = await api.get('/knowledge-base', { params });
      setEntries(data.data);
      setPagination({ page: data.page, pages: data.pages, total: data.total });
    } catch {
      toast.error('Failed to load knowledge base entries');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { fetchEntries(1); }, [fetchEntries]);

  const filterChange = (e) => {
    const { name, value } = e.target;
    setFilters((p) => ({ ...p, [name]: value }));
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Knowledge Base</h1>
          <p className="page-subtitle">{pagination.total} total entries</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/knowledge-base/new')}>
          + Add Entry
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
          placeholder="🔍 Search title, content, tags..."
        />
        <select className="form-control" style={{ maxWidth: '200px' }}
          name="category" value={filters.category} onChange={filterChange}>
          <option value="">All categories</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select className="form-control" style={{ maxWidth: '150px' }}
          name="status" value={filters.status} onChange={filterChange}>
          <option value="">All statuses</option>
          <option value="Draft">Draft</option>
          <option value="Published">Published</option>
          <option value="Archived">Archived</option>
        </select>
        {Object.values(filters).some(Boolean) && (
          <button className="btn" onClick={() => setFilters({ category: '', status: '', search: '' })}>
            ✕ Clear
          </button>
        )}
      </div>

      {loading ? (
        <div className="loading-spinner" />
      ) : entries.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📚</div>
          <h3>No knowledge base entries found</h3>
          <p>Add your first entry or adjust filters</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '14px' }}>
          {entries.map((entry) => (
            <KnowledgeCard key={entry._id} entry={entry} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginTop: '20px' }}>
          {Array.from({ length: pagination.pages }, (_, i) => i + 1).map((p) => (
            <button key={p} className={`btn ${p === pagination.page ? 'btn-primary' : ''}`}
              style={{ minWidth: '36px' }} onClick={() => fetchEntries(p)}>{p}</button>
          ))}
        </div>
      )}
    </div>
  );
};

export default KnowledgeBase;
