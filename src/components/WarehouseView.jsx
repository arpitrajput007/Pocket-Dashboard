import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Warehouse, Plus, Upload, RefreshCw, Trash2, Edit3, Check, X,
  AlertTriangle, PackageX, TrendingDown, Database, Link2,
  FileSpreadsheet, ClipboardList, ChevronDown, ChevronUp,
  ShieldAlert, Boxes, DollarSign, Package,
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const STATUS_CONFIG = {
  in_stock:    { label: 'In Stock',    color: '#10b981', bg: 'rgba(16,185,129,0.10)', border: 'rgba(16,185,129,0.25)' },
  low_stock:   { label: 'Low Stock',   color: '#f59e0b', bg: 'rgba(245,158,11,0.10)', border: 'rgba(245,158,11,0.25)' },
  out_of_stock:{ label: 'Out of Stock',color: '#ef4444', bg: 'rgba(239,68,68,0.10)',  border: 'rgba(239,68,68,0.25)' },
};

function getStatus(item) {
  const avail = Math.max(0, item.current_stock - item.reserved_stock);
  if (avail === 0)                        return 'out_of_stock';
  if (avail <= item.reorder_threshold)    return 'low_stock';
  return 'in_stock';
}

function StatusBadge({ item }) {
  const s = STATUS_CONFIG[getStatus(item)];
  return (
    <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 6,
      color: s.color, background: s.bg, border: `1px solid ${s.border}` }}>
      {s.label}
    </span>
  );
}

