import React, { useState, useEffect } from 'react';
import { Search, Filter, ChevronDown, Eye, Edit2, Ban, Trash2,
         ArrowUpCircle, ArrowDownCircle, Gift, StickyNote, RefreshCw,
         ShoppingBag, Truck, AtSign, CheckCircle, XCircle, Store, X } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const MOCK_USERS = [
  { id: '1', store_name: 'BNB Toys', owner: 'Arpit Kumar', email: 'arpit@bnbtoys.in', phone: '+91 98765 43210', plan_type: 'pro', trial: false, created_at: '2024-08-14', last_synced_at: '2025-06-12T09:41:00Z', shopify_domain: 'bnb-toys.myshopify.com', shiprocket_connected: true, has_meta: true, order_count: 4231, shipment_count: 3890, is_active: true },
  { id: '2', store_name: 'Pure Origins Skincare', owner: 'Priya Sharma', email: 'priya@pureorigins.in', phone: '+91 87654 32109', plan_type: 'pro', trial: false, created_at: '2024-09-02', last_synced_at: '2025-06-12T08:20:00Z', shopify_domain: 'pure-origins.myshopify.com', shiprocket_connected: true, has_meta: true, order_count: 2187, shipment_count: 2011, is_active: true },
  { id: '3', store_name: 'Kashmiri Threads', owner: 'Mohit Wani', email: 'mohit@kashmirithreads.in', phone: '+91 76543 21098', plan_type: 'pro', trial: false, created_at: '2024-10-11', last_synced_at: '2025-06-11T14:30:00Z', shopify_domain: 'kashmiri-threads.myshopify.com', shiprocket_connected: false, has_meta: true, order_count: 1432, shipment_count: 0, is_active: true },
  { id: '4', store_name: 'Bamboo Living Co', owner: 'Ritesh Verma', email: 'ritesh@bambooliving.in', phone: '+91 65432 10987', plan_type: 'trial', trial: true, created_at: '2025-05-28', last_synced_at: '2025-06-12T07:10:00Z', shopify_domain: 'bamboo-living.myshopify.com', shiprocket_connected: false, has_meta: false, order_count: 342, shipment_count: 0, is_active: true },
  { id: '5', store_name: 'Royal Spice Garden', owner: 'Anjali Patel', email: 'anjali@royalspice.in', phone: '+91 54321 09876', plan_type: 'free', trial: false, created_at: '2025-01-15', last_synced_at: '2025-06-10T11:00:00Z', shopify_domain: 'royal-spice.myshopify.com', shiprocket_connected: false, has_meta: false, order_count: 189, shipment_count: 0, is_active: true },
  { id: '6', store_name: 'FitFlex Sports', owner: 'Karan Mehta', email: 'karan@fitflex.in', phone: '+91 43210 98765', plan_type: 'pro', trial: false, created_at: '2024-11-20', last_synced_at: '2025-06-12T06:45:00Z', shopify_domain: 'fitflex-sports.myshopify.com', shiprocket_connected: true, has_meta: true, order_count: 3102, shipment_count: 2876, is_active: true },
  { id: '7', store_name: 'Velvet Dreams Saree', owner: 'Meera Nair', email: 'meera@velvetdreams.in', phone: '+91 32109 87654', plan_type: 'trial', trial: true, created_at: '2025-06-01', last_synced_at: '2025-06-12T10:00:00Z', shopify_domain: 'velvet-dreams.myshopify.com', shiprocket_connected: false, has_meta: false, order_count: 98, shipment_count: 0, is_active: true },
  { id: '8', store_name: 'EcoWrap India', owner: 'Siddharth Joshi', email: 'sid@ecowrap.in', phone: '+91 21098 76543', plan_type: 'trial', trial: true, created_at: '2025-06-05', last_synced_at: '2025-06-11T22:00:00Z', shopify_domain: 'ecowrap-india.myshopify.com', shiprocket_connected: false, has_meta: false, order_count: 57, shipment_count: 0, is_active: true },
  { id: '9', store_name: 'Heritage Brass Works', owner: 'Deepak Agarwal', email: 'deepak@heritagebrass.in', phone: '+91 10987 65432', plan_type: 'free', trial: false, created_at: '2024-12-05', last_synced_at: '2025-06-08T09:00:00Z', shopify_domain: 'heritage-brass.myshopify.com', shiprocket_connected: false, has_meta: false, order_count: 442, shipment_count: 0, is_active: false },
  { id: '10', store_name: 'Himalayan Honey Co', owner: 'Vikram Thakur', email: 'vikram@himalayanHoney.in', phone: '+91 99887 66554', plan_type: 'pro', trial: false, created_at: '2024-10-30', last_synced_at: '2025-06-12T05:30:00Z', shopify_domain: 'himalayan-honey.myshopify.com', shiprocket_connected: true, has_meta: false, order_count: 1897, shipment_count: 1754, is_active: true },
  { id: '11', store_name: 'ZenCraft Wellness', owner: 'Pooja Singh', email: 'pooja@zencraft.in', phone: '+91 88776 55443', plan_type: 'trial', trial: true, created_at: '2025-05-22', last_synced_at: '2025-06-09T14:00:00Z', shopify_domain: 'zencraft-wellness.myshopify.com', shiprocket_connected: false, has_meta: false, order_count: 123, shipment_count: 0, is_active: true },
  { id: '12', store_name: 'Niyama Wild', owner: 'Isha Kapoor', email: 'isha@niyamawild.in', phone: '+91 77665 44332', plan_type: 'pro', trial: false, created_at: '2024-07-18', last_synced_at: '2025-06-12T11:00:00Z', shopify_domain: 'niyama-wild.myshopify.com', shiprocket_connected: true, has_meta: true, order_count: 5621, shipment_count: 5210, is_active: true },
];

