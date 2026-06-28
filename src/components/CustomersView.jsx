import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient';

const fmt  = n => '₹' + Math.round(Math.abs(Number(n) || 0)).toLocaleString('en-IN');
const fmtK = n => {
  const v = Math.abs(Number(n) || 0);
  if (v >= 1e5) return '₹' + (v / 1e5).toFixed(1) + 'L';
  if (v >= 1e3) return '₹' + (v / 1e3).toFixed(1) + 'K';
  return fmt(v);
};

function maskPhone(phone) {
  if (!phone) return '—';
  const digits = phone.replace(/\D/g, '');
  if (digits.length >= 10) return '+91 ****' + digits.slice(-4);
  return '****' + phone.slice(-4);
}

function maskEmail(email) {
  if (!email) return '—';
  const [local, domain] = email.split('@');
  if (!domain) return '****@****';
  return local.slice(0, 2) + '****@' + domain;
}

function daysSince(dateStr) {
  if (!dateStr) return null;
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
}

function CustomerStatus({ lastOrder }) {
  const days = daysSince(lastOrder);
  if (days === null) return <span style={{ color: 'var(--text-dim)' }}>—</span>;
  if (days <= 30) return <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--profit-color)', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 999, padding: '2px 8px' }}>Active</span>;
  if (days <= 60) return <span style={{ fontSize: 11, fontWeight: 700, color: '#fbbf24', background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.25)', borderRadius: 999, padding: '2px 8px' }}>At risk</span>;
  return <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--loss-color)', background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.2)', borderRadius: 999, padding: '2px 8px' }}>Churned</span>;
}

function RepeatTrendChart({ monthlyData }) {
  if (!monthlyData || monthlyData.length < 2) return null;
  const max = Math.max(...monthlyData.map(d => d.rate), 25, 1);
  const W = 100, H = 60;
  const pts = monthlyData.map((d, i) => {
    const x = (i / (monthlyData.length - 1)) * W;
    const y = H - (d.rate / max) * H;
    return `${x},${y}`;
  });
  const benchY = H - (25 / max) * H;

  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: 10 }}>Repeat Rate Trend (6 Months)</div>
      <svg viewBox={`0 0 ${W} ${H + 10}`} style={{ width: '100%', height: 80, overflow: 'visible' }}>
        <line x1={0} y1={benchY} x2={W} y2={benchY} stroke="rgba(251,191,36,0.3)" strokeDasharray="2,2" strokeWidth={0.8} />
        <text x={W + 1} y={benchY + 3} fill="rgba(251,191,36,0.6)" fontSize={4}>25%</text>
        <polyline points={pts.join(' ')} fill="none" stroke="rgba(167,139,250,0.8)" strokeWidth={1.5} strokeLinejoin="round" />
        {monthlyData.map((d, i) => {
          const x = (i / (monthlyData.length - 1)) * W;
          const y = H - (d.rate / max) * H;
          return <circle key={i} cx={x} cy={y} r={2} fill="rgba(167,139,250,1)" />;
        })}
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
        {monthlyData.map((d, i) => (
          <span key={i} style={{ fontSize: 9, color: 'var(--text-dim)' }}>{d.label}</span>
        ))}
      </div>
    </div>
  );
}

