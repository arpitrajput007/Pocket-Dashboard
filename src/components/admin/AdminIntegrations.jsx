import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, AlertTriangle, RefreshCw, Plug, ShoppingBag, Truck, AtSign, CreditCard } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const MOCK_HEALTH = {
  shopify:     { connected: 67, total: 83, failedSyncs: 2,  apiErrors: 4,  lastSync: '4 min ago',  status: 'healthy',   uptime: 99.7 },
  shiprocket:  { connected: 31, total: 83, failedSyncs: 1,  apiErrors: 1,  lastSync: '18 min ago', status: 'healthy',   uptime: 99.1 },
  meta:        { connected: 23, total: 83, failedSyncs: 0,  apiErrors: 0,  lastSync: '—',          status: 'manual',    uptime: 100 },
  payment:     { connected: 42, total: 42, failedSyncs: 0,  apiErrors: 0,  lastSync: '2 min ago',  status: 'healthy',   uptime: 100 },
};

const API_ERRORS = [
  { store: 'BNB Toys', integration: 'Shopify', error: 'Rate limit exceeded (429) — retry in 2s', time: '8 min ago', resolved: true },
  { store: 'Heritage Brass Works', integration: 'Shopify', error: 'Invalid access token — credentials may have expired', time: '1 hr ago', resolved: false },
  { store: 'Artisan Spice Lab', integration: 'Shiprocket', error: 'Token refresh failed — login credentials may have changed', time: '3 hr ago', resolved: false },
  { store: 'ZenCraft Wellness', integration: 'Shopify', error: 'Shop not found (404) — domain may have changed', time: '6 hr ago', resolved: true },
];

const SYNC_LOG = [
  { store: 'Niyama Wild', type: 'Shopify', orders: 47, duration: '12s', status: 'success', time: '4 min ago' },
  { store: 'FitFlex Sports', type: 'Shiprocket', shipments: 23, duration: '8s', status: 'success', time: '18 min ago' },
  { store: 'Pure Origins', type: 'Shopify', orders: 12, duration: '5s', status: 'success', time: '34 min ago' },
  { store: 'BNB Toys', type: 'Shopify', orders: 0, duration: '—', status: 'error', time: '42 min ago' },
  { store: 'Himalayan Honey', type: 'Shiprocket', shipments: 8, duration: '4s', status: 'success', time: '1 hr ago' },
];

