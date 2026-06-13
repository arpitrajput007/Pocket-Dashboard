import React from 'react';
import { Bot, Zap, DollarSign, Clock, TrendingUp, MessageSquare } from 'lucide-react';
import { Line, Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Filler, Tooltip, Legend } from 'chart.js';
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Filler, Tooltip, Legend);

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DAILY_QUERIES = [42,38,51,46,59,44,67,52,71,63,78,55,82,69,91,74,88,72,95,84,102,79,96,85,110,92,108,87,118,95];
const MONTHLY_QUERIES = [1240,1580,1820,2140,2490,2720,3100,3450,3780,4120,4580,4930];
const MONTHLY_COST_USD = [8.2,10.5,12.1,14.2,16.5,18.1,20.6,22.9,25.1,27.4,30.4,32.7];

const TOP_QUESTIONS = [
  { question: 'What is my RTO rate this month?', count: 847, category: 'Delivery' },
  { question: 'Show me top performing products', count: 712, category: 'Products' },
  { question: 'What is my net profit today?', count: 698, category: 'Finance' },
  { question: 'Compare this week vs last week', count: 634, category: 'Analytics' },
  { question: 'Which ad platform has best ROAS?', count: 589, category: 'Marketing' },
  { question: 'What is my cost per acquisition?', count: 521, category: 'Marketing' },
  { question: 'Show money in my pocket for October', count: 498, category: 'Finance' },
  { question: 'How many orders delivered today?', count: 467, category: 'Delivery' },
];

const CATEGORY_COLORS = { Delivery: '#10b981', Finance: '#6366f1', Products: '#8b5cf6', Analytics: '#3b82f6', Marketing: '#ec4899' };

const chartOpts = {
  responsive: true, maintainAspectRatio: false,
  plugins: { legend: { display: false }, tooltip: {
    backgroundColor: 'rgba(10,10,22,0.92)', borderColor: 'rgba(255,255,255,0.1)', borderWidth: 1,
    titleColor: '#e2e8f0', bodyColor: 'rgba(226,232,240,0.65)', padding: 10, cornerRadius: 8,
  }},
  scales: {
    x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: 'rgba(226,232,240,0.3)', font: { size: 11 } } },
    y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: 'rgba(226,232,240,0.3)', font: { size: 11 } } },
  },
};

