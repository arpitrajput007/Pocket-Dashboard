import React, { useState, useEffect } from 'react';
import { CreditCard, RefreshCw } from 'lucide-react';
import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
ChartJS.register(ArcElement, Tooltip, Legend);

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const PLAN_META = {
  free:       { label: 'Free',       color: '#6b7280', price: '₹0' },
  starter:    { label: 'Starter',    color: '#3b82f6', price: '₹999' },
  pro:        { label: 'Pro',        color: '#6366f1', price: '₹1,499' },
  enterprise: { label: 'Enterprise', color: '#8b5cf6', price: '₹4,999' },
};

export default function AdminSubscriptions({ session }) {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  const load = () => {
    const token = session?.access_token;
    if (!token) { setLoading(false); return; }
    setLoading(true); setError(null);
    fetch(`${API_URL}/api/admin/overview`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
      .then(d => setData(d)).catch(e => setError(e.message)).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, [session]);

  const pb = data?.planBreakdown ?? {};
  const total = data?.totalStores ?? 0;
  const paid = (pb.starter ?? 0) + (pb.pro ?? 0) + (pb.enterprise ?? 0);

  const chartData = {
    labels: Object.values(PLAN_META).map(m => m.label),
    datasets: [{ data: Object.keys(PLAN_META).map(k => pb[k] ?? 0), backgroundColor: Object.values(PLAN_META).map(m => m.color + 'cc'), borderColor: Object.values(PLAN_META).map(m => m.color), borderWidth: 1.5 }],
  };

  return (
    <div>
      <div style={{ marginBottom: 22, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#e2e8f0', letterSpacing: '-0.02em' }}>Subscriptions</h1>
          <p style={{ margin: '3px 0 0', fontSize: 13, color: 'rgba(226,232,240,0.4)' }}>Plan distribution — real data from your database</p>
        </div>
        <button onClick={load} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 7, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: 'rgba(226,232,240,0.55)', fontSize: 12, cursor: 'pointer' }}>
          <RefreshCw size={11} style={loading ? { animation: 'spin 1s linear infinite' } : {}} />{loading ? 'Loading…' : 'Refresh'}
        </button>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
      {error && <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#fca5a5', fontSize: 12, marginBottom: 16 }}>⚠️ {error}</div>}

      {/* Real stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Total Stores', value: total, color: '#6366f1', real: true },
          { label: 'On Paid Plan', value: paid, color: '#10b981', real: true },
          { label: 'Pro Plan', value: pb.pro ?? 0, color: '#8b5cf6', real: true },
          { label: 'Free Plan', value: pb.free ?? 0, color: '#6b7280', real: true },
          { label: 'MRR', value: '₹0', color: '#10b981', real: false },
          { label: 'ARR', value: '₹0', color: '#6366f1', real: false },
          { label: 'Churn Rate', value: '—', color: '#ef4444', real: false },
          { label: 'Avg Revenue/User', value: '—', color: '#f59e0b', real: false },
        ].map((s, i) => (
          <div key={i} className="admin-card" style={{ padding: '16px 18px', borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', position: 'relative', overflow: 'hidden', transition: 'all 0.18s' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: s.color, opacity: s.real ? 0.7 : 0.2 }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <CreditCard size={13} color={s.real ? s.color : `${s.color}44`} />
              {!s.real && <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 4, background: 'rgba(255,255,255,0.05)', color: 'rgba(226,232,240,0.3)', border: '1px solid rgba(255,255,255,0.07)' }}>NOT TRACKED</span>}
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: s.real ? '#e2e8f0' : 'rgba(226,232,240,0.22)', letterSpacing: '-0.02em' }}>{s.value}</div>
            <div style={{ fontSize: 12, color: s.real ? 'rgba(226,232,240,0.5)' : 'rgba(226,232,240,0.25)', marginTop: 4 }}>{s.label}</div>
            {!s.real && <div style={{ fontSize: 10, color: 'rgba(226,232,240,0.18)', marginTop: 2 }}>Set up billing to track</div>}
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 16 }}>
        {/* Real plan chart */}
        <div style={{ padding: '20px', borderRadius: 14, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0', marginBottom: 2 }}>Plan Split</div>
          <div style={{ fontSize: 11, color: 'rgba(226,232,240,0.35)', marginBottom: 16 }}>Real — from stores table</div>
          {total > 0
            ? <div style={{ height: 160 }}><Doughnut data={chartData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, cutout: '68%' }} /></div>
            : <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(226,232,240,0.25)', fontSize: 13 }}>No stores yet</div>}
          <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 7 }}>
            {Object.entries(PLAN_META).map(([k, m]) => {
              const count = pb[k] ?? 0;
              const pct = total > 0 ? Math.round((count / total) * 100) : 0;
              return (
                <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <div style={{ width: 7, height: 7, borderRadius: 2, background: m.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: 'rgba(226,232,240,0.55)', flex: 1 }}>{m.label}</span>
                  <span style={{ fontSize: 11, color: 'rgba(226,232,240,0.35)' }}>{m.price}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#e2e8f0', width: 24, textAlign: 'right' }}>{count}</span>
                  <span style={{ fontSize: 10, color: 'rgba(226,232,240,0.28)', width: 30, textAlign: 'right' }}>{pct}%</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Billing callout */}
        <div style={{ padding: '24px', borderRadius: 14, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 20 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f0', marginBottom: 6 }}>Revenue & Billing Metrics</div>
            <div style={{ fontSize: 13, color: 'rgba(226,232,240,0.4)', lineHeight: 1.7 }}>
              MRR, ARR, churn, and subscription revenue will appear here once you connect a payment provider (Razorpay / Stripe) and add a <code style={{ background: 'rgba(255,255,255,0.07)', padding: '1px 5px', borderRadius: 4, color: '#a5b4fc' }}>subscriptions</code> table in Supabase.
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            {['MRR', 'ARR', 'Churn', 'LTV', 'Conversion', 'ARPU'].map(m => (
              <div key={m} style={{ padding: '14px', borderRadius: 8, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', textAlign: 'center' }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: 'rgba(226,232,240,0.18)' }}>—</div>
                <div style={{ fontSize: 11, color: 'rgba(226,232,240,0.25)', marginTop: 4 }}>{m}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
