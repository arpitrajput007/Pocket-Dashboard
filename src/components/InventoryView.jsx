import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Upload, FileText, Link, Type, Trash2, ChevronDown, ChevronRight,
  Package, TrendingDown, ShoppingCart, DollarSign, AlertTriangle,
  CheckCircle, XCircle, RefreshCw, Plus, X
} from 'lucide-react';

const API = import.meta.env.VITE_API_URL || 'https://pocket-dashboard-api.onrender.com';

const inr = (n) => '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });

const STATUS_STYLES = {
  in_stock:    { color: '#2dd4a4', bg: 'rgba(45,212,164,0.12)', label: 'In Stock' },
  low_stock:   { color: '#fbbf24', bg: 'rgba(251,191,36,0.12)',  label: 'Low Stock' },
  out_of_stock:{ color: '#f87171', bg: 'rgba(248,113,113,0.12)', label: 'Out of Stock' },
};

// ── Shared card style ─────────────────────────────────────────────────────────
const card = {
  background:   'rgba(255,255,255,0.03)',
  border:       '1px solid rgba(255,255,255,0.07)',
  borderRadius: '16px',
  padding:      '24px',
};

export default function InventoryView({ store }) {
  const storeId = store?.id;

  // upload state
  const [uploadMode, setUploadMode] = useState('text'); // 'text'|'pdf'|'url'
  const [inputText,  setInputText]  = useState('');
  const [inputUrl,   setInputUrl]   = useState('');
  const [dragOver,   setDragOver]   = useState(false);
  const [parsing,    setParsing]    = useState(false);
  const [parseError, setParseError] = useState('');
  const fileInputRef = useRef(null);

  // data state
  const [bills,     setBills]     = useState([]);
  const [summary,   setSummary]   = useState([]);
  const [totals,    setTotals]    = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [expanded,  setExpanded]  = useState(new Set()); // expanded bill IDs
  const [activeTab, setActiveTab] = useState('summary'); // 'summary'|'bills'

  // ── Load data ───────────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    if (!storeId) return;
    setLoading(true);
    try {
      const [billsRes, summaryRes] = await Promise.all([
        fetch(`${API}/api/inventory/bills/${storeId}`),
        fetch(`${API}/api/inventory/summary/${storeId}`),
      ]);
      const billsData   = await billsRes.json();
      const summaryData = await summaryRes.json();
      setBills(billsData.bills   || []);
      setSummary(summaryData.summary || []);
      setTotals(summaryData.totals   || null);
    } catch (e) {
      console.error('[InventoryView] load error', e);
    } finally {
      setLoading(false);
    }
  }, [storeId]);

  useEffect(() => { loadData(); }, [loadData]);

  // ── File → base64 helper ────────────────────────────────────────────────────
  const fileToBase64 = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload  = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  // ── Upload / parse a bill ───────────────────────────────────────────────────
  const handleParse = async (file) => {
    setParseError('');
    setParsing(true);

    try {
      let body = { storeId };

      if (uploadMode === 'text') {
        if (!inputText.trim()) { setParseError('Please paste the bill text.'); setParsing(false); return; }
        body.sourceType = 'text';
        body.text = inputText;
      } else if (uploadMode === 'url') {
        if (!inputUrl.trim()) { setParseError('Please enter a URL.'); setParsing(false); return; }
        body.sourceType = 'url';
        body.url = inputUrl;
      } else if (file) {
        const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
        body.sourceType  = isPdf ? 'pdf' : 'doc';
        body.fileBase64  = await fileToBase64(file);
      } else {
        setParseError('Please select a file or paste text.');
        setParsing(false);
        return;
      }

      const res  = await fetch(`${API}/api/inventory/parse`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { setParseError(data.error || 'Parse failed.'); setParsing(false); return; }

      // Clear inputs
      setInputText('');
      setInputUrl('');
      if (fileInputRef.current) fileInputRef.current.value = '';

      // Reload both lists and switch to summary
      await loadData();
      setActiveTab('summary');
    } catch (e) {
      setParseError('Upload failed: ' + e.message);
    } finally {
      setParsing(false);
    }
  };

  const handleFileDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) handleParse(file);
  };

  const deleteBill = async (billId) => {
    if (!confirm('Delete this bill and all its line items?')) return;
    await fetch(`${API}/api/inventory/bills/${billId}?storeId=${storeId}`, { method: 'DELETE' });
    loadData();
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto', fontFamily: "'Outfit', sans-serif" }}>

      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 700, color: '#f1f5f9' }}>Inventory Management</h1>
        <p style={{ margin: '6px 0 0', fontSize: '14px', color: 'rgba(255,255,255,0.4)' }}>
          Upload vendor bills — AI extracts your stock. See what's sold vs. what's left.
        </p>
      </div>

      {/* Totals row */}
      {totals && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', marginBottom: '28px' }}>
          <StatCard icon={DollarSign}   label="Total Spent on Stock"     value={inr(totals.totalSpent)}        color="#a78bfa" />
          <StatCard icon={Package}      label="Total Units Purchased"     value={totals.totalQtyPurchased}      color="#60a5fa" />
          <StatCard icon={ShoppingCart} label="Units Sold (from orders)"  value={totals.totalQtySold}           color="#2dd4a4" />
          <StatCard icon={TrendingDown} label="Units Remaining"           value={totals.totalQtyPurchased - totals.totalQtySold} color="#fbbf24" />
        </div>
      )}

      {/* Upload Card */}
      <div style={{ ...card, marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
          <Plus size={18} color="#6366f1" />
          <span style={{ fontWeight: 600, color: '#f1f5f9', fontSize: '15px' }}>Upload a Vendor Bill</span>
        </div>

        {/* Mode tabs */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '18px' }}>
          {[
            { key: 'text', icon: Type,     label: 'Paste Text' },
            { key: 'pdf',  icon: FileText, label: 'Upload PDF / Doc' },
            { key: 'url',  icon: Link,     label: 'URL' },
          ].map(({ key, icon: Icon, label }) => (
            <button
              key={key}
              onClick={() => { setUploadMode(key); setParseError(''); }}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '7px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: 500,
                cursor: 'pointer', transition: 'all .15s',
                background: uploadMode === key ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.04)',
                border: uploadMode === key ? '1px solid rgba(99,102,241,0.5)' : '1px solid rgba(255,255,255,0.07)',
                color: uploadMode === key ? '#a5b4fc' : 'rgba(255,255,255,0.45)',
              }}
            >
              <Icon size={13} />
              {label}
            </button>
          ))}
        </div>

        {/* Input area */}
        {uploadMode === 'text' && (
          <textarea
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            placeholder={`Paste your vendor bill / invoice text here…\n\nExample:\nVendor: ABC Traders  Date: 15-Jun-2025\n1. BNB Paper Paint       Qty: 100   Rate: ₹50   Total: ₹5,000\n2. Sketch Pens Set       Qty: 50    Rate: ₹80   Total: ₹4,000`}
            style={{
              width: '100%', minHeight: '160px', resize: 'vertical',
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)',
              borderRadius: '10px', color: '#f1f5f9', fontSize: '13px', fontFamily: 'monospace',
              padding: '14px', lineHeight: 1.6, outline: 'none', boxSizing: 'border-box',
            }}
          />
        )}

        {uploadMode === 'pdf' && (
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleFileDrop}
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: `2px dashed ${dragOver ? '#6366f1' : 'rgba(255,255,255,0.12)'}`,
              borderRadius: '12px', padding: '40px 24px', textAlign: 'center',
              cursor: 'pointer', transition: 'border-color .15s',
              background: dragOver ? 'rgba(99,102,241,0.06)' : 'rgba(255,255,255,0.02)',
            }}
          >
            <Upload size={28} color="rgba(255,255,255,0.3)" style={{ marginBottom: '12px' }} />
            <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px', fontWeight: 500 }}>
              Drop PDF or Doc here, or <span style={{ color: '#a5b4fc' }}>click to browse</span>
            </div>
            <div style={{ color: 'rgba(255,255,255,0.25)', fontSize: '12px', marginTop: '6px' }}>
              .pdf, .txt, .doc, .docx supported
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.txt,.doc,.docx,text/plain,application/pdf"
              style={{ display: 'none' }}
              onChange={e => { const f = e.target.files?.[0]; if (f) handleParse(f); }}
            />
          </div>
        )}

        {uploadMode === 'url' && (
          <input
            value={inputUrl}
            onChange={e => setInputUrl(e.target.value)}
            placeholder="https://example.com/vendor-invoice.html"
            style={{
              width: '100%', padding: '12px 14px', borderRadius: '10px',
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)',
              color: '#f1f5f9', fontSize: '13px', outline: 'none', boxSizing: 'border-box',
            }}
          />
        )}

        {parseError && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px', color: '#f87171', fontSize: '13px' }}>
            <XCircle size={14} /> {parseError}
          </div>
        )}

        {(uploadMode === 'text' || uploadMode === 'url') && (
          <button
            onClick={() => handleParse(null)}
            disabled={parsing}
            style={{
              marginTop: '14px', padding: '10px 24px', borderRadius: '10px',
              background: parsing ? 'rgba(99,102,241,0.4)' : 'linear-gradient(135deg,#6366f1,#4f46e5)',
              border: 'none', color: '#fff', fontSize: '14px', fontWeight: 600,
              cursor: parsing ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '8px',
            }}
          >
            {parsing ? <><RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> Parsing bill…</> : 'Parse Bill with AI'}
          </button>
        )}

        {parsing && (
          <div style={{ marginTop: '12px', fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>
            AI is reading your bill and extracting inventory items…
          </div>
        )}
      </div>

      {/* Main content tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '20px' }}>
        {[
          { key: 'summary', label: `Inventory (${summary.length})` },
          { key: 'bills',   label: `Bills (${bills.length})` },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            style={{
              padding: '8px 18px', borderRadius: '8px', fontSize: '13px', fontWeight: 600,
              cursor: 'pointer', transition: 'all .15s',
              background: activeTab === key ? 'rgba(99,102,241,0.18)' : 'transparent',
              border: activeTab === key ? '1px solid rgba(99,102,241,0.4)' : '1px solid transparent',
              color: activeTab === key ? '#a5b4fc' : 'rgba(255,255,255,0.4)',
            }}
          >
            {label}
          </button>
        ))}
        <button
          onClick={loadData}
          disabled={loading}
          style={{
            marginLeft: 'auto', padding: '8px 14px', borderRadius: '8px',
            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)',
            color: 'rgba(255,255,255,0.4)', cursor: loading ? 'not-allowed' : 'pointer', fontSize: '13px',
            display: 'flex', alignItems: 'center', gap: '6px',
          }}
        >
          <RefreshCw size={13} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          Refresh
        </button>
      </div>

      {/* Inventory Summary Tab */}
      {activeTab === 'summary' && (
        loading ? <LoadingSkeleton /> : summary.length === 0 ? (
          <EmptyState message="No inventory yet. Upload your first vendor bill above." />
        ) : (
          <InventoryTable summary={summary} />
        )
      )}

      {/* Bills Tab */}
      {activeTab === 'bills' && (
        loading ? <LoadingSkeleton /> : bills.length === 0 ? (
          <EmptyState message="No bills uploaded yet." />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {bills.map(bill => (
              <BillCard
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
        )
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: '14px', padding: '18px 20px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
        <Icon size={15} color={color} />
        <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>{label}</span>
      </div>
      <div style={{ fontSize: '22px', fontWeight: 700, color: '#f1f5f9' }}>{value}</div>
    </div>
  );
}

// ── Inventory summary table ───────────────────────────────────────────────────
function InventoryTable({ summary }) {
  const [sortKey, setSortKey] = useState('product_name');
  const [sortDir, setSortDir] = useState(1);

  const sorted = [...summary].sort((a, b) => {
    const av = a[sortKey]; const bv = b[sortKey];
    return (av < bv ? -1 : av > bv ? 1 : 0) * sortDir;
  });

  const toggle = (key) => {
    if (sortKey === key) setSortDir(d => d * -1);
    else { setSortKey(key); setSortDir(1); }
  };

  const th = (label, key) => (
    <th
      onClick={() => toggle(key)}
      style={{
        padding: '10px 14px', textAlign: key === 'product_name' ? 'left' : 'right',
        fontSize: '11px', fontWeight: 600, color: sortKey === key ? '#a5b4fc' : 'rgba(255,255,255,0.35)',
        cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      {label} {sortKey === key ? (sortDir === 1 ? '↑' : '↓') : ''}
    </th>
  );

  return (
    <div style={{ overflowX: 'auto', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.07)' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
        <thead style={{ background: 'rgba(255,255,255,0.03)' }}>
          <tr>
            {th('Product', 'product_name')}
            {th('SKU', 'sku')}
            {th('Purchased', 'qty_purchased')}
            {th('Avg Unit Cost', 'avg_unit_cost')}
            {th('Total Spent', 'total_spent')}
            {th('Sold', 'qty_sold')}
            {th('Remaining', 'qty_remaining')}
            <th style={{ padding: '10px 14px', textAlign: 'center', fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.35)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>Status</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((item, i) => {
            const st = STATUS_STYLES[item.status] || STATUS_STYLES.in_stock;
            return (
              <tr
                key={i}
                style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}
              >
                <td style={{ padding: '12px 14px', color: '#e2e8f0', fontWeight: 500, maxWidth: '220px' }}>
                  <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.product_name}</div>
                </td>
                <td style={{ padding: '12px 14px', textAlign: 'right', color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace', fontSize: '12px' }}>
                  {item.sku || '—'}
                </td>
                <td style={{ padding: '12px 14px', textAlign: 'right', color: '#94a3b8' }}>{item.qty_purchased}</td>
                <td style={{ padding: '12px 14px', textAlign: 'right', color: '#94a3b8' }}>{inr(item.avg_unit_cost)}</td>
                <td style={{ padding: '12px 14px', textAlign: 'right', color: '#a78bfa', fontWeight: 600 }}>{inr(item.total_spent)}</td>
                <td style={{ padding: '12px 14px', textAlign: 'right', color: '#2dd4a4', fontWeight: 600 }}>{item.qty_sold}</td>
                <td style={{ padding: '12px 14px', textAlign: 'right', color: '#f1f5f9', fontWeight: 700 }}>{item.qty_remaining}</td>
                <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                  <span style={{
                    display: 'inline-block', padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 600,
                    background: st.bg, color: st.color,
                  }}>
                    {st.label}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Bill card (collapsible) ───────────────────────────────────────────────────
function BillCard({ bill, expanded, onToggle, onDelete }) {
  const items = bill.bill_line_items || [];
  const dateStr = bill.bill_date
    ? new Date(bill.bill_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : 'Date unknown';

  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: '14px', overflow: 'hidden',
    }}>
      {/* Bill header row */}
      <div
        onClick={onToggle}
        style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 20px', cursor: 'pointer' }}
      >
        {expanded ? <ChevronDown size={16} color="rgba(255,255,255,0.4)" /> : <ChevronRight size={16} color="rgba(255,255,255,0.4)" />}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 600, color: '#e2e8f0', fontSize: '14px' }}>{bill.vendor || 'Unknown Vendor'}</span>
            {bill.bill_number && (
              <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)', fontFamily: 'monospace' }}>#{bill.bill_number}</span>
            )}
            <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)' }}>
              {bill.source_type}
            </span>
          </div>
          <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)', marginTop: '3px' }}>
            {dateStr} · {items.length} item{items.length !== 1 ? 's' : ''}
            {bill.total_amount ? ` · ${bill.currency || 'INR'} ${Number(bill.total_amount).toLocaleString('en-IN')}` : ''}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '16px', fontWeight: 700, color: '#a78bfa' }}>
            {bill.total_amount ? inr(bill.total_amount) : '—'}
          </span>
          <button
            onClick={e => { e.stopPropagation(); onDelete(); }}
            style={{
              padding: '6px', borderRadius: '8px', background: 'rgba(248,113,113,0.1)',
              border: '1px solid rgba(248,113,113,0.2)', color: '#f87171', cursor: 'pointer',
              display: 'flex', alignItems: 'center',
            }}
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Expanded line items */}
      {expanded && items.length > 0 && (
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                {['Product', 'SKU', 'Qty', 'Unit Cost', 'Total'].map((h, i) => (
                  <th key={h} style={{
                    padding: '9px 16px', textAlign: i === 0 ? 'left' : 'right',
                    fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.3)',
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                  <td style={{ padding: '10px 16px', color: '#cbd5e1', maxWidth: '220px' }}>
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.product_name}</div>
                  </td>
                  <td style={{ padding: '10px 16px', textAlign: 'right', color: 'rgba(255,255,255,0.35)', fontFamily: 'monospace', fontSize: '12px' }}>{item.sku || '—'}</td>
                  <td style={{ padding: '10px 16px', textAlign: 'right', color: '#94a3b8' }}>{item.quantity}</td>
                  <td style={{ padding: '10px 16px', textAlign: 'right', color: '#94a3b8' }}>{inr(item.unit_cost)}</td>
                  <td style={{ padding: '10px 16px', textAlign: 'right', color: '#a78bfa', fontWeight: 600 }}>{inr(item.total_cost)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Loading / empty ────────────────────────────────────────────────────────────
function LoadingSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {[1, 2, 3].map(i => (
        <div key={i} style={{
          height: '64px', borderRadius: '12px',
          background: 'linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.07) 50%, rgba(255,255,255,0.04) 75%)',
          backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite',
        }} />
      ))}
      <style>{`@keyframes shimmer { from { background-position: 200% 0; } to { background-position: -200% 0; } }`}</style>
    </div>
  );
}

function EmptyState({ message }) {
  return (
    <div style={{
      textAlign: 'center', padding: '60px 24px',
      background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: '16px', color: 'rgba(255,255,255,0.3)', fontSize: '14px',
    }}>
      <Package size={36} color="rgba(255,255,255,0.1)" style={{ marginBottom: '14px' }} />
      <div>{message}</div>
    </div>
  );
}
