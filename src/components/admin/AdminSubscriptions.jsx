import React, { useState } from 'react';
import { CreditCard, TrendingUp, TrendingDown, Users, ArrowUpRight } from 'lucide-react';
import { Doughnut, Bar } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from 'chart.js';
ChartJS.register(ArcElement, CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const PLANS = [
  { id: 'starter', label: 'Starter', price: 999,  color: '#3b82f6', subscribers: 18, churn: 5.1, conversion: 31.2, mrr: 17982,  features: ['Daily Dashboard', 'Weekly View', '1 Store'] },
  { id: 'pro',     label: 'Pro',     price: 1499, color: '#6366f1', subscribers: 19, churn: 2.8, conversion: 44.6, mrr: 28481,  features: ['All Views', 'AI Copilot', 'Pricing', 'Money in Pocket'] },
  { id: 'enterprise', label: 'Enterprise', price: 4999, color: '#8b5cf6', subscribers: 5, churn: 0.9, conversion: 71.4, mrr: 24995, features: ['Everything in Pro', 'Multi-store', 'Priority Support', 'Custom Reports'] },
];

const MONTHLY_SUBSCRIBERS = {
  starter:    [12,13,14,13,15,16,16,17,17,18,18,18],
  pro:        [8, 9, 10,11,12,13,14,15,16,17,18,19],
  enterprise: [2, 2, 3, 3, 3, 4, 4, 4, 5, 5, 5, 5],
};

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const SUBSCRIBER_TABLE = [
  { store: 'Niyama Wild', plan: 'enterprise', since: 'Aug 2024', mrr: 4999, status: 'active' },
  { store: 'BNB Toys', plan: 'pro', since: 'Aug 2024', mrr: 1499, status: 'active' },
  { store: 'FitFlex Sports', plan: 'pro', since: 'Nov 2024', mrr: 1499, status: 'active' },
  { store: 'Pure Origins Skincare', plan: 'pro', since: 'Sep 2024', mrr: 1499, status: 'active' },
  { store: 'Kashmiri Threads', plan: 'pro', since: 'Oct 2024', mrr: 1499, status: 'active' },
  { store: 'Himalayan Honey Co', plan: 'pro', since: 'Oct 2024', mrr: 1499, status: 'active' },
  { store: 'Heritage Brass Works', plan: 'starter', since: 'Dec 2024', mrr: 999, status: 'paused' },
  { store: 'Royal Spice Garden', plan: 'starter', since: 'Jan 2025', mrr: 999, status: 'active' },
];

const PLAN_COLORS = {
  pro:        { bg: 'rgba(99,102,241,0.12)',  border: 'rgba(99,102,241,0.25)',  text: '#a5b4fc' },
  starter:    { bg: 'rgba(59,130,246,0.1)',   border: 'rgba(59,130,246,0.22)',  text: '#93c5fd' },
  enterprise: { bg: 'rgba(139,92,246,0.12)',  border: 'rgba(139,92,246,0.25)', text: '#c4b5fd' },
};

export default function AdminSubscriptions() {
  const [activeTab, setActiveTab] = useState('overview');

  const totalMRR = PLANS.reduce((s, p) => s + p.mrr, 0);
  const totalSubs = PLANS.reduce((s, p) => s + p.subscribers, 0);

  const donutData = {
    labels: PLANS.map(p => p.label),
    datasets: [{ data: PLANS.map(p => p.subscribers), backgroundColor: PLANS.map(p => p.color + 'cc'), borderColor: PLANS.map(p => p.color), borderWidth: 2, hoverOffset: 6 }],
  };

  const barData = {
    labels: MONTHS,
    datasets: PLANS.map(p => ({
      label: p.label,
      data: MONTHLY_SUBSCRIBERS[p.id],
      backgroundColor: p.color + '80',
      borderColor: p.color,
      borderWidth: 1.5,
      borderRadius: 3,
      stack: 'stack',
    })),
  };

  const chartOpts = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: {
      backgroundColor: 'rgba(10,10,22,0.92)', borderColor: 'rgba(255,255,255,0.1)', borderWidth: 1,
      titleColor: '#e2e8f0', bodyColor: 'rgba(226,232,240,0.65)', padding: 10, cornerRadius: 8,
    }},
    scales: {
      x: { stacked: true, grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: 'rgba(226,232,240,0.3)', font: { size: 11 } } },
      y: { stacked: true, grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: 'rgba(226,232,240,0.3)', font: { size: 11 } } },
    },
  };

  return (
    <div>
      <div style={{ marginBottom: 22 }}>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#e2e8f0', letterSpacing: '-0.02em' }}>Subscriptions</h1>
        <p style={{ margin: '3px 0 0', fontSize: 13, color: 'rgba(226,232,240,0.4)' }}>Plan distribution, revenue, and subscriber management</p>
      </div>

      {/* Top stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Total Subscribers', value: totalSubs, sub: '+3 this month', color: '#6366f1' },
          { label: 'Total MRR', value: '₹' + (totalMRR/1000).toFixed(1) + 'k', sub: '+₹4.2k MoM', color: '#10b981' },
          { label: 'Avg Subscription Value', value: '₹' + Math.round(totalMRR/totalSubs).toLocaleString(), sub: 'per subscriber', color: '#8b5cf6' },
          { label: 'Avg Churn Rate', value: (PLANS.reduce((s,p)=>s+p.churn,0)/PLANS.length).toFixed(1) + '%', sub: 'across all plans', color: '#f59e0b' },
        ].map(s => (
          <div key={s.label} className="admin-card" style={{
            padding: '16px 18px', borderRadius: 12,
            background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', transition: 'all 0.18s',
          }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: s.color, letterSpacing: '-0.02em', marginBottom: 4 }}>{s.value}</div>
            <div style={{ fontSize: 12, color: 'rgba(226,232,240,0.45)' }}>{s.label}</div>
            <div style={{ fontSize: 11, color: 'rgba(226,232,240,0.28)', marginTop: 2 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Plan Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 20 }}>
        {PLANS.map(plan => (
          <div key={plan.id} className="admin-card" style={{
            padding: '18px 20px', borderRadius: 14,
            background: 'rgba(255,255,255,0.025)', border: `1px solid ${plan.color}22`,
            transition: 'all 0.18s', position: 'relative', overflow: 'hidden',
          }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: plan.color, opacity: 0.7 }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#e2e8f0' }}>{plan.label}</div>
                <div style={{ fontSize: 12, color: 'rgba(226,232,240,0.4)', marginTop: 2 }}>₹{plan.price.toLocaleString()}/mo</div>
              </div>
              <div style={{
                padding: '3px 9px', borderRadius: 6,
                background: `${plan.color}15`, border: `1px solid ${plan.color}30`,
                fontSize: 11, fontWeight: 700, color: plan.color,
              }}>{plan.subscribers} users</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#10b981' }}>₹{(plan.mrr/1000).toFixed(1)}k</div>
                <div style={{ fontSize: 10, color: 'rgba(226,232,240,0.38)' }}>MRR</div>
              </div>
              <div>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#f87171' }}>{plan.churn}%</div>
                <div style={{ fontSize: 10, color: 'rgba(226,232,240,0.38)' }}>Churn</div>
              </div>
            </div>
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 12 }}>
              {plan.features.map(f => (
                <div key={f} style={{ fontSize: 11, color: 'rgba(226,232,240,0.45)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 3, height: 3, borderRadius: '50%', background: plan.color }} />
                  {f}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 14, marginBottom: 20 }}>
        <div style={{ padding: '18px 20px', borderRadius: 14, background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0', marginBottom: 6 }}>Plan Distribution</div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
            {PLANS.map(p => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'rgba(226,232,240,0.5)' }}>
                <div style={{ width: 8, height: 8, borderRadius: 2, background: p.color }} />
                {p.label}
              </div>
            ))}
          </div>
          <div style={{ height: 160, position: 'relative' }}>
            <Doughnut data={donutData} options={{ responsive: true, maintainAspectRatio: false, cutout: '65%', plugins: { legend: { display: false }, tooltip: { backgroundColor: 'rgba(10,10,22,0.92)', borderColor: 'rgba(255,255,255,0.1)', borderWidth: 1, titleColor: '#e2e8f0', bodyColor: 'rgba(226,232,240,0.65)', padding: 10, cornerRadius: 8 } } }} />
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#e2e8f0' }}>{totalSubs}</div>
              <div style={{ fontSize: 10, color: 'rgba(226,232,240,0.4)' }}>Total</div>
            </div>
          </div>
        </div>
        <div style={{ padding: '18px 20px', borderRadius: 14, background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0', marginBottom: 4 }}>Subscriber Growth</div>
          <div style={{ fontSize: 11, color: 'rgba(226,232,240,0.38)', marginBottom: 14 }}>Stacked by plan — last 12 months</div>
          <div style={{ height: 160 }}>
            <Bar data={barData} options={chartOpts} />
          </div>
        </div>
      </div>

      {/* Subscriber Table */}
      <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,0.06)', fontSize: 13, fontWeight: 700, color: '#e2e8f0' }}>Recent Subscribers</div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              {['Store', 'Plan', 'Since', 'MRR', 'Status', 'Actions'].map(h => (
                <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 10.5, fontWeight: 700, color: 'rgba(226,232,240,0.3)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {SUBSCRIBER_TABLE.map((row, i) => {
              const c = PLAN_COLORS[row.plan] || PLAN_COLORS.starter;
              return (
                <tr key={i} className="admin-row" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background 0.12s' }}>
                  <td style={{ padding: '11px 16px', fontSize: 13, fontWeight: 600, color: '#e2e8f0' }}>{row.store}</td>
                  <td style={{ padding: '11px 16px' }}>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 5, background: c.bg, border: `1px solid ${c.border}`, color: c.text, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{row.plan}</span>
                  </td>
                  <td style={{ padding: '11px 16px', fontSize: 12, color: 'rgba(226,232,240,0.45)' }}>{row.since}</td>
                  <td style={{ padding: '11px 16px', fontSize: 13, fontWeight: 700, color: '#10b981' }}>₹{row.mrr.toLocaleString()}</td>
                  <td style={{ padding: '11px 16px' }}>
                    <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 5, fontWeight: 600,
                      background: row.status === 'active' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                      border: `1px solid ${row.status === 'active' ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`,
                      color: row.status === 'active' ? '#10b981' : '#f87171',
                    }}>{row.status}</span>
                  </td>
                  <td style={{ padding: '11px 16px' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {['Change Plan','Cancel'].map(a => (
                        <button key={a} style={{ fontSize: 11, padding: '4px 9px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: 'rgba(226,232,240,0.5)', cursor: 'pointer' }}>{a}</button>
                      ))}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
