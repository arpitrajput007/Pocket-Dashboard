import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import {
  Search, Save, RefreshCw, Plus, Eye, EyeOff,
  Tag, AlertTriangle, CheckCircle2, Package, DollarSign,
  Layers, Trash2, X, History
} from 'lucide-react';

const fmt = (n) => '₹' + Number(n || 0).toLocaleString('en-IN');

/* ─── Inline number input ─── */
// Shows empty when value is 0 so the placeholder "0" is visible and the user
// can type directly without deleting. Selects all on focus so clicking a
// non-zero field lets you type over it instantly.
function PriceInput({ value, onChange, disabled, placeholder, autoFromShopify }) {
  const display = value === 0 || value == null || Number.isNaN(value) ? '' : value;
  return (
    <div style={{ position: 'relative' }}>
      <span style={{
        position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)',
        color: 'rgba(255,255,255,0.3)', fontSize: '12px', pointerEvents: 'none',
      }}>₹</span>
      <input
        type="number"
        value={display}
        onChange={e => {
          const v = e.target.value;
          onChange(v === '' ? 0 : parseFloat(v) || 0);
        }}
        disabled={disabled}
        placeholder={placeholder || '0'}
        title={autoFromShopify ? 'Auto-fetched from Shopify' : undefined}
        style={{
          width: '100%', padding: '8px 8px 8px 22px', borderRadius: '8px',
          border: '1px solid rgba(255,255,255,0.08)',
          background: disabled ? 'rgba(0,0,0,0.1)' : 'rgba(0,0,0,0.35)',
          color: disabled ? 'rgba(255,255,255,0.25)' : '#fff',
          fontSize: '13px', outline: 'none', fontFamily: 'inherit',
          transition: 'border-color 0.2s',
          boxSizing: 'border-box',
        }}
        onFocus={e => {
          if (!disabled) {
            e.target.style.borderColor = 'rgba(167,139,250,0.5)';
            // Select all so typing replaces the current value (works on type=number).
            e.target.select();
          }
        }}
        onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
      />
    </div>
  );
}

// Plain number input used inside modals — same behaviour, plain style.
function ModalNumberInput({ value, onChange, placeholder, min }) {
  const display = value === 0 || value == null || Number.isNaN(value) ? '' : value;
  return (
    <input
      type="number"
      min={min}
      value={display}
      placeholder={placeholder}
      onChange={e => {
        const v = e.target.value;
        onChange(v === '' ? 0 : parseFloat(v) || 0);
      }}
      onFocus={e => e.target.select()}
      style={{
        width:'100%', padding:'10px 12px', borderRadius:'9px',
        border:'1px solid rgba(255,255,255,0.1)', background:'rgba(0,0,0,0.35)',
        color:'white', fontSize:'13px', outline:'none', boxSizing:'border-box',
      }}
    />
  );
}

/* ─── Margin badge ─── */
function MarginBadge({ cp, shipping, sp }) {
  if (!sp || sp <= 0) return <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '12px' }}>—</span>;
  const profit = sp - (cp || 0) - (shipping || 0);
  const margin = (profit / sp * 100).toFixed(1);
  const isProfit = profit >= 0;
  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-end', gap: '1px' }}>
      <span style={{
        fontSize: '12px', fontWeight: 700, padding: '3px 8px', borderRadius: '6px',
        background: isProfit ? 'rgba(52,211,153,0.1)' : 'rgba(251,113,133,0.1)',
        border: `1px solid ${isProfit ? 'rgba(52,211,153,0.25)' : 'rgba(251,113,133,0.25)'}`,
        color: isProfit ? 'rgba(52,211,153,0.9)' : 'rgba(251,113,133,0.9)',
      }}>{margin}%</span>
      <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)' }}>{fmt(profit)} / unit</span>
    </div>
  );
}

