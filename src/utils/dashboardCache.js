// Dashboard data cache — sessionStorage with 2-minute TTL.
// Prevents re-fetching the same date-range data when switching between tabs.
// Automatically cleared when the owner triggers a manual sync (refreshTrigger).

const TTL = 2 * 60 * 1000; // 2 minutes
const PREFIX = 'pd_';

export const dashboardCache = {
  get(key) {
    try {
      const raw = sessionStorage.getItem(PREFIX + key);
      if (!raw) return null;
      const { d, t } = JSON.parse(raw);
      if (Date.now() - t > TTL) {
        sessionStorage.removeItem(PREFIX + key);
        return null;
      }
      return d;
    } catch {
      return null;
    }
  },

  set(key, data) {
    try {
      sessionStorage.setItem(PREFIX + key, JSON.stringify({ d: data, t: Date.now() }));
    } catch {
      // Silently ignore QuotaExceededError — degrade gracefully to no-cache
    }
  },

  // Bust all cached entries for a store (call after sync completes)
  bust(storeId) {
    try {
      const prefix = PREFIX + storeId + '_';
      Object.keys(sessionStorage)
        .filter(k => k.startsWith(prefix))
        .forEach(k => sessionStorage.removeItem(k));
    } catch {}
  },
};
