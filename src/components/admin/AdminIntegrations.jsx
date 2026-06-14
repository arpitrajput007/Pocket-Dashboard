import React, { useState, useEffect, useCallback } from 'react';
import { CheckCircle, XCircle, AlertTriangle, RefreshCw, ShoppingBag, Truck, AtSign, CreditCard, Clock, Wifi } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

function timeAgo(iso) {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hr ago`;
  return `${Math.floor(h / 24)} days ago`;
}

function HealthCard({ name, icon: Icon, connected, total, lastSync, color, status }) {
  const pct = total > 0 ? Math.round((connected / total) * 100) : 0;
  const statusMap = {
    healthy: { label: 'Healthy', color: '#10b981', Icon: CheckCircle },
    partial: { label: 'Partial',  color: '#f59e0b', Icon: AlertTriangle },
    none:    { label: 'None',     color: '#ef4444', Icon: XCircle },
  };
  const s = statusMap[status] || statusMap.none;
  return (
    <div style={{
      padding:'18px 20px', borderRadius:14,
      background:'rgba(255,255,255,0.025)', border:'1px solid rgba(255,255,255,0.07)',
      position:'relative', overflow:'hidden',
    }}>
      <div style={{ position:'absolute', top:0, left:0, right:0, height:2, background:color, opacity:0.75 }} />

      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:14 }}>
        <div style={{ display:'flex', alignItems:'center', gap:9 }}>
          <div style={{ width:32, height:32, borderRadius:9, background:`${color}18`, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Icon size={14} color={color} />
          </div>
          <span style={{ fontSize:14, fontWeight:700, color:'#e2e8f0' }}>{name}</span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:5, padding:'3px 8px', borderRadius:6, background:`${s.color}12`, border:`1px solid ${s.color}25` }}>
          <s.Icon size={10} color={s.color} />
          <span style={{ fontSize:10, fontWeight:600, color:s.color }}>{s.label}</span>
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:14 }}>
        <div>
          <div style={{ fontSize:22, fontWeight:800, color:'#e2e8f0', letterSpacing:'-0.02em' }}>{connected}</div>
          <div style={{ fontSize:10, color:'rgba(226,232,240,0.38)', marginTop:2 }}>Connected / {total}</div>
        </div>
        <div>
          <div style={{ fontSize:22, fontWeight:800, color: pct === 100 ? '#10b981' : pct > 50 ? '#f59e0b' : '#ef4444' }}>{pct}%</div>
          <div style={{ fontSize:10, color:'rgba(226,232,240,0.38)', marginTop:2 }}>Connection rate</div>
        </div>
      </div>

      <div style={{ height:4, background:'rgba(255,255,255,0.06)', borderRadius:4, overflow:'hidden', marginBottom:12 }}>
        <div style={{ height:'100%', width:`${pct}%`, background:color, borderRadius:4, transition:'width 0.6s ease' }} />
      </div>

      <div style={{ display:'flex', alignItems:'center', gap:6 }}>
        <Clock size={10} color="rgba(226,232,240,0.3)" />
        <span style={{ fontSize:10, color:'rgba(226,232,240,0.35)' }}>Last sync: {lastSync || '—'}</span>
      </div>
    </div>
  );
}

export default function AdminIntegrations({ session }) {
  const [overview, setOverview]   = useState(null);
  const [stores,   setStores]     = useState([]);
  const [loading,  setLoading]    = useState(true);
  const [error,    setError]      = useState(null);
  const [lastFetch, setLastFetch] = useState(null);

  const fetchData = useCallback(async () => {
    const token = session?.access_token;
    if (!token) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      const [ovRes, stRes] = await Promise.all([
        fetch(`${API_URL}/api/admin/overview`,{ headers:{ Authorization:`Bearer ${token}` } }),
        fetch(`${API_URL}/api/admin/stores`,  { headers:{ Authorization:`Bearer ${token}` } }),
      ]);
      if (!ovRes.ok) throw new Error(`Overview API ${ovRes.status}`);
      if (!stRes.ok) throw new Error(`Stores API ${stRes.status}`);
      const [ovData, stData] = await Promise.all([ovRes.json(), stRes.json()]);
      setOverview(ovData);
      setStores(stData.stores || []);
      setLastFetch(new Date());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Derived real data ──────────────────────────────────────────────────────
  const total             = overview?.totalStores         ?? 0;
  const shopifyConnected  = overview?.shopifyConnected    ?? 0;
  const srConnected       = overview?.shiprocketConnected ?? 0;
  const metaConnected     = overview?.metaConnected       ?? 0;

  // Most recent last_synced_at per integration
  const shopifyStores     = stores.filter(s => s.shopify_domain);
  const srStores          = stores.filter(s => s.shiprocket_connected);
  const metaStores        = stores.filter(s => s.has_meta);

  const latestSync = (arr) => {
    const sorted = arr.filter(s => s.last_synced_at).sort((a,b) => new Date(b.last_synced_at) - new Date(a.last_synced_at));
    return sorted[0]?.last_synced_at ? timeAgo(sorted[0].last_synced_at) : '—';
  };

  // Stores that may have issues: synced but no orders, or never synced
  const neverSynced = shopifyStores.filter(s => !s.last_synced_at);
  const zeroOrders  = shopifyStores.filter(s => s.last_synced_at && s.order_count === 0);
  const warningStores = [...new Map([...neverSynced, ...zeroOrders].map(s=>[s.id,s])).values()].slice(0, 6);

  // Recent sync activity: sort stores by last_synced_at descending
  const recentSyncs = stores
    .filter(s => s.last_synced_at)
    .sort((a,b) => new Date(b.last_synced_at) - new Date(a.last_synced_at))
    .slice(0, 8);

  const getStatus = (connected, total) => {
    if (total === 0) return 'none';
    const pct = connected / total;
    if (pct >= 0.8)  return 'healthy';
    if (pct > 0)     return 'partial';
    return 'none';
  };

  const integrations = [
    { name:'Shopify',    icon:ShoppingBag, color:'#10b981', connected:shopifyConnected, total, lastSync:latestSync(shopifyStores), status:getStatus(shopifyConnected, total) },
    { name:'Shiprocket', icon:Truck,       color:'#6366f1', connected:srConnected,      total, lastSync:latestSync(srStores),       status:getStatus(srConnected, total) },
    { name:'Meta Ads',   icon:AtSign,      color:'#ec4899', connected:metaConnected,    total, lastSync:latestSync(metaStores),     status:getStatus(metaConnected, total) },
    { name:'Payments',   icon:CreditCard,  color:'#f59e0b', connected:shopifyConnected, total, lastSync:latestSync(shopifyStores),  status:getStatus(shopifyConnected, total) },
  ];

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom:22, display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:12 }}>
        <div>
          <h1 style={{ margin:0, fontSize:20, fontWeight:800, color:'#e2e8f0', letterSpacing:'-0.02em' }}>Integration Health</h1>
          <p style={{ margin:'3px 0 0', fontSize:13, color:'rgba(226,232,240,0.4)' }}>Live status from your Supabase stores table</p>
        </div>
        <div style={{ display:'flex', gap:10, alignItems:'center' }}>
          {lastFetch && (
            <span style={{ fontSize:11, color:'rgba(226,232,240,0.3)' }}>
              Updated {timeAgo(lastFetch.toISOString())}
            </span>
          )}
          <button onClick={fetchData} disabled={loading}
            style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 14px', borderRadius:8, background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', color:'rgba(226,232,240,0.7)', fontSize:12, fontWeight:600, cursor:loading?'not-allowed':'pointer' }}>
            <RefreshCw size={12} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            Refresh
          </button>
          {total > 0 && (
            <div style={{ padding:'10px 16px', borderRadius:12, background:'rgba(16,185,129,0.08)', border:'1px solid rgba(16,185,129,0.2)', textAlign:'right' }}>
              <div style={{ fontSize:22, fontWeight:800, color:'#10b981' }}>{total}</div>
              <div style={{ fontSize:11, color:'rgba(226,232,240,0.4)' }}>Total Stores</div>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div style={{ marginBottom:16, padding:'12px 16px', borderRadius:10, background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)', fontSize:13, color:'#fca5a5' }}>
          ⚠️ {error} — <button onClick={fetchData} style={{ background:'none', border:'none', color:'#f87171', cursor:'pointer', fontWeight:600 }}>Retry</button>
        </div>
      )}

      {/* Integration cards */}
      {loading && stores.length === 0 ? (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:20 }}>
          {[0,1,2,3].map(i => (
            <div key={i} style={{ height:160, borderRadius:14, background:'rgba(255,255,255,0.025)', border:'1px solid rgba(255,255,255,0.07)', animation:'pulse 1.5s ease infinite' }} />
          ))}
        </div>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:20 }}>
          {integrations.map(int => <HealthCard key={int.name} {...int} />)}
        </div>
      )}

      {/* Sync Activity + Warnings */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>

        {/* ── Warning / Attention ── */}
        <div style={{ background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:12, overflow:'hidden' }}>
          <div style={{ padding:'14px 18px', borderBottom:'1px solid rgba(255,255,255,0.06)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <span style={{ fontSize:13, fontWeight:700, color:'#e2e8f0' }}>Stores Needing Attention</span>
            {warningStores.length > 0 && (
              <span style={{ fontSize:10, padding:'2px 6px', borderRadius:5, background:'rgba(245,158,11,0.1)', border:'1px solid rgba(245,158,11,0.25)', color:'#fbbf24', fontWeight:600 }}>
                {warningStores.length} flagged
              </span>
            )}
          </div>

          {loading && stores.length === 0 ? (
            <div style={{ padding:'28px', textAlign:'center', color:'rgba(226,232,240,0.3)', fontSize:13 }}>Loading...</div>
          ) : warningStores.length === 0 ? (
            <div style={{ padding:'32px 20px', textAlign:'center' }}>
              <CheckCircle size={28} color="rgba(16,185,129,0.35)" style={{ marginBottom:10 }} />
              <div style={{ fontSize:14, fontWeight:600, color:'rgba(226,232,240,0.45)', marginBottom:6 }}>
                {shopifyStores.length === 0 ? 'No stores connected yet' : 'All stores look healthy'}
              </div>
              <div style={{ fontSize:12, color:'rgba(226,232,240,0.25)', lineHeight:1.7 }}>
                {shopifyStores.length === 0
                  ? 'Stores will appear here once users sign up and connect Shopify.'
                  : 'No stores with zero orders after syncing. Looking good!'}
              </div>
            </div>
          ) : (
            warningStores.map((s, i) => {
              const isNeverSynced = !s.last_synced_at;
              return (
                <div key={s.id} style={{ padding:'12px 18px', borderBottom:'1px solid rgba(255,255,255,0.04)' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:4 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:7 }}>
                      {isNeverSynced
                        ? <XCircle size={12} color="#ef4444" />
                        : <AlertTriangle size={12} color="#f59e0b" />}
                      <span style={{ fontSize:12, fontWeight:600, color:'#e2e8f0' }}>
                        {s.store_name || s.shopify_domain || 'Unnamed Store'}
                      </span>
                      <span style={{ fontSize:10, padding:'1px 5px', borderRadius:4, background:'rgba(99,102,241,0.1)', color:'#a5b4fc' }}>Shopify</span>
                    </div>
                    <span style={{ fontSize:10.5, color:'rgba(226,232,240,0.3)' }}>
                      {s.last_synced_at ? timeAgo(s.last_synced_at) : 'Never synced'}
                    </span>
                  </div>
                  <div style={{ fontSize:11, color: isNeverSynced ? '#fca5a5' : '#fcd34d', paddingLeft:19, lineHeight:1.5 }}>
                    {isNeverSynced
                      ? `Connected but never synced — ${s.shopify_domain || 'no domain'}`
                      : `Synced with 0 orders — may need re-sync · ${s.order_count} orders in DB`}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* ── Recent Sync Activity ── */}
        <div style={{ background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:12, overflow:'hidden' }}>
          <div style={{ padding:'14px 18px', borderBottom:'1px solid rgba(255,255,255,0.06)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <span style={{ fontSize:13, fontWeight:700, color:'#e2e8f0' }}>Recent Sync Activity</span>
            <span style={{ fontSize:10, color:'rgba(226,232,240,0.3)' }}>Real · from stores table</span>
          </div>

          {loading && stores.length === 0 ? (
            <div style={{ padding:'28px', textAlign:'center', color:'rgba(226,232,240,0.3)', fontSize:13 }}>Loading...</div>
          ) : recentSyncs.length === 0 ? (
            <div style={{ padding:'32px 20px', textAlign:'center' }}>
              <Wifi size={28} color="rgba(226,232,240,0.15)" style={{ marginBottom:10 }} />
              <div style={{ fontSize:14, fontWeight:600, color:'rgba(226,232,240,0.35)', marginBottom:6 }}>No sync activity yet</div>
              <div style={{ fontSize:12, color:'rgba(226,232,240,0.2)', lineHeight:1.7 }}>
                Sync activity will appear here once store owners trigger a Shopify sync from their dashboard.
              </div>
            </div>
          ) : (
            recentSyncs.map((s, i) => (
              <div key={s.id} style={{
                padding:'12px 18px', borderBottom:'1px solid rgba(255,255,255,0.04)',
                display:'flex', alignItems:'center', gap:10,
              }}>
                <CheckCircle size={13} color="#10b981" />
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:12, fontWeight:600, color:'#e2e8f0', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                    {s.store_name || s.shopify_domain || 'Unnamed Store'}
                  </div>
                  <div style={{ fontSize:11, color:'rgba(226,232,240,0.38)' }}>
                    Shopify
                    {s.order_count > 0 ? ` · ${s.order_count.toLocaleString('en-IN')} orders` : ' · 0 orders'}
                    {s.shiprocket_connected && s.shipment_count > 0 ? ` · ${s.shipment_count} shipments` : ''}
                    {s.shopify_domain ? ` · ${s.shopify_domain}` : ''}
                  </div>
                </div>
                <span style={{ fontSize:10.5, color:'rgba(226,232,240,0.3)', whiteSpace:'nowrap', flexShrink:0 }}>
                  {timeAgo(s.last_synced_at)}
                </span>
              </div>
            ))
          )}

          {stores.length > 0 && recentSyncs.length === 0 && stores.some(s => !s.last_synced_at) && (
            <div style={{ padding:'10px 18px', borderTop:'1px solid rgba(255,255,255,0.04)', fontSize:11, color:'rgba(226,232,240,0.25)', fontStyle:'italic' }}>
              {stores.filter(s => !s.last_synced_at).length} store(s) connected but never synced
            </div>
          )}
        </div>
      </div>

      {/* Honest note about missing data */}
      {!loading && total > 0 && (
        <div style={{ marginTop:14, padding:'12px 16px', borderRadius:10, background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.06)', fontSize:12, color:'rgba(226,232,240,0.3)', lineHeight:1.7 }}>
          💡 <strong style={{ color:'rgba(226,232,240,0.5)' }}>To track API errors & uptime:</strong> Add a <code style={{ background:'rgba(255,255,255,0.06)', padding:'1px 4px', borderRadius:3, color:'#a5b4fc' }}>sync_logs</code> table to Supabase (store_id, status, error_message, synced_at) and log each sync attempt from the backend. The data will auto-appear here.
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
      `}</style>
    </div>
  );
}
