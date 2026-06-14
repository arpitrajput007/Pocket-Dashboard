import React, { useState, useEffect } from 'react';
import { Search, RefreshCw, ShoppingBag, Truck, AtSign, X, ExternalLink } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const PLAN_COLORS = {
  pro:        { bg: 'rgba(99,102,241,0.12)',  border: 'rgba(99,102,241,0.25)',  text: '#a5b4fc' },
  trial:      { bg: 'rgba(245,158,11,0.1)',   border: 'rgba(245,158,11,0.22)',  text: '#fbbf24' },
  free:       { bg: 'rgba(255,255,255,0.06)', border: 'rgba(255,255,255,0.12)', text: 'rgba(226,232,240,0.5)' },
  starter:    { bg: 'rgba(59,130,246,0.1)',   border: 'rgba(59,130,246,0.22)',  text: '#60a5fa' },
  enterprise: { bg: 'rgba(16,185,129,0.1)',   border: 'rgba(16,185,129,0.22)', text: '#34d399' },
};

function PlanBadge({ plan }) {
  const c = PLAN_COLORS[plan] || PLAN_COLORS.free;
  return (
    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 5,
      background: c.bg, border: `1px solid ${c.border}`, color: c.text,
      textTransform: 'uppercase', letterSpacing: '0.06em' }}>
      {plan || 'free'}
    </span>
  );
}

function IntIcon({ connected, Icon, title }) {
  return (
    <div title={title} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 22, height: 22, borderRadius: 5,
      background: connected ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.04)' }}>
      <Icon size={11} color={connected ? '#10b981' : 'rgba(226,232,240,0.2)'} strokeWidth={connected ? 2.2 : 1.8} />
    </div>
  );
}

