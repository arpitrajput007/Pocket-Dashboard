import React, { useState } from 'react';
import { Bell, UserPlus, AlertTriangle, CreditCard, Ticket, Inbox, Zap, Check, CheckCheck, Filter } from 'lucide-react';

const NOTIF_TYPES = {
  signup:     { icon: UserPlus,      color: '#10b981', label: 'New Signup' },
  trial_exp:  { icon: AlertTriangle, color: '#f59e0b', label: 'Trial Expiring' },
  payment:    { icon: CreditCard,    color: '#ef4444', label: 'Payment Issue' },
  support:    { icon: Ticket,        color: '#6366f1', label: 'Support Ticket' },
  request:    { icon: Inbox,         color: '#8b5cf6', label: 'Custom Request' },
  api_error:  { icon: Zap,           color: '#f87171', label: 'API Error' },
};

const NOTIFICATIONS = [
  { id: 1, type: 'signup',     title: 'New signup: PureLeaf Organics', body: 'Ananya Rathi just signed up for a trial. Store: pureleaf-organics.myshopify.com', time: '2 min ago', read: false },
  { id: 2, type: 'api_error',  title: 'Shopify sync failed: Heritage Brass', body: 'Invalid access token (401). Store credentials may have expired and need re-authentication.', time: '8 min ago', read: false },
  { id: 3, type: 'support',    title: 'New ticket #TKT-0041', body: 'BNB Toys — "Shopify sync not working after token refresh". Priority: High', time: '18 min ago', read: false },
  { id: 4, type: 'trial_exp',  title: 'Trial expiring soon: ZenCraft Wellness', body: 'Trial expires in 2 days. User has not connected Shopify. High churn risk.', time: '42 min ago', read: false },
  { id: 5, type: 'request',    title: 'New custom request: Mamaearth', body: 'Enterprise dashboard inquiry from Ghazal Alagh. 1,00,000+ orders/mo. Follow up immediately.', time: '1 hr ago', read: false },
  { id: 6, type: 'payment',    title: 'Payment failed: Pro plan renewal', body: 'Kashmiri Threads — card declined on auto-renewal. Grace period: 3 days.', time: '2 hr ago', read: true },
  { id: 7, type: 'signup',     title: 'New signup: Artisan Spice Lab', body: 'Kavya Sharma joined on trial plan.', time: '3 hr ago', read: true },
  { id: 8, type: 'support',    title: 'Ticket resolved: #TKT-0035', body: 'Bamboo Living Co — Shiprocket setup guide resolved automatically.', time: '5 hr ago', read: true },
  { id: 9, type: 'trial_exp',  title: 'Trial converted: Sacred Seeds → Pro', body: 'Rahul Mishra upgraded from trial to Pro plan. MRR +₹1,499.', time: '6 hr ago', read: true },
  { id: 10, type: 'api_error', title: 'Shiprocket token refresh failed', body: 'Artisan Spice Lab — login credentials may have changed. Sync paused.', time: '8 hr ago', read: true },
  { id: 11, type: 'signup',    title: 'New signup: Velvet Dreams Saree', body: 'Meera Nair signed up from Google Ads campaign.', time: '1 day ago', read: true },
  { id: 12, type: 'payment',   title: 'Subscription renewed: FitFlex Sports', body: 'Pro plan auto-renewed successfully. MRR stable.', time: '1 day ago', read: true },
];

