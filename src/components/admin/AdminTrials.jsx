import React, { useState, useEffect } from 'react';
import { Timer, RefreshCw, ShoppingBag, Truck, AtSign } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

function timeAgo(iso) {
  if (!iso) return 'Never';
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) return 'Just now';
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function IntDot({ on }) {
  return <div style={{ width: 7, height: 7, borderRadius: '50%', background: on ? '#10b981' : 'rgba(255,255,255,0.12)' }} />;
}

export default function AdminTrials({ session }) {
  const [stores, setStores]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  const load = () => {
    const token = session?.access_token;
    if (!token) { setLoading(false); return; }
    setLoading(true); setError(null);
    fetch(`${API_URL}/api/admin/stores`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
      .then(d => setStores((d.stores || []).filter(s => s.plan_type === 'trial')))
      .catch(e => setError(e.message)).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, [session]);

  const withShopify    = stores.filter(s => s.shopify_domain).length;
  const withShiprocket = stores.filter(s => s.shiprocket_connected).length;
  const synced24h      = stores.filter(s => s.last_synced_at && Date.now() - new Date(s.last_synced_at) < 86400000).length;

  return (
    <div>
      <div style={{ marginBottom: 22, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#e2e8f0', letterSpacing: '-0.02em' }}>Trial Users</h1>
          <p style={{ margin: '3px 0 0', fontSize: 13, color: 'rgba(226,232,240,0.4)' }}>All stores on trial plan — real data</p>
        </div>
        <button onClick={load} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 7, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: 'rgba(226,232,240,0.55)', fontSize: 12, cursor: 'pointer' }}>
          <RefreshCw size={11} style={loading ? { animation: 'spin 1s linear infinite' } : {}} />{loading ? 'Loading…' : 'Refresh'}
        </button>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
      {error && <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#fca5a5', fontSize: 12, marginBottom: 16 }}>⚠️ {error}</div>}

      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Total Trial Stores', value: stores.length, color: '#f59e0b' },
          { label: 'Shopify Connected',  value: withShopify,   color: '#10b981' },
          { label: 'Shiprocket Connected', value: withShiprocket, color: '#6366f1' },
          { label: 'Active Last 24h',    value: synced24h,     color: '#3b82f6' },
        ].map((s, i) => (
          <div key={i} className="admin-card" style={{ padding: '16px 18px', borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', position: 'relative', overflow: 'hidden', transition: 'all 0.18s' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: s.color, opacity: 0.7 }} />
            <Timer size={13} color={s.color} style={{ marginBottom: 8 }} />
            <div style={{ fontSize: 22, fontWeight: 800, color: '#e2e8f0', letterSpacing: '-0.02em' }}>{s.value}</div>
            <div style={{ fontSize: 12, color: 'rgba(226,232,240,0.5)', marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Trial expiry note */}
      <div style={{ padding: '12px 16px', borderRadius: 8, background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.18)', fontSize: 12, color: 'rgba(226,232,240,0.5)', marginBottom: 16 }}>
        💡 <strong style={{ color: 'rgba(226,232,240,0.7)' }}>Trial expiry dates</strong> are not tracked yet — add a <code style={{ background: 'rgba(255,255,255,0.07)', padding: '1px 4px', borderRadius: 3 }}>trial_ends_at</code> column to the stores table to enable countdown tracking.
      </div>

      {/* Table */}
      <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 12, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              {['Store', 'Owner Email', 'Shopify', 'Shiprocket', 'Meta', 'Orders', 'Last Active'].map(h => (
                <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 10.5, fontWeight: 700, color: 'rgba(226,232,240,0.35)', textTransform: 'uppercase', letterSpacing: '0.07em', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && stores.length === 0 ? (
              <tr><td colSpan={7} style={{ padding: 40, textAlign: 'center', color: 'rgba(226,232,240,0.25)', fontSize: 13 }}>Loading…</td></tr>
            ) : stores.length === 0 ? (
              <tr><td colSpan={7} style={{ padding: 40, textAlign: 'center', color: 'rgba(226,232,240,0.25)', fontSize: 13 }}>⏱ No trial stores right now</td></tr>
            ) : stores.map((s, i) => (
              <tr key={s.id || i} className="admin-row" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background 0.12s' }}>
                <td style={{ padding: '11px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 26, height: 26, borderRadius: 7, background: `hsl(${(s.store_name?.charCodeAt(0) || 65) * 137 % 360},45%,22%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#e2e8f0', flexShrink: 0 }}>
                      {s.store_name?.[0]?.toUpperCase() || '?'}
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0' }}>{s.store_name || 'Unnamed'}</div>
                  </div>
                </td>
                <td style={{ padding: '11px 14px', fontSize: 12, color: 'rgba(226,232,240,0.5)' }}>{s.owner_email || '—'}</td>
                <td style={{ padding: '11px 14px' }}><IntDot on={!!s.shopify_domain} /></td>
                <td style={{ padding: '11px 14px' }}><IntDot on={!!s.shiprocket_connected} /></td>
                <td style={{ padding: '11px 14px' }}><IntDot on={!!s.has_meta} /></td>
                <td style={{ padding: '11px 14px', fontSize: 13, fontWeight: 700, color: '#e2e8f0' }}>{(s.order_count ?? 0).toLocaleString()}</td>
                <td style={{ padding: '11px 14px', fontSize: 12, color: 'rgba(226,232,240,0.4)' }}>{timeAgo(s.last_synced_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
