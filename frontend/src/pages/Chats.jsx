import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import './Chats.css';

const Chats = () => {
  const navigate = useNavigate();
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchThreads = useCallback(async () => {
    try {
      const { data } = await api.get('/chat/threads');
      setThreads(data.data || []);
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchThreads();
    const iv = setInterval(fetchThreads, 8000);
    return () => clearInterval(iv);
  }, [fetchThreads]);

  const filtered = threads.filter((t) =>
    t.customerName?.toLowerCase().includes(search.toLowerCase()) ||
    t.phone?.includes(search)
  );

  const formatTime = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    const now = new Date();
    const diff = now - d;
    if (diff < 86400000 && d.toDateString() === now.toDateString())
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (diff < 604800000) return d.toLocaleDateString([], { weekday: 'short' });
    return d.toLocaleDateString([], { day: 'numeric', month: 'short' });
  };

  return (
    <div className="chats-root">
      <div className="chats-header">
        <div className="chats-title">Chats</div>
        <input
          className="chats-search"
          placeholder="🔍  Search by name or number..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="chats-loading">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="thread-skeleton">
              <div className="skeleton-avatar" />
              <div className="skeleton-lines">
                <div className="skeleton-line w70" />
                <div className="skeleton-line w50" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="chats-empty">
          <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>💬</div>
          <p>{search ? 'No matches found' : 'No conversations yet'}</p>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted, #667781)' }}>
            Open a conversation from the Leads page to get started
          </p>
        </div>
      ) : (
        <div className="threads-list">
          {filtered.map((t) => (
            <div
              key={t.leadId}
              className={`thread-item ${t.unread > 0 ? 'unread' : ''}`}
              onClick={() => navigate(`/leads/${t.leadId}/chat`)}
            >
              <div className="thread-avatar">
                {t.customerName?.charAt(0).toUpperCase() || '?'}
              </div>
              <div className="thread-body">
                <div className="thread-top">
                  <span className="thread-name">{t.customerName}</span>
                  <span className="thread-time">{formatTime(t.lastMessageAt)}</span>
                </div>
                <div className="thread-bottom">
                  <span className="thread-preview">
                    {t.lastDirection === 'outbound' && <span className="preview-you">You: </span>}
                    {t.lastMessage || 'Start the conversation...'}
                  </span>
                  {t.unread > 0 && (
                    <span className="thread-unread-badge">{t.unread}</span>
                  )}
                </div>
                <div className="thread-phone">{t.phone}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Chats;
