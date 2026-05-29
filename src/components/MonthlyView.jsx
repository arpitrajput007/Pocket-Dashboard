import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { dashboardCache } from '../utils/dashboardCache';
import { extractPackSize, loadCostHistory, effectiveCostPrice, effectiveShippingCost } from '../utils/dashboardUtils';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const YEARS  = ['2024','2025','2026'];

const fmt = (n) => '₹' + Math.round(n).toLocaleString('en-IN');

export default function MonthlyView({ store, refreshTrigger }) {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  
  const [orders, setOrders] = useState([]);
  const [pricing, setPricing] = useState({});
  const [loading, setLoading] = useState(false);

  const { mStart, mEnd } = useMemo(() => {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0);
    return { mStart: start, mEnd: end };
  }, [month, year]);

  useEffect(() => {
    if (store?.id && refreshTrigger) dashboardCache.bust(store.id);
  }, [refreshTrigger, store?.id]);

  useEffect(() => {
    if (store?.id) {
      loadPricing();
      fetchOrders();
    }
  }, [store?.id, month, year, refreshTrigger]);

  async function loadPricing() {
    if (!store?.id) return;
    const { data } = await supabase.from('products').select('*').eq('store_id', store.id);
    if (data) {
      const history = await loadCostHistory(supabase, store.id);
      const map = {};
      data.forEach(p => { p._costHistory = history[p.id] || null; map[p.title] = p; map[p.sku] = p; });
      setPricing(map);
    }
  }

  async function fetchOrders() {
    if (!store?.id) return;
    setLoading(true);

    const startStr = `${year}-${String(month).padStart(2, '0')}-01T00:00:00`;
    const endStr = `${year}-${String(month).padStart(2, '0')}-${String(mEnd.getDate()).padStart(2, '0')}T23:59:59`;
    const cacheKey = `${store.id}_monthly_${year}_${month}`;
    const cached = dashboardCache.get(cacheKey);
    if (cached) { setOrders(cached); setLoading(false); return; }

    const { data } = await supabase
      .from('orders')
      .select('id, created_at, total_price, tags, fulfillment_status, financial_status, cancelled_at, shipping_title, line_items')
      .eq('store_id', store.id)
      .gte('created_at', startStr)
      .lte('created_at', endStr)
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
    for (let d = new Date(mStart); d <= mEnd; d.setDate(d.getDate() + 1)) {
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
        
        const orderDate = (o.created_at || '').slice(0, 10);
        (o.line_items || []).forEach(item => {
          const p = pricing[item.title] || pricing[item.sku] || {};
          const cp = effectiveCostPrice(p._costHistory, orderDate, parseFloat(p.cost_price ?? 555));
          const ship = effectiveShippingCost(p._costHistory, orderDate, parseFloat(p.shipping_cost ?? 135));
          const qty = item.quantity || 0;
          const packSize = extractPackSize(item.variant_title);

          if (isDel) {
            dRev += qty * parseFloat(item.price || 0);
            dCost += qty * (cp * packSize + ship);
          } else if (isCanc) {
            dCost += qty * ship;
          }
        });
      });
      
      tOrders += dOrders.length;
      tDelivered += dDel;
      tRevenue += dRev;
      tCost += dCost;
      
      days.push({
        day: d.getDate(),
        orders: dOrders.length,
        delivered: dDel,
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
  }, [orders, pricing, mStart, mEnd]);

  const chartData = {
    labels: daysData.map(d => d.day),
    datasets: [
      {
        label: 'Total Orders',
        data: daysData.map(d => d.orders),
        backgroundColor: '#1e88e5',
        borderRadius: 2
      },
      {
        label: 'Delivered',
        data: daysData.map(d => d.delivered),
        backgroundColor: '#4caf50',
        borderRadius: 2
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: { ticks: { color: '#a0a0a0' }, grid: { color: 'rgba(255,255,255,0.05)' } },
      x: { 
        ticks: { color: '#a0a0a0', autoSkip: false, maxRotation: 0, font: { size: 10 } },
        grid: { display: false } 
      }
    },
    plugins: { legend: { labels: { color: '#a0a0a0' } } }
  };

  return (
    <div style={{ animation: 'fadeInUp 0.35s ease forwards' }}>

      {/* Controls */}
      <div className="controls-bar">
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '17px', fontWeight: 800, color: 'var(--text-main)', marginBottom: '2px', fontFamily: 'Outfit', letterSpacing: '-0.4px' }}>Monthly Report</div>
          <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>Month-over-month performance overview</div>
        </div>
        <select
          value={month}
          onChange={(e) => setMonth(Number(e.target.value))}
          style={{ padding: '9px 14px', background: 'rgba(0,0,0,0.35)', border: '1px solid var(--border)', color: 'white', borderRadius: '9px', fontSize: '13px', colorScheme: 'dark', outline: 'none', cursor: 'pointer', fontFamily: 'Inter', transition: 'border-color 0.2s' }}
          onFocus={e => e.target.style.borderColor = 'var(--primary)'}
          onBlur={e => e.target.style.borderColor = 'var(--border)'}
        >
          {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
        </select>
        <select
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          style={{ padding: '9px 14px', background: 'rgba(0,0,0,0.35)', border: '1px solid var(--border)', color: 'white', borderRadius: '9px', fontSize: '13px', colorScheme: 'dark', outline: 'none', cursor: 'pointer', fontFamily: 'Inter', transition: 'border-color 0.2s' }}
          onFocus={e => e.target.style.borderColor = 'var(--primary)'}
          onBlur={e => e.target.style.borderColor = 'var(--border)'}
        >
          {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <button className="primary" style={{ padding: '9px 20px', fontSize: '13px', fontFamily: 'Outfit', fontWeight: 700 }} onClick={fetchOrders}>
          {loading ? 'Fetching...' : 'Fetch Orders'}
        </button>
      </div>

      {/* Metric Cards */}
      <div className="metrics-grid">
        <div className="metric-card glow-green clickable">
          <div className="metric-label">Monthly Revenue</div>
          <div className="metric-value text-profit">{fmt(totalRevenue)}</div>
          <div className="metric-sub">Delivered orders</div>
          <div style={{ marginTop: '14px', height: '28px', display: 'flex', alignItems: 'flex-end', gap: '3px' }}>
            {[45, 60, 50, 75, 65, 80, 70, 88].map((h, i) => (
              <div key={i} style={{ flex: 1, height: `${h}%`, borderRadius: '3px', background: `rgba(45,212,160,${0.12 + i * 0.11})` }} />
            ))}
          </div>
        </div>
        <div className="metric-card glow-white clickable">
          <div className="metric-label">Total Orders</div>
          <div className="metric-value">{totalOrders}</div>
          <div className="metric-sub">All statuses</div>
          <div style={{ marginTop: '14px', height: '28px', display: 'flex', alignItems: 'flex-end', gap: '3px' }}>
            {[55, 40, 65, 48, 70, 58, 75, 62].map((h, i) => (
              <div key={i} style={{ flex: 1, height: `${h}%`, borderRadius: '3px', background: `rgba(255,255,255,${0.05 + i * 0.025})` }} />
            ))}
          </div>
        </div>
        <div className="metric-card glow-yellow clickable">
          <div className="metric-label">Net P&amp;L</div>
          <div className={`metric-value ${netProfit >= 0 ? 'text-profit' : 'text-loss'}`}>{fmt(netProfit)}</div>
          <div className="metric-sub">Revenue − Costs</div>
          <div style={{ marginTop: '14px', height: '5px', background: 'rgba(255,255,255,0.06)', borderRadius: '3px', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: '100%', background: 'var(--primary-gradient)', borderRadius: '3px' }} />
          </div>
        </div>
      </div>

      {/* P&L Table */}
      <div className="card" style={{ marginBottom: '20px', background: 'rgba(15,15,26,0.7)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <h3 style={{ margin: '0 0 20px 0', fontSize: '15px', fontWeight: 700, fontFamily: 'Outfit', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          Monthly P&amp;L
          <span className={`badge ${netProfit >= 0 ? 'live' : 'demo'}`}>
            {netProfit >= 0 ? 'Profit' : 'Loss'}: {fmt(Math.abs(netProfit))}
          </span>
        </h3>
        <table className="pnll-table" style={{ width: '100%' }}>
          <tbody>
            {[
              ['Gross Revenue (Delivered)', fmt(totalRevenue), null],
              ['− Total Costs (Products + Shipping + RTOs)', fmt(totalCost), 'var(--loss-color)'],
            ].map(([label, val, color], i) => (
              <tr key={i}>
                <td style={{ color: 'var(--text-muted)', fontSize: '13.5px', padding: '13px 0' }}>{label}</td>
                <td style={{ textAlign: 'right', fontWeight: 600, color: color || 'var(--text-main)', padding: '13px 0' }}>{val}</td>
              </tr>
            ))}
            <tr style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
              <td style={{ paddingTop: '16px', fontWeight: 800, fontFamily: 'Outfit', fontSize: '15px' }}>Estimated Net Profit</td>
              <td className={netProfit >= 0 ? 'text-profit' : 'text-loss'} style={{ textAlign: 'right', paddingTop: '16px', fontWeight: 800, fontSize: '20px', fontFamily: 'Outfit', letterSpacing: '-0.5px' }}>
                {fmt(Math.abs(netProfit))} {netProfit >= 0 ? '▲' : '▼'}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Monthly Trend */}
      <div className="card" style={{ background: 'rgba(15,15,26,0.7)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', fontWeight: 700, fontFamily: 'Outfit' }}>Monthly Trend</h3>
        <div style={{ height: '220px', width: '100%' }}>
          <Bar data={chartData} options={chartOptions} />
        </div>
      </div>
    </div>
  );
}
