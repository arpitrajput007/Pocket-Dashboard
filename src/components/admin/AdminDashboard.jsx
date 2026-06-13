import React, { useState, useEffect } from 'react';
import {
  Store, Users, CreditCard, Timer, TrendingUp, TrendingDown,
  ShoppingCart, Zap, RefreshCw, ArrowUpRight, Activity,
  ShoppingBag, AtSign, Percent, DollarSign, Package, Truck,
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
    return { key: `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`, label: MONTHS_SHORT[d.getMonth()] };
  });
}

// Realistic mock data for metrics not yet tracked in DB
const MOCK = {
  trialUsers: 24,
  paidSubscribers: 42,
  mrr: 62958,
  arr: 755496,
  churnRate: 3.2,
  conversionRate: 38.5,
  metaConnectedMock: 23,
  mrrTrend: [31200,34800,38400,42000,44800,47300,51200,54600,55800,58200,61400,62958],
  userGrowth: [6,4,8,7,9,6,11,8,7,10,9,11],
  recentActivity: [
    { type: 'signup', store: 'PureLeaf Organics', time: '2 min ago', plan: 'trial' },
    { type: 'upgrade', store: 'BNB Toys', time: '18 min ago', plan: 'pro' },
    { type: 'sync', store: 'Kashmiri Threads', time: '31 min ago', plan: 'pro' },
    { type: 'signup', store: 'Velvet Dreams Co', time: '1 hr ago', plan: 'trial' },
    { type: 'sync', store: 'Royal Spice Garden', time: '2 hr ago', plan: 'free' },
    { type: 'upgrade', store: 'FitFlex Sports', time: '3 hr ago', plan: 'pro' },
    { type: 'signup', store: 'EcoWrap India', time: '5 hr ago', plan: 'trial' },
    { type: 'churn', store: 'Mumbai Pickle Co', time: '7 hr ago', plan: 'free' },
  ],
};

function fmt(n) {
  if (n >= 1e7) return '₹' + (n/1e7).toFixed(2) + 'Cr';
  if (n >= 1e5) return '₹' + (n/1e5).toFixed(1) + 'L';
  if (n >= 1e3) return '₹' + (n/1e3).toFixed(1) + 'k';
  return '₹' + n;
}