/* ─── Product thumbnail ─── */
function ProductThumb({ imageUrl }) {
  if (imageUrl) {
    return (
      <img src={imageUrl} alt=""
        style={{ width: 32, height: 32, borderRadius: 8, objectFit: 'cover', flexShrink: 0, border: '1px solid rgba(255,255,255,0.08)' }}
      />
    );
  }
  return (
    <div style={{
      width: 32, height: 32, borderRadius: 8, flexShrink: 0,
      background: 'linear-gradient(135deg, rgba(167,139,250,0.15), rgba(56,189,248,0.1))',
      border: '1px solid rgba(167,139,250,0.15)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <Tag size={14} color="rgba(167,139,250,0.6)" />
    </div>
  );
}

export default function PricingView({ store }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [savingAll, setSavingAll] = useState(false);
  const [savingId, setSavingId] = useState(null);
  const [search, setSearch] = useState('');
  const [showHidden, setShowHidden] = useState(false);
  const [toast, setToast] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newProduct, setNewProduct] = useState({ title: '', sku: '', cost_price: 0, selling_price: 0, shipping_cost: 135 });
  const [packModal, setPackModal] = useState(null); // { parent, pack_size, cost_price, selling_price }
  const [costDateModal, setCostDateModal] = useState(null); // { mode:'single'|'all', items:[...], date:'YYYY-MM-DD' }
  const [historyOpen, setHistoryOpen] = useState({});   // { [productId]: true }
  const [historyRows, setHistoryRows] = useState({});   // { [productId]: [{id, effective_from, cost_price, shipping_cost}] }
  const [historyBusy, setHistoryBusy] = useState({});   // { [productId]: true }
  const [localHidden, setLocalHidden] = useState({});

  function showToast(msg, type = 'success') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  // Local YYYY-MM-DD (avoids UTC off-by-one from toISOString()).
  function today() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  useEffect(() => {
    if (store?.id) fetchProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store?.id]);

  // Load local-hidden overrides (lets owner additionally hide products that are 'active' in Shopify).
  useEffect(() => {
    if (!store?.id) return;
    try {
      const raw = localStorage.getItem(`hidden_pricing_${store.id}`);
      setLocalHidden(raw ? JSON.parse(raw) : {});
    } catch { setLocalHidden({}); }
  }, [store?.id]);

  async function fetchProducts() {
    if (!store?.id) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('store_id', store.id)
      .order('title');
    setLoading(false);
    if (error) { showToast('Failed to load: ' + error.message, 'error'); return; }
    setProducts((data || []).map(p => ({
      ...p, _dirty: false,
      _origCost: p.cost_price, _origShip: p.shipping_cost,
    })));
  }

  // Real Shopify sync via backend.
  async function syncFromShopify() {
    if (!store?.id) return;
    setSyncing(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || '';
      const res = await fetch(`${apiUrl}/api/sync-products/${store.id}`, { method: 'POST' });
      const json = await res.json();
      if (!res.ok || json.status !== 'sync_complete') {
        throw new Error(json.error || 'Sync failed');
      }
      await fetchProducts();
      showToast(`Synced ${json.totalSynced} product(s) from Shopify`);
    } catch (e) {
      showToast('Sync failed: ' + e.message, 'error');
    }
    setSyncing(false);
  }

  function updateField(id, field, value) {
    setProducts(prev => prev.map(p =>
      p.id === id ? { ...p, [field]: value, _dirty: true } : p
    ));
  }

  // True when the cost or shipping changed vs what was loaded — these are the
  // values that flow into PNL, so they need an "effective from" date.
  function costChanged(p) {
    return Number(p.cost_price) !== Number(p._origCost) ||
           Number(p.shipping_cost) !== Number(p._origShip);
  }

  // Writes a dated cost entry so historical orders keep their old cost and
  // orders on/after `effectiveFrom` use the new one.
  function writeCostHistory(p, effectiveFrom) {
    return supabase.from('product_cost_history').upsert({
      product_id: p.id,
      store_id: store.id,
      cost_price: Number(p.cost_price) || 0,
      shipping_cost: Number(p.shipping_cost) || 0,
      effective_from: effectiveFrom,
    }, { onConflict: 'product_id,effective_from' });
  }

  // Persists the products rows + (when cost/shipping changed) a dated history row.
  async function persistSave(items, effectiveFrom) {
    const ops = [];
    items.forEach(p => {
      ops.push(supabase.from('products').update({
        cost_price: p.cost_price,
        selling_price: p.selling_price,
        shipping_cost: p.shipping_cost,
      }).eq('id', p.id));
      if (effectiveFrom && costChanged(p)) ops.push(writeCostHistory(p, effectiveFrom));
    });
    const results = await Promise.all(ops);
    return results.filter(r => r.error);
  }

  function markSaved(ids) {
    setProducts(prev => prev.map(p => ids.includes(p.id)
      ? { ...p, _dirty: false, _origCost: p.cost_price, _origShip: p.shipping_cost }
      : p));
  }

  async function saveSingle(product) {
    // Cost/shipping change → ask for the effective-from date first.
    if (costChanged(product)) {
      setCostDateModal({ mode: 'single', items: [product], date: today() });
      return;
    }
    setSavingId(product.id);
    const errors = await persistSave([product], null);
    setSavingId(null);
    if (errors.length) showToast('Save failed: ' + errors[0].error.message, 'error');
    else { markSaved([product.id]); showToast(`Saved: ${product.title}`); }
  }

  async function saveAll() {
    const dirty = products.filter(p => p._dirty);
    if (!dirty.length) { showToast('No changes to save'); return; }
    // If any dirty product changed its cost/shipping, collect one effective date.
    if (dirty.some(costChanged)) {
      setCostDateModal({ mode: 'all', items: dirty, date: today() });
      return;
    }
    setSavingAll(true);
    const errors = await persistSave(dirty, null);
    setSavingAll(false);
    if (errors.length) showToast(`${errors.length} save(s) failed`, 'error');
    else { markSaved(dirty.map(p => p.id)); showToast(`Saved ${dirty.length} product(s) ✓`); }
  }

  // Confirms the effective-from date from the modal and persists everything.
  async function confirmCostDate() {
    if (!costDateModal) return;
    const { items, date, mode } = costDateModal;
    if (!date) { showToast('Pick an effective-from date', 'error'); return; }
    if (mode === 'single') setSavingId(items[0].id); else setSavingAll(true);
    const errors = await persistSave(items, date);
    setSavingId(null); setSavingAll(false);
    setCostDateModal(null);
    if (errors.length) showToast(`${errors.length} save(s) failed`, 'error');
    else {
      markSaved(items.map(p => p.id));
      // Refresh any open history panels for the saved products.
      items.forEach(p => { if (historyOpen[p.id]) loadHistory(p.id); });
      showToast(`Saved ${items.length} product(s) — cost effective ${date} ✓`);
    }
  }

  // ── Cost-change history (per product) ──────────────────────────────────────
  async function loadHistory(productId) {
    setHistoryBusy(b => ({ ...b, [productId]: true }));
    const { data, error } = await supabase
      .from('product_cost_history')
      .select('id, effective_from, cost_price, shipping_cost')
      .eq('product_id', productId)
      .order('effective_from', { ascending: false });
    setHistoryBusy(b => ({ ...b, [productId]: false }));
    if (error) { showToast('Could not load history: ' + error.message, 'error'); return; }
    setHistoryRows(r => ({ ...r, [productId]: data || [] }));
  }

  function toggleHistory(productId) {
    setHistoryOpen(o => {
      const next = { ...o, [productId]: !o[productId] };
      if (next[productId] && !historyRows[productId]) loadHistory(productId);
      return next;
    });
  }

  function updateHistoryField(productId, idx, field, value) {
    setHistoryRows(r => {
      const list = [...(r[productId] || [])];
      list[idx] = { ...list[idx], [field]: value, _dirty: true };
      return { ...r, [productId]: list };
    });
  }

  async function saveHistoryEntry(productId, entry) {
    if (!entry.effective_from) { showToast('Pick a date for this entry', 'error'); return; }
    setHistoryBusy(b => ({ ...b, [productId]: true }));
    const { error } = await supabase.from('product_cost_history').upsert({
      id: entry.id,
      product_id: productId,
      store_id: store.id,
      cost_price: Number(entry.cost_price) || 0,
      shipping_cost: Number(entry.shipping_cost) || 0,
      effective_from: entry.effective_from,
    }, { onConflict: 'product_id,effective_from' });
    setHistoryBusy(b => ({ ...b, [productId]: false }));
    if (error) { showToast('Save failed: ' + error.message, 'error'); return; }
    showToast('Cost entry updated ✓');
    loadHistory(productId);
  }

  async function deleteHistoryEntry(productId, id) {
    if (!confirm('Delete this cost entry? Orders in its window will revert to the previous cost.')) return;
    setHistoryBusy(b => ({ ...b, [productId]: true }));
    const { error } = await supabase.from('product_cost_history').delete().eq('id', id);
    setHistoryBusy(b => ({ ...b, [productId]: false }));
    if (error) { showToast('Delete failed: ' + error.message, 'error'); return; }
    showToast('Cost entry deleted');
    loadHistory(productId);
  }

  function toggleLocalHide(productId) {
    setLocalHidden(prev => {
      const next = { ...prev };
      if (next[productId]) delete next[productId];
      else next[productId] = true;
      try { localStorage.setItem(`hidden_pricing_${store.id}`, JSON.stringify(next)); } catch {}
      return next;
    });
  }

  async function addCustomProduct() {
    if (!newProduct.title.trim()) { showToast('Product title is required', 'error'); return; }
    const { data, error } = await supabase.from('products').insert([{
      store_id: store.id,
      shopify_product_id: 'custom_' + Date.now(),
      title: newProduct.title,
      sku: newProduct.sku || '',
      cost_price: newProduct.cost_price,
      selling_price: newProduct.selling_price,
      shipping_cost: newProduct.shipping_cost,
      status: 'active',
    }]).select().single();
    if (error) { showToast('Failed: ' + error.message, 'error'); return; }
    setProducts(prev => [...prev, { ...data, _dirty: false, _origCost: data.cost_price, _origShip: data.shipping_cost }]);
    setShowAddModal(false);
    setNewProduct({ title: '', sku: '', cost_price: 0, selling_price: 0, shipping_cost: 135 });
    showToast('Product added!');
  }

  function openPackModal(parent) {
    setPackModal({ parent, pack_size: 2, cost_price: 0, selling_price: 0, shipping_cost: parent.shipping_cost || 135 });
  }

  async function createPack() {
    if (!packModal) return;
    const { parent, pack_size, cost_price, selling_price, shipping_cost } = packModal;
    if (!pack_size || pack_size < 2) { showToast('Pack size must be at least 2', 'error'); return; }
    // Block duplicate pack sizes for the same parent.
    const existing = products.find(p => p.parent_product_id === parent.id && p.pack_size === Number(pack_size));
    if (existing) { showToast(`Pack of ${pack_size} already exists for this product`, 'error'); return; }

    const synthId = `pack_${parent.shopify_product_id}_${pack_size}_${Date.now()}`;
    const { data, error } = await supabase.from('products').insert([{
      store_id: store.id,
      shopify_product_id: synthId,
      title: `${parent.title} — Pack of ${pack_size}`,
      sku: parent.sku ? `${parent.sku}-PACK${pack_size}` : '',
      cost_price: Number(cost_price) || 0,
      selling_price: Number(selling_price) || 0,
      shipping_cost: Number(shipping_cost) || 0,
      status: 'active',
      parent_product_id: parent.id,
      pack_size: Number(pack_size),
    }]).select().single();
    if (error) { showToast('Failed to create pack: ' + error.message, 'error'); return; }
    setProducts(prev => [...prev, { ...data, _dirty: false, _origCost: data.cost_price, _origShip: data.shipping_cost }]);
    setPackModal(null);
    showToast(`Pack of ${pack_size} added`);
  }

  async function deletePack(pack) {
    if (!confirm(`Delete this Pack of ${pack.pack_size}?`)) return;
    const { error } = await supabase.from('products').delete().eq('id', pack.id);
    if (error) { showToast('Delete failed: ' + error.message, 'error'); return; }
    setProducts(prev => prev.filter(p => p.id !== pack.id));
    showToast('Pack deleted');
  }

  // Visibility: a product is visible when status === 'active' AND not locally hidden.
  // Packs inherit the visibility of their parent.
  function isProductVisible(p) {
    if (p.parent_product_id) return false; // packs are rendered as children, not in the flat list
    if (p.status && p.status !== 'active') return false;
    if (localHidden[p.id]) return false;
    return true;
  }

  function isProductHidden(p) {
    if (p.parent_product_id) return false;
    return (p.status && p.status !== 'active') || !!localHidden[p.id];
  }

  const baseProducts = useMemo(
    () => products.filter(p => !p.parent_product_id),
    [products]
  );

  const packsByParent = useMemo(() => {
    const m = new Map();
    products.forEach(p => {
      if (p.parent_product_id) {
        if (!m.has(p.parent_product_id)) m.set(p.parent_product_id, []);
        m.get(p.parent_product_id).push(p);
      }
    });
    m.forEach(arr => arr.sort((a, b) => (a.pack_size || 0) - (b.pack_size || 0)));
    return m;
  }, [products]);

  const hiddenCount = baseProducts.filter(isProductHidden).length;
  const dirtyCount = products.filter(p => p._dirty).length;

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return baseProducts
      .filter(p => showHidden ? isProductHidden(p) : isProductVisible(p))
      .filter(p => !q || p.title?.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseProducts, showHidden, search, localHidden]);

  if (!store?.shopify_domain) {
    return (
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:'60vh', gap:'16px', textAlign:'center', padding:'40px' }}>
        <DollarSign size={48} color="rgba(167,139,250,0.5)" strokeWidth={1.2} />
        <div style={{ fontFamily:'Outfit', fontSize:'22px', fontWeight:800, color:'#fff' }}>No Store Connected</div>
        <div style={{ color:'rgba(255,255,255,0.4)', fontSize:'14px', maxWidth:'360px', lineHeight:1.7 }}>
          Connect your Shopify store first to manage product pricing.
        </div>
      </div>
    );
  }

  const thStyle = {
    padding: '11px 14px', fontSize: '11px', fontWeight: 700,
    color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase',
    letterSpacing: '0.5px', background: 'rgba(0,0,0,0.3)',
    borderBottom: '1px solid rgba(255,255,255,0.06)', textAlign: 'left', whiteSpace: 'nowrap',
  };

  function renderRow(p, opts = {}) {
    const { isPack = false, parent = null, isLast = false } = opts;
    const hiddenFlag = !isPack && isProductHidden(p);
    const histExpanded = !!historyOpen[p.id];
    return (
      <React.Fragment key={p.id}>
      <tr style={{
        borderBottom: histExpanded ? 'none' : (isLast ? 'none' : '1px solid rgba(255,255,255,0.04)'),
        background: p._dirty ? 'rgba(167,139,250,0.04)' : isPack ? 'rgba(56,189,248,0.025)' : 'transparent',
        opacity: hiddenFlag ? 0.45 : 1,
        transition: 'background 0.15s, opacity 0.2s',
      }}>
        {/* Product cell */}
        <td style={{ padding:'12px 14px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'10px', paddingLeft: isPack ? 32 : 0 }}>
            {isPack ? (
              <div style={{
                width:'26px', height:'26px', borderRadius:'7px', flexShrink:0,
                background:'rgba(56,189,248,0.1)', border:'1px solid rgba(56,189,248,0.25)',
                display:'flex', alignItems:'center', justifyContent:'center',
              }}>
                <Layers size={12} color="rgba(56,189,248,0.85)"/>
              </div>
            ) : (
              <ProductThumb imageUrl={p.image_url}/>
            )}
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: isPack ? 500 : 600, color: isPack ? 'rgba(255,255,255,0.85)' : '#fff', fontSize:'13px', marginBottom:'2px', display:'flex', alignItems:'center', gap:6 }}>
                {isPack ? (
                  <>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 5, background: 'rgba(56,189,248,0.15)', color: 'rgba(56,189,248,0.95)', letterSpacing: '0.3px' }}>
                      PACK × {p.pack_size}
                    </span>
                    <span>{parent?.title || p.title}</span>
                  </>
                ) : (
                  <span>{p.title}</span>
                )}
                {!isPack && p.status && p.status !== 'active' && (
                  <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 5, background: 'rgba(251,191,36,0.12)', color: 'rgba(251,191,36,0.9)', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                    {p.status}
                  </span>
                )}
              </div>
              <div style={{ fontSize:'10px', color:'rgba(255,255,255,0.3)', fontFamily:'monospace' }}>
                {p.sku || <em style={{ fontStyle:'italic' }}>No SKU</em>}
              </div>
            </div>
          </div>
        </td>
        {/* CP — manually entered */}
        <td style={{ padding:'8px 14px' }}>
          <PriceInput value={p.cost_price} onChange={v=>updateField(p.id,'cost_price',v)} disabled={hiddenFlag}/>
        </td>
        {/* SP — auto from Shopify for base, manual for packs */}
        <td style={{ padding:'8px 14px' }}>
          <PriceInput
            value={p.selling_price}
            onChange={v=>updateField(p.id,'selling_price',v)}
            disabled={hiddenFlag || (!isPack && !!p.shopify_product_id && !p.shopify_product_id.startsWith('custom_'))}
            autoFromShopify={!isPack && !!p.shopify_product_id && !p.shopify_product_id.startsWith('custom_')}
          />
        </td>
        {/* Shipping */}
        <td style={{ padding:'8px 14px' }}>
          <PriceInput value={p.shipping_cost} onChange={v=>updateField(p.id,'shipping_cost',v)} disabled={hiddenFlag}/>
        </td>
        {/* Margin */}
        <td style={{ padding:'8px 14px', textAlign:'right' }}>
          <MarginBadge cp={p.cost_price} shipping={p.shipping_cost} sp={p.selling_price}/>
        </td>
        {/* Actions */}
        <td style={{ padding:'8px 14px' }}>
          {(() => {
            const iconBtn = { width: 30, height: 30, flexShrink: 0, borderRadius: 8, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.15s' };
            return (
              <div style={{ display:'flex', gap:'6px', justifyContent:'flex-end', alignItems:'center', flexWrap:'nowrap' }}>
                {/* Save — labeled, primary */}
                <button onClick={()=>saveSingle(p)} disabled={!p._dirty || hiddenFlag || savingId===p.id} title="Save changes" style={{
                  height: 30, padding:'0 14px', borderRadius:'8px', fontSize:'12px', fontWeight:700, flexShrink: 0,
                  background: p._dirty && !hiddenFlag ? 'linear-gradient(135deg,rgba(167,139,250,1),rgba(56,189,248,1))' : 'rgba(255,255,255,0.06)',
                  border:'none', color: p._dirty && !hiddenFlag ? '#000' : 'rgba(255,255,255,0.25)',
                  cursor: p._dirty && !hiddenFlag ? 'pointer' : 'not-allowed', transition: 'all 0.15s',
                }}>
                  {savingId===p.id ? '…' : 'Save'}
                </button>

                {/* History */}
                <button onClick={()=>toggleHistory(p.id)} title="Cost history" style={{
                  ...iconBtn,
                  background: histExpanded ? 'rgba(251,191,36,0.14)' : 'rgba(255,255,255,0.05)',
                  border: histExpanded ? '1px solid rgba(251,191,36,0.3)' : '1px solid rgba(255,255,255,0.08)',
                  color: histExpanded ? 'rgba(251,191,36,0.95)' : 'rgba(255,255,255,0.45)',
                }}>
                  <History size={13}/>
                </button>

                {isPack ? (
                  <button onClick={()=>deletePack(p)} title="Delete this pack" style={{
                    ...iconBtn, background:'rgba(251,113,133,0.08)', border:'1px solid rgba(251,113,133,0.2)', color:'rgba(251,113,133,0.85)',
                  }}>
                    <Trash2 size={13}/>
                  </button>
                ) : (
                  <>
                    {/* Add pack — labeled so it's discoverable; always available for any size */}
                    <button onClick={()=>openPackModal(p)} title="Create a pack (any size)" disabled={hiddenFlag} style={{
                      height: 30, padding:'0 12px', borderRadius:'8px', fontSize:'12px', fontWeight:600, flexShrink: 0,
                      background:'rgba(56,189,248,0.1)', border:'1px solid rgba(56,189,248,0.25)',
                      color:'rgba(56,189,248,0.95)', cursor: hiddenFlag ? 'not-allowed' : 'pointer',
                      opacity: hiddenFlag ? 0.4 : 1, display: 'inline-flex', alignItems: 'center', gap: 5, transition: 'all 0.15s',
                    }}>
                      <Layers size={13}/> Pack
                    </button>
                    <button onClick={()=>toggleLocalHide(p.id)} title={localHidden[p.id] ? 'Unhide product' : 'Hide product'} style={{
                      ...iconBtn,
                      background: localHidden[p.id] ? 'rgba(56,189,248,0.1)' : 'rgba(255,255,255,0.05)',
                      border: localHidden[p.id] ? '1px solid rgba(56,189,248,0.25)' : '1px solid rgba(255,255,255,0.08)',
                      color: localHidden[p.id] ? 'rgba(56,189,248,0.8)' : 'rgba(255,255,255,0.4)',
                    }}>
                      {localHidden[p.id] ? <Eye size={13}/> : <EyeOff size={13}/>}
                    </button>
                  </>
                )}
              </div>
            );
          })()}
        </td>
      </tr>
      {histExpanded && (
        <tr style={{ background:'rgba(0,0,0,0.22)', borderBottom: isLast ? 'none' : '1px solid rgba(255,255,255,0.04)' }}>
          <td colSpan={6} style={{ padding:'4px 14px 14px' }}>
            {historyBusy[p.id] && !historyRows[p.id] ? (
              <div style={{ fontSize:12, color:'rgba(255,255,255,0.4)', padding:'10px 4px' }}>Loading cost history…</div>
            ) : (historyRows[p.id] && historyRows[p.id].length) ? (
              <div style={{ paddingLeft: isPack ? 32 : 0 }}>
                <div style={{ fontSize:10, fontWeight:700, color:'rgba(255,255,255,0.35)', textTransform:'uppercase', letterSpacing:'0.5px', margin:'6px 0 8px' }}>
                  Cost history — orders use the cost effective on their order date
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                  {historyRows[p.id].map((h, idx) => (
                    <div key={h.id} style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap', background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:9, padding:'8px 10px' }}>
                      <label style={{ fontSize:10, color:'rgba(255,255,255,0.4)' }}>From
                        <input type="date" value={h.effective_from} max={today()} onChange={e=>updateHistoryField(p.id, idx, 'effective_from', e.target.value)}
                          style={{ marginLeft:6, padding:'5px 8px', borderRadius:7, border:'1px solid rgba(255,255,255,0.1)', background:'rgba(0,0,0,0.35)', color:'#fff', fontSize:12, outline:'none', colorScheme:'dark' }}/>
                      </label>
                      <label style={{ fontSize:10, color:'rgba(255,255,255,0.4)' }}>Cost ₹
                        <input type="number" value={h.cost_price} onChange={e=>updateHistoryField(p.id, idx, 'cost_price', e.target.value)} onFocus={e=>e.target.select()}
                          style={{ marginLeft:6, width:74, padding:'5px 8px', borderRadius:7, border:'1px solid rgba(255,255,255,0.1)', background:'rgba(0,0,0,0.35)', color:'#fff', fontSize:12, outline:'none' }}/>
                      </label>
                      <label style={{ fontSize:10, color:'rgba(255,255,255,0.4)' }}>Ship ₹
                        <input type="number" value={h.shipping_cost ?? ''} onChange={e=>updateHistoryField(p.id, idx, 'shipping_cost', e.target.value)} onFocus={e=>e.target.select()}
                          style={{ marginLeft:6, width:64, padding:'5px 8px', borderRadius:7, border:'1px solid rgba(255,255,255,0.1)', background:'rgba(0,0,0,0.35)', color:'#fff', fontSize:12, outline:'none' }}/>
                      </label>
                      <div style={{ display:'flex', gap:6, marginLeft:'auto' }}>
                        <button onClick={()=>saveHistoryEntry(p.id, h)} disabled={!h._dirty || historyBusy[p.id]} style={{
                          padding:'5px 10px', borderRadius:7, fontSize:11, fontWeight:700, border:'none',
                          background: h._dirty ? 'linear-gradient(135deg,rgba(167,139,250,1),rgba(56,189,248,1))' : 'rgba(255,255,255,0.06)',
                          color: h._dirty ? '#000' : 'rgba(255,255,255,0.25)', cursor: h._dirty ? 'pointer' : 'not-allowed' }}>Save</button>
                        <button onClick={()=>deleteHistoryEntry(p.id, h.id)} title="Delete entry" style={{
                          padding:'5px 8px', borderRadius:7, fontSize:11, border:'1px solid rgba(251,113,133,0.2)',
                          background:'rgba(251,113,133,0.08)', color:'rgba(251,113,133,0.85)', cursor:'pointer' }}><Trash2 size={11}/></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ fontSize:12, color:'rgba(255,255,255,0.4)', padding:'10px 4px', paddingLeft: isPack ? 32 : 0 }}>
                No cost history yet. Change the cost above and Save to add a dated entry.
              </div>
            )}
          </td>
        </tr>
      )}
      </React.Fragment>
    );
  }

  return (
    <div style={{ animation: 'fadeInUp 0.35s ease' }}>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: '20px', right: '24px', zIndex: 9999,
          display: 'flex', alignItems: 'center', gap: '10px',
          padding: '13px 18px', borderRadius: '12px',
          background: toast.type === 'error' ? 'rgba(251,113,133,0.15)' : 'rgba(52,211,153,0.15)',
          border: `1px solid ${toast.type === 'error' ? 'rgba(251,113,133,0.4)' : 'rgba(52,211,153,0.4)'}`,
          color: toast.type === 'error' ? '#fb7185' : '#34d399',
          fontSize: '13px', fontWeight: 600, backdropFilter: 'blur(12px)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          animation: 'fadeInUp 0.3s ease',
        }}>
          {toast.type === 'error' ? <AlertTriangle size={15}/> : <CheckCircle2 size={15}/>}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:'24px', flexWrap:'wrap', gap:'12px' }}>
        <div>
          <h2 style={{ fontFamily:'Outfit', fontSize:'22px', fontWeight:800, color:'#fff', margin:'0 0 4px 0' }}>Pricing Management</h2>
          <p style={{ margin:0, fontSize:'13px', color:'rgba(255,255,255,0.4)' }}>
            Set cost price per SKU. Selling price syncs from Shopify. Create packs for bulk SKUs you sell.
          </p>
        </div>
        <div style={{ display:'flex', gap:'10px', flexWrap:'wrap' }}>
          {dirtyCount > 0 && (
            <div style={{ display:'flex', alignItems:'center', gap:'6px', padding:'8px 14px', borderRadius:'10px', background:'rgba(251,191,36,0.1)', border:'1px solid rgba(251,191,36,0.25)', color:'rgba(251,191,36,0.9)', fontSize:'12px', fontWeight:600 }}>
              <span style={{ width:'7px', height:'7px', borderRadius:'50%', background:'rgba(251,191,36,1)', display:'inline-block' }}/>
              {dirtyCount} unsaved change{dirtyCount > 1 ? 's' : ''}
            </div>
          )}
          <button onClick={() => setShowAddModal(true)} style={{
            display:'flex', alignItems:'center', gap:'7px', padding:'9px 16px', borderRadius:'10px',
            background:'rgba(52,211,153,0.1)', border:'1px solid rgba(52,211,153,0.25)',
            color:'rgba(52,211,153,0.9)', cursor:'pointer', fontSize:'13px', fontWeight:600,
          }}>
            <Plus size={15}/> Add Product
          </button>
          <button onClick={syncFromShopify} disabled={syncing} style={{
            display:'flex', alignItems:'center', gap:'7px', padding:'9px 16px', borderRadius:'10px',
            background:'rgba(56,189,248,0.08)', border:'1px solid rgba(56,189,248,0.2)',
            color:'rgba(56,189,248,0.85)', cursor:syncing?'not-allowed':'pointer', fontSize:'13px', fontWeight:600, opacity:syncing?0.7:1,
          }}>
            <RefreshCw size={14} style={{ animation:syncing?'spin 1s linear infinite':'none' }}/>
            {syncing ? 'Syncing…' : 'Sync SKUs'}
          </button>
          <button onClick={saveAll} disabled={savingAll || !dirtyCount} style={{
            display:'flex', alignItems:'center', gap:'8px', padding:'9px 20px', borderRadius:'10px', border:'none',
            background: dirtyCount ? 'linear-gradient(135deg, rgba(167,139,250,1), rgba(56,189,248,1))' : 'rgba(255,255,255,0.06)',
            color: dirtyCount ? '#000' : 'rgba(255,255,255,0.25)',
            fontWeight:700, fontSize:'13px', cursor:!dirtyCount||savingAll?'not-allowed':'pointer',
            transition:'all 0.2s',
          }}>
            <Save size={14}/> {savingAll ? 'Saving...' : 'Save All'}
          </button>
        </div>
      </div>

      {/* Controls */}
      <div style={{ display:'flex', gap:'12px', alignItems:'center', padding:'14px 16px', borderRadius:'14px', background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', marginBottom:'20px', flexWrap:'wrap' }}>
        <div style={{ flex:1, minWidth:'200px', position:'relative' }}>
          <Search size={14} style={{ position:'absolute', left:'10px', top:'50%', transform:'translateY(-50%)', color:'rgba(255,255,255,0.3)' }}/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search products or SKU..."
            style={{ width:'100%', padding:'8px 10px 8px 32px', borderRadius:'8px', border:'1px solid rgba(255,255,255,0.08)', background:'rgba(0,0,0,0.3)', color:'white', fontSize:'13px', outline:'none', boxSizing:'border-box' }}/>
        </div>
        <button onClick={() => setShowHidden(s=>!s)} style={{
          display:'flex', alignItems:'center', gap:'7px', padding:'8px 14px', borderRadius:'10px',
          background: showHidden ? 'rgba(251,191,36,0.1)' : 'rgba(255,255,255,0.04)',
          border: showHidden ? '1px solid rgba(251,191,36,0.3)' : '1px solid rgba(255,255,255,0.08)',
          color: showHidden ? 'rgba(251,191,36,0.85)' : 'rgba(255,255,255,0.45)',
          cursor:'pointer', fontSize:'13px', fontWeight:600,
        }}>
          {showHidden ? <Eye size={14}/> : <EyeOff size={14}/>}
          {showHidden ? 'Showing Hidden' : `Hidden (${hiddenCount})`}
        </button>
        <div style={{ fontSize:'12px', color:'rgba(255,255,255,0.3)', whiteSpace:'nowrap' }}>
          {filtered.length} product{filtered.length !== 1 ? 's' : ''} shown
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ display:'flex', justifyContent:'center', padding:'60px', color:'rgba(255,255,255,0.3)', fontSize:'14px' }}>
          <RefreshCw size={20} style={{ animation:'spin 1s linear infinite', marginRight:'10px' }}/> Loading products...
        </div>
      ) : (
        <div style={{ borderRadius:'16px', border:'1px solid rgba(255,255,255,0.08)', overflow:'hidden', background:'rgba(0,0,0,0.2)' }}>
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', minWidth:'820px' }}>
              <thead>
                <tr>
                  <th style={thStyle}>Product / SKU</th>
                  <th style={{ ...thStyle, width:'150px' }}>Cost Price (CP)</th>
                  <th style={{ ...thStyle, width:'150px' }}>Selling Price (SP)</th>
                  <th style={{ ...thStyle, width:'150px' }}>Shipping / Fulfillment</th>
                  <th style={{ ...thStyle, width:'130px', textAlign:'right' }}>Margin / Profit</th>
                  <th style={{ ...thStyle, width:'180px', textAlign:'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={6} style={{ padding:'70px', textAlign:'center' }}>
                    <Package size={36} style={{ opacity:0.2, display:'block', margin:'0 auto 14px' }}/>
                    <div style={{ color:'rgba(255,255,255,0.3)', fontSize:'14px' }}>
                      {baseProducts.length === 0
                        ? 'No products found. Click "Sync SKUs" to pull from your Shopify store.'
                        : showHidden ? 'No hidden products' : 'No products match your search'}
                    </div>
                  </td></tr>
                ) : filtered.flatMap((p, i) => {
                  const packs = packsByParent.get(p.id) || [];
                  const baseRow = renderRow(p, { isLast: false });
                  const packRows = packs.map((pk, j) =>
                    renderRow(pk, { isPack: true, parent: p, isLast: i === filtered.length - 1 && j === packs.length - 1 })
                  );
                  return [baseRow, ...packRows];
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Product Modal */}
      {showAddModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', backdropFilter:'blur(8px)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:'20px' }}>
          <div style={{ background:'oklch(0.18 0.03 270)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'20px', padding:'28px', width:'100%', maxWidth:'440px', boxShadow:'0 24px 60px rgba(0,0,0,0.6)' }}>
            <h3 style={{ fontFamily:'Outfit', fontSize:'18px', fontWeight:800, color:'#fff', margin:'0 0 20px 0' }}>Add Custom Product</h3>
            {[
              { label:'Product Title *', field:'title', type:'text', placeholder:'e.g. Premium Toy Set' },
              { label:'SKU', field:'sku', type:'text', placeholder:'e.g. TOY-001' },
              { label:'Cost Price (₹)', field:'cost_price', type:'number', placeholder:'0' },
              { label:'Selling Price (₹)', field:'selling_price', type:'number', placeholder:'0' },
              { label:'Shipping Cost (₹)', field:'shipping_cost', type:'number', placeholder:'135' },
            ].map(f => (
              <div key={f.field} style={{ marginBottom:'14px' }}>
                <label style={{ fontSize:'12px', fontWeight:600, color:'rgba(255,255,255,0.4)', display:'block', marginBottom:'6px', textTransform:'uppercase', letterSpacing:'0.5px' }}>{f.label}</label>
                {f.type === 'number' ? (
                  <ModalNumberInput
                    value={newProduct[f.field]}
                    placeholder={f.placeholder}
                    onChange={v => setNewProduct(p => ({ ...p, [f.field]: v }))}
                  />
                ) : (
                  <input type={f.type} value={newProduct[f.field]} placeholder={f.placeholder}
                    onChange={e=>setNewProduct(p=>({...p,[f.field]:e.target.value}))}
                    onFocus={e=>e.target.select()}
                    style={{ width:'100%', padding:'10px 12px', borderRadius:'9px', border:'1px solid rgba(255,255,255,0.1)', background:'rgba(0,0,0,0.35)', color:'white', fontSize:'13px', outline:'none', boxSizing:'border-box' }}/>
                )}
              </div>
            ))}
            <div style={{ display:'flex', gap:'10px', marginTop:'20px' }}>
              <button onClick={()=>setShowAddModal(false)} style={{ flex:1, padding:'11px', borderRadius:'10px', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', color:'rgba(255,255,255,0.6)', cursor:'pointer', fontWeight:600, fontSize:'13px' }}>Cancel</button>
              <button onClick={addCustomProduct} style={{ flex:2, padding:'11px', borderRadius:'10px', border:'none', background:'linear-gradient(135deg,rgba(167,139,250,1),rgba(56,189,248,1))', color:'#000', fontWeight:700, fontSize:'13px', cursor:'pointer' }}>Add Product</button>
            </div>
          </div>
        </div>
      )}

      {/* Pack Creation Modal */}
      {packModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', backdropFilter:'blur(8px)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:'20px' }}>
          <div style={{ background:'oklch(0.18 0.03 270)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'20px', padding:'28px', width:'100%', maxWidth:'480px', boxShadow:'0 24px 60px rgba(0,0,0,0.6)' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'6px' }}>
              <h3 style={{ fontFamily:'Outfit', fontSize:'18px', fontWeight:800, color:'#fff', margin:0 }}>Create Pack</h3>
              <button onClick={()=>setPackModal(null)} style={{ background:'transparent', border:'none', color:'rgba(255,255,255,0.4)', cursor:'pointer', padding:4 }}>
                <X size={18}/>
              </button>
            </div>
            <p style={{ fontSize:'13px', color:'rgba(255,255,255,0.5)', margin:'0 0 18px 0' }}>
              For <strong style={{ color:'#fff' }}>{packModal.parent.title}</strong>
            </p>

            <div style={{ marginBottom:'14px' }}>
              <label style={{ fontSize:'12px', fontWeight:600, color:'rgba(255,255,255,0.4)', display:'block', marginBottom:'6px', textTransform:'uppercase', letterSpacing:'0.5px' }}>Pack Size *</label>
              <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                {[2, 3, 5, 10].map(n => (
                  <button key={n} onClick={()=>setPackModal(m=>({ ...m, pack_size: n }))} style={{
                    padding:'8px 16px', borderRadius:9, fontSize:13, fontWeight:700,
                    background: packModal.pack_size === n ? 'rgba(56,189,248,0.15)' : 'rgba(255,255,255,0.04)',
                    border: packModal.pack_size === n ? '1px solid rgba(56,189,248,0.45)' : '1px solid rgba(255,255,255,0.08)',
                    color: packModal.pack_size === n ? 'rgba(56,189,248,1)' : 'rgba(255,255,255,0.6)',
                    cursor:'pointer',
                  }}>
                    Pack of {n}
                  </button>
                ))}
                <input type="number" min={2} value={packModal.pack_size === 0 ? '' : packModal.pack_size}
                  onChange={e=>{
                    const v = e.target.value;
                    setPackModal(m => ({ ...m, pack_size: v === '' ? 0 : parseInt(v) || 0 }));
                  }}
                  onFocus={e=>e.target.select()}
                  style={{ width:80, padding:'8px 10px', borderRadius:9, border:'1px solid rgba(255,255,255,0.1)', background:'rgba(0,0,0,0.35)', color:'white', fontSize:13, outline:'none' }}
                  placeholder="Custom"/>
              </div>
            </div>

            {[
              { label:'Cost Price for this Pack (₹) *', field:'cost_price', placeholder:'Total cost for the whole pack' },
              { label:'Selling Price for this Pack (₹) *', field:'selling_price', placeholder:'What you charge for the pack' },
              { label:'Shipping Cost (₹)', field:'shipping_cost', placeholder:'135' },
            ].map(f => (
              <div key={f.field} style={{ marginBottom:'14px' }}>
                <label style={{ fontSize:'12px', fontWeight:600, color:'rgba(255,255,255,0.4)', display:'block', marginBottom:'6px', textTransform:'uppercase', letterSpacing:'0.5px' }}>{f.label}</label>
                <ModalNumberInput
                  value={packModal[f.field]}
                  placeholder={f.placeholder}
                  onChange={v => setPackModal(m => ({ ...m, [f.field]: v }))}
                />
              </div>
            ))}

            <div style={{ display:'flex', gap:'10px', marginTop:'20px' }}>
              <button onClick={()=>setPackModal(null)} style={{ flex:1, padding:'11px', borderRadius:'10px', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', color:'rgba(255,255,255,0.6)', cursor:'pointer', fontWeight:600, fontSize:'13px' }}>Cancel</button>
              <button onClick={createPack} style={{ flex:2, padding:'11px', borderRadius:'10px', border:'none', background:'linear-gradient(135deg,rgba(167,139,250,1),rgba(56,189,248,1))', color:'#000', fontWeight:700, fontSize:'13px', cursor:'pointer' }}>Create Pack</button>
            </div>
          </div>
        </div>
      )}

      {costDateModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', backdropFilter:'blur(8px)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:'20px' }}>
          <div style={{ background:'oklch(0.18 0.03 270)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'20px', padding:'28px', width:'100%', maxWidth:'460px', boxShadow:'0 24px 60px rgba(0,0,0,0.6)' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'6px' }}>
              <h3 style={{ fontFamily:'Outfit', fontSize:'18px', fontWeight:800, color:'#fff', margin:0 }}>Cost effective from</h3>
              <button onClick={()=>setCostDateModal(null)} style={{ background:'transparent', border:'none', color:'rgba(255,255,255,0.4)', cursor:'pointer', padding:4 }}>
                <X size={18}/>
              </button>
            </div>
            <p style={{ fontSize:'13px', color:'rgba(255,255,255,0.55)', margin:'0 0 18px 0', lineHeight:1.5 }}>
              {costDateModal.mode === 'single'
                ? <>New cost for <strong style={{ color:'#fff' }}>{costDateModal.items[0].title}</strong> applies to orders on/after this date. Older orders keep their previous cost.</>
                : <>New costs apply to orders on/after this date for <strong style={{ color:'#fff' }}>{costDateModal.items.filter(costChanged).length}</strong> product(s). Older orders keep their previous cost.</>}
            </p>

            <div style={{ marginBottom:'16px' }}>
              <label style={{ fontSize:'12px', fontWeight:600, color:'rgba(255,255,255,0.4)', display:'block', marginBottom:'6px', textTransform:'uppercase', letterSpacing:'0.5px' }}>Effective from *</label>
              <input
                type="date"
                value={costDateModal.date}
                max={today()}
                onChange={e=>setCostDateModal(m=>({ ...m, date: e.target.value }))}
                style={{ width:'100%', padding:'10px 12px', borderRadius:10, border:'1px solid rgba(255,255,255,0.12)', background:'rgba(0,0,0,0.35)', color:'white', fontSize:14, outline:'none', colorScheme:'dark' }}
              />
              <div style={{ display:'flex', gap:8, marginTop:10 }}>
                <button onClick={()=>setCostDateModal(m=>({ ...m, date: today() }))} style={{ padding:'6px 12px', borderRadius:8, fontSize:12, fontWeight:600, background:'rgba(56,189,248,0.12)', border:'1px solid rgba(56,189,248,0.3)', color:'rgba(56,189,248,1)', cursor:'pointer' }}>Today</button>
                <button onClick={()=>setCostDateModal(m=>({ ...m, date: '2000-01-01' }))} style={{ padding:'6px 12px', borderRadius:8, fontSize:12, fontWeight:600, background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', color:'rgba(255,255,255,0.6)', cursor:'pointer' }}>All history</button>
              </div>
            </div>

            <div style={{ display:'flex', gap:'10px', marginTop:'20px' }}>
              <button onClick={()=>setCostDateModal(null)} style={{ flex:1, padding:'11px', borderRadius:'10px', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', color:'rgba(255,255,255,0.6)', cursor:'pointer', fontWeight:600, fontSize:'13px' }}>Cancel</button>
              <button onClick={confirmCostDate} disabled={savingAll || savingId!=null} style={{ flex:2, padding:'11px', borderRadius:'10px', border:'none', background:'linear-gradient(135deg,rgba(167,139,250,1),rgba(56,189,248,1))', color:'#000', fontWeight:700, fontSize:'13px', cursor:'pointer', opacity:(savingAll||savingId!=null)?0.6:1 }}>Save with this date</button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