function KpiCard({ icon: Icon, label, value, color }) {
  return (
    <div style={{ flex: 1, minWidth: 150, padding: '18px 20px', borderRadius: 14,
      background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <div style={{ width: 32, height: 32, borderRadius: 9, display: 'flex', alignItems: 'center',
          justifyContent: 'center', background: `${color}18`, border: `1px solid ${color}30` }}>
          <Icon size={15} color={color} />
        </div>
        <span style={{ fontSize: 12, color: 'rgba(226,232,240,0.45)', fontWeight: 600 }}>{label}</span>
      </div>
      <div style={{ fontSize: 26, fontWeight: 800, color: '#e2e8f0', letterSpacing: '-0.5px' }}>{value}</div>
    </div>
  );
}

// ── Add / Edit modal ──────────────────────────────────────────────────────────
function ProductModal({ initial, onSave, onClose }) {
  const [form, setForm] = useState({
    product_name: '', sku: '', current_stock: '', reorder_threshold: '10',
    unit_cost: '', notes: '', ...initial,
  });
  const set = f => e => setForm(p => ({ ...p, [f]: e.target.value }));
  const inputStyle = {
    width: '100%', padding: '9px 12px', borderRadius: 10, fontSize: 13,
    background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)',
    color: '#e2e8f0', outline: 'none', boxSizing: 'border-box',
  };
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', zIndex: 999, padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 480, borderRadius: 20,
        background: '#0d0d16', border: '1px solid rgba(255,255,255,0.1)', padding: 28 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#e2e8f0' }}>
            {initial?.id ? 'Edit Product' : 'Add Product'}
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(226,232,240,0.4)', padding: 4 }}>
            <X size={18} />
          </button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'rgba(226,232,240,0.45)', display: 'block', marginBottom: 5 }}>Product Name *</label>
              <input style={inputStyle} value={form.product_name} onChange={set('product_name')} placeholder="e.g. Blue T-Shirt" />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'rgba(226,232,240,0.45)', display: 'block', marginBottom: 5 }}>SKU</label>
              <input style={inputStyle} value={form.sku} onChange={set('sku')} placeholder="e.g. TSHIRT-BLU-M" />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'rgba(226,232,240,0.45)', display: 'block', marginBottom: 5 }}>Current Stock</label>
              <input style={inputStyle} type="number" min="0" value={form.current_stock} onChange={set('current_stock')} placeholder="0" />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'rgba(226,232,240,0.45)', display: 'block', marginBottom: 5 }}>Reorder At</label>
              <input style={inputStyle} type="number" min="0" value={form.reorder_threshold} onChange={set('reorder_threshold')} placeholder="10" />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'rgba(226,232,240,0.45)', display: 'block', marginBottom: 5 }}>Unit Cost (₹)</label>
              <input style={inputStyle} type="number" min="0" value={form.unit_cost} onChange={set('unit_cost')} placeholder="0.00" />
            </div>
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: 'rgba(226,232,240,0.45)', display: 'block', marginBottom: 5 }}>Notes</label>
            <input style={inputStyle} value={form.notes} onChange={set('notes')} placeholder="Optional notes..." />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '10px', borderRadius: 10, background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(226,232,240,0.6)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            Cancel
          </button>
          <button onClick={() => onSave(form)} disabled={!form.product_name.trim()}
            style={{ flex: 2, padding: '10px', borderRadius: 10,
              background: form.product_name.trim() ? 'linear-gradient(135deg,#6366f1,#4f46e5)' : 'rgba(99,102,241,0.3)',
              border: 'none', color: '#fff', fontSize: 13, fontWeight: 700, cursor: form.product_name.trim() ? 'pointer' : 'not-allowed' }}>
            {initial?.id ? 'Save Changes' : 'Add Product'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── CSV Import panel ──────────────────────────────────────────────────────────
function CsvImportPanel({ storeId, onImported }) {
  const [rows, setRows]       = useState(null);
  const [headers, setHeaders] = useState([]);
  const [mapping, setMapping] = useState({ product_name: '', sku: '', current_stock: '', reorder_threshold: '', unit_cost: '' });
  const [importing, setImporting] = useState(false);
  const [result, setResult]   = useState(null);
  const fileRef = useRef();

  const parseFile = e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = evt => {
      const text = evt.target.result;
      const lines = text.split(/\r?\n/).filter(Boolean);
      if (lines.length < 2) return;
      const hdrs = lines[0].split(',').map(h => h.replace(/^"|"$/g, '').trim());
      const data = lines.slice(1).map(line => {
        const vals = line.split(',').map(v => v.replace(/^"|"$/g, '').trim());
        const obj = {};
        hdrs.forEach((h, i) => { obj[h] = vals[i] || ''; });
        return obj;
      }).filter(r => Object.values(r).some(Boolean));
      setHeaders(hdrs);
      setRows(data);
      // Auto-detect common column names
      const auto = { product_name: '', sku: '', current_stock: '', reorder_threshold: '', unit_cost: '' };
      const nameKeys = ['product name', 'name', 'product', 'item'];
      const skuKeys  = ['sku', 'item code', 'product code', 'code'];
      const qtyKeys  = ['quantity', 'stock', 'current stock', 'qty', 'units'];
      const reorderKeys = ['reorder', 'min stock', 'reorder threshold', 'minimum'];
      const costKeys = ['cost', 'unit cost', 'price', 'unit price'];
      hdrs.forEach(h => {
        const hl = h.toLowerCase();
        if (!auto.product_name && nameKeys.some(k => hl.includes(k))) auto.product_name = h;
        if (!auto.sku && skuKeys.some(k => hl === k || hl.includes(k))) auto.sku = h;
        if (!auto.current_stock && qtyKeys.some(k => hl.includes(k))) auto.current_stock = h;
        if (!auto.reorder_threshold && reorderKeys.some(k => hl.includes(k))) auto.reorder_threshold = h;
        if (!auto.unit_cost && costKeys.some(k => hl.includes(k))) auto.unit_cost = h;
      });
      setMapping(auto);
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!rows || !mapping.product_name) return;
    setImporting(true);
    const mapped = rows.map(r => ({
      product_name:      r[mapping.product_name] || '',
      sku:               mapping.sku ? r[mapping.sku] : '',
      current_stock:     mapping.current_stock ? r[mapping.current_stock] : 0,
      reorder_threshold: mapping.reorder_threshold ? r[mapping.reorder_threshold] : 10,
      unit_cost:         mapping.unit_cost ? r[mapping.unit_cost] : '',
    })).filter(r => r.product_name);
    try {
      const res = await fetch(`${API_URL}/api/warehouse/${storeId}/import`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: mapped }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      setResult({ success: true, count: d.imported });
      onImported();
    } catch (e) {
      setResult({ success: false, error: e.message });
    } finally { setImporting(false); }
  };

  const selectStyle = {
    padding: '7px 10px', borderRadius: 8, fontSize: 12,
    background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)',
    color: '#e2e8f0', width: '100%', cursor: 'pointer',
  };

  return (
    <div style={{ padding: 24, borderRadius: 16, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
        <FileSpreadsheet size={18} color="#6366f1" />
        <span style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f0' }}>CSV / Excel Import</span>
      </div>

      {!rows ? (
        <div>
          <input ref={fileRef} type="file" accept=".csv,.txt" onChange={parseFile} style={{ display: 'none' }} />
          <div onClick={() => fileRef.current?.click()}
            style={{ padding: '32px 24px', border: '2px dashed rgba(99,102,241,0.3)', borderRadius: 12,
              textAlign: 'center', cursor: 'pointer', background: 'rgba(99,102,241,0.04)' }}
            onDragOver={e => e.preventDefault()}
            onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) { const dt = new DataTransfer(); dt.items.add(f); fileRef.current.files = dt.files; parseFile({ target: fileRef.current }); } }}>
            <Upload size={28} color="rgba(99,102,241,0.5)" style={{ marginBottom: 10 }} />
            <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(226,232,240,0.6)', marginBottom: 4 }}>Drop your CSV here or click to browse</div>
            <div style={{ fontSize: 11, color: 'rgba(226,232,240,0.3)' }}>Export from your warehouse system as .csv</div>
          </div>
          <div style={{ marginTop: 16, padding: 14, borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(226,232,240,0.4)', marginBottom: 8 }}>Expected CSV format (any column order):</div>
            <code style={{ fontSize: 11, color: '#a5b4fc', lineHeight: 1.8 }}>
              Product Name, SKU, Quantity, Reorder Threshold, Unit Cost<br/>
              Blue T-Shirt, TSHIRT-BLU-M, 120, 15, 299
            </code>
          </div>
        </div>
      ) : (
        <div>
          <div style={{ fontSize: 12, color: '#10b981', fontWeight: 600, marginBottom: 16 }}>
            ✓ {rows.length} rows detected — map your columns below
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
            {[
              { key: 'product_name', label: 'Product Name *' },
              { key: 'sku', label: 'SKU' },
              { key: 'current_stock', label: 'Current Stock' },
              { key: 'reorder_threshold', label: 'Reorder Threshold' },
              { key: 'unit_cost', label: 'Unit Cost' },
            ].map(({ key, label }) => (
              <div key={key}>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'rgba(226,232,240,0.45)', display: 'block', marginBottom: 5 }}>{label}</label>
                <select style={selectStyle} value={mapping[key]} onChange={e => setMapping(p => ({ ...p, [key]: e.target.value }))}>
                  <option value="">— skip —</option>
                  {headers.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
            ))}
          </div>

          {result && (
            <div style={{ padding: '10px 14px', borderRadius: 10, marginBottom: 14,
              background: result.success ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
              border: `1px solid ${result.success ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`,
              color: result.success ? '#34d399' : '#f87171', fontSize: 13, fontWeight: 600 }}>
              {result.success ? `✓ ${result.count} products imported successfully` : `Error: ${result.error}`}
            </div>
          )}

          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => { setRows(null); setResult(null); }}
              style={{ padding: '9px 18px', borderRadius: 10, background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(226,232,240,0.6)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              Start Over
            </button>
            <button onClick={handleImport} disabled={!mapping.product_name || importing}
              style={{ flex: 1, padding: '9px 18px', borderRadius: 10,
                background: mapping.product_name && !importing ? 'linear-gradient(135deg,#6366f1,#4f46e5)' : 'rgba(99,102,241,0.3)',
                border: 'none', color: '#fff', fontSize: 13, fontWeight: 700,
                cursor: mapping.product_name && !importing ? 'pointer' : 'not-allowed' }}>
              {importing ? 'Importing…' : `Import ${rows.length} Products`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Coming Soon panel ──────────────────────────────────────────────────────────
function ComingSoon({ icon: Icon, title, description, bullets }) {
  return (
    <div style={{ padding: 32, borderRadius: 16, background: 'rgba(255,255,255,0.02)',
      border: '1px dashed rgba(255,255,255,0.1)', textAlign: 'center' }}>
      <div style={{ width: 52, height: 52, borderRadius: 16, background: 'rgba(99,102,241,0.1)',
        border: '1px solid rgba(99,102,241,0.2)', display: 'flex', alignItems: 'center',
        justifyContent: 'center', margin: '0 auto 16px' }}>
        <Icon size={24} color="#6366f1" />
      </div>
      <div style={{ fontSize: 15, fontWeight: 700, color: '#e2e8f0', marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 13, color: 'rgba(226,232,240,0.4)', lineHeight: 1.7, maxWidth: 380, margin: '0 auto 20px' }}>{description}</div>
      {bullets && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
          {bullets.map(b => (
            <span key={b} style={{ fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 6,
              background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', color: '#a5b4fc' }}>{b}</span>
          ))}
        </div>
      )}
      <div style={{ marginTop: 20, display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px',
        borderRadius: 20, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: '#f59e0b', letterSpacing: '0.5px' }}>COMING SOON</span>
      </div>
    </div>
  );
}

// ── Order Validation panel ─────────────────────────────────────────────────────
function OrderValidation({ storeId }) {
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(false);
  const [days, setDays]     = useState(7);
  const [expanded, setExpanded] = useState({});

  const validate = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/warehouse/${storeId}/validate?days=${days}`);
      setData(await res.json());
    } catch { setData(null); }
    finally { setLoading(false); }
  }, [storeId, days]);

  useEffect(() => { validate(); }, [validate]);

  const toggle = id => setExpanded(p => ({ ...p, [id]: !p[id] }));

  if (loading) return (
    <div style={{ padding: 32, textAlign: 'center', color: 'rgba(226,232,240,0.3)', fontSize: 13 }}>Checking orders…</div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0' }}>
          Order Validation — last
          <select value={days} onChange={e => setDays(Number(e.target.value))}
            style={{ margin: '0 6px', padding: '3px 8px', borderRadius: 7, fontSize: 12,
              background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', color: '#e2e8f0' }}>
            {[3, 7, 14, 30].map(d => <option key={d} value={d}>{d} days</option>)}
          </select>
          ({data?.orders_checked ?? 0} orders checked)
        </div>
        <button onClick={validate}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8,
            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
            color: 'rgba(226,232,240,0.6)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {/* Conflicts */}
      {(data?.conflicts || []).length > 0 ? (
        data.conflicts.map((c, i) => (
          <div key={i} style={{ borderRadius: 12, background: 'rgba(239,68,68,0.05)',
            border: '1px solid rgba(239,68,68,0.2)', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '14px 16px', cursor: 'pointer' }} onClick={() => toggle(i)}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <ShieldAlert size={16} color="#ef4444" />
                <div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0' }}>{c.product_name}</span>
                  {c.sku && <span style={{ fontSize: 11, color: 'rgba(226,232,240,0.35)', marginLeft: 8 }}>SKU: {c.sku}</span>}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 12, color: '#f87171', fontWeight: 700 }}>
                  Shortfall: {c.shortfall} units
                </span>
                {expanded[i] ? <ChevronUp size={14} color="rgba(226,232,240,0.4)" /> : <ChevronDown size={14} color="rgba(226,232,240,0.4)" />}
              </div>
            </div>
            {expanded[i] && (
              <div style={{ padding: '0 16px 14px', display: 'flex', flexWrap: 'wrap', gap: 16 }}>
                {[
                  ['Ordered', c.ordered_qty],
                  ['Available', c.available_stock],
                  ['In Warehouse', c.current_stock],
                  ['Reserved', c.reserved_stock],
                ].map(([l, v]) => (
                  <div key={l} style={{ fontSize: 12 }}>
                    <span style={{ color: 'rgba(226,232,240,0.4)' }}>{l}: </span>
                    <span style={{ color: '#e2e8f0', fontWeight: 700 }}>{v}</span>
                  </div>
                ))}
                <div style={{ width: '100%', marginTop: 8 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(226,232,240,0.3)', marginBottom: 6 }}>ORDERS INVOLVED</div>
                  {c.orders.map(o => (
                    <div key={o.order_id} style={{ fontSize: 11, color: 'rgba(226,232,240,0.45)', marginBottom: 3 }}>
                      {o.order_name} — {o.qty} units — {new Date(o.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))
      ) : (
        <div style={{ padding: '20px', borderRadius: 12, background: 'rgba(16,185,129,0.05)',
          border: '1px solid rgba(16,185,129,0.15)', textAlign: 'center' }}>
          <span style={{ fontSize: 13, color: '#34d399', fontWeight: 600 }}>✓ No order conflicts — all recent orders can be fulfilled</span>
        </div>
      )}

      {/* Low stock alerts */}
      {(data?.low_stock || []).length > 0 && (
        <div style={{ marginTop: 4 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(226,232,240,0.3)', letterSpacing: '0.8px', marginBottom: 8 }}>LOW STOCK ALERTS</div>
          {data.low_stock.map((p, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '10px 14px', borderRadius: 10, background: 'rgba(245,158,11,0.05)',
              border: '1px solid rgba(245,158,11,0.15)', marginBottom: 6 }}>
              <span style={{ fontSize: 13, color: '#e2e8f0', fontWeight: 600 }}>{p.product_name}</span>
              <span style={{ fontSize: 12, color: '#f59e0b', fontWeight: 700 }}>
                {p.available_stock} left (threshold: {p.reorder_threshold})
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main WarehouseView ─────────────────────────────────────────────────────────
export default function WarehouseView({ store }) {
  const storeId = store?.id;
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [sourceTab, setSourceTab] = useState('manual');
  const [modal, setModal]         = useState(null); // null | 'add' | product obj
  const [editInline, setEditInline] = useState(null);
  const [saving, setSaving]       = useState(false);
  const [search, setSearch]       = useState('');
  const [sortField, setSortField] = useState('product_name');
  const [sortDir, setSortDir]     = useState('asc');
  const [activeSection, setActiveSection] = useState('inventory'); // 'inventory' | 'validation'

  const fetchInventory = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/warehouse/${storeId}`);
      const d = await res.json();
      setInventory(d.data || []);
    } catch { setInventory([]); }
    finally { setLoading(false); }
  }, [storeId]);

  useEffect(() => { if (storeId) fetchInventory(); }, [fetchInventory]);

  const handleAdd = async form => {
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/api/warehouse/${storeId}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      setModal(null);
      await fetchInventory();
    } finally { setSaving(false); }
  };

  const handleUpdate = async (id, updates) => {
    setSaving(true);
    try {
      await fetch(`${API_URL}/api/warehouse/${storeId}/${id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updates),
      });
      setEditInline(null);
      await fetchInventory();
    } finally { setSaving(false); }
  };

  const handleDelete = async id => {
    if (!confirm('Delete this product from warehouse inventory?')) return;
    await fetch(`${API_URL}/api/warehouse/${storeId}/${id}`, { method: 'DELETE' });
    setInventory(p => p.filter(i => i.id !== id));
  };

  // KPI derived values
  const totalProducts = inventory.length;
  const totalUnits = inventory.reduce((s, i) => s + i.current_stock, 0);
  const lowStock = inventory.filter(i => getStatus(i) === 'low_stock').length;
  const outOfStock = inventory.filter(i => getStatus(i) === 'out_of_stock').length;
  const inventoryValue = inventory.reduce((s, i) => s + (i.unit_cost || 0) * i.current_stock, 0);

  // Sort + filter
  const sorted = [...inventory]
    .filter(i => !search || i.product_name.toLowerCase().includes(search.toLowerCase()) || (i.sku || '').toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      let av = a[sortField], bv = b[sortField];
      if (typeof av === 'string') av = av.toLowerCase(), bv = (bv || '').toLowerCase();
      return sortDir === 'asc' ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
    });

  const toggleSort = field => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  const SortTh = ({ field, children }) => (
    <th onClick={() => toggleSort(field)}
      style={{ padding: '10px 14px', fontSize: 11, fontWeight: 700, textAlign: 'left',
        color: sortField === field ? '#a5b4fc' : 'rgba(226,232,240,0.35)',
        letterSpacing: '0.6px', cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}>
      {children} {sortField === field ? (sortDir === 'asc' ? '↑' : '↓') : ''}
    </th>
  );

  const sourceTabs = [
    { key: 'manual', icon: ClipboardList, label: 'Manual' },
    { key: 'csv', icon: FileSpreadsheet, label: 'CSV Import' },
    { key: 'api', icon: Link2, label: 'API Connect' },
    { key: 'sheets', icon: Database, label: 'Google Sheets' },
  ];

  const sectionBtnStyle = active => ({
    padding: '7px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600,
    background: active ? 'rgba(99,102,241,0.15)' : 'transparent',
    border: active ? '1px solid rgba(99,102,241,0.3)' : '1px solid transparent',
    color: active ? '#a5b4fc' : 'rgba(226,232,240,0.45)', cursor: 'pointer',
  });

  return (
    <div style={{ padding: '0 0 40px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12,
            background: 'linear-gradient(135deg,rgba(99,102,241,0.2),rgba(34,211,238,0.1))',
            border: '1px solid rgba(99,102,241,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Warehouse size={20} color="#6366f1" />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: 19, fontWeight: 800, color: '#e2e8f0', letterSpacing: '-0.3px' }}>Warehouse Inventory</h2>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: 'rgba(226,232,240,0.35)' }}>
              Live stock tracking — synced with your Shopify orders
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={fetchInventory}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10,
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
              color: 'rgba(226,232,240,0.6)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            <RefreshCw size={14} /> Refresh
          </button>
          <button onClick={() => setModal('add')}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 10,
              background: 'linear-gradient(135deg,#6366f1,#4f46e5)', border: 'none',
              color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            <Plus size={15} /> Add Product
          </button>
        </div>
      </div>

      {/* KPI cards */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 24 }}>
        <KpiCard icon={Package}    label="Total Products"  value={totalProducts}         color="#6366f1" />
        <KpiCard icon={Boxes}      label="Total Units"     value={totalUnits.toLocaleString('en-IN')} color="#22d3ee" />
        <KpiCard icon={TrendingDown} label="Low Stock"     value={lowStock}              color="#f59e0b" />
        <KpiCard icon={PackageX}   label="Out of Stock"    value={outOfStock}            color="#ef4444" />
        <KpiCard icon={DollarSign} label="Inventory Value" value={inventoryValue > 0 ? `₹${inventoryValue.toLocaleString('en-IN')}` : '—'} color="#10b981" />
      </div>

      {/* Section toggle */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
        <button style={sectionBtnStyle(activeSection === 'inventory')} onClick={() => setActiveSection('inventory')}>
          Inventory
        </button>
        <button style={sectionBtnStyle(activeSection === 'validation')} onClick={() => setActiveSection('validation')}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <AlertTriangle size={13} />
            Order Validation
            {(lowStock + outOfStock) > 0 && (
              <span style={{ fontSize: 10, fontWeight: 800, padding: '1px 6px', borderRadius: 10,
                background: 'rgba(239,68,68,0.2)', color: '#f87171' }}>
                {lowStock + outOfStock}
              </span>
            )}
          </span>
        </button>
      </div>

      {activeSection === 'validation' ? (
        <OrderValidation storeId={storeId} />
      ) : (
        <>
          {/* Source tabs */}
          <div style={{ display: 'flex', gap: 2, marginBottom: 20, background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: 4, width: 'fit-content' }}>
            {sourceTabs.map(({ key, icon: Icon, label }) => (
              <button key={key} onClick={() => setSourceTab(key)}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 9,
                  background: sourceTab === key ? 'rgba(99,102,241,0.15)' : 'transparent',
                  border: sourceTab === key ? '1px solid rgba(99,102,241,0.25)' : '1px solid transparent',
                  color: sourceTab === key ? '#a5b4fc' : 'rgba(226,232,240,0.4)',
                  fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                <Icon size={13} />
                {label}
              </button>
            ))}
          </div>

          {sourceTab === 'csv' && (
            <div style={{ marginBottom: 20 }}>
              <CsvImportPanel storeId={storeId} onImported={fetchInventory} />
            </div>
          )}
          {sourceTab === 'api' && (
            <div style={{ marginBottom: 20 }}>
              <ComingSoon icon={Link2} title="Custom API / ERP Connection"
                description="Connect your warehouse management system or ERP via REST API. Pocket Dashboard will periodically sync stock quantities automatically."
                bullets={['Warehouse REST API', 'ERP Integration', 'Custom Inventory API', 'Auto-sync every hour']} />
            </div>
          )}
          {sourceTab === 'sheets' && (
            <div style={{ marginBottom: 20 }}>
              <ComingSoon icon={Database} title="Google Sheets Sync"
                description="Link a Google Sheet containing your inventory. Pocket Dashboard will refresh the data periodically so your stock levels stay up to date without manual uploads."
                bullets={['SKU-based mapping', 'Periodic auto-refresh', 'No-code setup', 'Bidirectional sync']} />
            </div>
          )}

          {/* Search + table */}
          <div style={{ padding: '0 0 4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search by name or SKU…"
                style={{ padding: '8px 14px', borderRadius: 10, fontSize: 13,
                  background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.09)',
                  color: '#e2e8f0', width: 260, outline: 'none' }} />
              <span style={{ fontSize: 12, color: 'rgba(226,232,240,0.3)' }}>
                {sorted.length} product{sorted.length !== 1 ? 's' : ''}
              </span>
            </div>

            {loading ? (
              <div style={{ padding: 48, textAlign: 'center', color: 'rgba(226,232,240,0.25)', fontSize: 13 }}>Loading inventory…</div>
            ) : sorted.length === 0 ? (
              <div style={{ padding: '48px 24px', textAlign: 'center', borderRadius: 14,
                background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.08)' }}>
                <Warehouse size={32} color="rgba(99,102,241,0.3)" style={{ marginBottom: 12 }} />
                <div style={{ fontSize: 14, fontWeight: 700, color: 'rgba(226,232,240,0.35)', marginBottom: 6 }}>
                  {search ? 'No products match your search' : 'No products yet'}
                </div>
                {!search && (
                  <div style={{ fontSize: 13, color: 'rgba(226,232,240,0.25)' }}>
                    Add products manually, import a CSV, or connect your warehouse API.
                  </div>
                )}
              </div>
            ) : (
              <div style={{ overflowX: 'auto', borderRadius: 14, border: '1px solid rgba(255,255,255,0.07)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.02)' }}>
                      <SortTh field="product_name">Product</SortTh>
                      <SortTh field="sku">SKU</SortTh>
                      <SortTh field="current_stock">Stock</SortTh>
                      <th style={{ padding: '10px 14px', fontSize: 11, fontWeight: 700, color: 'rgba(226,232,240,0.35)', letterSpacing: '0.6px' }}>RESERVED</th>
                      <SortTh field="current_stock">AVAILABLE</SortTh>
                      <SortTh field="reorder_threshold">REORDER AT</SortTh>
                      <th style={{ padding: '10px 14px', fontSize: 11, fontWeight: 700, color: 'rgba(226,232,240,0.35)', letterSpacing: '0.6px' }}>STATUS</th>
                      <th style={{ padding: '10px 14px', fontSize: 11, fontWeight: 700, color: 'rgba(226,232,240,0.35)', letterSpacing: '0.6px' }}>ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sorted.map((item, idx) => {
                      const avail = Math.max(0, item.current_stock - item.reserved_stock);
                      const isEditing = editInline?.id === item.id;
                      return (
                        <tr key={item.id}
                          style={{ borderBottom: idx < sorted.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                            background: isEditing ? 'rgba(99,102,241,0.04)' : 'transparent' }}>
                          <td style={{ padding: '12px 14px', color: '#e2e8f0', fontWeight: 600 }}>
                            {isEditing
                              ? <input value={editInline.product_name} onChange={e => setEditInline(p => ({ ...p, product_name: e.target.value }))}
                                  style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(99,102,241,0.4)', borderRadius: 7, padding: '4px 8px', color: '#e2e8f0', fontSize: 13, width: 160 }} />
                              : item.product_name}
                          </td>
                          <td style={{ padding: '12px 14px', color: 'rgba(226,232,240,0.45)', fontFamily: 'monospace', fontSize: 12 }}>
                            {isEditing
                              ? <input value={editInline.sku || ''} onChange={e => setEditInline(p => ({ ...p, sku: e.target.value }))}
                                  style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(99,102,241,0.4)', borderRadius: 7, padding: '4px 8px', color: '#e2e8f0', fontSize: 12, width: 120 }} />
                              : (item.sku || '—')}
                          </td>
                          <td style={{ padding: '12px 14px', color: '#e2e8f0', fontWeight: 700 }}>
                            {isEditing
                              ? <input type="number" min="0" value={editInline.current_stock} onChange={e => setEditInline(p => ({ ...p, current_stock: e.target.value }))}
                                  style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(99,102,241,0.4)', borderRadius: 7, padding: '4px 8px', color: '#e2e8f0', fontSize: 13, width: 70 }} />
                              : item.current_stock}
                          </td>
                          <td style={{ padding: '12px 14px', color: 'rgba(226,232,240,0.5)' }}>{item.reserved_stock}</td>
                          <td style={{ padding: '12px 14px', fontWeight: 700,
                            color: avail === 0 ? '#ef4444' : avail <= item.reorder_threshold ? '#f59e0b' : '#10b981' }}>
                            {avail}
                          </td>
                          <td style={{ padding: '12px 14px', color: 'rgba(226,232,240,0.5)' }}>
                            {isEditing
                              ? <input type="number" min="0" value={editInline.reorder_threshold} onChange={e => setEditInline(p => ({ ...p, reorder_threshold: e.target.value }))}
                                  style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(99,102,241,0.4)', borderRadius: 7, padding: '4px 8px', color: '#e2e8f0', fontSize: 13, width: 70 }} />
                              : item.reorder_threshold}
                          </td>
                          <td style={{ padding: '12px 14px' }}><StatusBadge item={item} /></td>
                          <td style={{ padding: '12px 14px' }}>
                            <div style={{ display: 'flex', gap: 6 }}>
                              {isEditing ? (
                                <>
                                  <button onClick={() => handleUpdate(item.id, editInline)} disabled={saving}
                                    style={{ padding: '5px 10px', borderRadius: 7, background: 'rgba(16,185,129,0.15)',
                                      border: '1px solid rgba(16,185,129,0.3)', color: '#10b981', cursor: 'pointer' }}>
                                    <Check size={13} />
                                  </button>
                                  <button onClick={() => setEditInline(null)}
                                    style={{ padding: '5px 10px', borderRadius: 7, background: 'rgba(255,255,255,0.05)',
                                      border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(226,232,240,0.5)', cursor: 'pointer' }}>
                                    <X size={13} />
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button onClick={() => setEditInline({ ...item })}
                                    style={{ padding: '5px 10px', borderRadius: 7, background: 'rgba(99,102,241,0.1)',
                                      border: '1px solid rgba(99,102,241,0.2)', color: '#a5b4fc', cursor: 'pointer' }}>
                                    <Edit3 size={13} />
                                  </button>
                                  <button onClick={() => handleDelete(item.id)}
                                    style={{ padding: '5px 10px', borderRadius: 7, background: 'rgba(239,68,68,0.08)',
                                      border: '1px solid rgba(239,68,68,0.2)', color: '#f87171', cursor: 'pointer' }}>
                                    <Trash2 size={13} />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* Add / Edit modal */}
      {modal && (
        <ProductModal
          initial={modal === 'add' ? {} : modal}
          onSave={handleAdd}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
