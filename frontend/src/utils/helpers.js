export const formatDate = (date) => {
  if (!date) return null;
  return new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

export const formatDateTime = (date) => {
  if (!date) return null;
  return new Date(date).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

export const getStatusClass = (status) => {
  const map = {
    'New': 'badge-new',
    'Contacted': 'badge-contacted',
    'In Progress': 'badge-in-progress',
    'Converted': 'badge-converted',
    'Lost': 'badge-lost',
  };
  return map[status] || 'badge';
};

export const getMeetingStatusClass = (status) => {
  const map = {
    'Scheduled': 'badge-meeting-scheduled',
    'Completed': 'badge-meeting-completed',
    'Cancelled': 'badge-meeting-cancelled',
    'Rescheduled': 'badge-meeting-rescheduled',
    'No Show': 'badge-meeting-no-show',
  };
  return map[status] || 'badge';
};

export const getKnowledgeStatusClass = (status) => {
  const map = {
    'Draft': 'badge-kb-draft',
    'Published': 'badge-kb-published',
    'Archived': 'badge-kb-archived',
  };
  return map[status] || 'badge';
};

export const getTemperatureClass = (temperature) => {
  const map = { Hot: 'badge-temp-hot', Warm: 'badge-temp-warm', Cold: 'badge-temp-cold' };
  return map[temperature] || 'badge';
};

export const getSentimentClass = (sentiment) => {
  const map = { Positive: 'badge-sentiment-positive', Neutral: 'badge-sentiment-neutral', Negative: 'badge-sentiment-negative' };
  return map[sentiment] || 'badge';
};

export const getPriorityClass = (priority) => {
  const map = {
    Critical: 'badge-priority-critical',
    High: 'badge-priority-high',
    Medium: 'badge-priority-medium',
    Low: 'badge-priority-low',
  };
  return map[priority] || 'badge';
};

export const getLeadScoreColor = (score) => {
  if (score >= 70) return 'var(--green)';
  if (score >= 40) return 'var(--yellow)';
  return 'var(--red)';
};
