import React, { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '../supabaseClient';
import {
  Search, Eye, EyeOff, TrendingUp, TrendingDown,
  Package, RefreshCw, Download, AlertCircle, ChevronDown, ChevronUp, Upload
} from 'lucide-react';
import { loadCostHistory, effectiveCostPrice, effectiveShippingCost, getStoreCosts } from '../utils/dashboardUtils';

const fmt = (n) => '₹' + Math.round(n).toLocaleString('en-IN');

function toDateStr(d) {
  return d.toISOString().split('T')[0];
}

function StatCard({ label, value, sub, color = '#fff', glow }) {
  return (
    <div style={{
      padding: '18px 20px', borderRadius: '14px',
      background: `linear-gradient(135deg, ${glow ? glow.replace('1)', '0.08)') : 'rgba(255,255,255,0.03)'}, transparent)`,
      border: `1px solid ${glow ? glow.replace('1)', '0.2)') : 'rgba(255,255,255,0.07)'}`,
      flex: '1', minWidth: '120px',
    }}>
      <div style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '8px' }}>{label}</div>
      <div style={{ fontSize: '22px', fontWeight: 800, color, fontFamily: 'Outfit, sans-serif', letterSpacing: '-0.5px' }}>{value}</div>
      {sub && <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginTop: '4px' }}>{sub}</div>}
    </div>
  );
}

