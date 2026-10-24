import React, { useState, useEffect, useCallback } from 'react';
import { Navigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { formatDateTime } from '../utils/helpers';

const UsersManagement = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/users');
      setUsers(data.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  // Extra client-side guard on top of the backend's own adminOnly check —
  // the backend is the real enforcement point, this just avoids flashing
  // the page content to a non-admin before the API call would reject it.
  if (currentUser && currentUser.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  const toggleStatus = async (u) => {
    setUpdatingId(u._id);
    try {
      const { data } = await api.put(`/users/${u._id}/status`, { isActive: !u.isActive });
      setUsers((prev) => prev.map((x) => (x._id === u._id ? data.data : x)));
      toast.success(`${u.name} ${data.data.isActive ? 'activated' : 'deactivated'} successfully`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update user status');
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Users Management</h1>
          <p className="page-subtitle">{users.length} total users</p>
        </div>
      </div>

      {loading ? (
        <div className="loading-spinner" />
      ) : users.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">👥</div>
          <h3>No users found</h3>
        </div>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Created At</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u._id}>
                  <td>
                    {u.name}
                    {u._id === currentUser._id && (
                      <span style={{ marginLeft: '8px', fontSize: '11px', color: 'var(--text-muted)' }}>(you)</span>
                    )}
                  </td>
                  <td style={{ color: 'var(--text-secondary)' }}>{u.email}</td>
                  <td>
                    <span className="badge" style={{ textTransform: 'capitalize' }}>{u.role}</span>
                  </td>
                  <td>
                    <span className={`badge ${u.isActive ? 'badge-converted' : 'badge-lost'}`}>
                      {u.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>{formatDateTime(u.createdAt)}</td>
                  <td>
                    <button
                      className={`btn btn-sm ${u.isActive ? 'btn-danger' : 'btn-primary'}`}
                      onClick={() => toggleStatus(u)}
                      disabled={updatingId === u._id || u._id === currentUser._id}
                      title={u._id === currentUser._id ? "You can't deactivate your own account" : ''}
                    >
                      {updatingId === u._id ? <span className="spinner" /> : (u.isActive ? 'Deactivate' : 'Activate')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default UsersManagement;