export default function AdminAI() {
  const totalQueries = MONTHLY_QUERIES.reduce((s, v) => s + v, 0);
  const totalCostUSD = MONTHLY_COST_USD.reduce((s, v) => s + v, 0);
  const avgPerUser = Math.round(totalQueries / 42); // 42 paid users

  const queryChartData = {
    labels: MONTHS,
    datasets: [{
      data: MONTHLY_QUERIES, borderColor: '#8b5cf6', borderWidth: 2.5, tension: 0.4,
      fill: true, pointRadius: 0,
      backgroundColor: ctx => {
        const g = ctx.chart.ctx.createLinearGradient(0,0,0,180);
        g.addColorStop(0,'rgba(139,92,246,0.25)'); g.addColorStop(1,'rgba(139,92,246,0)');
        return g;
      },
    }],
  };

  const costChartData = {
    labels: MONTHS,
    datasets: [{
      data: MONTHLY_COST_USD,
      backgroundColor: MONTHS.map((_, i) => i === 11 ? '#ef444480' : 'rgba(239,68,68,0.3)'),
      borderRadius: 4, borderSkipped: false,
    }],
  };

  return (
    <div>
      <div style={{ marginBottom: 22 }}>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#e2e8f0', letterSpacing: '-0.02em' }}>AI Copilot Analytics</h1>
        <p style={{ margin: '3px 0 0', fontSize: 13, color: 'rgba(226,232,240,0.4)' }}>GPT-4o usage, costs, and most queried insights across all stores</p>
      </div>

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Total AI Queries', value: totalQueries.toLocaleString(), color: '#8b5cf6', icon: MessageSquare, trend: '+18%' },
          { label: 'Queries Today', value: DAILY_QUERIES[29], color: '#6366f1', icon: Zap, trend: '+12%' },
          { label: 'Avg Per User', value: avgPerUser, color: '#3b82f6', icon: Bot, trend: '+8%' },
          { label: 'OpenAI Spend', value: '$' + totalCostUSD.toFixed(0), color: '#ef4444', icon: DollarSign, trend: '+19%' },
          { label: 'Avg Response Time', value: '1.8s', color: '#10b981', icon: Clock, trend: '-5%' },
        ].map(card => (
          <div key={card.label} className="admin-card" style={{
            padding: '14px 16px', borderRadius: 12,
            background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', transition: 'all 0.18s',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <div style={{ width: 30, height: 30, borderRadius: 8, background: `${card.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <card.icon size={13} color={card.color} />
              </div>
              <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 5px', borderRadius: 4,
                background: card.trend.startsWith('-') ? 'rgba(16,185,129,0.1)' : 'rgba(99,102,241,0.1)',
                color: card.trend.startsWith('-') ? '#10b981' : '#a5b4fc',
              }}>{card.trend}</span>
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, color: card.color, lineHeight: 1, marginBottom: 3 }}>{card.value}</div>
            <div style={{ fontSize: 11, color: 'rgba(226,232,240,0.38)' }}>{card.label}</div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 14, marginBottom: 20 }}>
        <div className="admin-card" style={{ padding: '18px 20px', borderRadius: 14, background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', transition: 'all 0.18s' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0', marginBottom: 3 }}>Query Volume Trend</div>
          <div style={{ fontSize: 11, color: 'rgba(226,232,240,0.38)', marginBottom: 14 }}>Monthly AI queries across all active stores</div>
          <div style={{ height: 160 }}>
            <Line data={queryChartData} options={chartOpts} />
          </div>
        </div>
        <div className="admin-card" style={{ padding: '18px 20px', borderRadius: 14, background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', transition: 'all 0.18s' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0', marginBottom: 3 }}>OpenAI Cost (USD)</div>
          <div style={{ fontSize: 11, color: 'rgba(226,232,240,0.38)', marginBottom: 14 }}>Monthly spend on GPT-4o + GPT-4o-mini</div>
          <div style={{ height: 160 }}>
            <Bar data={costChartData} options={{ ...chartOpts, scales: { ...chartOpts.scales, y: { ...chartOpts.scales.y, ticks: { ...chartOpts.scales.y.ticks, callback: v => '$' + v } } } }} />
          </div>
        </div>
      </div>

      {/* Top Questions */}
      <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,0.06)', fontSize: 13, fontWeight: 700, color: '#e2e8f0' }}>Top Questions Asked (All Time)</div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              {['Question', 'Category', 'Count', 'Share'].map(h => (
                <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 10.5, fontWeight: 700, color: 'rgba(226,232,240,0.3)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {TOP_QUESTIONS.map((q, i) => {
              const share = ((q.count / totalQueries) * 100).toFixed(1);
              const catColor = CATEGORY_COLORS[q.category] || '#6b7280';
              return (
                <tr key={i} className="admin-row" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background 0.12s' }}>
                  <td style={{ padding: '11px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(226,232,240,0.35)', minWidth: 16 }}>#{i+1}</span>
                      <span style={{ fontSize: 13, color: '#e2e8f0' }}>{q.question}</span>
                    </div>
                  </td>
                  <td style={{ padding: '11px 16px' }}>
                    <span style={{ fontSize: 10.5, padding: '2px 7px', borderRadius: 5, fontWeight: 600,
                      background: `${catColor}15`, border: `1px solid ${catColor}30`, color: catColor,
                    }}>{q.category}</span>
                  </td>
                  <td style={{ padding: '11px 16px', fontSize: 13, fontWeight: 700, color: '#e2e8f0' }}>{q.count.toLocaleString()}</td>
                  <td style={{ padding: '11px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 60, height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${Math.min((q.count / TOP_QUESTIONS[0].count) * 100, 100)}%`, background: '#8b5cf6', borderRadius: 4 }} />
                      </div>
                      <span style={{ fontSize: 11, color: 'rgba(226,232,240,0.45)' }}>{share}%</span>
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
