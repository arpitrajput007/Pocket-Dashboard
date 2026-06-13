import React from 'react';
import { TrendingUp, Users, DollarSign, Target, ArrowRight } from 'lucide-react';
import { Bar, Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Filler, Tooltip, Legend } from 'chart.js';
ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Filler, Tooltip, Legend);

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const FUNNEL = [
  { stage: 'Website Visitors',    value: 18400, color: '#6366f1', pct: 100 },
  { stage: 'Landing Page Views',  value: 9200,  color: '#8b5cf6', pct: 50 },
  { stage: 'Trial Signups',       value: 312,   color: '#3b82f6', pct: 1.7 },
  { stage: 'Shopify Connected',   value: 198,   color: '#10b981', pct: 1.1 },
  { stage: 'Paid Conversions',    value: 42,    color: '#f59e0b', pct: 0.23 },
];

const CHANNELS = [
  { channel: 'Organic Search',  visitors: 6800, signups: 142, conversions: 18, cac: 0, color: '#10b981' },
  { channel: 'Google Ads',      visitors: 4200, signups: 89,  conversions: 11, cac: 3200, color: '#3b82f6' },
  { channel: 'Meta Ads',        visitors: 3100, signups: 52,  conversions: 7,  cac: 5800, color: '#ec4899' },
  { channel: 'LinkedIn',        visitors: 1800, signups: 18,  conversions: 4,  cac: 8200, color: '#6366f1' },
  { channel: 'Referral',        visitors: 1400, signups: 9,   conversions: 2,  cac: 0, color: '#8b5cf6' },
  { channel: 'Direct',          visitors: 1100, signups: 2,   conversions: 0,  cac: 0, color: '#f59e0b' },
];

const MONTHLY_SIGNUPS = [6,4,8,7,9,6,11,8,7,10,9,11];
const MONTHLY_CONVERSIONS = [1,1,3,2,3,2,4,3,3,4,4,5];

const chartOpts = {
  responsive: true, maintainAspectRatio: false,
  plugins: { legend: { display: false }, tooltip: { backgroundColor: 'rgba(10,10,22,0.92)', borderColor: 'rgba(255,255,255,0.1)', borderWidth: 1, titleColor: '#e2e8f0', bodyColor: 'rgba(226,232,240,0.65)', padding: 10, cornerRadius: 8 } },
  scales: {
    x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: 'rgba(226,232,240,0.3)', font: { size: 11 } } },
    y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: 'rgba(226,232,240,0.3)', font: { size: 11 } } },
  },
};