export default function AdminNotifications() {
  const [filter, setFilter] = useState('all');
  const [items, setItems] = useState(NOTIFICATIONS);

  const unread = items.filter(n => !n.read).length;

  const markAllRead = () => setItems(prev => prev.map(n => ({ ...n, read: true })));
  const markRead = (id) => setItems(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));

  const filtered = filter === 'all' ? items : filter === 'unread' ? items.filter(n => !n.read) : items.filter(n => n.type === filter);

  return (
    <div>
      <div style={{ marginBottom: 22, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#e2e8f0', letterSpacing: '-0.02em' }}>Notifications</h1>
          <p style={{ margin: '3px 0 0', fontSize: 13, color: 'rgba(226,232,240,0.4)' }}>Platform events, alerts, and activity feed</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {unread > 0 && (
            <div style={{ padding: '4px 10px', borderRadius: 20, background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)', fontSize: 12, fontWeight: 700, color: '#f87171' }}>
              {unread} unread
            </div>
          )}
          <button onClick={markAllRead} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(226,232,240,0.55)', fontSize: 12, cursor: 'pointer' }}>
            <CheckCheck size={12} /> Mark all read
          </button>
        </div>
      </div>

      {/* Type summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8, marginBottom: 16 }}>
        {Object.entries(NOTIF_TYPES).map(([type, cfg]) => {
          const count = items.filter(n => n.type === type).length;
          const unreadCount = items.filter(n => n.type === type && !n.read).length;
          return (
            <div key={type} className="admin-card" onClick={() => setFilter(filter === type ? 'all' : type)} style={{
              padding: '10px 12px', borderRadius: 10, cursor: 'pointer', transition: 'all 0.18s',
              background: filter === type ? `${cfg.color}15` : 'rgba(255,255,255,0.025)',
              border: `1px solid ${filter === type ? cfg.color + '35' : 'rgba(255,255,255,0.07)'}`,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <cfg.icon size={13} color={cfg.color} />
                {unreadCount > 0 && <span style={{ fontSize: 9.5, fontWeight: 700, padding: '0 4px', borderRadius: 4, background: `${cfg.color}25`, color: cfg.color }}>{unreadCount}</span>}
              </div>
              <div style={{ fontSize: 15, fontWeight: 800, color: filter === type ? cfg.color : '#e2e8f0' }}>{count}</div>
              <div style={{ fontSize: 10, color: 'rgba(226,232,240,0.38)', marginTop: 2 }}>{cfg.label}</div>
            </div>
          );
        })}
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        {['all', 'unread'].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding: '6px 12px', borderRadius: 7, fontSize: 12, cursor: 'pointer', fontWeight: 500,
            background: filter === f ? 'rgba(99,102,241,0.18)' : 'rgba(255,255,255,0.04)',
            border: `1px solid ${filter === f ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.08)'}`,
            color: filter === f ? '#a5b4fc' : 'rgba(226,232,240,0.45)',
          }}>{f === 'all' ? 'All' : 'Unread only'}</button>
        ))}
      </div>

      {/* Notification list */}
      <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, overflow: 'hidden' }}>
        {filtered.length === 0 && (
          <div style={{ padding: 40, textAlign: 'center', color: 'rgba(226,232,240,0.3)', fontSize: 13 }}>No notifications</div>
        )}
        {filtered.map((notif, i) => {
          const cfg = NOTIF_TYPES[notif.type];
          return (
            <div key={notif.id} className="admin-row" onClick={() => markRead(notif.id)} style={{
              display: 'flex', gap: 12, padding: '14px 18px',
              borderBottom: i < filtered.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
              cursor: 'pointer', transition: 'background 0.12s',
              background: notif.read ? 'transparent' : 'rgba(99,102,241,0.04)',
              borderLeft: notif.read ? 'none' : `2px solid ${cfg.color}60`,
            }}>
              <div style={{ width: 32, height: 32, borderRadius: 9, background: `${cfg.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                <cfg.icon size={14} color={cfg.color} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                  <div style={{ fontSize: 13, fontWeight: notif.read ? 500 : 700, color: '#e2e8f0', lineHeight: 1.4 }}>{notif.title}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                    {!notif.read && <div style={{ width: 5, height: 5, borderRadius: '50%', background: cfg.color }} />}
                    <span style={{ fontSize: 10.5, color: 'rgba(226,232,240,0.3)', whiteSpace: 'nowrap' }}>{notif.time}</span>
                  </div>
                </div>
                <div style={{ fontSize: 12, color: 'rgba(226,232,240,0.45)', marginTop: 3, lineHeight: 1.5 }}>{notif.body}</div>
                <div style={{ marginTop: 5 }}>
                  <span style={{ fontSize: 9.5, padding: '1px 6px', borderRadius: 4, background: `${cfg.color}15`, color: cfg.color, fontWeight: 600 }}>{cfg.label}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