const PLAN_COLORS = {
  pro:        { bg: 'rgba(99,102,241,0.12)', border: 'rgba(99,102,241,0.25)', text: '#a5b4fc' },
  trial:      { bg: 'rgba(245,158,11,0.1)',  border: 'rgba(245,158,11,0.22)',  text: '#fbbf24' },
  free:       { bg: 'rgba(255,255,255,0.06)',border: 'rgba(255,255,255,0.12)', text: 'rgba(226,232,240,0.5)' },
  enterprise: { bg: 'rgba(16,185,129,0.1)',  border: 'rgba(16,185,129,0.22)', text: '#34d399' },
};

function PlanBadge({ plan }) {
  const c = PLAN_COLORS[plan] || PLAN_COLORS.free;
  return (
    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 5,
      background: c.bg, border: `1px solid ${c.border}`, color: c.text,
      textTransform: 'uppercase', letterSpacing: '0.06em' }}>
      {plan}
    </span>
  );
}

function IntIcon({ connected, Icon, title }) {
  return (
    <div title={title} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 22, height: 22, borderRadius: 5,
      background: connected ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.04)',
    }}>
      <Icon size={11} color={connected ? '#10b981' : 'rgba(226,232,240,0.25)'} strokeWidth={connected ? 2.2 : 1.8} />
    </div>
  );
}

