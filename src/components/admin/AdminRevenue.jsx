import React from 'react';
import { TrendingUp, TrendingDown, DollarSign, BarChart3, ArrowUpRight, Users } from 'lucide-react';
import { Line, Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Filler, Tooltip, Legend } from 'chart.js';
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Filler, Tooltip, Legend);

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const MRR_DATA =     [31200,34800,38400,42000,44800,47300,51200,54600,55800,58200,61400,62958];
const NEW_REV =      [4800, 5200, 6100, 5400, 5600, 5800, 6200, 5800, 6100, 6400, 6700, 6900];
const CHURNED_REV =  [1200, 1400, 1100, 1600, 1200, 1300, 900,  1100, 1200, 800,  900,  1100];
const EXPANSION_REV =[800,  900,  1000, 1100, 900,  1200, 1100, 1300, 1100, 1400, 1200, 1500];
const LTV_DATA =     [8200, 8500, 8900, 9100, 9300, 9600, 9800, 10100,10400,10700,11000,11300];

function fmt(n) {
  if (n >= 1e7) return '₹' + (n/1e7).toFixed(2) + 'Cr';
  if (n >= 1e5) return '₹' + (n/1e5).toFixed(2) + 'L';
  if (n >= 1e3) return '₹' + (n/1e3).toFixed(1) + 'k';
  return '₹' + n;
}

const chartBase = {
  responsive: true, maintainAspectRatio: false,
  plugins: { legend: { display: false }, tooltip: {
    backgroundColor: 'rgba(10,10,22,0.92)', borderColor: 'rgba(255,255,255,0.1)', borderWidth: 1,
    titleColor: '#e2e8f0', bodyColor: 'rgba(226,232,240,0.65)', padding: 10, cornerRadius: 8,
  }},
  scales: {
    x: { grid: { color: 'rgba(255,255,255,0.04)', drawBorder: false }, ticks: { color: 'rgba(226,232,240,0.3)', font: { size: 11 } } },
    y: { grid: { color: 'rgba(255,255,255,0.04)', drawBorder: false }, ticks: { color: 'rgba(226,232,240,0.3)', font: { size: 11 }, callback: v => '₹' + (v/1000).toFixed(0) + 'k' } },
  },
};

