import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Upload, Package, ShoppingCart, TrendingDown, DollarSign, Boxes,
  Sparkles, Trash2, ChevronDown, ChevronRight, RefreshCw, XCircle,
  FileSpreadsheet, FileText, CheckCircle2
} from 'lucide-react';

const API = import.meta.env.VITE_API_URL || 'https://pocket-dashboard-api.onrender.com';

const inr = (n) => '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
const fmt = (n) => Number(n || 0).toLocaleString('en-IN');

// ─────────────────────────────────────────────────────────────────────────────

export default function InventoryView({ store }) {
  const storeId = store?.id;

  // data
  const [bills,    setBills]    = useState([]);
  const [summary,  setSummary]  = useState([]);
  const [totals,   setTotals]   = useState(null);
  const [loading,  setLoading]  = useState(true);

  // upload panel
  const [showUpload,  setShowUpload]  = useState(false);
  const [dragOver,    setDragOver]    = useState(false);
  const [parsing,     setParsing]     = useState(false);
  const [parseError,  setParseError]  = useState('');
  const [parseSuccess,setParseSuccess]= useState('');
  const fileInputRef = useRef(null);

  // AI insights
  const [insights,        setInsights]        = useState([]);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [insightsLoaded,  setInsightsLoaded]  = useState(false);

  // bills drawer
  const [showBills,  setShowBills]  = useState(false);
  const [expanded,   setExpanded]   = useState(new Set());

  // table sort
  const [sortKey, setSortKey] = useState('product_name');
  const [sortDir, setSortDir] = useState(1);

  // ── Load inventory data ────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    if (!storeId) return;
    setLoading(true);
    try {
      const [billsRes, summaryRes] = await Promise.all([
        fetch(`${API}/api/inventory/bills/${storeId}`),
        fetch(`${API}/api/inventory/summary/${storeId}`),
      ]);
      const [bd, sd] = await Promise.all([billsRes.json(), summaryRes.json()]);
      setBills(bd.bills    || []);
      setSummary(sd.summary || []);
      setTotals(sd.totals   || null);
    } catch (e) {
      console.error('[InventoryView]', e);
    } finally {
      setLoading(false);
    }
  }, [storeId]);

  useEffect(() => { loadData(); }, [loadData]);

  // ── File → base64 ─────────────────────────────────────────────────────────
  const toBase64 = (file) => new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload  = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });

  // ── Detect file type ───────────────────────────────────────────────────────
  const getSourceType = (file) => {
    const name = file.name.toLowerCase();
    if (name.endsWith('.pdf'))  return 'pdf';
    if (name.endsWith('.csv'))  return 'csv';
    if (name.endsWith('.xlsx') || name.endsWith('.xls')) return 'excel';
    if (file.type === 'application/pdf') return 'pdf';
    if (file.type.includes('spreadsheet') || file.type.includes('excel')) return 'excel';
    if (file.type === 'text/csv') return 'csv';
    return 'doc';
  };

  // ── Upload handler ─────────────────────────────────────────────────────────
  const handleFile = async (file) => {
    if (!file) return;
    setParseError('');
    setParseSuccess('');
    setParsing(true);

    try {
      const sourceType = getSourceType(file);
      const fileBase64 = await toBase64(file);

      const res  = await fetch(`${API}/api/inventory/parse`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ storeId, sourceType, fileBase64 }),
      });
      const data = await res.json();

      if (!res.ok) {
        setParseError(data.error || 'Parsing failed. Please check the file and try again.');
        return;
      }

      const itemCount = data.items?.length || 0;
      setParseSuccess(`Bill parsed — ${itemCount} product${itemCount !== 1 ? 's' : ''} added to inventory.`);
      if (fileInputRef.current) fileInputRef.current.value = '';
      await loadData();
      setInsightsLoaded(false); // reset insights so they re-generate with new data
    } catch (e) {
      setParseError('Upload failed: ' + e.message);
    } finally {
      setParsing(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFile(e.dataTransfer?.files?.[0]);
  };

  // ── Delete bill ────────────────────────────────────────────────────────────
  const deleteBill = async (billId) => {
    if (!confirm('Delete this bill and all its line items?')) return;
    await fetch(`${API}/api/inventory/bills/${billId}?storeId=${storeId}`, { method: 'DELETE' });
    setInsightsLoaded(false);
    loadData();
  };

  // ── AI Insights ────────────────────────────────────────────────────────────
  const loadInsights = async () => {
    setInsightsLoading(true);
    try {
      const res  = await fetch(`${API}/api/inventory/insights/${storeId}`);
      const data = await res.json();
      setInsights(data.insights || []);
      setInsightsLoaded(true);
    } catch (e) {
      setInsights(['Could not load insights. Please try again.']);
      setInsightsLoaded(true);
    } finally {
      setInsightsLoading(false);
    }
  };

  // ── Sort helpers ───────────────────────────────────────────────────────────
  const toggleSort = (key) => {
    if (sortKey === key) setSortDir(d => d * -1);
    else { setSortKey(key); setSortDir(1); }
  };

  const sorted = [...summary].sort((a, b) => {
    const av = a[sortKey]; const bv = b[sortKey];
    return (av < bv ? -1 : av > bv ? 1 : 0) * sortDir;
  });

  const hasData = !loading && summary.length > 0;

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ padding: '24px', maxWidth: '1160px', margin: '0 auto', fontFamily: "'Outfit', sans-serif" }}>

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '28px', gap: '16px', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 700, color: '#f1f5f9', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Boxes size={22} color="#6366f1" />
            Inventory Tracker
          </h1>
          <p style={{ margin: '5px 0 0', fontSize: '13px', color: 'rgba(255,255,255,0.35)' }}>
            Upload vendor bills — see what you bought vs. what sold.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {bills.length > 0 && (
            <button
              onClick={() => setShowBills(v => !v)}
              style={ghostBtn}
            >
              <FileText size={13} />
              Bills ({bills.length})
            </button>
          )}
          <button
            onClick={() => { setShowUpload(v => !v); setParseError(''); setParseSuccess(''); }}
            style={{
              display: 'flex', alignItems: 'center', gap: '7px',
              padding: '9px 18px', borderRadius: '10px', fontSize: '13px', fontWeight: 600,
              background: showUpload ? 'rgba(99,102,241,0.25)' : 'linear-gradient(135deg,#6366f1,#4f46e5)',
              border: showUpload ? '1px solid rgba(99,102,241,0.5)' : 'none',
              color: '#fff', cursor: 'pointer',
            }}
          >
            <Upload size={13} />
            Add Bill
          </button>
        </div>
      </div>

      {/* ── Upload panel ──────────────────────────────────────────────────── */}
      {showUpload && (
        <div style={{ ...glassCard, marginBottom: '20px' }}>
          <div style={{ fontSize: '13px', fontWeight: 600, color: 'rgba(255,255,255,0.55)', marginBottom: '14px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Upload Vendor Bill
          </div>

          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => !parsing && fileInputRef.current?.click()}
            style={{
              border: `2px dashed ${dragOver ? '#6366f1' : 'rgba(255,255,255,0.1)'}`,
              borderRadius: '12px', padding: '36px 24px', textAlign: 'center',
              cursor: parsing ? 'not-allowed' : 'pointer', transition: 'all .15s',
              background: dragOver ? 'rgba(99,102,241,0.07)' : 'rgba(255,255,255,0.02)',
            }}
          >
            {parsing ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                <RefreshCw size={28} color="#6366f1" style={{ animation: 'spin 1s linear infinite' }} />
                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px' }}>AI is reading your bill…</div>
                <div style={{ color: 'rgba(255,255,255,0.25)', fontSize: '12px' }}>Extracting products, SKUs, quantities and costs</div>
              </div>
            ) : (
              <>
                <Upload size={28} color="rgba(255,255,255,0.25)" style={{ marginBottom: '10px' }} />
                <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px', fontWeight: 500 }}>
                  Drop your file here, or <span style={{ color: '#a5b4fc' }}>click to browse</span>
                </div>
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginTop: '12px', flexWrap: 'wrap' }}>
                  {[['PDF', '#f87171'], ['Excel', '#34d399'], ['CSV', '#60a5fa']].map(([label, color]) => (
                    <span key={label} style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '20px', border: `1px solid ${color}30`, color, background: `${color}10`, fontWeight: 600 }}>
                      .{label.toLowerCase()}
                    </span>
                  ))}
                </div>
              </>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.xlsx,.xls,.csv,application/pdf,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              style={{ display: 'none' }}
              onChange={e => handleFile(e.target.files?.[0])}
            />
          </div>

          {parseError && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px', color: '#f87171', fontSize: '13px', background: 'rgba(248,113,113,0.08)', padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(248,113,113,0.15)' }}>
              <XCircle size={14} style={{ flexShrink: 0 }} /> {parseError}
            </div>
          )}
          {parseSuccess && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px', color: '#34d399', fontSize: '13px', background: 'rgba(52,211,153,0.08)', padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(52,211,153,0.15)' }}>
              <CheckCircle2 size={14} style={{ flexShrink: 0 }} /> {parseSuccess}
            </div>
          )}
        </div>
      )}

      {/* ── Bills drawer ──────────────────────────────────────────────────── */}
      {showBills && bills.length > 0 && (
        <div style={{ ...glassCard, marginBottom: '20px' }}>
          <div style={{ fontSize: '13px', fontWeight: 600, color: 'rgba(255,255,255,0.55)', marginBottom: '14px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Uploaded Bills
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {bills.map(bill => (
              <BillRow
                key={bill.id}
                bill={bill}
                expanded={expanded.has(bill.id)}
                onToggle={() => setExpanded(prev => {
                  const next = new Set(prev);
                  next.has(bill.id) ? next.delete(bill.id) : next.add(bill.id);
                  return next;
                })}
                onDelete={() => deleteBill(bill.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Stat cards ────────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', marginBottom: '20px' }}>
        <StatCard
          label="Total Inventory Purchased"
          value={loading ? '—' : inr(totals?.totalSpent || 0)}
          icon={DollarSign}
          color="#a78bfa"
          glow="rgba(167,139,250,0.08)"
        />
        <StatCard
          label="Units Purchased"
          value={loading ? '—' : fmt(totals?.totalQtyPurchased || 0)}
          icon={Package}
          color="#60a5fa"
          glow="rgba(96,165,250,0.08)"
        />
        <StatCard
          label="Units Sold"
          value={loading ? '—' : fmt(totals?.totalQtySold || 0)}
          icon={ShoppingCart}
          color="#34d399"
          glow="rgba(52,211,153,0.08)"
        />
        <StatCard
          label="Units Remaining"
          value={loading ? '—' : fmt((totals?.totalQtyPurchased || 0) - (totals?.totalQtySold || 0))}
          icon={TrendingDown}
          color="#fbbf24"
          glow="rgba(251,191,36,0.08)"
        />
        <StatCard
          label="Inventory Value Remaining"
          value={loading ? '—' : inr(totals?.totalValueRemaining || 0)}
          icon={Boxes}
          color="#f472b6"
          glow="rgba(244,114,182,0.08)"
        />
      </div>

      {/* ── AI Insights ───────────────────────────────────────────────────── */}
      {hasData && (
        <div style={{ ...glassCard, marginBottom: '20px', borderColor: insightsLoaded ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.07)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: insightsLoaded ? '14px' : 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles size={15} color="#a78bfa" />
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#f1f5f9' }}>AI Insights</span>
            </div>
            {!insightsLoaded && (
              <button
                onClick={loadInsights}
                disabled={insightsLoading}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '7px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 600,
                  background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)',
                  color: '#a5b4fc', cursor: insightsLoading ? 'not-allowed' : 'pointer',
                }}
              >
                {insightsLoading
                  ? <><RefreshCw size={12} style={{ animation: 'spin 1s linear infinite' }} /> Generating…</>
                  : <><Sparkles size={12} /> Generate Insights</>}
              </button>
            )}
            {insightsLoaded && (
              <button
                onClick={loadInsights}
                disabled={insightsLoading}
                style={{ ...ghostBtn, fontSize: '12px', padding: '5px 10px' }}
              >
                <RefreshCw size={11} style={{ animation: insightsLoading ? 'spin 1s linear infinite' : 'none' }} />
                Refresh
              </button>
            )}
          </div>

          {insightsLoaded && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {insights.map((insight, i) => (
                <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', padding: '10px 14px', background: 'rgba(99,102,241,0.06)', borderRadius: '10px', border: '1px solid rgba(99,102,241,0.12)' }}>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#6366f1', marginTop: '6px', flexShrink: 0 }} />
                  <span style={{ fontSize: '13px', color: '#cbd5e1', lineHeight: 1.5 }}>{insight}</span>
                </div>
              ))}
            </div>
          )}

          {!insightsLoaded && !insightsLoading && (
            <p style={{ margin: '10px 0 0', fontSize: '12px', color: 'rgba(255,255,255,0.25)', lineHeight: 1.5 }}>
              Analyse your inventory vs. sales data with AI — get actionable insights in seconds.
            </p>
          )}
        </div>
      )}

      {/* ── Product Table ─────────────────────────────────────────────────── */}
      {loading ? (
        <LoadingSkeleton />
      ) : summary.length === 0 ? (
        <EmptyState onUpload={() => { setShowUpload(true); }} />
      ) : (
        <div style={{ borderRadius: '14px', border: '1px solid rgba(255,255,255,0.07)', overflow: 'hidden' }}>
          <div style={{ background: 'rgba(255,255,255,0.02)', padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#f1f5f9' }}>Products</span>
            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)' }}>{summary.length} item{summary.length !== 1 ? 's' : ''} · synced with Shopify orders</span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                  <TH label="Product Name"   k="product_name"   left sortKey={sortKey} sortDir={sortDir} toggle={toggleSort} />
                  <TH label="SKU"            k="sku"            sortKey={sortKey} sortDir={sortDir} toggle={toggleSort} />
                  <TH label="Purchased"      k="qty_purchased"  sortKey={sortKey} sortDir={sortDir} toggle={toggleSort} />
                  <TH label="Sold"           k="qty_sold"       sortKey={sortKey} sortDir={sortDir} toggle={toggleSort} />
                  <TH label="Remaining"      k="qty_remaining"  sortKey={sortKey} sortDir={sortDir} toggle={toggleSort} />
                  <TH label="Purchase Cost"  k="total_spent"    sortKey={sortKey} sortDir={sortDir} toggle={toggleSort} />
                </tr>
              </thead>
              <tbody>
                {sorted.map((item, i) => (
                  <ProductRow key={i} item={item} even={i % 2 === 0} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes shimmer { from { background-position: 200% 0; } to { background-position: -200% 0; } }
      `}</style>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function StatCard({ label, value, icon: Icon, color, glow }) {
  return (
    <div style={{
      background: `linear-gradient(135deg, rgba(255,255,255,0.04) 0%, ${glow} 100%)`,
      border: '1px solid rgba(255,255,255,0.07)', borderRadius: '14px', padding: '18px 20px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '10px' }}>
        <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={14} color={color} />
        </div>
        <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontWeight: 500, lineHeight: 1.3 }}>{label}</span>
      </div>
      <div style={{ fontSize: '24px', fontWeight: 700, color: '#f1f5f9', letterSpacing: '-0.5px' }}>{value}</div>
    </div>
  );
}

function TH({ label, k, left, sortKey, sortDir, toggle }) {
  const active = sortKey === k;
  return (
    <th
      onClick={() => toggle(k)}
      style={{
        padding: '11px 16px', textAlign: left ? 'left' : 'right',
        fontSize: '11px', fontWeight: 600, whiteSpace: 'nowrap',
        color: active ? '#a5b4fc' : 'rgba(255,255,255,0.3)',
        cursor: 'pointer', userSelect: 'none',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      {label}{active ? (sortDir === 1 ? ' ↑' : ' ↓') : ''}
    </th>
  );
}

function ProductRow({ item, even }) {
  const STATUS = {
    in_stock:    { color: '#34d399', bg: 'rgba(52,211,153,0.12)',  label: 'In Stock' },
    low_stock:   { color: '#fbbf24', bg: 'rgba(251,191,36,0.12)',  label: 'Low Stock' },
    out_of_stock:{ color: '#f87171', bg: 'rgba(248,113,113,0.12)', label: 'Sold Out' },
  };
  const st = STATUS[item.status] || STATUS.in_stock;
  const pctSold = item.qty_purchased > 0 ? Math.round((item.qty_sold / item.qty_purchased) * 100) : 0;

  return (
    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', background: even ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
      {/* Product Name */}
      <td style={{ padding: '13px 16px', maxWidth: '240px' }}>
        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#e2e8f0', fontWeight: 500 }}>
          {item.product_name}
        </div>
        <div style={{ marginTop: '3px' }}>
          <span style={{ fontSize: '11px', padding: '1px 7px', borderRadius: '20px', background: st.bg, color: st.color, fontWeight: 600 }}>
            {st.label}
          </span>
        </div>
      </td>
      {/* SKU */}
      <td style={{ padding: '13px 16px', textAlign: 'right', color: 'rgba(255,255,255,0.35)', fontFamily: 'monospace', fontSize: '12px' }}>
        {item.sku || '—'}
      </td>
      {/* Purchased */}
      <td style={{ padding: '13px 16px', textAlign: 'right', color: '#94a3b8', fontWeight: 500 }}>
        {fmt(item.qty_purchased)}
      </td>
      {/* Sold */}
      <td style={{ padding: '13px 16px', textAlign: 'right' }}>
        <span style={{ color: '#34d399', fontWeight: 600 }}>{fmt(item.qty_sold)}</span>
        {pctSold > 0 && <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: '11px', marginLeft: '4px' }}>{pctSold}%</span>}
      </td>
      {/* Remaining */}
      <td style={{ padding: '13px 16px', textAlign: 'right' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
          <div style={{ width: '44px', height: '4px', borderRadius: '2px', background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${Math.max(0, 100 - pctSold)}%`, background: st.color, borderRadius: '2px' }} />
          </div>
          <span style={{ color: '#f1f5f9', fontWeight: 700 }}>{fmt(item.qty_remaining)}</span>
        </div>
      </td>
      {/* Purchase Cost */}
      <td style={{ padding: '13px 16px', textAlign: 'right', color: '#a78bfa', fontWeight: 600 }}>
        {inr(item.total_spent)}
      </td>
    </tr>
  );
}

function BillRow({ bill, expanded, onToggle, onDelete }) {
  const items = bill.bill_line_items || [];
  const dateStr = bill.bill_date
    ? new Date(bill.bill_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : 'Date unknown';

  const typeIcon = { pdf: '📄', excel: '📊', csv: '📋' };

  return (
    <div style={{ background: 'rgba(255,255,255,0.025)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden' }}>
      <div onClick={onToggle} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', cursor: 'pointer' }}>
        {expanded ? <ChevronDown size={14} color="rgba(255,255,255,0.3)" /> : <ChevronRight size={14} color="rgba(255,255,255,0.3)" />}
        <span style={{ fontSize: '13px' }}>{typeIcon[bill.source_type] || '📄'}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: '#e2e8f0', fontSize: '13px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {bill.vendor || 'Unknown Vendor'}{bill.bill_number ? ` · #${bill.bill_number}` : ''}
          </div>
          <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px', marginTop: '1px' }}>
            {dateStr} · {items.length} item{items.length !== 1 ? 's' : ''}
          </div>
        </div>
        <span style={{ color: '#a78bfa', fontWeight: 700, fontSize: '14px', flexShrink: 0 }}>
          {bill.total_amount ? inr(bill.total_amount) : '—'}
        </span>
        <button
          onClick={e => { e.stopPropagation(); onDelete(); }}
          style={{ padding: '5px', borderRadius: '6px', background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.15)', color: '#f87171', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
        >
          <Trash2 size={12} />
        </button>
      </div>

      {expanded && items.length > 0 && (
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                {['Product', 'SKU', 'Qty', 'Unit Cost', 'Total'].map((h, i) => (
                  <th key={h} style={{ padding: '8px 14px', textAlign: i === 0 ? 'left' : 'right', fontSize: '10px', fontWeight: 600, color: 'rgba(255,255,255,0.25)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                  <td style={{ padding: '8px 14px', color: '#cbd5e1', maxWidth: '200px' }}>
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.product_name}</div>
                  </td>
                  <td style={{ padding: '8px 14px', textAlign: 'right', color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace' }}>{item.sku || '—'}</td>
                  <td style={{ padding: '8px 14px', textAlign: 'right', color: '#94a3b8' }}>{item.quantity}</td>
                  <td style={{ padding: '8px 14px', textAlign: 'right', color: '#94a3b8' }}>{inr(item.unit_cost)}</td>
                  <td style={{ padding: '8px 14px', textAlign: 'right', color: '#a78bfa', fontWeight: 600 }}>{inr(item.total_cost)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {[1, 2, 3, 4].map(i => (
        <div key={i} style={{ height: '56px', borderRadius: '10px', background: 'linear-gradient(90deg,rgba(255,255,255,0.03) 25%,rgba(255,255,255,0.06) 50%,rgba(255,255,255,0.03) 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite' }} />
      ))}
    </div>
  );
}

function EmptyState({ onUpload }) {
  return (
    <div style={{ textAlign: 'center', padding: '64px 24px', background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px' }}>
      <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
        <Boxes size={24} color="#6366f1" />
      </div>
      <div style={{ color: '#e2e8f0', fontSize: '16px', fontWeight: 600, marginBottom: '8px' }}>No inventory yet</div>
      <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '13px', marginBottom: '20px', lineHeight: 1.6, maxWidth: '320px', margin: '0 auto 20px' }}>
        Upload a vendor bill (PDF, Excel, or CSV) and AI will extract your products automatically.
      </div>
      <button
        onClick={onUpload}
        style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '10px 22px', borderRadius: '10px', background: 'linear-gradient(135deg,#6366f1,#4f46e5)', border: 'none', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
      >
        <Upload size={13} /> Upload Your First Bill
      </button>
    </div>
  );
}

// ── Shared styles ──────────────────────────────────────────────────────────────
const glassCard = {
  background:   'rgba(255,255,255,0.03)',
  border:       '1px solid rgba(255,255,255,0.07)',
  borderRadius: '14px',
  padding:      '20px',
};

const ghostBtn = {
  display: 'flex', alignItems: 'center', gap: '6px',
  padding: '8px 14px', borderRadius: '9px', fontSize: '13px', fontWeight: 500,
  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
  color: 'rgba(255,255,255,0.5)', cursor: 'pointer',
};
