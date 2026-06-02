import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { isOrderDelivered } from '../utils/dashboardUtils';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend);

export default function BusinessAnalytics({ store, refreshTrigger }) {
  const now = new Date();
  const d30 = new Date(now); d30.setDate(d30.getDate() - 30);
  
  const [startDate, setStartDate] = useState(d30.toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(now.toISOString().split('T')[0]);
  
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (store?.id) {
      fetchOrders();
    }
  }, [store?.id, refreshTrigger]);

  async function fetchOrders() {
    if (!store?.id) return;
    setLoading(true);
    
    const { data } = await supabase
      .from('orders')
      .select('tags')
      .eq('store_id', store.id)
      .gte('created_at', startDate + 'T00:00:00')
      .lte('created_at', endDate + 'T23:59:59');
      
    setOrders(data || []);
    setLoading(false);
  }

  function setPreset(days) {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - days);
    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(end.toISOString().split('T')[0]);
  }
  
  function setThisMonth() {
    const end = new Date();
    const start = new Date(end.getFullYear(), end.getMonth(), 1);
    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(end.toISOString().split('T')[0]);
  }

  const stats = useMemo(() => {
    let delivered = 0;
    let inTransit = 0;
    let rto = 0;
    let canceled = 0;
    let failed = 0;
    let other = 0;

    orders.forEach(o => {
      const tags = (o.tags || '').toLowerCase();
      if (isOrderDelivered(o)) delivered++;
      else if (tags.includes('rto') || tags.includes('returned') || tags.includes('undelivered')) rto++;
      else if (tags.includes('canceled')) canceled++;
      else if (tags.includes('failed')) failed++;
      else if (tags.includes('in transit') || tags.includes('shipped')) inTransit++;
      else other++;
    });

    const total = orders.length;
    const deliveredPct = total > 0 ? (delivered / total) * 100 : 0;
    const rtoPct = total > 0 ? (rto / total) * 100 : 0;
    const canceledPct = total > 0 ? (canceled / total) * 100 : 0;

    return { delivered, inTransit, rto, canceled, failed, other, deliveredPct, rtoPct, canceledPct, total };
  }, [orders]);

  const chartData = {
    labels: ['Delivered', 'In Transit', 'RTO', 'Canceled', 'Failed', 'Other'],
    datasets: [{
      data: [stats.delivered, stats.inTransit, stats.rto, stats.canceled, stats.failed, stats.other],
      backgroundColor: [
        '#34d399', // Delivered
        '#60a5fa', // In Transit
        '#ef4444', // RTO
        '#f87171', // Canceled
        '#f97316', // Failed
        '#9ca3af', // Other
      ],
      borderWidth: 0,
      hoverOffset: 4
    }]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    layout: { padding: 40 },
    color: '#ffffff',
    plugins: {
      legend: {
        position: 'bottom',
        labels: { color: '#a1a1aa', padding: 20, font: { family: 'Inter', size: 12 } }
      }
    },
    cutout: '70%'
  };

  return (
    <div className="view-content active" style={{ animation: 'fadeInUp 0.4s ease forwards' }}>
      <div className="controls-bar glass">
        <div style={{ flex: 1 }}>
          <h2 style={{ margin: 0, fontSize: '20px' }}>Business Analytics Overview</h2>
          <p style={{ margin: '4px 0 0 0', color: 'var(--text-muted)', fontSize: '14px' }}>Analyze delivery & fulfillment performance</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: '6px', marginRight: '10px' }}>
            <button onClick={() => setPreset(0)} className="btn-preset" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', color: 'var(--text-muted)', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', transition: '0.2s' }}>Today</button>
            <button onClick={() => setPreset(7)} className="btn-preset" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', color: 'var(--text-muted)', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', transition: '0.2s' }}>7 Days</button>
            <button onClick={() => setPreset(30)} className="btn-preset" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', color: 'var(--text-muted)', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', transition: '0.2s' }}>30 Days</button>
            <button onClick={setThisMonth} className="btn-preset" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', color: 'var(--text-muted)', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', transition: '0.2s' }}>This Month</button>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>From</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={{ padding: '6px 10px', borderRadius: '4px', border: '1px solid var(--border)', background: 'rgba(0,0,0,0.2)', color: 'white' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>To</label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={{ padding: '6px 10px', borderRadius: '4px', border: '1px solid var(--border)', background: 'rgba(0,0,0,0.2)', color: 'white' }} />
          </div>
          <button className="primary" style={{ alignSelf: 'flex-end', padding: '7px 16px' }} onClick={fetchOrders}>
            {loading ? 'Fetching...' : 'Fetch Data'}
          </button>
        </div>
      </div>

      <div className="metrics-grid">
        <div className="metric-card"><div className="metric-label">Delivery Rate</div><div className="metric-value text-profit">{stats.deliveredPct.toFixed(1)}%</div></div>
        <div className="metric-card"><div className="metric-label">RTO Rate</div><div className="metric-value text-loss">{stats.rtoPct.toFixed(1)}%</div></div>
        <div className="metric-card"><div className="metric-label">Cancellation Rate</div><div className="metric-value text-loss">{stats.canceledPct.toFixed(1)}%</div></div>
      </div>

      <div className="main-grid" style={{ gridTemplateColumns: '1fr' }}>
        <div className="card glass">
          <h3>Order Status Distribution ({stats.total} Orders)</h3>
          <div style={{ position: 'relative', width: '100%', height: '320px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            {stats.total > 0 ? (
               <Doughnut data={chartData} options={chartOptions} />
            ) : (
               <div style={{ color: 'var(--text-dim)' }}>No data available in this range</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
