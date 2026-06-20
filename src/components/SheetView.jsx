import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const STATUS_FILTERS = ['All Statuses', 'Delivered', 'Paid', 'Pending', 'Canceled'];

const fmt = (n) => '₹' + Math.round(n).toLocaleString('en-IN');

function downloadCSV(rows, filename) {
  const headers = ['Order', 'Customer', 'Total (₹)', 'Tags', 'Date'];
  const lines = [
    headers.join(','),
    ...rows.map(o => [
      o.name || '',
      `"${((o.customer_fn || '') + ' ' + (o.customer_ln || '')).trim()}"`,
      Math.round(parseFloat(o.total_price || 0)),
      `"${(o.tags || '').replace(/"/g, '""')}"`,
      new Date(o.created_at).toLocaleDateString('en-IN'),
    ].join(',')),
  ];
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export default function SheetView({ store, refreshTrigger }) {
  const [statusFilter, setStatusFilter] = useState('All Statuses');

  const now = new Date();
  const d30 = new Date(now); d30.setDate(d30.getDate() - 30);
  const [startDate, setStartDate] = useState(d30.toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(now.toISOString().split('T')[0]);

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (store?.id) fetchOrders();
  }, [store?.id, refreshTrigger]);

  async function fetchOrders() {
    if (!store?.id) return;
    setLoading(true);
    const { data } = await supabase
      .from('orders')
      .select('*')
      .eq('store_id', store.id)
      .gte('created_at', startDate + 'T00:00:00')
      .lte('created_at', endDate + 'T23:59:59')
      .order('created_at', { ascending: false });
    setOrders(data || []);
    setLoading(false);
  }

  const filteredOrders = orders.filter(o => {
    const s = search.toLowerCase();
    const matchesSearch = !s || (o.name?.toLowerCase().includes(s) || o.customer_fn?.toLowerCase().includes(s) || o.tags?.toLowerCase().includes(s));
    
    if (!matchesSearch) return false;
    
    const t = o.tags?.toLowerCase() || '';
    if (statusFilter === 'All Statuses') return true;
    if (statusFilter === 'Delivered' && t.includes('delivered')) return true;
    if (statusFilter === 'Paid' && t.includes('paid')) return true;
    if (statusFilter === 'Pending' && t.includes('pending')) return true;
    if (statusFilter === 'Canceled' && (t.includes('canceled') || t.includes('rto') || t.includes('returned'))) return true;
    return false;
  });

  return (
    <div style={{ animation: 'fadeInUp 0.35s ease forwards' }}>
      {/* Top controls */}
      <div className="controls-bar">
        <div className="date-picker">
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
          <span style={{ color: 'var(--text-dim)', fontSize: '12px' }}>→</span>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
        </div>
        <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto' }}>
          <button className="primary" style={{ fontSize: '13px', padding: '8px 16px' }} onClick={fetchOrders}>
            {loading ? 'Fetching...' : 'Fetch Details'}
          </button>
          <button
            onClick={() => downloadCSV(filteredOrders, `${store?.store_name || 'orders'}-${startDate}-${endDate}.csv`)}
            disabled={filteredOrders.length === 0}
            style={{ fontSize: '12px', padding: '8px 14px', opacity: filteredOrders.length === 0 ? 0.4 : 1, cursor: filteredOrders.length === 0 ? 'not-allowed' : 'pointer' }}
          >⬇ Export CSV ({filteredOrders.length})</button>
        </div>
      </div>

      {/* Filter row */}
      <div className="controls-bar" style={{ marginTop: '-8px', gap: '12px' }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: 1, maxWidth: '380px' }}>
          <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '14px', opacity: 0.4, pointerEvents: 'none' }}>🔍</span>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search orders, customers, tags..."
            style={{ width: '100%', padding: '8px 12px 8px 36px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border)', borderRadius: '6px', color: 'white', fontSize: '13px', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
          />
        </div>

        {/* Status chips */}
        <div className="filter-chips">
          {STATUS_FILTERS.map(s => (
            <div
              key={s}
              className={`filter-chip ${statusFilter === s ? 'active' : ''}`}
              onClick={() => setStatusFilter(s)}
            >
              {s}
            </div>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="sheet-container">
        <div style={{ overflowX: 'auto' }}>
          <table className="sheet-table">
            <thead>
              <tr>
                <th style={{ width: '100px', cursor: 'pointer' }}>Order ↕</th>
                <th style={{ width: '150px', cursor: 'pointer' }}>Customer ↕</th>
                <th style={{ width: '110px', cursor: 'pointer' }}>Total ↕</th>
                <th style={{ width: '100px' }}>Status</th>
                <th>Tags</th>
                <th style={{ width: '130px', cursor: 'pointer' }}>Date ↕</th>
              </tr>
            </thead>
              {loading ? (
                <tr>
                  <td colSpan="6" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-dim)' }}>
                    Loading orders...
                  </td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan="6">
                    <div className="empty-state">
                      <div className="empty-state-icon">📋</div>
                      <div className="empty-state-text">No orders found</div>
                      <div className="empty-state-sub">Adjust your date range or filters</div>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredOrders.map(o => {
                  const tags = (o.tags || '').split(',').map(t => t.trim()).filter(Boolean);
                  const tagRender = tags.map(t => (
                    <span key={t} style={{
                      padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 600,
                      background: t.toLowerCase() === 'delivered' ? 'rgba(52,211,153,0.1)' : t.toLowerCase() === 'rto' ? 'rgba(251,113,133,0.1)' : 'rgba(255,255,255,0.05)',
                      color: t.toLowerCase() === 'delivered' ? '#34d399' : t.toLowerCase() === 'rto' ? '#fb7185' : 'var(--text-muted)',
                      border: `1px solid ${t.toLowerCase() === 'delivered' ? 'rgba(52,211,153,0.2)' : t.toLowerCase() === 'rto' ? 'rgba(251,113,133,0.2)' : 'rgba(255,255,255,0.1)'}`,
                      marginRight: '4px'
                    }}>{t}</span>
                  ));

                  return (
                    <tr key={o.id}>
                      <td style={{ fontWeight: 600, color: 'var(--text-main)' }}>{o.name}</td>
                      <td>{o.customer_fn} {o.customer_ln}</td>
                      <td style={{ fontWeight: 500 }}>{fmt(o.total_price)}</td>
                      <td>-</td>
                      <td style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>{tagRender}</td>
                      <td style={{ fontSize: '12px', color: 'var(--text-dim)' }}>
                        {new Date(o.created_at).toLocaleDateString()} {new Date(o.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                    </tr>
                  );
                })
              )}
          </table>
        </div>
      </div>
    </div>
  );
}
