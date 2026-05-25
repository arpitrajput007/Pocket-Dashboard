import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { dashboardCache } from '../utils/dashboardCache';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const fmt = (n) => '₹' + Math.round(n).toLocaleString('en-IN');

function getWeekStart(d) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
  const start = new Date(date.setDate(diff));
  start.setHours(0,0,0,0);
  return start;
}

export default function WeeklyView({ store, refreshTrigger }) {
  const now = new Date();
  const [weekDate, setWeekDate] = useState(now.toISOString().split('T')[0]);
  
  const [orders, setOrders] = useState([]);
  const [pricing, setPricing] = useState({});
  const [loading, setLoading] = useState(false);

  const { wStart, wEnd } = useMemo(() => {
    const d = new Date(weekDate);
    const start = getWeekStart(d);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    return { wStart: start, wEnd: end };
  }, [weekDate]);

  useEffect(() => {
    if (store?.id && refreshTrigger) dashboardCache.bust(store.id);
  }, [refreshTrigger, store?.id]);

  useEffect(() => {
    if (store?.id) {
      loadPricing();
      fetchOrders();
    }
  }, [store?.id, weekDate, refreshTrigger]);

  async function loadPricing() {
    if (!store?.id) return;
    const { data } = await supabase.from('products').select('*').eq('store_id', store.id);
    if (data) {
      const map = {};
      data.forEach(p => { map[p.title] = p; map[p.sku] = p; });
      setPricing(map);
    }
  }

  async function fetchOrders() {
    if (!store?.id) return;
    setLoading(true);

    const startDateStr = wStart.toISOString().split('T')[0];
    const endDateStr = wEnd.toISOString().split('T')[0];
    const cacheKey = `${store.id}_weekly_${startDateStr}_${endDateStr}`;
    const cached = dashboardCache.get(cacheKey);
    if (cached) { setOrders(cached); setLoading(false); return; }

    const { data } = await supabase
      .from('orders')
      .select('id, created_at, total_price, tags, fulfillment_status, financial_status, cancelled_at, shipping_title, line_items')
      .eq('store_id', store.id)
      .gte('created_at', startDateStr + 'T00:00:00')
      .lte('created_at', endDateStr + 'T23:59:59')
      .order('created_at', { ascending: true });

    setOrders(data || []);
    dashboardCache.set(cacheKey, data || []);
    setLoading(false);
  }

  const { daysData, totalOrders, totalDelivered, totalRevenue, totalCost, netProfit } = useMemo(() => {
    let tOrders = 0;
    let tDelivered = 0;
    let tRevenue = 0;
    let tCost = 0;

    const days = [];
    for (let d = new Date(wStart); d <= wEnd; d.setDate(d.getDate() + 1)) {
      const dStr = d.toISOString().split('T')[0];
      const dOrders = orders.filter(o => o.created_at.startsWith(dStr));
      
      let dDel = 0;
      let dCanc = 0;
      let dRev = 0;
      let dCost = 0;
      
      dOrders.forEach(o => {
        const tags = (o.tags || '').toLowerCase();
        const isDel = tags.includes('delivered');
        const isCanc = tags.includes('canceled') || tags.includes('rto') || tags.includes('returned');
        
        if (isDel) dDel++;
        if (isCanc) dCanc++;
        
        (o.line_items || []).forEach(item => {
          const p = pricing[item.title] || pricing[item.sku] || {};
          const cp = parseFloat(p.cost_price || 555);
          const ship = parseFloat(p.shipping_cost || 135);
          const qty = item.quantity || 0;
          
          if (isDel) {
            dRev += qty * parseFloat(item.price || 0);
            dCost += qty * (cp + ship);
          } else if (isCanc) {
            dCost += qty * ship; // Lost shipping
          }
        });
      });
      
      tOrders += dOrders.length;
      tDelivered += dDel;
      tRevenue += dRev;
      tCost += dCost;
      
      days.push({
        label: d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
        dayLabel: d.toLocaleDateString('en-US', { weekday: 'short' }),
        orders: dOrders.length,
        delivered: dDel,
        canceled: dCanc,
        profit: dRev - dCost
      });
    }

    return { 
      daysData: days, 
      totalOrders: tOrders, 
      totalDelivered: tDelivered, 
      totalRevenue: tRevenue, 
      totalCost: tCost, 
      netProfit: tRevenue - tCost 
    };
  }, [orders, pricing, wStart, wEnd]);

  const chartData = {
    labels: daysData.map(d => d.dayLabel),
    datasets: [
      {
        label: 'Total Orders',
        data: daysData.map(d => d.orders),
        backgroundColor: '#1e88e5',
        borderRadius: 4
      },
      {
        label: 'Delivered',
        data: daysData.map(d => d.delivered),
        backgroundColor: '#4caf50',
        borderRadius: 4
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: { ticks: { color: '#a0a0a0' }, grid: { color: 'rgba(255,255,255,0.05)' } },
      x: { ticks: { color: '#a0a0a0' }, grid: { display: false } }
    },
    plugins: { legend: { labels: { color: '#a0a0a0' } } }
  };

  return (
    <div style={{ animation: 'fadeInUp 0.35s ease forwards' }}>
      <div className="controls-bar">
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)' }}>Weekly Report</div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            {wStart.toLocaleDateString()} to {wEnd.toLocaleDateString()}
          </div>
        </div>
        <div className="date-picker">
          <label style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>Week of:</label>
          <input type="date" value={weekDate} onChange={e => setWeekDate(e.target.value)} />
        </div>
        <button className="primary" style={{ padding: '8px 18px', fontSize: '13px' }} onClick={fetchOrders}>
          {loading ? 'Fetching...' : 'Fetch Orders'}
        </button>
      </div>

      <div className="metrics-grid">
        <div className="metric-card">
          <span className="metric-icon">💰</span>
          <div className="metric-label">Total Revenue</div>
          <div className="metric-value">{fmt(totalRevenue)}</div>
          <div className="metric-sub">Delivered orders only</div>
        </div>
        <div className="metric-card">
          <span className="metric-icon">📦</span>
          <div className="metric-label">Total Orders</div>
          <div className="metric-value">{totalOrders}</div>
          <div className="metric-sub">All statuses</div>
        </div>
        <div className="metric-card">
          <span className="metric-icon">📈</span>
          <div className="metric-label">Net P&L</div>
          <div className={`metric-value ${netProfit >= 0 ? 'text-profit' : 'text-loss'}`}>{fmt(netProfit)}</div>
          <div className="metric-sub">Revenue − Costs</div>
        </div>
      </div>

      <div className="main-grid">
        <div className="card">
          <h3>Daily Breakdown</h3>
          <table className="sheet-table" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th>Day</th>
                <th>Orders</th>
                <th>Delivered</th>
                <th>Canceled</th>
                <th>Net P&L</th>
              </tr>
            </thead>
            <tbody>
              {daysData.map(d => (
                <tr key={d.label}>
                  <td>{d.label}</td>
                  <td>{d.orders}</td>
                  <td>{d.delivered}</td>
                  <td>{d.canceled}</td>
                  <td className={d.profit >= 0 ? 'text-profit' : 'text-loss'}>{fmt(d.profit)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="card">
          <h3>
            Weekly P&L
            <span className={`badge ${netProfit >= 0 ? 'live' : 'demo'}`}>
              {netProfit >= 0 ? 'Profit' : 'Loss'}: {fmt(Math.abs(netProfit))}
            </span>
          </h3>
          <table className="pnll-table" style={{ width: '100%', marginTop: '8px' }}>
            <tbody>
              <tr>
                <td style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Gross Revenue (Delivered)</td>
                <td style={{ textAlign: 'right', fontWeight: 600 }}>{fmt(totalRevenue)}</td>
              </tr>
              <tr>
                <td style={{ color: 'var(--text-muted)', fontSize: '13px' }}>− Total Costs (Product + Shipping + RTOs)</td>
                <td style={{ textAlign: 'right', color: 'var(--loss-color)', fontWeight: 600 }}>{fmt(totalCost)}</td>
              </tr>
              <tr style={{ borderTop: '1px solid var(--border)' }}>
                <td style={{ paddingTop: '14px', fontWeight: 800, fontFamily: 'Outfit' }}>Estimated Net Profit</td>
                <td className={netProfit >= 0 ? 'text-profit' : 'text-loss'} style={{ textAlign: 'right', paddingTop: '14px', fontWeight: 800, fontSize: '18px' }}>
                  {fmt(Math.abs(netProfit))} {netProfit >= 0 ? '▲' : '▼'}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Chart */}
      <div className="card">
        <h3>Weekly Trend</h3>
        <div style={{ height: '220px', width: '100%' }}>
          <Bar data={chartData} options={chartOptions} />
        </div>
      </div>
    </div>
  );
}