function HealthCard({ name, icon: Icon, data, color }) {
  const pct = Math.round((data.connected / data.total) * 100);
  const statusColors = { healthy: '#10b981', warning: '#f59e0b', error: '#ef4444', manual: '#3b82f6' };
  const sc = statusColors[data.status];
  return (
    <div className="admin-card" style={{
      padding: '18px 20px', borderRadius: 14,
      background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)',
      transition: 'all 0.18s', position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: color, opacity: 0.7 }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <div style={{ width: 32, height: 32, borderRadius: 9, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon size={14} color={color} />
          </div>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f0' }}>{name}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '3px 8px', borderRadius: 6, background: `${sc}12`, border: `1px solid ${sc}25` }}>
          {data.status === 'healthy' ? <CheckCircle size={10} color={sc} /> : data.status === 'error' ? <XCircle size={10} color={sc} /> : <AlertTriangle size={10} color={sc} />}
          <span style={{ fontSize: 10, fontWeight: 600, color: sc, textTransform: 'capitalize' }}>{data.status}</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#e2e8f0', letterSpacing: '-0.02em' }}>{data.connected}</div>
          <div style={{ fontSize: 10, color: 'rgba(226,232,240,0.38)', marginTop: 2 }}>Connected / {data.total}</div>
        </div>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#10b981' }}>{data.uptime}%</div>
          <div style={{ fontSize: 10, color: 'rgba(226,232,240,0.38)', marginTop: 2 }}>Uptime</div>
        </div>
      </div>

      <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 4, overflow: 'hidden', marginBottom: 12 }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 4, transition: 'width 0.6s ease' }} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
        {[
          { label: 'Failed Syncs', value: data.failedSyncs, color: data.failedSyncs > 0 ? '#f59e0b' : '#10b981' },
          { label: 'API Errors', value: data.apiErrors, color: data.apiErrors > 0 ? '#ef4444' : '#10b981' },
          { label: 'Last Sync', value: data.lastSync, color: 'rgba(226,232,240,0.45)' },
        ].map(s => (
          <div key={s.label}>
            <div style={{ fontSize: 12, fontWeight: 700, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 9.5, color: 'rgba(226,232,240,0.3)', marginTop: 1 }}>{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AdminIntegrations({ session }) {
  const [health, setHealth] = useState(MOCK_HEALTH);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = session?.access_token;
    if (!token) { setLoading(false); return; }
    fetch(`${API_URL}/api/admin/overview`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d) {
          setHealth(prev => ({
            ...prev,
            shopify:    { ...prev.shopify,    connected: d.shopifyConnected ?? prev.shopify.connected,    total: d.totalStores ?? prev.shopify.total },
            shiprocket: { ...prev.shiprocket, connected: d.shiprocketConnected ?? prev.shiprocket.connected, total: d.totalStores ?? prev.shiprocket.total },
            meta:       { ...prev.meta,       connected: d.metaConnected ?? prev.meta.connected,           total: d.totalStores ?? prev.meta.total },
          }));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [session]);

  const integrations = [
    { name: 'Shopify',     key: 'shopify',    icon: ShoppingBag, color: '#10b981' },
    { name: 'Shiprocket',  key: 'shiprocket', icon: Truck,       color: '#6366f1' },
    { name: 'Meta Ads',    key: 'meta',       icon: AtSign,      color: '#ec4899' },
    { name: 'Payments',    key: 'payment',    icon: CreditCard,  color: '#f59e0b' },
  ];

  const systemScore = Math.round(
    (health.shopify.uptime * 0.4 + health.shiprocket.uptime * 0.3 + health.meta.uptime * 0.15 + health.payment.uptime * 0.15)
  );

  return (
    <div>
      <div style={{ marginBottom: 22, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#e2e8f0', letterSpacing: '-0.02em' }}>Integration Health</h1>
          <p style={{ margin: '3px 0 0', fontSize: 13, color: 'rgba(226,232,240,0.4)' }}>Real-time status of all platform integrations</p>
        </div>
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2,
          padding: '10px 16px', borderRadius: 12,
          background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)',
        }}>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#10b981' }}>{systemScore}%</div>
          <div style={{ fontSize: 11, color: 'rgba(226,232,240,0.4)' }}>System Health Score</div>
        </div>
      </div>

      {/* Integration cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }}>
        {integrations.map(int => (
          <HealthCard key={int.key} name={int.name} icon={int.icon} data={health[int.key]} color={int.color} />
        ))}
      </div>

      {/* Error Log + Sync Log */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        {/* API Errors */}
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0' }}>API Error Log</span>
            <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 5, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171', fontWeight: 600 }}>
              {API_ERRORS.filter(e => !e.resolved).length} unresolved
            </span>
          </div>
          {API_ERRORS.map((err, i) => (
            <div key={i} className="admin-row" style={{
              padding: '12px 18px', borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background 0.12s',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  {err.resolved ? <CheckCircle size={12} color="#10b981" /> : <XCircle size={12} color="#ef4444" />}
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#e2e8f0' }}>{err.store}</span>
                  <span style={{ fontSize: 10, padding: '1px 5px', borderRadius: 4, background: 'rgba(99,102,241,0.1)', color: '#a5b4fc' }}>{err.integration}</span>
                </div>
                <span style={{ fontSize: 10.5, color: 'rgba(226,232,240,0.3)' }}>{err.time}</span>
              </div>
              <div style={{ fontSize: 11, color: err.resolved ? 'rgba(226,232,240,0.38)' : '#fca5a5', paddingLeft: 19 }}>{err.error}</div>
            </div>
          ))}
        </div>

        {/* Recent Syncs */}
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0' }}>Recent Sync Activity</span>
          </div>
          {SYNC_LOG.map((log, i) => (
            <div key={i} className="admin-row" style={{
              padding: '12px 18px', borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background 0.12s',
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              {log.status === 'success' ? <CheckCircle size={13} color="#10b981" /> : <XCircle size={13} color="#ef4444" />}
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#e2e8f0' }}>{log.store}</div>
                <div style={{ fontSize: 11, color: 'rgba(226,232,240,0.38)' }}>
                  {log.type} · {log.orders !== undefined ? `${log.orders} orders` : `${log.shipments} shipments`} · {log.duration}
                </div>
              </div>
              <span style={{ fontSize: 10.5, color: 'rgba(226,232,240,0.3)', whiteSpace: 'nowrap' }}>{log.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