export default function AdminMarketing() {
  const totalVisitors = CHANNELS.reduce((s, c) => s + c.visitors, 0);
  const totalSignups = CHANNELS.reduce((s, c) => s + c.signups, 0);
  const totalConversions = CHANNELS.reduce((s, c) => s + c.conversions, 0);
  const blendedCAC = Math.round(CHANNELS.filter(c => c.cac > 0).reduce((s, c) => s + c.cac * c.conversions, 0) / Math.max(CHANNELS.filter(c => c.cac > 0).reduce((s, c) => s + c.conversions, 0), 1));

  const funnelChartData = {
    labels: MONTHS,
    datasets: [
      { label: 'Signups', data: MONTHLY_SIGNUPS, backgroundColor: 'rgba(99,102,241,0.5)', borderRadius: 3, stack: 's' },
      { label: 'Paid', data: MONTHLY_CONVERSIONS, backgroundColor: 'rgba(16,185,129,0.6)', borderRadius: 3, stack: 's' },
    ],
  };

  return (
    <div>
      <div style={{ marginBottom: 22 }}>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#e2e8f0', letterSpacing: '-0.02em' }}>Marketing Analytics</h1>
        <p style={{ margin: '3px 0 0', fontSize: 13, color: 'rgba(226,232,240,0.4)' }}>Acquisition funnel, channel performance, and growth metrics</p>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Monthly Visitors', value: totalVisitors.toLocaleString(), color: '#6366f1', trend: '+12%' },
          { label: 'Trial Signups', value: totalSignups, color: '#3b82f6', trend: '+22%' },
          { label: 'Paid Conversions', value: totalConversions, color: '#10b981', trend: '+25%' },
          { label: 'Blended CAC', value: '₹' + blendedCAC.toLocaleString(), color: '#f59e0b', trend: '-8%' },
          { label: 'LTV / CAC Ratio', value: '3.5×', color: '#8b5cf6', trend: '+0.3×' },
        ].map(card => (
          <div key={card.label} className="admin-card" style={{ padding: '14px 16px', borderRadius: 12, background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', transition: 'all 0.18s' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 11, color: 'rgba(226,232,240,0.38)' }}>{card.label}</span>
              <span style={{ fontSize: 9.5, fontWeight: 700, padding: '1px 5px', borderRadius: 4, background: 'rgba(16,185,129,0.1)', color: '#10b981' }}>{card.trend}</span>
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, color: card.color, lineHeight: 1 }}>{card.value}</div>
          </div>
        ))}
      </div>

      {/* Funnel */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 14, marginBottom: 20 }}>
        <div style={{ padding: '18px 20px', borderRadius: 14, background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0', marginBottom: 14 }}>Conversion Funnel</div>
          {FUNNEL.map((stage, i) => (
            <div key={i} style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                <span style={{ fontSize: 12, color: 'rgba(226,232,240,0.6)' }}>{stage.stage}</span>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ fontSize: 11, color: 'rgba(226,232,240,0.35)' }}>{stage.pct}%</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#e2e8f0' }}>{stage.value.toLocaleString()}</span>
                </div>
              </div>
              <div style={{ height: 5, background: 'rgba(255,255,255,0.06)', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${stage.pct}%`, background: stage.color, borderRadius: 4, transition: 'width 0.6s ease' }} />
              </div>
              {i < FUNNEL.length - 1 && (
                <div style={{ textAlign: 'center', margin: '4px 0', fontSize: 10, color: 'rgba(226,232,240,0.2)' }}>↓ {((FUNNEL[i+1].value / stage.value) * 100).toFixed(1)}%</div>
              )}
            </div>
          ))}
        </div>

        <div style={{ padding: '18px 20px', borderRadius: 14, background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0', marginBottom: 3 }}>Signups vs Paid Conversions</div>
          <div style={{ fontSize: 11, color: 'rgba(226,232,240,0.38)', marginBottom: 14 }}>Monthly — all acquisition channels combined</div>
          <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
            {[{ label: 'Signups', color: 'rgba(99,102,241,0.6)' }, { label: 'Paid', color: 'rgba(16,185,129,0.7)' }].map(l => (
              <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'rgba(226,232,240,0.5)' }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, background: l.color }} />{l.label}
              </div>
            ))}
          </div>
          <div style={{ height: 180 }}>
            <Bar data={funnelChartData} options={{ ...chartOpts, scales: { x: { ...chartOpts.scales.x, stacked: true }, y: { ...chartOpts.scales.y, stacked: true } }, plugins: { ...chartOpts.plugins, legend: { display: false } } }} />
          </div>
        </div>
      </div>

      {/* Channel Table */}
      <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,0.06)', fontSize: 13, fontWeight: 700, color: '#e2e8f0' }}>Channel Performance</div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              {['Channel', 'Visitors', 'Signups', 'Conv. Rate', 'Paid', 'CAC'].map(h => (
                <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 10.5, fontWeight: 700, color: 'rgba(226,232,240,0.3)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {CHANNELS.map((ch, i) => (
              <tr key={i} className="admin-row" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background 0.12s' }}>
                <td style={{ padding: '11px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 8, height: 8, borderRadius: 2, background: ch.color }} />
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0' }}>{ch.channel}</span>
                  </div>
                </td>
                <td style={{ padding: '11px 16px', fontSize: 12, color: '#e2e8f0' }}>{ch.visitors.toLocaleString()}</td>
                <td style={{ padding: '11px 16px', fontSize: 12, color: '#e2e8f0' }}>{ch.signups}</td>
                <td style={{ padding: '11px 16px', fontSize: 12, fontWeight: 600, color: '#a5b4fc' }}>
                  {((ch.signups / ch.visitors) * 100).toFixed(1)}%
                </td>
                <td style={{ padding: '11px 16px', fontSize: 12, fontWeight: 700, color: '#10b981' }}>{ch.conversions}</td>
                <td style={{ padding: '11px 16px', fontSize: 12, color: ch.cac > 0 ? '#fbbf24' : 'rgba(226,232,240,0.35)', fontWeight: ch.cac > 0 ? 600 : 400 }}>
                  {ch.cac > 0 ? '₹' + ch.cac.toLocaleString() : 'Organic'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
