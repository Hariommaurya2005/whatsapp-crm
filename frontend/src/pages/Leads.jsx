import React, { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../api/axios';
import LeadForm from '../components/LeadForm';

const STATUS_COLORS = {
  'New': '#3b82f6',
  'Contacted': '#f59e0b',
  'In Progress': '#8b5cf6',
  'Converted': '#22c55e',
  'Lost': '#ef4444',
};

const PRIORITY_ICONS = { Low: '🔵', Medium: '🟡', High: '🔴' };

const Leads = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const overdueOnly = searchParams.get('overdue') === 'true';
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editLead, setEditLead] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [filters, setFilters] = useState({ status: '', source: '', priority: '', search: '' });
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [deleting, setDeleting] = useState(null);

  const fetchLeads = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = { page, limit: 20, ...filters, ...(overdueOnly ? { overdue: 'true' } : {}) };
      // Strip empty
      Object.keys(params).forEach((k) => !params[k] && delete params[k]);
      const { data } = await api.get('/leads', { params });
      setLeads(data.data);
      setPagination({ page: data.page, pages: data.pages, total: data.total });
    } catch {
      toast.error('Failed to load leads');
    } finally {
      setLoading(false);
    }
  }, [filters, overdueOnly]);

  useEffect(() => { fetchLeads(1); }, [fetchLeads]);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this lead? This cannot be undone.')) return;
    setDeleting(id);
    try {
      await api.delete(`/leads/${id}`);
      toast.success('Lead deleted');
      fetchLeads(pagination.page);
      setSelectedIds((p) => p.filter((i) => i !== id));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
    } finally {
      setDeleting(null);
    }
  };

  const handleBulkStatusUpdate = async (status) => {
    if (!selectedIds.length) return;
    if (!window.confirm(`Update ${selectedIds.length} lead(s) to "${status}"?`)) return;
    try {
      await api.put('/leads/bulk-status', { ids: selectedIds, status });
      toast.success(`${selectedIds.length} lead(s) updated`);
      setSelectedIds([]);
      fetchLeads(pagination.page);
    } catch {
      toast.error('Bulk update failed');
    }
  };

  const toggleSelect = (id) =>
    setSelectedIds((p) => p.includes(id) ? p.filter((i) => i !== id) : [...p, id]);

  const toggleSelectAll = () =>
    setSelectedIds(selectedIds.length === leads.length ? [] : leads.map((l) => l._id));

  const filterChange = (e) => {
    const { name, value } = e.target;
    setFilters((p) => ({ ...p, [name]: value }));
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">{overdueOnly ? 'Overdue Follow-ups' : 'Leads'}</h1>
          <p className="page-subtitle">
            {overdueOnly ? `${pagination.total} overdue lead${pagination.total === 1 ? '' : 's'} need follow-up` : `${pagination.total} total leads`}
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditLead(null); setShowForm(true); }}>
          + Add Lead
        </button>
      </div>

      {overdueOnly && (
        <div className="overdue-filter-notice">
          <span>Showing leads with a past follow-up date that are not converted or lost.</span>
          <button type="button" className="overdue-filter-clear" onClick={() => setSearchParams({})}>
            Clear overdue filter
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="filters-bar" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '16px' }}>
        <input
          className="form-control"
          style={{ maxWidth: '220px' }}
          name="search"
          value={filters.search}
          onChange={filterChange}
          placeholder="🔍 Search name, phone..."
        />
        {[
          { name: 'status', options: ['', 'New', 'Contacted', 'In Progress', 'Converted', 'Lost'] },
          { name: 'source', options: ['', 'WhatsApp', 'Web', 'Manual', 'Referral', 'Social Media'] },
          { name: 'priority', options: ['', 'Low', 'Medium', 'High'] },
        ].map(({ name, options }) => (
          <select key={name} className="form-control" style={{ maxWidth: '150px' }}
            name={name} value={filters[name]} onChange={filterChange}>
            {options.map((o) => (
              <option key={o} value={o}>{o || `All ${name}s`}</option>
            ))}
          </select>
        ))}
        {Object.values(filters).some(Boolean) && (
          <button className="btn" onClick={() => setFilters({ status: '', source: '', priority: '', search: '' })}>
            ✕ Clear
          </button>
        )}
      </div>

      {/* Bulk Actions */}
      {selectedIds.length > 0 && (
        <div style={{
          background: 'var(--bg-tertiary)', border: '1px solid var(--border)', borderRadius: '8px',
          padding: '12px 16px', marginBottom: '12px', display: 'flex', gap: '8px', alignItems: 'center'
        }}>
          <span style={{ color: 'var(--text-secondary)' }}>{selectedIds.length} selected</span>
          {['Contacted', 'In Progress', 'Converted', 'Lost'].map((s) => (
            <button key={s} className="btn" style={{ fontSize: '13px', padding: '4px 10px' }}
              onClick={() => handleBulkStatusUpdate(s)}>
              → {s}
            </button>
          ))}
          <button className="btn" style={{ fontSize: '13px', padding: '4px 10px', marginLeft: 'auto' }}
            onClick={() => setSelectedIds([])}>
            Deselect
          </button>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="loading-spinner" />
      ) : leads.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📋</div>
          <h3>No leads found</h3>
          <p>Add your first lead or adjust filters</p>
        </div>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '40px' }}>
                  <input type="checkbox" checked={selectedIds.length === leads.length && leads.length > 0}
                    onChange={toggleSelectAll} />
                </th>
                <th>Customer</th>
                <th>Phone</th>
                <th>Status</th>
                <th>Priority</th>
                <th>Source</th>
                <th>Follow Up</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr key={lead._id} className={lead.isOverdue ? 'row-overdue' : ''}>
                  <td>
                    <input type="checkbox" checked={selectedIds.includes(lead._id)}
                      onChange={() => toggleSelect(lead._id)} />
                  </td>
                  <td>
                    <Link to={`/leads/${lead._id}`} className="lead-name-link">
                      {lead.customerName}
                    </Link>
                    {lead.company && <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{lead.company}</div>}
                    {lead.isOverdue && <span style={{ fontSize: '11px', color: '#ef4444' }}>⚠️ Overdue</span>}
                  </td>
                  <td>
                    <a href={`tel:${lead.phone}`} style={{ color: '#25d366' }}>{lead.phone}</a>
                  </td>
                  <td>
                    <span className="status-badge" style={{ backgroundColor: STATUS_COLORS[lead.status] + '20', color: STATUS_COLORS[lead.status], border: `1px solid ${STATUS_COLORS[lead.status]}40` }}>
                      {lead.status}
                    </span>
                  </td>
                  <td>{PRIORITY_ICONS[lead.priority]} {lead.priority}</td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>{lead.source}</td>
                  <td style={{ fontSize: '13px', color: lead.isOverdue ? '#ef4444' : 'var(--text-secondary)' }}>
                    {lead.followUpDate ? new Date(lead.followUpDate).toLocaleDateString() : '—'}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <Link to={`/leads/${lead._id}`} className="btn" style={{ fontSize: '12px', padding: '4px 8px' }}>View</Link>
                      <button className="btn" style={{ fontSize: '12px', padding: '4px 8px' }}
                        onClick={() => { setEditLead(lead); setShowForm(true); }}>Edit</button>
                      <button className="btn btn-danger" style={{ fontSize: '12px', padding: '4px 8px' }}
                        onClick={() => handleDelete(lead._id)} disabled={deleting === lead._id}>
                        {deleting === lead._id ? '...' : 'Del'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginTop: '16px' }}>
          {Array.from({ length: pagination.pages }, (_, i) => i + 1).map((p) => (
            <button key={p} className={`btn ${p === pagination.page ? 'btn-primary' : ''}`}
              style={{ minWidth: '36px' }} onClick={() => fetchLeads(p)}>{p}</button>
          ))}
        </div>
      )}

      {showForm && (
        <LeadForm
          lead={editLead}
          onClose={() => { setShowForm(false); setEditLead(null); }}
          onSaved={() => { fetchLeads(pagination.page); setShowForm(false); setEditLead(null); }}
        />
      )}
    </div>
  );
};

export default Leads;