function timeAgo(iso) {
  if (!iso) return 'Never';
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) return 'Just now';
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h/24)}d ago`;
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
            <div style={{ fontSize: 12, color: 'rgba(226,232,240,0.4)', marginTop: 2 }}>User Profile</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(226,232,240,0.4)' }}>
            <X size={18} />
          </button>
        </div>
        <div style={{ padding: 20 }}>
          {[
            ['Owner', user.owner], ['Email', user.email], ['Phone', user.phone],
            ['Shopify Domain', user.shopify_domain || '—'],
            ['Plan', null],
            ['Member Since', new Date(user.created_at).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })],
            ['Last Active', timeAgo(user.last_synced_at)],
            ['Total Orders', user.order_count?.toLocaleString()],
            ['Shipments Tracked', user.shipment_count?.toLocaleString()],
          ].map(([label, value], i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <span style={{ fontSize: 12, color: 'rgba(226,232,240,0.45)' }}>{label}</span>
              {label === 'Plan' ? <PlanBadge plan={user.plan_type} /> : <span style={{ fontSize: 12, fontWeight: 600, color: '#e2e8f0' }}>{value}</span>}
            </div>
          ))}
        </div>
        <div style={{ padding: '12px 20px', background: 'rgba(255,255,255,0.02)', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {[
            { label: 'Grant Free Access', color: '#10b981' },
            { label: 'Extend Trial', color: '#f59e0b' },
            { label: 'Suspend', color: '#ef4444' },
          ].map(btn => (
            <button key={btn.label} onClick={onClose} style={{
              padding: '6px 12px', borderRadius: 7, border: `1px solid ${btn.color}30`,
              background: `${btn.color}10`, color: btn.color, fontSize: 12, fontWeight: 500, cursor: 'pointer',
            }}>{btn.label}</button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function AdminUsers({ session }) {
  const [users, setUsers] = useState(MOCK_USERS);
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);

  useEffect(() => {
    const token = session?.access_token;
    if (!token) { setLoading(false); return; }
    fetch(`${API_URL}/api/admin/stores`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.stores?.length) {
          const mapped = d.stores.map((s, i) => ({
            ...s,
            owner: s.store_name, // real owner name not available from stores table alone
            email: `owner@${s.shopify_domain?.replace('.myshopify.com', '') || 'store'}.in`,
            phone: '—',
            trial: s.plan_type === 'trial',
          }));
          setUsers(mapped.length > 0 ? mapped : MOCK_USERS);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [session]);

  const filtered = users.filter(u => {
    const q = search.toLowerCase();
    const matchSearch = !q || u.store_name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q) || u.owner?.toLowerCase().includes(q);
    const matchPlan = planFilter === 'all' || u.plan_type === planFilter;
    return matchSearch && matchPlan;
  });

  const stats = {
    total: users.length,
    pro: users.filter(u => u.plan_type === 'pro').length,
    trial: users.filter(u => u.plan_type === 'trial').length,
    free: users.filter(u => u.plan_type === 'free').length,
    active: users.filter(u => u.is_active !== false).length,
  };

  return (
    <div>
      {selectedUser && <UserModal user={selectedUser} onClose={() => setSelectedUser(null)} />}

      {/* Header */}
      <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#e2e8f0', letterSpacing: '-0.02em' }}>User Management</h1>
          <p style={{ margin: '3px 0 0', fontSize: 13, color: 'rgba(226,232,240,0.4)' }}>All registered stores and their owners</p>
        </div>
        {loading && <div style={{ fontSize: 12, color: 'rgba(226,232,240,0.3)', display: 'flex', alignItems: 'center', gap: 6 }}>
          <RefreshCw size={12} style={{ animation: 'spin 1s linear infinite' }} /> Syncing
        </div>}
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginBottom: 16 }}>
        {[
          { label: 'Total Users', value: stats.total, color: '#6366f1' },
          { label: 'Pro', value: stats.pro, color: '#8b5cf6' },
          { label: 'Trial', value: stats.trial, color: '#f59e0b' },
          { label: 'Free', value: stats.free, color: 'rgba(226,232,240,0.5)' },
          { label: 'Active', value: stats.active, color: '#10b981' },
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

      {/* Search & Filter */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <Search size={13} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'rgba(226,232,240,0.3)' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by store, email, owner..."
            style={{
              width: '100%', padding: '8px 12px 8px 32px', borderRadius: 8,
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
              color: '#e2e8f0', fontSize: 12, outline: 'none', boxSizing: 'border-box',
            }}
          />
        </div>
        {['all','pro','trial','free'].map(p => (
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
              {['Store / Owner', 'Plan', 'Integrations', 'Orders', 'Last Active', 'Actions'].map(h => (
                <th key={h} style={{ padding: '11px 14px', textAlign: 'left', fontSize: 10.5, fontWeight: 700, color: 'rgba(226,232,240,0.35)', textTransform: 'uppercase', letterSpacing: '0.07em', whiteSpace: 'nowrap' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((user, i) => (
              <tr key={user.id || i} className="admin-row" style={{
                borderBottom: '1px solid rgba(255,255,255,0.04)',
                transition: 'background 0.12s',
              }}>
                <td style={{ padding: '11px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: 7, flexShrink: 0,
                      background: `hsl(${(user.store_name?.charCodeAt(0) || 65) * 137 % 360},50%,25%)`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 11, fontWeight: 700, color: '#e2e8f0',
                    }}>
                      {user.store_name?.[0]?.toUpperCase() || '?'}
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0' }}>{user.store_name}</div>
                      <div style={{ fontSize: 11, color: 'rgba(226,232,240,0.38)' }}>{user.email}</div>
                    </div>
                  </div>
                </td>
                <td style={{ padding: '11px 14px' }}>
                  <PlanBadge plan={user.plan_type} />
                </td>
                <td style={{ padding: '11px 14px' }}>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <IntIcon connected={!!user.shopify_domain} Icon={ShoppingBag} title="Shopify" />
                    <IntIcon connected={user.shiprocket_connected} Icon={Truck} title="Shiprocket" />
                    <IntIcon connected={user.has_meta} Icon={AtSign} title="Meta" />
                  </div>
                </td>
                <td style={{ padding: '11px 14px', fontSize: 12, fontWeight: 600, color: '#e2e8f0' }}>
                  {(user.order_count || 0).toLocaleString()}
                </td>
                <td style={{ padding: '11px 14px', fontSize: 11, color: 'rgba(226,232,240,0.45)' }}>
                  {timeAgo(user.last_synced_at)}
                </td>
                <td style={{ padding: '11px 14px' }}>
                  <div style={{ display: 'flex', gap: 5 }}>
                    <button onClick={() => setSelectedUser(user)} title="View" className="admin-action-btn" style={{
                      background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 6,
                      padding: '5px 7px', cursor: 'pointer', color: 'rgba(226,232,240,0.5)', opacity: 0.7,
                    }}><Eye size={12} /></button>
                    <button title="Edit" className="admin-action-btn" style={{
                      background: 'rgba(99,102,241,0.1)', border: 'none', borderRadius: 6,
                      padding: '5px 7px', cursor: 'pointer', color: '#a5b4fc', opacity: 0.7,
                    }}><Edit2 size={12} /></button>
                    <button title="Suspend" className="admin-action-btn" style={{
                      background: 'rgba(239,68,68,0.08)', border: 'none', borderRadius: 6,
                      padding: '5px 7px', cursor: 'pointer', color: '#f87171', opacity: 0.7,
                    }}><Ban size={12} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div style={{ padding: '40px', textAlign: 'center', color: 'rgba(226,232,240,0.3)', fontSize: 13 }}>
            No users match your search
          </div>
        )}
      </div>
      <div style={{ marginTop: 10, fontSize: 11, color: 'rgba(226,232,240,0.3)' }}>
        Showing {filtered.length} of {users.length} users
      </div>
    </div>
  );
}
