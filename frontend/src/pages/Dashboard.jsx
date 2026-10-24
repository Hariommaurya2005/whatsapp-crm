import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

const STATUS_COLORS = { New: '#3b82f6', Contacted: '#f59e0b', 'In Progress': '#8b5cf6', Converted: '#22c55e', Lost: '#ef4444' };

const StatCard = ({ label, value, icon, sub }) => (
  <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <span style={{ fontSize: '13px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
      <span style={{ fontSize: '22px' }}>{icon}</span>
    </div>
    <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1 }}>{value}</div>
    {sub && <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{sub}</div>}
  </div>
);

const MiniBar = ({ label, value, max, color }) => (
  <div style={{ marginBottom: '10px' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '13px' }}>
      <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
      <span style={{ fontWeight: 600 }}>{value}</span>
    </div>
    <div style={{ height: '6px', background: 'var(--bg-tertiary)', borderRadius: '3px', overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${(value / max) * 100}%`, background: color, borderRadius: '3px', transition: 'width 0.5s ease' }} />
    </div>
  </div>
);

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboard/stats')
      .then(({ data }) => setStats(data.data))
      .catch(() => toast.error('Failed to load dashboard'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="loading-center" style={{ minHeight: '60vh' }}>
      <span className="spinner spinner-lg" />
    </div>
  );

  const statusData = stats?.leadsByStatus || {};
  const sourceData = stats?.leadsBySource || {};
  const maxStatus = Math.max(...Object.values(statusData), 1);
  const maxSource = Math.max(...Object.values(sourceData), 1);
  const overdueCount = stats?.overdueLeads ?? (stats?.recentLeads?.filter(l => l.followUpDate && new Date(l.followUpDate) < new Date() && !['Converted', 'Lost'].includes(l.status)).length || 0);

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <div className="page-title">Dashboard</div>
          <div className="page-subtitle">Good day, {user?.name} 👋</div>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-primary" onClick={() => navigate('/leads')}>+ New Lead</button>
        </div>
      </div>

      {/* Alerts */}
      {overdueCount > 0 && (
        <div className="overdue-alert" role="status">
          <span className="overdue-alert-icon" aria-hidden="true">⚠️</span>
          <span className="overdue-alert-message">
            {overdueCount} lead{overdueCount > 1 ? 's' : ''} overdue for follow-up
          </span>
          <button
            type="button"
            className="overdue-alert-action"
            onClick={() => navigate('/leads?overdue=true')}
            aria-label={`View ${overdueCount} overdue leads`}
          >
            View <span aria-hidden="true">→</span>
          </button>
        </div>
      )}

      {/* Stats Row */}
      <div className="stats-grid">
        <StatCard label="Total Leads" value={stats?.totalLeads ?? 0} icon="📋" />
        <StatCard label="Converted" value={statusData.Converted ?? 0} icon="✅" sub={`${stats?.conversionRate ?? 0}% rate`} />
        <StatCard label="In Progress" value={statusData['In Progress'] ?? 0} icon="⏳" />
        <StatCard label="Lost" value={statusData.Lost ?? 0} icon="❌" />
      </div>

      {/* Charts Row */}
      <div className="charts-grid">
        <div className="card">
          <div style={{ fontWeight: 600, marginBottom: '16px', fontSize: '0.95rem' }}>Leads by Status</div>
          {Object.entries(statusData).map(([k, v]) => (
            <MiniBar key={k} label={k} value={v} max={maxStatus} color={STATUS_COLORS[k] || '#64748b'} />
          ))}
          {!Object.keys(statusData).length && <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>No data yet</p>}
        </div>

        <div className="card">
          <div style={{ fontWeight: 600, marginBottom: '16px', fontSize: '0.95rem' }}>Leads by Source</div>
          {Object.entries(sourceData).map(([k, v]) => (
            <MiniBar key={k} label={k} value={v} max={maxSource} color="var(--accent)" />
          ))}
          {!Object.keys(sourceData).length && <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>No data yet</p>}
        </div>
      </div>

      {/* Recent Leads */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>Recent Leads</div>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/leads')}>View all →</button>
        </div>

        {!stats?.recentLeads?.length ? (
          <div className="empty-state" style={{ padding: '30px 0' }}>
            <div className="empty-state-icon">📭</div>
            <p>No leads yet — create your first one!</p>
          </div>
        ) : (
          <div className="table-container" style={{ border: 'none' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Phone</th>
                  <th>Status</th>
                  <th>Source</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentLeads.map((lead) => (
                  <tr key={lead._id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/leads/${lead._id}`)}>
                    <td style={{ fontWeight: 500 }}>{lead.customerName}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.82rem', color: '#25d366' }}>{lead.phone}</td>
                    <td>
                      <span className="status-badge" style={{ backgroundColor: (STATUS_COLORS[lead.status] || '#666') + '20', color: STATUS_COLORS[lead.status] || '#aaa', border: `1px solid ${(STATUS_COLORS[lead.status] || '#666')}40` }}>
                        {lead.status}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>{lead.source}</td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                      {new Date(lead.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