export default function CustomersView({ store, refreshTrigger }) {
  const [orders, setOrders]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod]   = useState('month');

  useEffect(() => { if (store?.id) fetchOrders(); }, [store?.id, period, refreshTrigger]);

  async function fetchOrders() {
    setLoading(true);
    const since = new Date();
    if (period === 'month') since.setDate(1);
    else if (period === '30d') since.setDate(since.getDate() - 29);
    else if (period === '90d') since.setDate(since.getDate() - 89);
    since.setHours(0, 0, 0, 0);

    const { data } = await supabase
      .from('orders')
      .select('id, phone, email, total_price, created_at, tags')
      .eq('store_id', store.id)
      .gte('created_at', since.toISOString())
      .order('created_at', { ascending: false });

    setOrders(data || []);
    setLoading(false);
  }

  /* ── Customer aggregation ─────────────────────────────────────────────────── */
  const { summary, topCustomers } = useMemo(() => {
    const map = {};
    orders.forEach(o => {
      const key = (o.phone || '').trim() || (o.email || '').trim().toLowerCase();
      if (!key) return;
      if (!map[key]) map[key] = {
        phone: o.phone || '', email: o.email || '',
        totalOrders: 0, ltv: 0,
        firstOrder: o.created_at, lastOrder: o.created_at,
      };
      const c = map[key];
      c.totalOrders++;
      c.ltv += parseFloat(o.total_price || 0);
      if (o.created_at < c.firstOrder) c.firstOrder = o.created_at;
      if (o.created_at > c.lastOrder)  c.lastOrder  = o.created_at;
    });

    const all      = Object.values(map);
    const newC     = all.filter(c => c.totalOrders === 1);
    const returning = all.filter(c => c.totalOrders > 1);
    const repeatRate = all.length > 0 ? (returning.length / all.length) * 100 : 0;
    const avgOrders  = all.length > 0 ? all.reduce((s, c) => s + c.totalOrders, 0) / all.length : 0;
    const bestLTV    = all.length > 0 ? Math.max(...all.map(c => c.ltv)) : 0;

    const top = [...all].sort((a, b) => b.ltv - a.ltv).slice(0, 10);

    return {
      summary: { total: all.length, newC: newC.length, returning: returning.length, repeatRate, avgOrders, bestLTV },
      topCustomers: top,
    };
  }, [orders]);

  /* ── Monthly repeat rate (last 6 months) ──────────────────────────────────── */
  const monthlyTrend = useMemo(() => {
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setDate(1); d.setMonth(d.getMonth() - i);
      months.push({ year: d.getFullYear(), month: d.getMonth(), label: d.toLocaleString('en-IN', { month: 'short' }) });
    }
    return months.map(m => {
      const monthOrders = orders.filter(o => {
        const d = new Date(o.created_at);
        return d.getFullYear() === m.year && d.getMonth() === m.month;
      });
      const map = {};
      monthOrders.forEach(o => {
        const key = (o.phone || '').trim() || (o.email || '').trim();
        if (!key) return;
        if (!map[key]) map[key] = 0;
        map[key]++;
      });
      const all = Object.values(map);
      const returning = all.filter(n => n > 1).length;
      const rate = all.length > 0 ? (returning / all.length) * 100 : 0;
      return { ...m, rate };
    });
  }, [orders]);

  const PERIODS = [
    { key: 'month', label: 'This Month' },
    { key: '30d',   label: 'Last 30 Days' },
    { key: '90d',   label: 'Last 90 Days' },
  ];

  return (
    <div className="view-content active" style={{ paddingBottom: 60 }}>
      {/* Header + period selector */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>Customer Retention</h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>Repeat purchase rate and lifetime value</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {PERIODS.map(p => (
            <button key={p.key} onClick={() => setPeriod(p.key)}
              style={{ padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer', border: '1px solid', borderColor: period === p.key ? 'rgba(167,139,250,0.5)' : 'rgba(255,255,255,0.1)', background: period === p.key ? 'rgba(167,139,250,0.12)' : 'transparent', color: period === p.key ? '#a78bfa' : 'var(--text-muted)', transition: 'all 0.15s' }}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>Loading customer data…</div>
      ) : orders.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>No orders found for this period.</div>
      ) : (
        <>
          {/* ── Section A: Retention Summary ─── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, marginBottom: 24 }}>
            {[
              { label: 'New Customers',       value: summary.newC,                                    color: 'rgba(96,165,250,1)' },
              { label: 'Returning Customers', value: `${summary.returning} (${summary.repeatRate.toFixed(1)}%)`, color: 'var(--profit-color)' },
              { label: 'Avg Orders / Customer', value: summary.avgOrders.toFixed(1),                 color: 'rgba(167,139,250,1)' },
              { label: 'Best Customer LTV',   value: fmtK(summary.bestLTV),                          color: '#fbbf24' },
            ].map(card => (
              <div key={card.label} style={{ padding: '14px 16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: 8 }}>{card.label}</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: card.color }}>{card.value}</div>
              </div>
            ))}
          </div>

          {/* Repeat rate health banner */}
          <div style={{ marginBottom: 20, padding: '12px 16px', borderRadius: 12, background: summary.repeatRate >= 25 ? 'rgba(16,185,129,0.06)' : 'rgba(251,191,36,0.06)', border: `1px solid ${summary.repeatRate >= 25 ? 'rgba(16,185,129,0.2)' : 'rgba(251,191,36,0.2)'}`, fontSize: 13, color: 'var(--text-muted)' }}>
            {summary.repeatRate >= 25
              ? `Your ${summary.repeatRate.toFixed(1)}% repeat rate is above the 25% D2C benchmark — strong retention.`
              : `Your repeat rate is ${summary.repeatRate.toFixed(1)}%. Brands above 25% have 3.4× higher margins. Focus on post-purchase follow-up.`}
          </div>

          {/* ── Section B: Trend chart ─── */}
          <div className="card glass" style={{ marginBottom: 20 }}>
            <h3>Repeat Purchase Rate — Last 6 Months</h3>
            <RepeatTrendChart monthlyData={monthlyTrend} />
            <div style={{ display: 'flex', gap: 20, marginTop: 14, fontSize: 12, color: 'var(--text-dim)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 24, height: 2, background: 'rgba(167,139,250,0.8)', display: 'inline-block', borderRadius: 2 }} /> Repeat rate
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 24, height: 2, background: 'rgba(251,191,36,0.5)', display: 'inline-block', borderRadius: 2, borderTop: '1px dashed rgba(251,191,36,0.5)' }} /> 25% benchmark
              </span>
            </div>
          </div>

          {/* ── Section C: Top Customers ─── */}
          <div className="card glass">
            <h3>Top Customers by Lifetime Value</h3>
            {topCustomers.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-muted)', fontSize: 13 }}>No customer data available.</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      {['Customer', 'Orders', 'LTV', 'Last Order', 'Status'].map(h => (
                        <th key={h} style={{ textAlign: h === 'Customer' ? 'left' : 'right', padding: '8px 10px', fontSize: 11, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.7px', borderBottom: '1px solid var(--border)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {topCustomers.map((c, i) => {
                      const display = c.phone ? maskPhone(c.phone) : maskEmail(c.email);
                      const days    = daysSince(c.lastOrder);
                      const lastStr = days === 0 ? 'Today' : days === 1 ? 'Yesterday' : `${days} days ago`;
                      return (
                        <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                          <td style={{ padding: '10px 10px', fontSize: 13, color: 'var(--text-main)', fontVariantNumeric: 'tabular-nums' }}>{display}</td>
                          <td style={{ textAlign: 'right', padding: '10px 10px', fontSize: 13, color: 'var(--text-muted)' }}>{c.totalOrders}</td>
                          <td style={{ textAlign: 'right', padding: '10px 10px', fontSize: 13, fontWeight: 700, color: 'var(--profit-color)' }}>{fmtK(c.ltv)}</td>
                          <td style={{ textAlign: 'right', padding: '10px 10px', fontSize: 12, color: 'var(--text-muted)' }}>{lastStr}</td>
                          <td style={{ textAlign: 'right', padding: '10px 10px' }}><CustomerStatus lastOrder={c.lastOrder} /></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
