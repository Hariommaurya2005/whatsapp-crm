// Simple in-process cache for AI context data (Lead/Meeting/Knowledge fetches).
// Not shared across server instances — acceptable for this app's single-process
// deployment. Lazy expiration: entries are checked on read, no background sweep.

const store = new Map(); // key -> { value, expiresAt }
const TTL_MS = 5 * 60 * 1000; // 5 minutes

const isExpired = (entry) => !entry || Date.now() > entry.expiresAt;

const getCache = (key) => {
  const entry = store.get(key);
  if (isExpired(entry)) {
    if (entry) store.delete(key);
    return undefined;
  }
  return entry.value;
};

const setCache = (key, value) => {
  store.set(key, { value, expiresAt: Date.now() + TTL_MS });
};

const invalidate = (key) => store.delete(key);

const invalidatePrefix = (prefix) => {
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) store.delete(key);
  }
};

/**
 * Reusable memoization helper: returns the cached value for `key` if still
 * fresh, otherwise calls `fetchFn`, caches the result, and returns it.
 * Pass `bypass: true` (e.g. on Regenerate) to force a fresh fetch and
 * refresh the cache entry — guarantees no stale data is ever returned
 * on an explicit regeneration request.
 */
const getOrSet = async (key, fetchFn, { bypass = false } = {}) => {
  if (!bypass) {
    const cached = getCache(key);
    if (cached !== undefined) return cached;
  }
  const value = await fetchFn();
  setCache(key, value);
  return value;
};

// Domain-scoped invalidation — called from mutation endpoints elsewhere in
// the app so cached AI context can never go stale after an update.
const invalidateLeadContext = (leadId) => {
  invalidatePrefix(`conversation:${leadId}`);
  invalidatePrefix(`meetingHistory:${leadId}`);
  invalidatePrefix(`reminderHistory:${leadId}`);
};

const invalidateMeetingContext = (meetingId) => {
  invalidate(`meetingDoc:${meetingId}`);
};

const invalidateKnowledgeContext = () => {
  invalidate('knowledge:global');
};

module.exports = {
  TTL_MS,
  getCache,
  setCache,
  invalidate,
  invalidatePrefix,
  getOrSet,
  invalidateLeadContext,
  invalidateMeetingContext,
  invalidateKnowledgeContext,
};