export default function AdminRevenue() {
  const mrr = MRR_DATA[11];
  const prevMrr = MRR_DATA[10];
  const mrrGrowth = (((mrr - prevMrr) / prevMrr) * 100).toFixed(1);
  const arr = mrr * 12;
  const nrr = ((mrr - CHURNED_REV[11] + EXPANSION_REV[11]) / prevMrr * 100).toFixed(1);

  const mrrChartData = {
    labels: MONTHS,
    datasets: [{
      label: 'MRR', data: MRR_DATA, borderColor: '#6366f1', borderWidth: 2.5, tension: 0.4,
      fill: true, pointRadius: 0, pointHoverRadius: 5,
      backgroundColor: ctx => {
        const g = ctx.chart.ctx.createLinearGradient(0,0,0,200);
        g.addColorStop(0,'rgba(99,102,241,0.28)'); g.addColorStop(1,'rgba(99,102,241,0)');
        return g;
      },
    }],
  };

  const waterfallData = {
    labels: MONTHS,
    datasets: [
      { label: 'New Revenue', data: NEW_REV, backgroundColor: 'rgba(16,185,129,0.7)', borderRadius: 3, stack: 's' },
      { label: 'Expansion', data: EXPANSION_REV, backgroundColor: 'rgba(99,102,241,0.7)', borderRadius: 3, stack: 's' },
      { label: 'Churned', data: CHURNED_REV.map(v => -v), backgroundColor: 'rgba(239,68,68,0.6)', borderRadius: 3, stack: 's' },
    ],
  };

  const ltvData = {
    labels: MONTHS,
    datasets: [{
      label: 'Avg LTV', data: LTV_DATA, borderColor: '#8b5cf6', borderWidth: 2.5, tension: 0.4,
      fill: true, pointRadius: 0,
      backgroundColor: ctx => {
        const g = ctx.chart.ctx.createLinearGradient(0,0,0,160);
        g.addColorStop(0,'rgba(139,92,246,0.2)'); g.addColorStop(1,'rgba(139,92,246,0)');
        return g;
      },
    }],
  };

  const ltvOpts = { ...chartBase, scales: { ...chartBase.scales, y: { ...chartBase.scales.y, ticks: { ...chartBase.scales.y.ticks, callback: v => '₹' + (v/1000).toFixed(0) + 'k' } } } };
  const waterfallOpts = {
    ...chartBase, scales: {
      x: { ...chartBase.scales.x, stacked: true },
      y: { ...chartBase.scales.y, stacked: true, ticks: { ...chartBase.scales.y.ticks, callback: v => '₹' + Math.abs(v/1000).toFixed(0) + 'k' } },
    },
    plugins: { ...chartBase.plugins, legend: { display: true, labels: { color: 'rgba(226,232,240,0.45)', font: { size: 10 }, boxWidth: 10, padding: 12 } } },
  };

  return (
    <div>
      <div style={{ marginBottom: 22 }}>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#e2e8f0', letterSpacing: '-0.02em' }}>Revenue Dashboard</h1>
        <p style={{ margin: '3px 0 0', fontSize: 13, color: 'rgba(226,232,240,0.4)' }}>Pocket Dashboard internal financial performance</p>
      </div>

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'MRR', value: fmt(mrr), trend: `+${mrrGrowth}%`, up: true, color: '#10b981', sub: 'Monthly Recurring Revenue' },
          { label: 'ARR', value: fmt(arr), trend: '+9.1%', up: true, color: '#6366f1', sub: 'Annualized Run Rate' },
          { label: 'Net Revenue Retention', value: nrr + '%', trend: '+1.2%', up: true, color: '#8b5cf6', sub: 'NRR (incl. expansion)' },
          { label: 'Avg LTV', value: fmt(LTV_DATA[11]), trend: '+2.8%', up: true, color: '#14b8a6', sub: 'Customer Lifetime Value' },
          { label: 'Churned Revenue', value: fmt(CHURNED_REV[11]), trend: '-10.4%', up: false, color: '#ef4444', sub: 'Lost this month' },
        ].map(card => (
          <div key={card.label} className="admin-card" style={{
            padding: '16px 18px', borderRadius: 12,
            background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', transition: 'all 0.18s',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 11, color: 'rgba(226,232,240,0.4)', fontWeight: 500 }}>{card.label}</span>
              <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 5px', borderRadius: 4,
                background: card.up ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                color: card.up ? '#10b981' : '#f87171',
              }}>{card.trend}</span>
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, color: card.color, letterSpacing: '-0.02em', marginBottom: 3 }}>{card.value}</div>
            <div style={{ fontSize: 10.5, color: 'rgba(226,232,240,0.3)' }}>{card.sub}</div>
          </div>
        ))}
      </div>

      {/* MRR Chart */}
      <div className="admin-card" style={{ padding: '20px', borderRadius: 14, background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', marginBottom: 16, transition: 'all 0.18s' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f0' }}>MRR Growth Trend</div>
            <div style={{ fontSize: 11, color: 'rgba(226,232,240,0.38)', marginTop: 2 }}>Monthly recurring revenue — 12 month trajectory</div>
          </div>
          <div style={{ display: 'flex', gap: 16, fontSize: 12 }}>
            {[{ label: 'Current MRR', value: fmt(mrr), color: '#a5b4fc' }, { label: 'YoY Growth', value: '+102%', color: '#10b981' }].map(s => (
              <div key={s.label} style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: 10, color: 'rgba(226,232,240,0.35)' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ height: 180 }}>
          <Line data={mrrChartData} options={chartBase} />
        </div>
      </div>

      {/* Waterfall + LTV */}
      <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 16, marginBottom: 16 }}>
        <div className="admin-card" style={{ padding: '20px', borderRadius: 14, background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', transition: 'all 0.18s' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0', marginBottom: 3 }}>Revenue Waterfall</div>
          <div style={{ fontSize: 11, color: 'rgba(226,232,240,0.38)', marginBottom: 14 }}>New + Expansion − Churned revenue each month</div>
          <div style={{ height: 180 }}>
            <Bar data={waterfallData} options={waterfallOpts} />
          </div>
        </div>
        <div className="admin-card" style={{ padding: '20px', borderRadius: 14, background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', transition: 'all 0.18s' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0', marginBottom: 3 }}>Customer Lifetime Value</div>
          <div style={{ fontSize: 11, color: 'rgba(226,232,240,0.38)', marginBottom: 14 }}>Average LTV trend over 12 months</div>
          <div style={{ height: 180 }}>
            <Line data={ltvData} options={ltvOpts} />
          </div>
        </div>
      </div>

      {/* Revenue breakdown table */}
      <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0' }}>Monthly Revenue Breakdown</span>
          <span style={{ fontSize: 11, color: 'rgba(226,232,240,0.3)' }}>Last 6 months</span>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              {['Month','Starting MRR','New Revenue','Expansion','Churned','Net Change','Ending MRR'].map(h => (
                <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 10.5, fontWeight: 700, color: 'rgba(226,232,240,0.3)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {MONTHS.slice(6).map((month, i) => {
              const idx = i + 6;
              const start = MRR_DATA[idx - 1] || MRR_DATA[0];
              const netChg = NEW_REV[idx] + EXPANSION_REV[idx] - CHURNED_REV[idx];
              return (
                <tr key={month} className="admin-row" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background 0.12s' }}>
                  <td style={{ padding: '10px 16px', fontSize: 13, fontWeight: 600, color: '#e2e8f0' }}>{month} '25</td>
                  <td style={{ padding: '10px 16px', fontSize: 12, color: 'rgba(226,232,240,0.6)' }}>{fmt(start)}</td>
                  <td style={{ padding: '10px 16px', fontSize: 12, color: '#10b981', fontWeight: 600 }}>+{fmt(NEW_REV[idx])}</td>
                  <td style={{ padding: '10px 16px', fontSize: 12, color: '#6366f1', fontWeight: 600 }}>+{fmt(EXPANSION_REV[idx])}</td>
                  <td style={{ padding: '10px 16px', fontSize: 12, color: '#f87171', fontWeight: 600 }}>-{fmt(CHURNED_REV[idx])}</td>
                  <td style={{ padding: '10px 16px', fontSize: 12, fontWeight: 700, color: netChg >= 0 ? '#10b981' : '#f87171' }}>{netChg >= 0 ? '+' : ''}{fmt(netChg)}</td>
                  <td style={{ padding: '10px 16px', fontSize: 12, fontWeight: 700, color: '#e2e8f0' }}>{fmt(MRR_DATA[idx])}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
