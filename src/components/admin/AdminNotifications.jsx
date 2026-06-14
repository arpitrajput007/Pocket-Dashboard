import React, { useState, useEffect } from 'react';
import { Bell, UserPlus, RefreshCw, CheckCheck, Store } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

function timeAgo(iso) {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export default function AdminNotifications({ session }) {
  const [stores, setStores]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [readIds, setReadIds]   = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem('admin_read_notifs') || '[]')); }
    catch { return new Set(); }
  });

  const fetchData = () => {
    const token = session?.access_token;
    if (!token) { setLoading(false); return; }
    setLoading(true);
    fetch(`${API_URL}/api/admin/stores`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
      .then(d => setStores(d.stores || []))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, [session]);

  // Build notifications from real store data — newest first
  const notifications = [...stores]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .map(s => ({
      id: s.id,
      type: 'signup',
      title: `New store signup: ${s.store_name || 'Unnamed Store'}`,
      body: [
        s.owner_email && s.owner_email !== '—' ? `Owner: ${s.owner_email}` : null,
        s.shopify_domain ? `Shopify: ${s.shopify_domain}` : 'Shopify not connected yet',
        `Plan: ${(s.plan_type || 'free').toUpperCase()}`,
      ].filter(Boolean).join(' · '),
      time: s.created_at,
      plan: s.plan_type || 'free',
      read: readIds.has(s.id),
    }));

  const unread = notifications.filter(n => !n.read).length;

  const markRead = (id) => {
    setReadIds(prev => {
      const next = new Set(prev);
      next.add(id);
      try { localStorage.setItem('admin_read_notifs', JSON.stringify([...next])); } catch {}
      return next;
    });
  };

  const markAllRead = () => {
    const allIds = notifications.map(n => n.id);
    setReadIds(prev => {
      const next = new Set([...prev, ...allIds]);
      try { localStorage.setItem('admin_read_notifs', JSON.stringify([...next])); } catch {}
      return next;
    });
  };

  const planColors = { pro: '#a5b4fc', trial: '#fbbf24', free: 'rgba(226,232,240,0.4)', starter: '#60a5fa', enterprise: '#34d399' };

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 22, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#e2e8f0', letterSpacing: '-0.02em' }}>Notifications</h1>
          <p style={{ margin: '3px 0 0', fontSize: 13, color: 'rgba(226,232,240,0.4)' }}>
            Real store signups — live from your database
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {unread > 0 && (
            <div style={{ padding: '4px 10px', borderRadius: 20, background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)', fontSize: 12, fontWeight: 700, color: '#10b981' }}>
              {unread} new
            </div>
          )}
          <button onClick={markAllRead} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(226,232,240,0.55)', fontSize: 12, cursor: 'pointer' }}>
            <CheckCheck size={12} /> Mark all read
          </button>
          <button onClick={fetchData} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(226,232,240,0.55)', fontSize: 12, cursor: 'pointer' }}>
            <RefreshCw size={11} style={loading ? { animation: 'spin 1s linear infinite' } : {}} />
            {loading ? 'Loading…' : 'Refresh'}
          </button>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>

      {/* Summary strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
        {[
          { label: 'Total Signups',  value: notifications.length, color: '#6366f1', icon: Store },
          { label: 'New (Unread)',   value: unread,               color: '#10b981', icon: Bell },
          { label: 'This Month',     value: notifications.filter(n => new Date(n.time) > new Date(Date.now() - 30*24*3600*1000)).length, color: '#f59e0b', icon: UserPlus },
          { label: 'Today',         value: notifications.filter(n => new Date(n.time).toDateString() === new Date().toDateString()).length, color: '#ec4899', icon: UserPlus },
        ].map(s => (
          <div key={s.label} className="admin-card" style={{ padding: '12px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', transition: 'all 0.18s' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6 }}>
              <s.icon size={12} color={s.color} />
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: 11, color: 'rgba(226,232,240,0.4)', marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div style={{ padding: '12px 16px', borderRadius: 8, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#fca5a5', fontSize: 13, marginBottom: 14 }}>
          ⚠️ {error} — <button onClick={fetchData} style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', textDecoration: 'underline', fontSize: 13 }}>retry</button>
        </div>
      )}

      {/* Notification list */}
      <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, overflow: 'hidden' }}>
        {loading && notifications.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'rgba(226,232,240,0.3)', fontSize: 13 }}>
            <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite', marginBottom: 8 }} /><br />Loading…
          </div>
        ) : notifications.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'rgba(226,232,240,0.3)', fontSize: 13 }}>
            🏪 No store signups yet — share your app link to get your first users!
          </div>
        ) : (
          notifications.map((notif, i) => (
            <div
              key={notif.id}
              className="admin-row"
              onClick={() => markRead(notif.id)}
              style={{
                display: 'flex', gap: 12, padding: '14px 18px',
                borderBottom: i < notifications.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                cursor: 'pointer', transition: 'background 0.12s',
                background: notif.read ? 'transparent' : 'rgba(16,185,129,0.04)',
                borderLeft: notif.read ? '2px solid transparent' : '2px solid rgba(16,185,129,0.5)',
              }}
            >
              {/* Icon */}
              <div style={{ width: 32, height: 32, borderRadius: 9, background: 'rgba(16,185,129,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                <UserPlus size={14} color="#10b981" />
              </div>

              {/* Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                  <div style={{ fontSize: 13, fontWeight: notif.read ? 500 : 700, color: '#e2e8f0', lineHeight: 1.4 }}>
                    {notif.title}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                    {!notif.read && <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#10b981' }} />}
                    <span style={{ fontSize: 10.5, color: 'rgba(226,232,240,0.3)', whiteSpace: 'nowrap' }}>{timeAgo(notif.time)}</span>
                  </div>
                </div>
                <div style={{ fontSize: 12, color: 'rgba(226,232,240,0.45)', marginTop: 3, lineHeight: 1.5 }}>{notif.body}</div>
                <div style={{ marginTop: 5 }}>
                  <span style={{
                    fontSize: 9.5, padding: '1px 6px', borderRadius: 4, fontWeight: 600,
                    background: `${planColors[notif.plan] || '#fff'}18`,
                    color: planColors[notif.plan] || 'rgba(226,232,240,0.4)',
                    textTransform: 'uppercase', letterSpacing: '0.04em',
                  }}>{notif.plan}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Gmail setup callout */}
      <div style={{ marginTop: 16, padding: '14px 16px', borderRadius: 10, background: 'rgba(99,102,241,0.06)', border: '1px dashed rgba(99,102,241,0.2)' }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#a5b4fc', marginBottom: 4 }}>📬 Gmail Alerts Active?</div>
        <div style={{ fontSize: 12, color: 'rgba(226,232,240,0.45)', lineHeight: 1.6 }}>
          Every new store signup automatically triggers an email to your Gmail — if you've set up <code style={{ background: 'rgba(255,255,255,0.06)', padding: '1px 5px', borderRadius: 4 }}>GMAIL_USER</code>, <code style={{ background: 'rgba(255,255,255,0.06)', padding: '1px 5px', borderRadius: 4 }}>GMAIL_APP_PASSWORD</code>, and <code style={{ background: 'rgba(255,255,255,0.06)', padding: '1px 5px', borderRadius: 4 }}>ADMIN_NOTIFY_EMAIL</code> in Render, and configured the Supabase Database Webhook.
        </div>
      </div>
    </div>
  );
}