function timeAgo(iso) {
  if (!iso) return 'Never';
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) return 'Just now';
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function UserModal({ user, onClose }) {
  if (!user) return null;
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        width: 520, background: '#0e0e1e', border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 16, overflow: 'hidden',
      }}>
        <div style={{ padding: '18px 20px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#e2e8f0' }}>{user.store_name}</div>
            <div style={{ fontSize: 12, color: 'rgba(226,232,240,0.4)', marginTop: 2 }}>Store Details</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(226,232,240,0.4)' }}>
            <X size={18} />
          </button>
        </div>
        <div style={{ padding: 20 }}>
          {[
            ['Owner Email', user.owner_email || '—'],
            ['Shopify Domain', user.shopify_domain || 'Not connected'],
            ['Plan', null],
            ['Status', user.is_active ? '✅ Active' : '⛔ Inactive'],
            ['Member Since', user.created_at ? new Date(user.created_at).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' }) : '—'],
            ['Last Synced', timeAgo(user.last_synced_at)],
            ['Total Orders', (user.order_count ?? 0).toLocaleString()],
            ['Shipments Tracked', (user.shipment_count ?? 0).toLocaleString()],
            ['Shiprocket', user.shiprocket_connected ? '✅ Connected' : '—'],
            ['Meta Ads', user.has_meta ? '✅ Connected' : '—'],
          ].map(([label, value], i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <span style={{ fontSize: 12, color: 'rgba(226,232,240,0.45)' }}>{label}</span>
              {label === 'Plan'
                ? <PlanBadge plan={user.plan_type} />
                : <span style={{ fontSize: 12, fontWeight: 600, color: '#e2e8f0' }}>{value}</span>}
            </div>
          ))}
        </div>
        {user.shopify_domain && (
          <div style={{ padding: '12px 20px', background: 'rgba(255,255,255,0.02)', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <a
              href={`https://${user.shopify_domain}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 7, border: '1px solid rgba(16,185,129,0.3)', background: 'rgba(16,185,129,0.08)', color: '#10b981', fontSize: 12, fontWeight: 500, textDecoration: 'none' }}
            >
              <ExternalLink size={11} /> Open Shopify Store
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminUsers({ session }) {
  const [users, setUsers]       = useState([]);
  const [search, setSearch]     = useState('');
  const [planFilter, setPlanFilter] = useState('all');
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [lastRefresh, setLastRefresh]   = useState(null);

  const fetchUsers = () => {
    const token = session?.access_token;
    if (!token) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    fetch(`${API_URL}/api/admin/stores`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
      .then(d => {
        setUsers(d.stores || []);
        setLastRefresh(new Date());
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchUsers(); }, [session]);

  const filtered = users.filter(u => {
    const q = search.toLowerCase();
    const matchSearch = !q ||
      u.store_name?.toLowerCase().includes(q) ||
      u.owner_email?.toLowerCase().includes(q) ||
      u.shopify_domain?.toLowerCase().includes(q);
    const matchPlan = planFilter === 'all' || (u.plan_type || 'free') === planFilter;
    return matchSearch && matchPlan;
  });

  const stats = {
    total:  users.length,
    pro:    users.filter(u => u.plan_type === 'pro').length,
    trial:  users.filter(u => u.plan_type === 'trial').length,
    free:   users.filter(u => !u.plan_type || u.plan_type === 'free').length,
    active: users.filter(u => u.is_active !== false).length,
  };

  return (
    <div>
      {selectedUser && <UserModal user={selectedUser} onClose={() => setSelectedUser(null)} />}

      {/* Header */}
      <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#e2e8f0', letterSpacing: '-0.02em' }}>User Management</h1>
          <p style={{ margin: '3px 0 0', fontSize: 13, color: 'rgba(226,232,240,0.4)' }}>All registered stores — live data from Supabase</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {lastRefresh && !loading && (
            <span style={{ fontSize: 11, color: 'rgba(226,232,240,0.28)' }}>Updated just now</span>
          )}
          <button
            onClick={fetchUsers}
            disabled={loading}
            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 7, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', color: 'rgba(226,232,240,0.55)', fontSize: 12, cursor: 'pointer' }}
          >
            <RefreshCw size={11} style={loading ? { animation: 'spin 1s linear infinite' } : {}} />
            {loading ? 'Loading…' : 'Refresh'}
          </button>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginBottom: 16 }}>
        {[
          { label: 'Total Stores', value: stats.total,  color: '#6366f1' },
          { label: 'Pro',          value: stats.pro,    color: '#8b5cf6' },
          { label: 'Trial',        value: stats.trial,  color: '#f59e0b' },
          { label: 'Free',         value: stats.free,   color: 'rgba(226,232,240,0.5)' },
          { label: 'Active',       value: stats.active, color: '#10b981' },
        ].map(s => (
          <div key={s.label} className="admin-card" style={{
            padding: '12px 14px', borderRadius: 10,
            background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', transition: 'all 0.18s',
          }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: 11, color: 'rgba(226,232,240,0.4)', marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Error state */}
      {error && (
        <div style={{ padding: '12px 16px', borderRadius: 8, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#fca5a5', fontSize: 13, marginBottom: 14 }}>
          ⚠️ Failed to load stores: {error} —{' '}
          <button onClick={fetchUsers} style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', textDecoration: 'underline', fontSize: 13 }}>retry</button>
        </div>
      )}

      {/* Search & Filter */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <Search size={13} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'rgba(226,232,240,0.3)' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by store name, email, Shopify domain…"
            style={{
              width: '100%', padding: '8px 12px 8px 32px', borderRadius: 8,
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
              color: '#e2e8f0', fontSize: 12, outline: 'none', boxSizing: 'border-box',
            }}
          />
        </div>
        {['all', 'pro', 'trial', 'free'].map(p => (
          <button key={p} onClick={() => setPlanFilter(p)} style={{
            padding: '7px 14px', borderRadius: 7, fontSize: 12, cursor: 'pointer', fontWeight: 500,
            background: planFilter === p ? 'rgba(99,102,241,0.18)' : 'rgba(255,255,255,0.04)',
            border: `1px solid ${planFilter === p ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.08)'}`,
            color: planFilter === p ? '#a5b4fc' : 'rgba(226,232,240,0.5)',
          }}>{p === 'all' ? 'All Plans' : p.charAt(0).toUpperCase() + p.slice(1)}</button>
        ))}
      </div>

      {/* Table */}
      <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              {['Store', 'Owner Email', 'Plan', 'Integrations', 'Orders', 'Last Synced', 'Actions'].map(h => (
                <th key={h} style={{ padding: '11px 14px', textAlign: 'left', fontSize: 10.5, fontWeight: 700, color: 'rgba(226,232,240,0.35)', textTransform: 'uppercase', letterSpacing: '0.07em', whiteSpace: 'nowrap' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && users.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: 'rgba(226,232,240,0.3)', fontSize: 13 }}>
                  <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite', marginBottom: 8 }} /><br />
                  Loading stores…
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: 'rgba(226,232,240,0.3)', fontSize: 13 }}>
                  {users.length === 0 ? '🏪 No stores have signed up yet' : '🔍 No stores match your search'}
                </td>
              </tr>
            ) : (
              filtered.map((user, i) => (
                <tr key={user.id || i} className="admin-row" style={{
                  borderBottom: '1px solid rgba(255,255,255,0.04)',
                  transition: 'background 0.12s',
                }}>
                  {/* Store */}
                  <td style={{ padding: '11px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: 7, flexShrink: 0,
                        background: `hsl(${(user.store_name?.charCodeAt(0) || 65) * 137 % 360},50%,22%)`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 11, fontWeight: 700, color: '#e2e8f0',
                      }}>
                        {user.store_name?.[0]?.toUpperCase() || '?'}
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0' }}>{user.store_name || 'Unnamed Store'}</div>
                        {user.shopify_domain && (
                          <div style={{ fontSize: 10.5, color: 'rgba(226,232,240,0.32)' }}>{user.shopify_domain}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  {/* Email */}
                  <td style={{ padding: '11px 14px', fontSize: 12, color: 'rgba(226,232,240,0.55)', maxWidth: 180 }}>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                      {user.owner_email || '—'}
                    </span>
                  </td>
                  {/* Plan */}
                  <td style={{ padding: '11px 14px' }}>
                    <PlanBadge plan={user.plan_type} />
                  </td>
                  {/* Integrations */}
                  <td style={{ padding: '11px 14px' }}>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <IntIcon connected={!!user.shopify_domain}       Icon={ShoppingBag} title="Shopify" />
                      <IntIcon connected={!!user.shiprocket_connected} Icon={Truck}       title="Shiprocket" />
                      <IntIcon connected={!!user.has_meta}             Icon={AtSign}      title="Meta Ads" />
                    </div>
                  </td>
                  {/* Orders */}
                  <td style={{ padding: '11px 14px', fontSize: 13, fontWeight: 700, color: '#e2e8f0' }}>
                    {(user.order_count ?? 0).toLocaleString()}
                  </td>
                  {/* Last Synced */}
                  <td style={{ padding: '11px 14px', fontSize: 12, color: 'rgba(226,232,240,0.4)', whiteSpace: 'nowrap' }}>
                    {timeAgo(user.last_synced_at)}
                  </td>
                  {/* Actions */}
                  <td style={{ padding: '11px 14px' }}>
                    <button
                      onClick={() => setSelectedUser(user)}
                      style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', color: 'rgba(226,232,240,0.55)', fontSize: 11, cursor: 'pointer' }}
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
