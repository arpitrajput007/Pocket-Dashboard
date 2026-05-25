import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { dashboardCache } from '../utils/dashboardCache';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const fmt = (n) => '₹' + Math.round(n).toLocaleString('en-IN');

export default function AllTimeView({ store, refreshTrigger }) {
  const now = new Date();
  const d365 = new Date(now); d365.setDate(d365.getDate() - 365);
  
  const [startDate, setStartDate] = useState(d365.toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(now.toISOString().split('T')[0]);
  
  const [orders, setOrders] = useState([]);
  const [pricing, setPricing] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (store?.id && refreshTrigger) dashboardCache.bust(store.id);
  }, [refreshTrigger, store?.id]);

  useEffect(() => {
    if (store?.id) {
      loadPricing();
      fetchOrders();
    }
  }, [store?.id, refreshTrigger]);

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

    const cacheKey = `${store.id}_alltime_${startDate}_${endDate}`;
    const cached = dashboardCache.get(cacheKey);
    if (cached) { setOrders(cached); setLoading(false); return; }

    const { data } = await supabase
      .from('orders')
      .select('id, created_at, total_price, tags, fulfillment_status, financial_status, cancelled_at, shipping_title, line_items')
      .eq('store_id', store.id)
      .gte('created_at', startDate + 'T00:00:00')
      .lte('created_at', endDate + 'T23:59:59')
      .order('created_at', { ascending: true });

    setOrders(data || []);
    dashboardCache.set(cacheKey, data || []);
    setLoading(false);
  }

  const { monthsData, totalOrders, totalRevenue, netProfit } = useMemo(() => {
    let tOrders = 0;
    let tRevenue = 0;
    let tCost = 0;

    const monthMap = {};

    orders.forEach(o => {
      const date = new Date(o.created_at);
      const mKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!monthMap[mKey]) {
        monthMap[mKey] = { label: `${MONTHS[date.getMonth()]} ${date.getFullYear()}`, orders: 0, delivered: 0, canceled: 0, revenue: 0, cost: 0 };
      }
      
      const tags = (o.tags || '').toLowerCase();
      const isDel = tags.includes('delivered');
      const isCanc = tags.includes('canceled') || tags.includes('rto') || tags.includes('returned');
      
      monthMap[mKey].orders++;
      tOrders++;
      
      if (isDel) monthMap[mKey].delivered++;
      if (isCanc) monthMap[mKey].canceled++;
      
      (o.line_items || []).forEach(item => {
        const p = pricing[item.title] || pricing[item.sku] || {};
        const cp = parseFloat(p.cost_price || 555);
        const ship = parseFloat(p.shipping_cost || 135);
        const qty = item.quantity || 0;
        
        if (isDel) {
          const rev = qty * parseFloat(item.price || 0);
          const cost = qty * (cp + ship);
          monthMap[mKey].revenue += rev;
          monthMap[mKey].cost += cost;
          tRevenue += rev;
          tCost += cost;
        } else if (isCanc) {
          const cost = qty * ship;
          monthMap[mKey].cost += cost;
          tCost += cost;
        }
      });
    });

    const mData = Object.keys(monthMap).sort().map(k => ({
      ...monthMap[k],
      profit: monthMap[k].revenue - monthMap[k].cost
    }));

    return { 
      monthsData: mData, 
      totalOrders: tOrders, 
      totalRevenue: tRevenue, 
      netProfit: tRevenue - tCost 
    };
  }, [orders, pricing]);

  const forceSync = async () => {
    if (!store?.id) return;
    setLoading(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || '';
      await fetch(`${apiUrl}/api/sync/${store.id}`, { method: 'POST' });
      alert('Sync triggered successfully! Data will populate in the background.');
    } catch(e) {
      alert('Sync failed: ' + e.message);
    }
    setLoading(false);
  };

  const chartData = {
    labels: monthsData.map(m => m.label),
    datasets: [
      {
        label: 'Revenue',
        data: monthsData.map(m => m.revenue),
        backgroundColor: '#4caf50',
        borderRadius: 2
      },
      {
        label: 'Net P&L',
        data: monthsData.map(m => m.profit),
        backgroundColor: monthsData.map(m => m.profit >= 0 ? '#34d399' : '#fb7185'),
        borderRadius: 2
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
    <div className="view-content active" style={{ animation: 'fadeInUp 0.4s ease forwards' }}>

      {/* Controls */}
      <div className="controls-bar glass">
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '17px', fontWeight: 800, fontFamily: 'Outfit', color: 'var(--text-main)', letterSpacing: '-0.4px' }}>
            Lifetime / Custom Analytics
          </div>
          <p style={{ margin: '3px 0 0 0', color: 'var(--text-muted)', fontSize: '11.5px' }}>Full historical performance across all synced orders</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '12px', flexWrap: 'wrap' }}>
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-dim)', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>From</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={{ padding: '8px 12px', borderRadius: '9px', border: '1px solid var(--border)', background: 'rgba(0,0,0,0.3)', color: 'white', colorScheme: 'dark', outline: 'none', fontSize: '13px', transition: 'border-color 0.2s, box-shadow 0.2s' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-dim)', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>To</label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={{ padding: '8px 12px', borderRadius: '9px', border: '1px solid var(--border)', background: 'rgba(0,0,0,0.3)', color: 'white', colorScheme: 'dark', outline: 'none', fontSize: '13px', transition: 'border-color 0.2s, box-shadow 0.2s' }} />
          </div>
          <button className="primary" style={{ padding: '9px 20px', fontSize: '13px', fontFamily: 'Outfit', fontWeight: 700 }} onClick={fetchOrders}>
            {loading ? '...' : 'Apply'}
          </button>
          <button style={{ padding: '9px 16px', fontSize: '13px', background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)', color: '#60a5fa', borderRadius: '9px', cursor: 'pointer', fontFamily: 'Inter', transition: 'all 0.2s' }}
            onClick={forceSync}
          >🔄 Force Sync</button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="metrics-grid">
        <div className="metric-card glow-green clickable">
          <div className="metric-label">Lifetime Revenue</div>
          <div className="metric-value text-profit">{fmt(totalRevenue)}</div>
          <div className="metric-sub">All delivered orders ever</div>
        </div>
        <div className="metric-card glow-white clickable">
          <div className="metric-label">Total Orders</div>
          <div className="metric-value">{totalOrders}</div>
          <div className="metric-sub">Across all time</div>
        </div>
        <div className="metric-card glow-yellow clickable">
          <div className="metric-label">Lifetime P&amp;L</div>
          <div className={`metric-value ${netProfit >= 0 ? 'text-profit' : 'text-loss'}`}>{fmt(netProfit)}</div>
          <div className="metric-sub">Revenue − All Costs</div>
        </div>
      </div>

      {/* Lifetime Orders Card */}
      <div className="main-grid" style={{ gridTemplateColumns: '1fr', marginBottom: '24px' }}>
        <div className="card glass" style={{ background: 'rgba(15,15,26,0.7)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
            <div>
              <h3 style={{ margin: '0 0 4px 0', fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px' }}>Lifetime Trends</h3>
              <div style={{ fontSize: '36px', fontWeight: 800, color: 'white', fontFamily: 'Outfit', letterSpacing: '-1.5px' }}>{totalOrders}</div>
            </div>
          </div>
          <div style={{ position: 'relative', width: '100%', height: '280px', display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column', gap: '12px' }}>
            {monthsData.length > 0 ? (
               <Bar data={chartData} options={chartOptions} />
            ) : (
               <span style={{ color: 'var(--text-dim)', fontSize: '13.5px', textAlign: 'center' }}>No data in this date range</span>
            )}
          </div>
        </div>
      </div>

      {/* Performance by Month table */}
      <div className="card glass" style={{ background: 'rgba(15,15,26,0.7)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <h3 style={{ margin: '0 0 20px 0', fontSize: '15px', fontWeight: 700, fontFamily: 'Outfit' }}>Performance by Month</h3>
        <table className="pnll-table" style={{ width: '100%' }}>
          <thead>
            <tr>
              {['Month', 'Orders', 'Delivered', 'Canceled', 'Net P&L'].map((col, i) => (
                <th key={i} style={{ textAlign: i === 4 ? 'right' : 'left', paddingBottom: '10px', borderBottom: '1px solid rgba(255,255,255,0.07)', fontSize: '10.5px', letterSpacing: '0.8px' }}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {monthsData.length > 0 ? monthsData.map(m => (
              <tr key={m.label}>
                <td style={{ padding: '12px 0' }}>{m.label}</td>
                <td style={{ padding: '12px 0' }}>{m.orders}</td>
                <td style={{ padding: '12px 0' }}>{m.delivered}</td>
                <td style={{ padding: '12px 0' }}>{m.canceled}</td>
                <td style={{ padding: '12px 0', textAlign: 'right' }} className={m.profit >= 0 ? 'text-profit' : 'text-loss'}>{fmt(m.profit)}</td>
              </tr>
            )) : (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', padding: '36px 20px', color: 'var(--text-dim)', fontSize: '13.5px', lineHeight: 1.7 }}>
                  <div style={{ opacity: 0.5, fontSize: '28px', marginBottom: '10px' }}>🗓️</div>
                  No data synced yet. Click <strong style={{ color: 'var(--text-muted)' }}>Force Sync</strong> to load historical data
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