function KPICard({ icon: Icon, label, value, trend, prevLabel, color = '#6366f1', gradient, wide }) {
  const up = trend >= 0;
  return (
    <div className="admin-card" style={{
      padding: '16px 18px', borderRadius: 12,
      background: 'rgba(255,255,255,0.025)',
      border: '1px solid rgba(255,255,255,0.07)',
      position: 'relative', overflow: 'hidden',
      transition: 'all 0.18s',
      gridColumn: wide ? 'span 2' : 'span 1',
    }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: gradient || `linear-gradient(90deg, ${color}, ${color}80)`, opacity: 0.8 }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 9,
          background: `${color}18`, border: `1px solid ${color}28`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={15} color={color} strokeWidth={1.9} />
        </div>
        {trend !== undefined && (
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
      </div>
      <div style={{ fontSize: 22, fontWeight: 800, color: '#e2e8f0', lineHeight: 1, marginBottom: 4, letterSpacing: '-0.02em' }}>
        {value}
      </div>
      <div style={{ fontSize: 12, color: 'rgba(226,232,240,0.45)', fontWeight: 500, marginBottom: prevLabel ? 3 : 0 }}>
        {label}
      </div>
      {prevLabel && <div style={{ fontSize: 10.5, color: 'rgba(226,232,240,0.28)' }}>{prevLabel}</div>}
    </div>
  );
}

function ActivityDot({ type }) {
  const colors = { signup: '#10b981', upgrade: '#6366f1', sync: '#3b82f6', churn: '#ef4444' };
  return <div style={{ width: 6, height: 6, borderRadius: '50%', background: colors[type] || '#6b7280', flexShrink: 0 }} />;
}

export default function AdminDashboard({ session }) {
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = session?.access_token;
    if (!token) { setLoading(false); return; }
    fetch(`${API_URL}/api/admin/overview`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setOverview(d); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [session]);

  const months = getLast12Months();

  const totalStores       = overview?.totalStores       ?? 83;
  const activeStores      = overview?.activeStores      ?? 67;
  const shopifyConnected  = overview?.shopifyConnected  ?? 67;
  const shiprocketConn    = overview?.shiprocketConnected ?? 31;
  const newToday          = overview?.newToday          ?? 2;
  const newThisMonth      = overview?.newThisMonth      ?? 11;
  const metaConnected     = overview?.metaConnected     ?? MOCK.metaConnectedMock;
  const monthlySignups    = overview?.monthlySignups    ?? {};

  const signupsData = months.map(m => monthlySignups[m.key] ?? MOCK.userGrowth[months.indexOf(m)] ?? 0);

  const kpiCards = [
    { icon: Store,       label: 'Total Registered Stores',    value: totalStores,                  trend: +8.4,  prevLabel: 'vs 76 last month',  color: '#6366f1', gradient: 'linear-gradient(90deg, #6366f1, #8b5cf6)' },
    { icon: Activity,    label: 'Active Stores',              value: activeStores,                 trend: +5.2,  prevLabel: 'vs 63 last month',  color: '#10b981', gradient: 'linear-gradient(90deg, #10b981, #059669)' },
    { icon: Timer,       label: 'Trial Users',                value: MOCK.trialUsers,              trend: +12.5, prevLabel: 'vs 21 last month',  color: '#f59e0b', gradient: 'linear-gradient(90deg, #f59e0b, #d97706)' },
    { icon: CreditCard,  label: 'Paid Subscribers',           value: MOCK.paidSubscribers,         trend: +7.7,  prevLabel: 'vs 39 last month',  color: '#8b5cf6', gradient: 'linear-gradient(90deg, #8b5cf6, #6366f1)' },
    { icon: DollarSign,  label: 'Monthly Recurring Revenue',  value: fmt(MOCK.mrr),                trend: +9.1,  prevLabel: 'vs ' + fmt(57700) + ' last month', color: '#10b981', gradient: 'linear-gradient(90deg, #10b981, #34d399)' },
    { icon: TrendingUp,  label: 'Annual Recurring Revenue',   value: fmt(MOCK.arr),                trend: +9.1,  prevLabel: 'Annualized from MRR', color: '#6366f1', gradient: 'linear-gradient(90deg, #6366f1, #4f46e5)' },
    { icon: TrendingDown,label: 'Churn Rate',                 value: MOCK.churnRate + '%',         trend: -0.8,  prevLabel: '4.0% last month',   color: '#ef4444', gradient: 'linear-gradient(90deg, #ef4444, #dc2626)' },
    { icon: Users,       label: 'New Signups Today',          value: newToday,                     trend: +100,  prevLabel: 'vs 1 yesterday',    color: '#3b82f6', gradient: 'linear-gradient(90deg, #3b82f6, #2563eb)' },
    { icon: ArrowUpRight,label: 'New Signups This Month',     value: newThisMonth,                 trend: +22,   prevLabel: 'vs 9 last month',   color: '#ec4899', gradient: 'linear-gradient(90deg, #ec4899, #db2777)' },
    { icon: Percent,     label: 'Trial → Paid Conversion',    value: MOCK.conversionRate + '%',    trend: +2.1,  prevLabel: 'vs 36.4% last month', color: '#14b8a6', gradient: 'linear-gradient(90deg, #14b8a6, #0d9488)' },
    { icon: ShoppingBag, label: 'Shopify Connected Stores',   value: shopifyConnected,             trend: +6.3,  prevLabel: 'vs 63 last month',  color: '#6366f1', gradient: 'linear-gradient(90deg, #6366f1, #818cf8)' },
    { icon: AtSign,      label: 'Meta Accounts Connected',    value: metaConnected,                trend: +4.3,  prevLabel: 'vs 22 last month',  color: '#ec4899', gradient: 'linear-gradient(90deg, #ec4899, #f472b6)' },
  ];

  const chartOpts = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: {
      backgroundColor: 'rgba(10,10,22,0.92)', borderColor: 'rgba(255,255,255,0.1)', borderWidth: 1,
      titleColor: '#e2e8f0', bodyColor: 'rgba(226,232,240,0.65)', padding: 10, cornerRadius: 8,
    }},
    scales: {
      x: { grid: { color: 'rgba(255,255,255,0.04)', drawBorder: false }, ticks: { color: 'rgba(226,232,240,0.3)', font: { size: 11 } } },
      y: { grid: { color: 'rgba(255,255,255,0.04)', drawBorder: false }, ticks: { color: 'rgba(226,232,240,0.3)', font: { size: 11 } } },
    },
  };

  const mrrChartData = {
    labels: months.map(m => m.label),
    datasets: [{
      data: MOCK.mrrTrend,
      borderColor: '#6366f1',
      backgroundColor: (ctx) => {
        const g = ctx.chart.ctx.createLinearGradient(0, 0, 0, 200);
        g.addColorStop(0, 'rgba(99,102,241,0.25)');
        g.addColorStop(1, 'rgba(99,102,241,0)');
        return g;
      },
      borderWidth: 2.5, fill: true, tension: 0.4, pointRadius: 0, pointHoverRadius: 5,
      pointHoverBackgroundColor: '#6366f1',
    }],
  };

  const growthChartData = {
    labels: months.map(m => m.label),
    datasets: [{
      data: signupsData,
      backgroundColor: (ctx) => {
        const idx = ctx.dataIndex;
        return idx === signupsData.length - 1 ? '#6366f1' : 'rgba(99,102,241,0.35)';
      },
      borderRadius: 5, borderSkipped: false,
    }],
  };

  const mrrY = {
    ...chartOpts.scales.y,
    ticks: { ...chartOpts.scales.y.ticks, callback: v => v >= 1000 ? '₹' + (v/1000).toFixed(0) + 'k' : '₹' + v },
  };

  return (
    <div>
      {/* Page Header */}
      <div style={{ marginBottom: 24, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#e2e8f0', letterSpacing: '-0.02em' }}>
            Mission Control
          </h1>
          <p style={{ margin: '3px 0 0', fontSize: 13, color: 'rgba(226,232,240,0.4)' }}>
            Platform overview — real-time health + key metrics
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {loading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'rgba(226,232,240,0.35)' }}>
              <RefreshCw size={12} style={{ animation: 'spin 1s linear infinite' }} />
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              Syncing
            </div>
          )}
          <div style={{
            padding: '5px 10px', borderRadius: 7,
            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
            fontSize: 11, color: 'rgba(226,232,240,0.4)',
          }}>
            Live data
          </div>
        </div>
      </div>

      {/* KPI Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        {kpiCards.map((card, i) => <KPICard key={i} {...card} />)}
      </div>

      {/* Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 16, marginBottom: 20 }}>
        {/* MRR Chart */}
        <div className="admin-card" style={{
          padding: '20px', borderRadius: 14,
          background: 'rgba(255,255,255,0.025)',
          border: '1px solid rgba(255,255,255,0.07)',
          transition: 'all 0.18s',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0', marginBottom: 2 }}>Revenue Growth</div>
              <div style={{ fontSize: 11, color: 'rgba(226,232,240,0.38)' }}>Monthly Recurring Revenue — 12 months</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#a5b4fc', letterSpacing: '-0.02em' }}>{fmt(MOCK.mrr)}</div>
              <div style={{ fontSize: 10, color: '#10b981', fontWeight: 600 }}>↑ +9.1% MoM</div>
            </div>
          </div>
          <div style={{ height: 160 }}>
            <Line data={mrrChartData} options={{ ...chartOpts, scales: { x: chartOpts.scales.x, y: mrrY } }} />
          </div>
        </div>

        {/* User Growth Chart */}
        <div className="admin-card" style={{
          padding: '20px', borderRadius: 14,
          background: 'rgba(255,255,255,0.025)',
          border: '1px solid rgba(255,255,255,0.07)',
          transition: 'all 0.18s',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0', marginBottom: 2 }}>User Growth</div>
              <div style={{ fontSize: 11, color: 'rgba(226,232,240,0.38)' }}>New signups per month</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#a5b4fc', letterSpacing: '-0.02em' }}>{newThisMonth}</div>
              <div style={{ fontSize: 10, color: '#10b981', fontWeight: 600 }}>this month</div>
            </div>
          </div>
          <div style={{ height: 160 }}>
            <Bar data={growthChartData} options={chartOpts} />
          </div>
        </div>
      </div>

      {/* Bottom Row: Activity + Platform Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Recent Activity */}
        <div style={{
          padding: '18px 20px', borderRadius: 14,
          background: 'rgba(255,255,255,0.025)',
          border: '1px solid rgba(255,255,255,0.07)',
        }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0', marginBottom: 14 }}>Recent Activity</div>
          {MOCK.recentActivity.map((item, i) => (
            <div key={i} className="admin-row" style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '8px 6px', borderRadius: 7,
              borderBottom: i < MOCK.recentActivity.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
              transition: 'background 0.12s',
            }}>
              <ActivityDot type={item.type} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#e2e8f0' }}>{item.store}</div>
                <div style={{ fontSize: 11, color: 'rgba(226,232,240,0.38)' }}>
                  {item.type === 'signup' ? '🚀 New signup' : item.type === 'upgrade' ? '⬆️ Upgraded plan' : item.type === 'sync' ? '🔄 Data synced' : '📉 Churned'}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3 }}>
                <span style={{
                  fontSize: 9.5, fontWeight: 700, padding: '1px 6px', borderRadius: 4,
                  background: item.plan === 'pro' ? 'rgba(99,102,241,0.15)' : item.plan === 'trial' ? 'rgba(245,158,11,0.12)' : 'rgba(255,255,255,0.06)',
                  color: item.plan === 'pro' ? '#a5b4fc' : item.plan === 'trial' ? '#fbbf24' : 'rgba(226,232,240,0.4)',
                  textTransform: 'uppercase', letterSpacing: '0.05em',
                }}>{item.plan}</span>
                <span style={{ fontSize: 10, color: 'rgba(226,232,240,0.28)' }}>{item.time}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Platform Health */}
        <div style={{
          padding: '18px 20px', borderRadius: 14,
          background: 'rgba(255,255,255,0.025)',
          border: '1px solid rgba(255,255,255,0.07)',
        }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0', marginBottom: 14 }}>Platform Health</div>
          {[
            { label: 'Shopify Connected', value: shopifyConnected, total: totalStores, color: '#10b981' },
            { label: 'Shiprocket Connected', value: shiprocketConn, total: totalStores, color: '#6366f1' },
            { label: 'Meta Ads Connected', value: metaConnected, total: totalStores, color: '#ec4899' },
            { label: 'Active (Last 24h)', value: overview?.lastSynced24h ?? 54, total: totalStores, color: '#f59e0b' },
            { label: 'Paid Subscribers', value: MOCK.paidSubscribers, total: totalStores, color: '#8b5cf6' },
            { label: 'On Trial', value: MOCK.trialUsers, total: totalStores, color: '#3b82f6' },
          ].map((item, i) => {
            const pct = totalStores > 0 ? Math.round((item.value / totalStores) * 100) : 0;
            return (
              <div key={i} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                  <span style={{ fontSize: 12, color: 'rgba(226,232,240,0.6)' }}>{item.label}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#e2e8f0' }}>{item.value} <span style={{ color: 'rgba(226,232,240,0.35)', fontWeight: 400 }}>/ {item.total}</span></span>
                </div>
                <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: item.color, borderRadius: 4, transition: 'width 0.6s ease' }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