export default function ProductsView({ store, refreshTrigger }) {
  const now = new Date();
  const d30 = new Date(now); d30.setDate(d30.getDate() - 30);

  const [startDate, setStartDate] = useState(toDateStr(d30));
  const [endDate, setEndDate] = useState(toDateStr(now));
  const [orders, setOrders] = useState([]);
  const [pricing, setPricing] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [hiddenProducts, setHiddenProducts] = useState(() => {
    try { return JSON.parse(localStorage.getItem('hidden_products') || '{}'); } catch { return {}; }
  });
  const [showHidden, setShowHidden] = useState(false);
  const [sortCol, setSortCol] = useState('revenue');
  const [sortDir, setSortDir] = useState('desc');
  const [fetched, setFetched] = useState(false);
  const [catalogProducts, setCatalogProducts] = useState([]);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const csvImportRef = useRef(null);

  // Store-configured cost defaults
  const storeCosts = useMemo(() => getStoreCosts(store), [store]);

  useEffect(() => {
    if (store?.id) {
      loadPricing();
      fetchOrders();
    }
  }, [store?.id, refreshTrigger]);

  async function syncAndRefresh() {
    if (!store?.id || syncing) return;
    setSyncing(true);
    try {
      await fetch(`/api/sync/${store.id}`, { method: 'POST' });
      await loadPricing();
      await fetchOrders();
    } catch (e) {
      setError('Sync failed: ' + e.message);
    } finally {
      setSyncing(false);
    }
  }

  async function loadPricing() {
    if (!store?.id) return;
    const { data } = await supabase.from('products').select('*').eq('store_id', store.id);
    if (data) {
      const history = await loadCostHistory(supabase, store.id);
      const map = {};
      data.forEach(p => { p._costHistory = history[p.id] || null; map[p.title] = p; if (p.sku) map[p.sku] = p; });
      setPricing(map);
      setCatalogProducts(data);
      if (data.length > 0) setFetched(true);
    }
  }

  async function fetchOrders() {
    if (!store?.id) return;
    setLoading(true); setError(null);
    const { data, error: err } = await supabase
      .from('orders')
      .select('*')
      .eq('store_id', store.id)
      .gte('created_at', startDate + 'T00:00:00')
      .lte('created_at', endDate + 'T23:59:59');
    setLoading(false);
    if (err) { setError(err.message); return; }
    setOrders(data || []);
    setFetched(true);
  }

  const products = useMemo(() => {
    // Phase 1: build date-accurate order stats per product title
    const orderStats = {};
    orders.forEach(order => {
      const items = order.line_items || [];
      const tags = (order.tags || []);
      const tagStr = Array.isArray(tags) ? tags.join(',') : tags;
      const isDelivered = tagStr.toLowerCase().includes('delivered');
      const orderDate = (order.created_at || '').slice(0, 10);
      items.forEach(item => {
        const title = item.title || 'Unknown';
        if (!orderStats[title]) orderStats[title] = { sku: item.sku || '', sold: 0, revenue: 0, delivered: 0, cost: 0 };
        orderStats[title].sold += (item.quantity || 0);
        if (isDelivered) {
          const qty = item.quantity || 0;
          const p = pricing[title] || pricing[item.sku] || {};
          const cp = effectiveCostPrice(p._costHistory, orderDate, parseFloat(p.cost_price ?? 0));
          const ship = effectiveShippingCost(p._costHistory, orderDate, parseFloat(p.shipping_cost ?? storeCosts.shippingCost));
          orderStats[title].revenue += qty * parseFloat(item.price || 0);
          orderStats[title].delivered += qty;
          orderStats[title].cost += qty * (cp + ship);
        }
      });
    });

    // Phase 2: catalog products as base — show all, overlay order stats where available
    const result = [];
    const seen = new Set();

    catalogProducts.forEach(p => {
      seen.add(p.title);
      const stats = orderStats[p.title] || { sold: 0, revenue: 0, delivered: 0, cost: 0 };
      const cp = parseFloat(p.cost_price ?? 0);
      const ship = parseFloat(p.shipping_cost ?? storeCosts.shippingCost);
      const profit = stats.revenue - stats.cost;
      const margin = stats.revenue > 0 ? (profit / stats.revenue * 100) : 0;
      result.push({ title: p.title, sku: p.sku || '', sold: stats.sold, revenue: stats.revenue, cost: stats.cost, cp, ship, profit, margin });
    });

    // Also include sold products no longer in the catalog (e.g. deleted from Shopify)
    Object.entries(orderStats).forEach(([title, stats]) => {
      if (seen.has(title)) return;
      const p = pricing[title] || pricing[stats.sku] || {};
      const cp = parseFloat(p.cost_price ?? 0);
      const ship = parseFloat(p.shipping_cost ?? storeCosts.shippingCost);
      const profit = stats.revenue - stats.cost;
      const margin = stats.revenue > 0 ? (profit / stats.revenue * 100) : 0;
      result.push({ title, sku: stats.sku || '', sold: stats.sold, revenue: stats.revenue, cost: stats.cost, cp, ship, profit, margin });
    });

    return result;
  }, [orders, pricing, catalogProducts, storeCosts]);

  const sorted = useMemo(() => {
    const list = [...products].filter(p =>
      (showHidden ? hiddenProducts[p.title] : !hiddenProducts[p.title]) &&
      p.title.toLowerCase().includes(search.toLowerCase())
    );
    list.sort((a, b) => {
      const av = a[sortCol] ?? 0, bv = b[sortCol] ?? 0;
      return sortDir === 'desc' ? bv - av : av - bv;
    });
    return list;
  }, [products, hiddenProducts, showHidden, search, sortCol, sortDir]);

  const hiddenCount = Object.keys(hiddenProducts).length;

  const totals = useMemo(() => sorted.reduce((acc, p) => ({
    sold: acc.sold + p.sold,
    revenue: acc.revenue + p.revenue,
    cost: acc.cost + p.cost,
    profit: acc.profit + p.profit,
  }), { sold: 0, revenue: 0, cost: 0, profit: 0 }), [sorted]);

  function toggleHide(title) {
    const next = { ...hiddenProducts };
    if (next[title]) delete next[title]; else next[title] = true;
    setHiddenProducts(next);
    localStorage.setItem('hidden_products', JSON.stringify(next));
  }

  function handleSort(col) {
    if (sortCol === col) setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    else { setSortCol(col); setSortDir('desc'); }
  }

  function downloadCostTemplate() {
    const csv = 'SKU,Product Title,Cost Price (INR),Shipping Cost (INR)\nSKU001,Example T-Shirt,250,135\nSKU002,Example Hoodie Pack,450,160\n';
    const a = document.createElement('a');
    a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
    a.download = 'cost_import_template.csv'; a.click();
  }

  async function handleCostImport(e) {
    const file = e.target.files?.[0];
    if (!file || !store?.id) return;
    e.target.value = '';

    let text;
    try { text = await file.text(); } catch { return; }

    const lines = text.trim().split(/\r?\n/).filter(Boolean);
    if (lines.length < 2) { alert('CSV is empty or has no data rows.'); return; }

    const header = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, '').toLowerCase());
    const skuIdx  = header.findIndex(h => h.includes('sku'));
    const titleIdx = header.findIndex(h => h.includes('title') || h.includes('product'));
    const cpIdx   = header.findIndex(h => h.includes('cost') && !h.includes('shipping'));
    const shipIdx = header.findIndex(h => h.includes('shipping'));

    if (cpIdx === -1) { alert('CSV must have a "Cost Price" column.'); return; }

    setImporting(true);

    // Fetch all current products for this store to match rows by SKU / title
    const { data: existingProducts } = await supabase
      .from('products').select('id, sku, title').eq('store_id', store.id);

    let updated = 0, skipped = 0;
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''));
      const sku   = skuIdx  >= 0 ? cols[skuIdx]  : '';
      const title = titleIdx >= 0 ? cols[titleIdx] : '';
      const cp    = parseFloat(cols[cpIdx]);
      const ship  = shipIdx >= 0 ? parseFloat(cols[shipIdx]) : null;

      if (isNaN(cp)) { skipped++; continue; }

      const match = (existingProducts || []).find(p =>
        (sku   && p.sku   && p.sku.toLowerCase()   === sku.toLowerCase()) ||
        (title && p.title && p.title.toLowerCase() === title.toLowerCase())
      );
      if (!match) { skipped++; continue; }

      const patch = { cost_price: cp };
      if (ship != null && !isNaN(ship) && ship >= 0) patch.shipping_cost = ship;
      const { error: ue } = await supabase.from('products').update(patch).eq('id', match.id);
      if (!ue) updated++; else skipped++;
    }

    await loadPricing();
    setImporting(false);
    setImportResult({ updated, skipped });
    setTimeout(() => setImportResult(null), 6000);
  }

  function exportCSV() {
    const rows = [['Product', 'SKU', 'Units Sold', 'Revenue', 'Cost', 'Net Profit', 'Margin %']];
    sorted.forEach(p => rows.push([p.title, p.sku, p.sold, p.revenue.toFixed(0), p.cost.toFixed(0), p.profit.toFixed(0), p.margin.toFixed(1) + '%']));
    const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const a = document.createElement('a'); a.href = 'data:text/csv;charset=utf-8,' + encodeURI(csv);
    a.download = `products_${startDate}_${endDate}.csv`; a.click();
  }

  const SortIcon = ({ col }) => {
    if (sortCol !== col) return <ChevronDown size={12} style={{ opacity: 0.3 }} />;
    return sortDir === 'desc' ? <ChevronDown size={12} style={{ color: 'rgba(167,139,250,1)' }} /> : <ChevronUp size={12} style={{ color: 'rgba(167,139,250,1)' }} />;
  };

  const colStyle = (col) => ({
    padding: '11px 14px', textAlign: 'left', fontSize: '11px', fontWeight: 700,
    color: sortCol === col ? 'rgba(167,139,250,0.9)' : 'rgba(255,255,255,0.3)',
    textTransform: 'uppercase', letterSpacing: '0.5px', cursor: 'pointer',
    userSelect: 'none', background: 'rgba(0,0,0,0.3)',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    whiteSpace: 'nowrap',
  });

  if (!store?.shopify_domain) {
    return (
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:'60vh', gap:'16px', textAlign:'center', padding:'40px' }}>
        <Package size={48} color="rgba(167,139,250,0.5)" strokeWidth={1.2} />
        <div style={{ fontFamily:'Outfit', fontSize:'22px', fontWeight:800, color:'#fff' }}>No Store Connected</div>
        <div style={{ color:'rgba(255,255,255,0.4)', fontSize:'14px', maxWidth:'360px', lineHeight:1.7 }}>
          Connect your Shopify store first to start analysing product performance.
        </div>
      </div>
    );
  }

  return (
    <div style={{ animation: 'fadeInUp 0.35s ease' }}>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'24px', flexWrap:'wrap', gap:'12px' }}>
        <div>
          <h2 style={{ fontFamily:'Outfit', fontSize:'22px', fontWeight:800, color:'#fff', margin:'0 0 4px 0' }}>Product Analytics</h2>
          <p style={{ margin:0, fontSize:'13px', color:'rgba(255,255,255,0.4)' }}>Revenue, cost & net profit by product</p>
        </div>
        <div style={{ display:'flex', gap:'10px', flexWrap:'wrap', alignItems:'center' }}>
          <button onClick={() => setShowHidden(s => !s)} style={{
            display:'flex', alignItems:'center', gap:'7px', padding:'9px 16px', borderRadius:'10px',
            background: showHidden ? 'rgba(251,191,36,0.12)' : 'rgba(255,255,255,0.05)',
            border: showHidden ? '1px solid rgba(251,191,36,0.3)' : '1px solid rgba(255,255,255,0.08)',
            color: showHidden ? 'rgba(251,191,36,0.9)' : 'rgba(255,255,255,0.5)',
            cursor:'pointer', fontSize:'13px', fontWeight:600, transition:'all 0.2s',
          }}>
            {showHidden ? <Eye size={15}/> : <EyeOff size={15}/>}
            {showHidden ? 'Showing Hidden' : `Hidden (${hiddenCount})`}
          </button>

          {/* Hidden CSV file input */}
          <input ref={csvImportRef} type="file" accept=".csv" style={{ display:'none' }} onChange={handleCostImport} />

          <button onClick={downloadCostTemplate} style={{
            display:'flex', alignItems:'center', gap:'7px', padding:'9px 16px', borderRadius:'10px',
            background:'rgba(251,191,36,0.08)', border:'1px solid rgba(251,191,36,0.2)',
            color:'rgba(251,191,36,0.8)', cursor:'pointer', fontSize:'13px', fontWeight:600, transition:'all 0.2s',
          }} title="Download CSV template">
            <Download size={15}/> Template
          </button>

          <button onClick={() => csvImportRef.current?.click()} disabled={importing} style={{
            display:'flex', alignItems:'center', gap:'7px', padding:'9px 16px', borderRadius:'10px',
            background: importing ? 'rgba(99,102,241,0.12)' : 'rgba(99,102,241,0.1)', border:'1px solid rgba(99,102,241,0.25)',
            color:'rgba(167,139,250,0.9)', cursor: importing ? 'not-allowed' : 'pointer', fontSize:'13px', fontWeight:600, transition:'all 0.2s',
          }}>
            <Upload size={15}/> {importing ? 'Importing…' : 'Import Costs CSV'}
          </button>

          <button onClick={syncAndRefresh} disabled={syncing} style={{
            display:'flex', alignItems:'center', gap:'7px', padding:'9px 16px', borderRadius:'10px',
            background: syncing ? 'rgba(167,139,250,0.06)' : 'rgba(167,139,250,0.1)', border:'1px solid rgba(167,139,250,0.25)',
            color:'rgba(167,139,250,0.9)', cursor: syncing ? 'not-allowed' : 'pointer', fontSize:'13px', fontWeight:600, transition:'all 0.2s', opacity: syncing ? 0.7 : 1,
          }}>
            <RefreshCw size={15} style={{ animation: syncing ? 'spin 1s linear infinite' : 'none' }}/> {syncing ? 'Syncing…' : 'Sync Now'}
          </button>

          <button onClick={exportCSV} style={{
            display:'flex', alignItems:'center', gap:'7px', padding:'9px 16px', borderRadius:'10px',
            background:'rgba(52,211,153,0.08)', border:'1px solid rgba(52,211,153,0.2)',
            color:'rgba(52,211,153,0.85)', cursor:'pointer', fontSize:'13px', fontWeight:600, transition:'all 0.2s',
          }}>
            <Download size={15}/> Export CSV
          </button>
        </div>
      </div>

      {/* Controls */}
      <div style={{
        display:'flex', gap:'12px', alignItems:'center', padding:'16px 18px', borderRadius:'14px',
        background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', marginBottom:'20px', flexWrap:'wrap',
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:'8px', flexWrap:'wrap' }}>
          <label style={{ fontSize:'12px', color:'rgba(255,255,255,0.4)', fontWeight:600 }}>From</label>
          <input type="date" value={startDate} onChange={e=>setStartDate(e.target.value)} style={{ padding:'8px 10px', borderRadius:'8px', border:'1px solid rgba(255,255,255,0.1)', background:'rgba(0,0,0,0.4)', color:'white', colorScheme:'dark', fontSize:'13px', outline:'none' }} />
          <label style={{ fontSize:'12px', color:'rgba(255,255,255,0.4)', fontWeight:600 }}>To</label>
          <input type="date" value={endDate} onChange={e=>setEndDate(e.target.value)} style={{ padding:'8px 10px', borderRadius:'8px', border:'1px solid rgba(255,255,255,0.1)', background:'rgba(0,0,0,0.4)', color:'white', colorScheme:'dark', fontSize:'13px', outline:'none' }} />
        </div>
        <button onClick={fetchOrders} disabled={loading} style={{
          display:'flex', alignItems:'center', gap:'8px', padding:'9px 20px', borderRadius:'10px', border:'none',
          background:'linear-gradient(135deg, rgba(167,139,250,1), rgba(56,189,248,1))',
          color:'#000', fontWeight:700, fontSize:'13px', cursor:loading?'not-allowed':'pointer', opacity:loading?0.7:1,
        }}>
          <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          {loading ? 'Analyzing...' : 'Analyze Products'}
        </button>
        <div style={{ flex:1, minWidth:'160px', position:'relative' }}>
          <Search size={14} style={{ position:'absolute', left:'10px', top:'50%', transform:'translateY(-50%)', color:'rgba(255,255,255,0.3)' }} />
          <input
            value={search} onChange={e=>setSearch(e.target.value)}
            placeholder="Search products..."
            style={{ width:'100%', padding:'8px 10px 8px 32px', borderRadius:'8px', border:'1px solid rgba(255,255,255,0.08)', background:'rgba(0,0,0,0.3)', color:'white', fontSize:'13px', outline:'none', boxSizing:'border-box' }}
          />
        </div>
      </div>

      {/* Import result */}
      {importResult && (
        <div style={{ display:'flex', gap:'10px', alignItems:'center', padding:'14px 18px', borderRadius:'12px', marginBottom:'16px', background:'rgba(52,211,153,0.08)', border:'1px solid rgba(52,211,153,0.2)', color:'#34d399', fontSize:'13px' }}>
          ✅ Updated <strong>{importResult.updated}</strong> product{importResult.updated !== 1 ? 's' : ''} · {importResult.skipped} row{importResult.skipped !== 1 ? 's' : ''} skipped (no match or invalid)
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{ display:'flex', gap:'10px', alignItems:'center', padding:'14px 18px', borderRadius:'12px', marginBottom:'16px', background:'rgba(251,113,133,0.08)', border:'1px solid rgba(251,113,133,0.2)', color:'#fb7185', fontSize:'13px' }}>
          <AlertCircle size={16}/>{error}
        </div>
      )}

      {/* Summary Cards */}
      {fetched && sorted.length > 0 && (
        <div style={{ display:'flex', gap:'12px', marginBottom:'20px', flexWrap:'wrap' }}>
          <StatCard label="Products" value={sorted.length} sub="in range" color="#fff" />
          <StatCard label="Units Sold" value={totals.sold.toLocaleString('en-IN')} color="rgba(56,189,248,1)" glow="rgba(56,189,248,1)" />
          <StatCard label="Gross Revenue" value={fmt(totals.revenue)} sub="Delivered only" color="#fff" />
          <StatCard label="Total Cost" value={fmt(totals.cost)} color="rgba(251,113,133,1)" glow="rgba(251,113,133,1)" />
          <StatCard
            label="Net Profit"
            value={fmt(totals.profit)}
            sub={`${totals.revenue > 0 ? ((totals.profit / totals.revenue) * 100).toFixed(1) : 0}% margin`}
            color={totals.profit >= 0 ? 'rgba(52,211,153,1)' : 'rgba(251,113,133,1)'}
            glow={totals.profit >= 0 ? 'rgba(52,211,153,1)' : 'rgba(251,113,133,1)'}
          />
        </div>
      )}

      {/* Table */}
      <div style={{ borderRadius:'16px', border:'1px solid rgba(255,255,255,0.08)', overflow:'hidden', background:'rgba(0,0,0,0.25)' }}>
        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', minWidth:'640px' }}>
            <thead>
              <tr>
                <th style={colStyle('title')} onClick={()=>handleSort('title')}>Product <SortIcon col="title"/></th>
                <th style={{...colStyle('sold'), textAlign:'right'}} onClick={()=>handleSort('sold')}>Sold <SortIcon col="sold"/></th>
                <th style={{...colStyle('revenue'), textAlign:'right'}} onClick={()=>handleSort('revenue')}>Revenue <SortIcon col="revenue"/></th>
                <th style={{...colStyle('cost'), textAlign:'right'}} onClick={()=>handleSort('cost')}>Cost <SortIcon col="cost"/></th>
                <th style={{...colStyle('profit'), textAlign:'right'}} onClick={()=>handleSort('profit')}>Net Profit <SortIcon col="profit"/></th>
                <th style={{...colStyle('margin'), textAlign:'right'}} onClick={()=>handleSort('margin')}>Margin <SortIcon col="margin"/></th>
                <th style={{ ...colStyle(''), cursor:'default', textAlign:'center' }}>Visibility</th>
              </tr>
            </thead>
            <tbody>
              {!fetched ? (
                <tr><td colSpan={7} style={{ padding:'60px', textAlign:'center', color:'rgba(255,255,255,0.25)', fontSize:'14px' }}>
                  <Package size={32} style={{ opacity:0.3, marginBottom:'12px', display:'block', margin:'0 auto 12px' }} />
                  Loading products…
                </td></tr>
              ) : sorted.length === 0 ? (
                <tr><td colSpan={7} style={{ padding:'60px', textAlign:'center', color:'rgba(255,255,255,0.25)', fontSize:'14px' }}>
                  {showHidden ? 'No hidden products' : 'No products found — run a sync to load your catalog'}
                </td></tr>
              ) : sorted.map((p, i) => {
                const isProfit = p.profit >= 0;
                return (
                  <tr key={p.title} style={{
                    borderBottom:'1px solid rgba(255,255,255,0.04)',
                    background: i % 2 === 0 ? 'rgba(255,255,255,0.01)' : 'transparent',
                    transition:'background 0.15s',
                  }}
                    onMouseEnter={e=>e.currentTarget.style.background='rgba(167,139,250,0.05)'}
                    onMouseLeave={e=>e.currentTarget.style.background=i%2===0?'rgba(255,255,255,0.01)':'transparent'}
                  >
                    {/* Product */}
                    <td style={{ padding:'14px 14px', maxWidth:'220px' }}>
                      <div style={{ fontWeight:600, color:'#fff', fontSize:'13px', marginBottom:'2px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.title}</div>
                      {p.sku && <div style={{ fontSize:'10px', color:'rgba(255,255,255,0.25)', fontFamily:'monospace' }}>{p.sku}</div>}
                    </td>
                    {/* Sold */}
                    <td style={{ padding:'14px', textAlign:'right', fontSize:'14px', fontWeight:700, color:'rgba(56,189,248,0.9)' }}>{p.sold}</td>
                    {/* Revenue */}
                    <td style={{ padding:'14px', textAlign:'right', fontSize:'13px', fontWeight:600, color:'#fff' }}>{fmt(p.revenue)}</td>
                    {/* Cost */}
                    <td style={{ padding:'14px', textAlign:'right', fontSize:'13px', color:'rgba(251,113,133,0.8)' }}>{fmt(p.cost)}</td>
                    {/* Net Profit */}
                    <td style={{ padding:'14px', textAlign:'right' }}>
                      <div style={{ display:'flex', alignItems:'center', justifyContent:'flex-end', gap:'5px' }}>
                        {isProfit ? <TrendingUp size={13} color="rgba(52,211,153,0.8)"/> : <TrendingDown size={13} color="rgba(251,113,133,0.8)"/>}
                        <span style={{ fontSize:'14px', fontWeight:800, color: isProfit ? 'rgba(52,211,153,1)' : 'rgba(251,113,133,1)', fontFamily:'Outfit' }}>
                          {fmt(p.profit)}
                        </span>
                      </div>
                    </td>
                    {/* Margin */}
                    <td style={{ padding:'14px', textAlign:'right' }}>
                      <div style={{
                        display:'inline-flex', alignItems:'center', padding:'3px 8px', borderRadius:'6px',
                        background: isProfit ? 'rgba(52,211,153,0.1)' : 'rgba(251,113,133,0.1)',
                        border: `1px solid ${isProfit ? 'rgba(52,211,153,0.25)' : 'rgba(251,113,133,0.25)'}`,
                        fontSize:'12px', fontWeight:700,
                        color: isProfit ? 'rgba(52,211,153,0.9)' : 'rgba(251,113,133,0.9)',
                      }}>
                        {p.margin.toFixed(1)}%
                      </div>
                    </td>
                    {/* Hide/Show */}
                    <td style={{ padding:'14px', textAlign:'center' }}>
                      <button
                        onClick={()=>toggleHide(p.title)}
                        title={hiddenProducts[p.title] ? 'Show product' : 'Hide product'}
                        style={{
                          display:'inline-flex', alignItems:'center', justifyContent:'center', gap:'5px',
                          padding:'5px 10px', borderRadius:'8px', cursor:'pointer', fontSize:'11px', fontWeight:600,
                          background: hiddenProducts[p.title] ? 'rgba(56,189,248,0.1)' : 'rgba(255,255,255,0.05)',
                          border: hiddenProducts[p.title] ? '1px solid rgba(56,189,248,0.3)' : '1px solid rgba(255,255,255,0.08)',
                          color: hiddenProducts[p.title] ? 'rgba(56,189,248,0.85)' : 'rgba(255,255,255,0.4)',
                          transition:'all 0.2s',
                        }}
                      >
                        {hiddenProducts[p.title] ? <><Eye size={12}/> Unhide</> : <><EyeOff size={12}/> Hide</>}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {/* Footer totals */}
            {fetched && sorted.length > 0 && (
              <tfoot>
                <tr style={{ background:'rgba(167,139,250,0.06)', borderTop:'2px solid rgba(167,139,250,0.2)' }}>
                  <td style={{ padding:'14px', fontWeight:800, color:'rgba(167,139,250,0.9)', fontSize:'13px', fontFamily:'Outfit' }}>TOTALS</td>
                  <td style={{ padding:'14px', textAlign:'right', fontWeight:800, color:'rgba(56,189,248,0.9)' }}>{totals.sold}</td>
                  <td style={{ padding:'14px', textAlign:'right', fontWeight:800, color:'#fff' }}>{fmt(totals.revenue)}</td>
                  <td style={{ padding:'14px', textAlign:'right', fontWeight:800, color:'rgba(251,113,133,0.8)' }}>{fmt(totals.cost)}</td>
                  <td style={{ padding:'14px', textAlign:'right', fontWeight:800, color: totals.profit>=0 ? 'rgba(52,211,153,1)':'rgba(251,113,133,1)', fontFamily:'Outfit', fontSize:'15px' }}>{fmt(totals.profit)}</td>
                  <td style={{ padding:'14px', textAlign:'right', fontWeight:800, color:'rgba(255,255,255,0.4)', fontSize:'12px' }}>
                    {totals.revenue>0 ? ((totals.profit/totals.revenue)*100).toFixed(1)+'%' : '—'}
                  </td>
                  <td />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
