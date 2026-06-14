import React, { useState, useEffect } from 'react';
import {
  Store, Users, CreditCard, Timer, TrendingUp, TrendingDown,
  RefreshCw, Activity, ShoppingBag, AtSign, Percent, DollarSign,
  Truck, Zap, ArrowUpRight,
} from 'lucide-react';
import { Line, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, Filler, Tooltip, Legend,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Filler, Tooltip, Legend);

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function getLast12Months() {
  const now = new Date();
  return Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
    return {
      key: `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`,
      label: MONTHS_SHORT[d.getMonth()],
    };
  });
}

function timeAgo(dateStr) {
  if (!dateStr) return '—';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function KPICard({ icon: Icon, label, value, subLabel, color = '#6366f1', gradient, trend, noData }) {
  const up = trend > 0;
  return (
    <div className="admin-card" style={{
      padding: '16px 18px', borderRadius: 12,
      background: 'rgba(255,255,255,0.025)',
      border: '1px solid rgba(255,255,255,0.07)',
      position: 'relative', overflow: 'hidden',
      transition: 'all 0.18s',
    }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: gradient || `linear-gradient(90deg, ${color}, ${color}80)`, opacity: noData ? 0.25 : 0.8 }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 9,
          background: `${color}${noData ? '0d' : '18'}`, border: `1px solid ${color}${noData ? '18' : '28'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={15} color={noData ? `${color}55` : color} strokeWidth={1.9} />
        </div>
        {trend !== undefined && !noData && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 3,
            padding: '2px 6px', borderRadius: 5,
            background: up ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
            border: `1px solid ${up ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`,
          }}>
            {up ? <TrendingUp size={9} color="#10b981" /> : <TrendingDown size={9} color="#ef4444" />}
            <span style={{ fontSize: 10, fontWeight: 700, color: up ? '#10b981' : '#ef4444' }}>
              {up ? '+' : ''}{trend}%
            </span>
          </div>
        )}
        {noData && (
          <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 4, background: 'rgba(255,255,255,0.04)', color: 'rgba(226,232,240,0.25)', border: '1px solid rgba(255,255,255,0.06)', letterSpacing: '0.04em' }}>
            NOT TRACKED
          </span>
        )}
      </div>
      <div style={{ fontSize: 22, fontWeight: 800, color: noData ? 'rgba(226,232,240,0.2)' : '#e2e8f0', lineHeight: 1, marginBottom: 4, letterSpacing: '-0.02em' }}>
        {value}
      </div>
      <div style={{ fontSize: 12, color: noData ? 'rgba(226,232,240,0.25)' : 'rgba(226,232,240,0.45)', fontWeight: 500, marginBottom: subLabel ? 3 : 0 }}>
        {label}
      </div>
      {subLabel && (
        <div style={{ fontSize: 10.5, color: noData ? 'rgba(226,232,240,0.15)' : 'rgba(226,232,240,0.28)' }}>
          {noData ? 'Set up billing to track' : subLabel}
        </div>
      )}
    </div>
  );
}

export default function AdminDashboard({ session }) {
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(null);

  const fetchData = () => {
    const token = session?.access_token;
    if (!token) { setLoading(false); return; }
    setLoading(true);
    fetch(`${API_URL}/api/admin/overview`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) { setOverview(d); setLastRefresh(new Date()); } })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, [session]);

  const months = getLast12Months();

  // ── Real data — comes from DB ──────────────────────────────────────────────
  const totalStores      = overview?.totalStores      ?? 0;
  const activeStores     = overview?.activeStores     ?? 0;
  const shopifyConnected = overview?.shopifyConnected ?? 0;
  const shiprocketConn   = overview?.shiprocketConnected ?? 0;
  const metaConnected    = overview?.metaConnected    ?? 0;
  const newToday         = overview?.newToday         ?? 0;
  const newThisMonth     = overview?.newThisMonth     ?? 0;
  const lastSynced24h    = overview?.lastSynced24h    ?? 0;
  const planBreakdown    = overview?.planBreakdown    ?? { free: 0, starter: 0, pro: 0, enterprise: 0 };
  const recentStores     = overview?.recentStores     ?? [];
  const monthlySignups   = overview?.monthlySignups   ?? {};

  // Signup trend: this month vs last month (real)
  const currentMonthKey  = months[11]?.key;
  const lastMonthKey     = months[10]?.key;
  const currentMonthVal  = monthlySignups[currentMonthKey] ?? 0;
  const lastMonthVal     = monthlySignups[lastMonthKey] ?? 0;
  const signupTrend      = lastMonthVal > 0
    ? Math.round(((currentMonthVal - lastMonthVal) / lastMonthVal) * 100)
    : null;

  // Monthly signup array for charts
  const signupsArr = months.map(m => monthlySignups[m.key] ?? 0);

  // Cumulative store growth (running total)
  const cumulativeArr = signupsArr.reduce((acc, v, i) => {
    acc.push((acc[i - 1] ?? (totalStores - signupsArr.reduce((s, x) => s + x, 0))) + v);
    return acc;
  }, []);

  // ── KPI Cards ──────────────────────────────────────────────────────────────
  const kpiCards = [
    {
      icon: Store, label: 'Total Registered Stores', value: totalStores,
      subLabel: `${newThisMonth} joined this month`,
      color: '#6366f1', gradient: 'linear-gradient(90deg,#6366f1,#8b5cf6)',
    },
    {
      icon: Activity, label: 'Active Stores', value: activeStores,
      subLabel: `${totalStores > 0 ? Math.round((activeStores/totalStores)*100) : 0}% of total`,
      color: '#10b981', gradient: 'linear-gradient(90deg,#10b981,#059669)',
    },
    {
      icon: Zap, label: 'Synced in Last 24h', value: lastSynced24h,
      subLabel: `${totalStores > 0 ? Math.round((lastSynced24h/totalStores)*100) : 0}% of stores`,
      color: '#f59e0b', gradient: 'linear-gradient(90deg,#f59e0b,#d97706)',
    },
    {
      icon: CreditCard, label: 'Paid Subscribers', value: 0,
      subLabel: 'Billing not set up yet', noData: true,
      color: '#8b5cf6', gradient: 'linear-gradient(90deg,#8b5cf6,#6366f1)',
    },
    {
      icon: DollarSign, label: 'Monthly Recurring Revenue', value: '₹0',
      subLabel: 'Billing not set up yet', noData: true,
      color: '#10b981', gradient: 'linear-gradient(90deg,#10b981,#34d399)',
    },
    {
      icon: TrendingUp, label: 'Annual Recurring Revenue', value: '₹0',
      subLabel: 'Billing not set up yet', noData: true,
      color: '#6366f1', gradient: 'linear-gradient(90deg,#6366f1,#4f46e5)',
    },
    {
      icon: TrendingDown, label: 'Churn Rate', value: '—',
      subLabel: 'Billing not set up yet', noData: true,
      color: '#ef4444', gradient: 'linear-gradient(90deg,#ef4444,#dc2626)',
    },
    {
      icon: Users, label: 'New Signups Today', value: newToday,
      subLabel: 'stores registered today',
      color: '#3b82f6', gradient: 'linear-gradient(90deg,#3b82f6,#2563eb)',
    },
    {
      icon: ArrowUpRight, label: 'New Signups This Month', value: newThisMonth,
      subLabel: signupTrend !== null ? `${signupTrend >= 0 ? '+' : ''}${signupTrend}% vs last month` : 'first month of data',
      trend: signupTrend ?? undefined,
      color: '#ec4899', gradient: 'linear-gradient(90deg,#ec4899,#db2777)',
    },
    {
      icon: Percent, label: 'Trial → Paid Conversion', value: '—',
      subLabel: 'Billing not set up yet', noData: true,
      color: '#14b8a6', gradient: 'linear-gradient(90deg,#14b8a6,#0d9488)',
    },
    {
      icon: ShoppingBag, label: 'Shopify Connected', value: shopifyConnected,
      subLabel: `${totalStores > 0 ? Math.round((shopifyConnected/totalStores)*100) : 0}% of stores`,
      color: '#6366f1', gradient: 'linear-gradient(90deg,#6366f1,#818cf8)',
    },
    {
      icon: AtSign, label: 'Meta Accounts Connected', value: metaConnected,
      subLabel: `${totalStores > 0 ? Math.round((metaConnected/totalStores)*100) : 0}% of stores`,
      color: '#ec4899', gradient: 'linear-gradient(90deg,#ec4899,#f472b6)',
    },
  ];

  // ── Chart options ──────────────────────────────────────────────────────────
  const baseChartOpts = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: {
      backgroundColor: 'rgba(10,10,22,0.92)', borderColor: 'rgba(255,255,255,0.1)', borderWidth: 1,
      titleColor: '#e2e8f0', bodyColor: 'rgba(226,232,240,0.65)', padding: 10, cornerRadius: 8,
    }},
    scales: {
      x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: 'rgba(226,232,240,0.3)', font: { size: 11 } } },
      y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: 'rgba(226,232,240,0.3)', font: { size: 11 } }, beginAtZero: true },
    },
  };

  const growthChartData = {
    labels: months.map(m => m.label),
    datasets: [{
      label: 'New Signups',
      data: signupsArr,
      backgroundColor: (ctx) => ctx.dataIndex === signupsArr.length - 1 ? '#6366f1' : 'rgba(99,102,241,0.35)',
      borderRadius: 5, borderSkipped: false,
    }],
  };

  const cumulativeChartData = {
    labels: months.map(m => m.label),
    datasets: [{
      label: 'Total Stores',
      data: cumulativeArr,
      borderColor: '#10b981',
      backgroundColor: (ctx) => {
        const g = ctx.chart.ctx.createLinearGradient(0, 0, 0, 200);
        g.addColorStop(0, 'rgba(16,185,129,0.2)');
        g.addColorStop(1, 'rgba(16,185,129,0)');
        return g;
      },
      borderWidth: 2.5, fill: true, tension: 0.4, pointRadius: 0, pointHoverRadius: 5,
      pointHoverBackgroundColor: '#10b981',
    }],
  };

  const planColors = { free: '#6b7280', starter: '#3b82f6', pro: '#6366f1', enterprise: '#8b5cf6' };

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#e2e8f0', letterSpacing: '-0.02em' }}>Mission Control</h1>
          <p style={{ margin: '3px 0 0', fontSize: 13, color: 'rgba(226,232,240,0.4)' }}>Platform overview — real-time health + key metrics</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {lastRefresh && (
            <span style={{ fontSize: 11, color: 'rgba(226,232,240,0.28)' }}>
              Updated {timeAgo(lastRefresh)}
            </span>
          )}
          <button
            onClick={fetchData}
            disabled={loading}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px', borderRadius: 7, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', color: 'rgba(226,232,240,0.55)', fontSize: 11, cursor: 'pointer' }}
          >
            <RefreshCw size={11} style={loading ? { animation: 'spin 1s linear infinite' } : {}} />
            {loading ? 'Loading…' : 'Refresh'}
          </button>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>

      {/* KPI Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        {kpiCards.map((card, i) => <KPICard key={i} {...card} />)}
      </div>

      {/* Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 16, marginBottom: 20 }}>
        {/* Store Growth (cumulative) */}
        <div className="admin-card" style={{ padding: '20px', borderRadius: 14, background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', transition: 'all 0.18s' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0', marginBottom: 2 }}>Store Growth</div>
              <div style={{ fontSize: 11, color: 'rgba(226,232,240,0.38)' }}>Cumulative registered stores — 12 months</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#10b981', letterSpacing: '-0.02em' }}>{totalStores}</div>
              <div style={{ fontSize: 10, color: 'rgba(226,232,240,0.35)' }}>total stores</div>
            </div>
          </div>
          <div style={{ height: 160 }}>
            <Line data={cumulativeChartData} options={baseChartOpts} />
          </div>
        </div>

        {/* Monthly Signups */}
        <div className="admin-card" style={{ padding: '20px', borderRadius: 14, background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', transition: 'all 0.18s' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0', marginBottom: 2 }}>New Signups / Month</div>
              <div style={{ fontSize: 11, color: 'rgba(226,232,240,0.38)' }}>New stores registered per month</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#a5b4fc', letterSpacing: '-0.02em' }}>{newThisMonth}</div>
              <div style={{ fontSize: 10, color: signupTrend > 0 ? '#10b981' : signupTrend < 0 ? '#ef4444' : 'rgba(226,232,240,0.35)', fontWeight: 600 }}>
                {signupTrend !== null ? `${signupTrend >= 0 ? '+' : ''}${signupTrend}% vs last month` : 'this month'}
              </div>
            </div>
          </div>
          <div style={{ height: 160 }}>
            <Bar data={growthChartData} options={baseChartOpts} />
          </div>
        </div>
      </div>

      {/* Bottom Row: Recent Signups + Platform Health */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Recent Store Signups — real data */}
        <div style={{ padding: '18px 20px', borderRadius: 14, background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0', marginBottom: 14 }}>Recent Store Signups</div>
          {recentStores.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 0', color: 'rgba(226,232,240,0.25)', fontSize: 13 }}>No stores yet</div>
          ) : (
            recentStores.map((store, i) => (
              <div key={i} className="admin-row" style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 6px', borderRadius: 7,
                borderBottom: i < recentStores.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                transition: 'background 0.12s',
              }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {store.store_name}
                  </div>
                  <div style={{ fontSize: 11, color: 'rgba(226,232,240,0.38)', display: 'flex', alignItems: 'center', gap: 5 }}>
                    🚀 Joined
                    {store.has_shopify && <span style={{ color: '#10b981' }}>· Shopify ✓</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3, flexShrink: 0 }}>
                  <span style={{
                    fontSize: 9.5, fontWeight: 700, padding: '1px 6px', borderRadius: 4,
                    background: planColors[store.plan_type] ? `${planColors[store.plan_type]}20` : 'rgba(255,255,255,0.06)',
                    color: planColors[store.plan_type] || 'rgba(226,232,240,0.4)',
                    textTransform: 'uppercase', letterSpacing: '0.05em', border: `1px solid ${planColors[store.plan_type] || 'transparent'}30`,
                  }}>{store.plan_type || 'free'}</span>
                  <span style={{ fontSize: 10, color: 'rgba(226,232,240,0.28)' }}>{timeAgo(store.created_at)}</span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Platform Health — real data */}
        <div style={{ padding: '18px 20px', borderRadius: 14, background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0', marginBottom: 14 }}>Platform Health</div>
          {[
            { label: 'Shopify Connected',    value: shopifyConnected, total: totalStores, color: '#10b981' },
            { label: 'Shiprocket Connected', value: shiprocketConn,   total: totalStores, color: '#6366f1' },
            { label: 'Meta Ads Connected',   value: metaConnected,    total: totalStores, color: '#ec4899' },
            { label: 'Synced in Last 24h',   value: lastSynced24h,    total: totalStores, color: '#f59e0b' },
            { label: 'Pro Plan',             value: planBreakdown.pro ?? 0,        total: totalStores, color: '#8b5cf6' },
            { label: 'Free Plan',            value: planBreakdown.free ?? 0,       total: totalStores, color: '#6b7280' },
          ].map((item, i) => {
            const pct = totalStores > 0 ? Math.round((item.value / totalStores) * 100) : 0;
            return (
              <div key={i} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                  <span style={{ fontSize: 12, color: 'rgba(226,232,240,0.6)' }}>{item.label}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#e2e8f0' }}>
                    {item.value} <span style={{ color: 'rgba(226,232,240,0.35)', fontWeight: 400 }}>/ {item.total}</span>
                    <span style={{ fontSize: 10, color: 'rgba(226,232,240,0.3)', marginLeft: 4 }}>({pct}%)</span>
                  </span>
                </div>
                <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: item.color, borderRadius: 4, transition: 'width 0.6s ease' }} />
                </div>
              </div>
            );
          })}

          {/* Billing callout */}
          <div style={{ marginTop: 16, padding: '10px 12px', borderRadius: 8, background: 'rgba(99,102,241,0.06)', border: '1px dashed rgba(99,102,241,0.2)' }}>
            <div style={{ fontSize: 11, color: 'rgba(226,232,240,0.4)', lineHeight: 1.5 }}>
              💡 <strong style={{ color: 'rgba(226,232,240,0.55)' }}>MRR, churn & conversion</strong> metrics will appear here once billing is set up in Supabase.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
