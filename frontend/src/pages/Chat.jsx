import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../api/axios';
import ConversationSummaryCard from '../components/ConversationSummaryCard';
import SuggestedReplyCard from '../components/SuggestedReplyCard';
import FollowUpCard from '../components/FollowUpCard';
import AIHistoryDrawer from '../components/AIHistoryDrawer';
import './Chat.css';

const Chat = () => {
  const { leadId } = useParams();
  const navigate = useNavigate();

  const [lead, setLead] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [aiSummary, setAiSummary] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [quickReplies, setQuickReplies] = useState([]);
  const [qrLoading, setQrLoading] = useState(false);
  const [showScheduler, setShowScheduler] = useState(false);
  const [scheduledAt, setScheduledAt] = useState('');
  const [scheduledMsg, setScheduledMsg] = useState('');

  // Day 6 — AI WhatsApp Assistant
  const [convSummary, setConvSummary] = useState(null);
  const [convSummaryLoading, setConvSummaryLoading] = useState(false);
  const [showSummaryHistory, setShowSummaryHistory] = useState(false);
  const [suggestedReply, setSuggestedReply] = useState(null);
  const [suggestedReplyLoading, setSuggestedReplyLoading] = useState(false);
  const [followUp, setFollowUp] = useState(null);
  const [followUpLoading, setFollowUpLoading] = useState(false);
  const [creatingReminder, setCreatingReminder] = useState(false);

  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const pollRef = useRef(null);

  const fetchMessages = useCallback(async () => {
    try {
      const { data } = await api.get(`/chat/${leadId}`);
      setMessages(data.data || []);
      setLead(data.lead);
    } catch {
      toast.error('Unable to load conversation');
      navigate('/chats');
    }
  }, [leadId, navigate]);

  useEffect(() => {
    const init = async () => { setLoading(true); await fetchMessages(); setLoading(false); };
    init();
    pollRef.current = setInterval(fetchMessages, 5000);
    return () => clearInterval(pollRef.current);
  }, [fetchMessages]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const sendMessage = async (e) => {
    e?.preventDefault();
    if (!input.trim() || sending) return;
    const text = input.trim();
    setInput('');
    setQuickReplies([]);
    setSending(true);

    const tempMsg = { _id: `temp-${Date.now()}`, direction: 'outbound', body: text, status: 'sending', createdAt: new Date().toISOString(), temp: true };
    setMessages((prev) => [...prev, tempMsg]);

    try {
      const { data } = await api.post(`/chat/${leadId}/send`, { body: text });
      await fetchMessages();
      if (data.warning) {
        toast.error(`Message saved but not delivered: ${data.warning}`);
      }
    } catch {
      toast.error('Send failed');
      setMessages((prev) => prev.filter((m) => m._id !== tempMsg._id));
      setInput(text);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const sendQuickReply = (text) => {
    setInput(text);
    inputRef.current?.focus();
  };

  const fetchQuickReplies = async () => {
    if (!process.env.REACT_APP_AI_ENABLED && quickReplies.length > 0) { setQuickReplies([]); return; }
    setQrLoading(true);
    try {
      const { data } = await api.get(`/chat/${leadId}/quick-replies`);
      setQuickReplies(data.data || []);
    } catch { toast.error('Failed to load quick replies'); }
    finally { setQrLoading(false); }
  };

  const fetchAISummary = async () => {
    setAiLoading(true);
    try {
      const { data } = await api.get(`/chat/${leadId}/summary`);
      setAiSummary(data.data);
    } catch { toast.error('AI summary failed'); }
    finally { setAiLoading(false); }
  };

  const generateConversationSummary = async (regenerate = false) => {
    setSuggestedReply(null); setFollowUp(null);
    setConvSummaryLoading(true);
    try {
      const { data } = await api.post(`/ai/conversation-summary/${leadId}`, { regenerate });
      setConvSummary(data.data);
      if (regenerate) toast.success('Conversation summary regenerated');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to generate conversation summary');
    } finally {
      setConvSummaryLoading(false);
    }
  };

  const generateSuggestedReply = async () => {
    setConvSummary(null); setFollowUp(null);
    setSuggestedReplyLoading(true);
    try {
      const { data } = await api.post(`/ai/suggest-reply/${leadId}`);
      setSuggestedReply(data.data.replies?.[0] || '');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to generate a suggested reply');
      setSuggestedReply(null);
    } finally {
      setSuggestedReplyLoading(false);
    }
  };

  const generateFollowUp = async () => {
    setConvSummary(null); setSuggestedReply(null);
    setFollowUpLoading(true);
    try {
      const { data } = await api.post(`/ai/follow-up/${leadId}`);
      setFollowUp(data.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to generate a follow-up suggestion');
    } finally {
      setFollowUpLoading(false);
    }
  };

  const handleUseSuggestedReply = (text) => {
    setInput(text);
    inputRef.current?.focus();
  };

  const handleCreateReminderFromFollowUp = async (form) => {
    setCreatingReminder(true);
    try {
      await api.post('/reminders', form);
      toast.success('Reminder created successfully');
      setFollowUp(null);
      return true;
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create reminder');
      return false;
    } finally {
      setCreatingReminder(false);
    }
  };

  const sendScheduled = async () => {
    if (!scheduledMsg.trim() || !scheduledAt) { toast.error('Message and scheduled time are required'); return; }
    try {
      await api.post(`/chat/${leadId}/send`, { body: scheduledMsg.trim(), scheduledAt });
      toast.success('Message scheduled successfully');
      setScheduledMsg(''); setScheduledAt(''); setShowScheduler(false);
      fetchMessages();
    } catch { toast.error('Schedule failed'); }
  };

  const formatTime = (iso) => { if (!iso) return ''; const d = new Date(iso); return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); };
  const formatDate = (iso) => {
    if (!iso) return '';
    const d = new Date(iso), now = new Date();
    const yest = new Date(now); yest.setDate(now.getDate() - 1);
    if (d.toDateString() === now.toDateString()) return 'Today';
    if (d.toDateString() === yest.toDateString()) return 'Yesterday';
    return d.toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const grouped = messages.reduce((acc, msg) => {
    const key = formatDate(msg.createdAt);
    if (!acc[key]) acc[key] = [];
    acc[key].push(msg); return acc;
  }, {});

  const StatusIcon = ({ status }) => {
    if (status === 'sending') return <span className="msg-status">◷</span>;
    if (status === 'sent') return <span className="msg-status sent">✓</span>;
    if (status === 'delivered') return <span className="msg-status delivered">✓✓</span>;
    if (status === 'read') return <span className="msg-status read">✓✓</span>;
    if (status === 'failed') return <span className="msg-status failed" title="Message failed to send — check WhatsApp configuration">✕</span>;
    return null;
  };

  const minDateTime = new Date(Date.now() + 60000).toISOString().slice(0, 16);
  const pendingScheduled = messages.filter((m) => m.scheduledAt && m.status === 'sending');

  if (loading) return (
    <div className="chat-loading">
      <div className="chat-loading-dots"><span /><span /><span /></div>
    </div>
  );

  return (
    <div className="chat-root">
      {/* Header */}
      <div className="chat-header">
        <button className="chat-back-btn" onClick={() => navigate('/chats')}>←</button>
        <div className="chat-avatar">{lead?.customerName?.charAt(0).toUpperCase() || '?'}</div>
        <div className="chat-header-info">
          <div className="chat-header-name">{lead?.customerName}</div>
          <div className="chat-header-phone">+{lead?.phone}</div>
        </div>
        <div className="chat-header-actions">
          <button className={`chat-ai-btn ${aiLoading ? 'loading' : ''}`} onClick={fetchAISummary} disabled={aiLoading} title="AI Summary">
            {aiLoading ? '◌' : '✦'} Summary
          </button>
          <button className="chat-ai-btn" onClick={fetchQuickReplies} disabled={qrLoading} title="AI Quick Replies">
            {qrLoading ? '◌' : '⚡'} Reply
          </button>
          <button className="chat-schedule-btn" onClick={() => setShowScheduler(!showScheduler)} title="Schedule Message">
            ⏱
          </button>
        </div>
      </div>

      {/* AI WhatsApp Assistant toolbar */}
      <div className="chat-assistant-bar">
        <span className="chat-assistant-bar-label">🤖 AI Assistant:</span>
        <button className="chat-ai-btn" onClick={() => generateConversationSummary(false)} disabled={convSummaryLoading} title="Generate Conversation Summary">
          {convSummaryLoading ? '◌' : '✨'} Generate Conversation Summary
        </button>
        <button className="chat-ai-btn" onClick={generateSuggestedReply} disabled={suggestedReplyLoading} title="Suggest Reply">
          {suggestedReplyLoading ? '◌' : '💬'} Suggest Reply
        </button>
        <button className="chat-ai-btn" onClick={generateFollowUp} disabled={followUpLoading} title="Generate Follow-up">
          {followUpLoading ? '◌' : '📅'} Generate Follow-up
        </button>
      </div>

      {/* AI Summary */}
      {aiSummary && (
        <div className="chat-ai-panel">
          <div className="ai-panel-header"><span>✦ AI Summary</span><button onClick={() => setAiSummary(null)}>✕</button></div>
          <div className="ai-panel-body">
            <p className="ai-summary-text">{aiSummary.summary}</p>
            <div className="ai-chips">
              {aiSummary.intent && <span className="ai-chip intent">🎯 {aiSummary.intent}</span>}
              {aiSummary.nextAction && <span className="ai-chip action">→ {aiSummary.nextAction}</span>}
              {aiSummary.sentiment && <span className="ai-chip sentiment" style={{ color: aiSummary.sentiment === 'positive' ? '#25d366' : aiSummary.sentiment === 'negative' ? '#ff6b6b' : '#aaa' }}>● {aiSummary.sentiment}</span>}
            </div>
          </div>
        </div>
      )}

      {/* AI WhatsApp Assistant results */}
      {(convSummaryLoading || convSummary) && (
        <div className="chat-ai-panel" style={{ padding: '12px 16px' }}>
          {convSummaryLoading && !convSummary ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#aebac1', fontSize: '0.8rem' }}>
              <span className="spinner" /> Generating conversation summary...
            </div>
          ) : (
            <ConversationSummaryCard
              summary={convSummary}
              onClose={() => setConvSummary(null)}
              onRegenerate={() => generateConversationSummary(true)}
              regenerating={convSummaryLoading}
              onShowHistory={() => setShowSummaryHistory(true)}
            />
          )}
        </div>
      )}

      {showSummaryHistory && (
        <AIHistoryDrawer
          referenceType="Lead"
          referenceId={leadId}
          type="ConversationSummary"
          onClose={() => setShowSummaryHistory(false)}
          onSelectVersion={(response) => { setConvSummary(response); setShowSummaryHistory(false); }}
        />
      )}

      {(suggestedReplyLoading || suggestedReply !== null) && (
        <div className="chat-ai-panel" style={{ padding: '12px 16px' }}>
          <SuggestedReplyCard
            reply={suggestedReply}
            loading={suggestedReplyLoading}
            onRegenerate={generateSuggestedReply}
            onUse={handleUseSuggestedReply}
            onClose={() => setSuggestedReply(null)}
          />
        </div>
      )}

      {(followUpLoading || followUp) && (
        <div className="chat-ai-panel" style={{ padding: '12px 16px' }}>
          {followUpLoading && !followUp ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#aebac1', fontSize: '0.8rem' }}>
              <span className="spinner" /> Generating follow-up suggestion...
            </div>
          ) : (
            <FollowUpCard
              followUp={followUp}
              leadId={leadId}
              onClose={() => setFollowUp(null)}
              onCreateReminder={handleCreateReminderFromFollowUp}
              creatingReminder={creatingReminder}
            />
          )}
        </div>
      )}

      {/* Quick Replies */}
      {quickReplies.length > 0 && (
        <div className="chat-qr-panel">
          <div className="qr-label">⚡ AI Quick Replies — click to use</div>
          <div className="qr-chips">
            {quickReplies.map((r, i) => (
              <button key={i} className="qr-chip" onClick={() => sendQuickReply(r)}>{r}</button>
            ))}
            <button className="qr-dismiss" onClick={() => setQuickReplies([])}>✕</button>
          </div>
        </div>
      )}

      {/* Scheduler */}
      {showScheduler && (
        <div className="chat-schedule-panel">
          <div className="schedule-panel-header"><span>⏱ Schedule Message</span><button onClick={() => setShowScheduler(false)}>✕</button></div>
          <textarea className="schedule-textarea" placeholder="Write your message..." value={scheduledMsg} onChange={(e) => setScheduledMsg(e.target.value)} rows={3} />
          <div className="schedule-row">
            <input type="datetime-local" className="schedule-datetime" value={scheduledAt} min={minDateTime} onChange={(e) => setScheduledAt(e.target.value)} />
            <button className="btn-send-schedule" onClick={sendScheduled}>Schedule ✓</button>
          </div>
          {pendingScheduled.length > 0 && (
            <div className="scheduled-pending">
              <div className="scheduled-pending-label">Pending ({pendingScheduled.length})</div>
              {pendingScheduled.map((m) => (
                <div key={m._id} className="scheduled-item">
                  <span className="scheduled-item-text">{m.body}</span>
                  <span className="scheduled-item-time">{new Date(m.scheduledAt).toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Messages */}
      <div className="chat-messages">
        {Object.keys(grouped).length === 0 ? (
          <div className="chat-empty">
            <div className="chat-empty-icon">💬</div>
            <p>No messages yet</p>
            <p className="chat-empty-sub">Send the first message to start the conversation</p>
          </div>
        ) : Object.entries(grouped).map(([date, msgs]) => (
          <div key={date}>
            <div className="chat-date-divider"><span>{date}</span></div>
            {msgs.map((msg) => (
              <div key={msg._id} className={`chat-bubble-wrap ${msg.direction === 'outbound' ? 'outbound' : 'inbound'}`}>
                <div className={`chat-bubble ${msg.direction === 'outbound' ? 'bubble-out' : 'bubble-in'} ${msg.temp ? 'temp' : ''}`}>
                  {msg.scheduledAt && (
                    <div className="bubble-scheduled-badge">⏱ Scheduled: {new Date(msg.scheduledAt).toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</div>
                  )}
                  <div className="bubble-text">{msg.body}</div>
                  <div className="bubble-meta">
                    <span className="bubble-time">{formatTime(msg.sentAt || msg.createdAt)}</span>
                    {msg.direction === 'outbound' && <StatusIcon status={msg.status} />}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form className="chat-input-row" onSubmit={sendMessage}>
        <input
          ref={inputRef}
          className="chat-input"
          placeholder="Type a message..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={sending}
          autoComplete="off"
        />
        <button type="submit" className={`chat-send-btn ${sending ? 'sending' : ''}`} disabled={!input.trim() || sending}>
          {sending ? '◌' : '▶'}
        </button>
      </form>
    </div>
  );
};

export default Chat;
