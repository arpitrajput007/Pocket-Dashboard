import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import {
  fmt, toDateStr, getOrderDateIST, parseDateStr,
  isOrderDelivered, isOrderPrepaidRevenue, categorizeOrders,
  getPaymentCounts, getRevenueBreakdown, getTotalRevenue, calcPL,
  PREPAID_LAUNCH_DATE, PRODUCT_COST, SHIPPING_COST, extractPackSize,
  effectiveCostPrice, effectiveShippingCost
} from '../utils/dashboardUtils';

const today = () => toDateStr(new Date());
const daysAgo = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return toDateStr(d); };

// ── MetricCard ─────────────────────────────────────────────────────────────
function MetricCard({ label, value, color, glow, onClick, active, note, badge }) {
  return (
    <div
      className={`metric-card clickable glow-${glow}${active ? ' active-filter' : ''}`}
      onClick={onClick}
      style={{ position: 'relative', overflow: badge ? 'hidden' : undefined }}
    >
      {badge && <div style={{ position:'absolute',top:8,right:8,width:6,height:6,borderRadius:'50%',background:'#fbbf24',boxShadow:'0 0 8px #fbbf24',animation:'pulseText 2s infinite' }} />}
      <div className="metric-label" style={{ fontSize: label.length > 14 ? 11 : 13 }}>{label}</div>
      <div className="metric-value" style={color ? { color } : {}}>{value}</div>
      {note && <div style={{ fontSize:10,color:'var(--text-muted)',marginTop:6,opacity:0.7 }}>{note}</div>}
    </div>
  );
}

// Flatten a per-platform-per-product breakdown into per-product totals.
//   Nested shape: { meta: { "Title": 500 }, google: { "Title": 200 } } → { "Title": 700 }
//   Legacy flat shape: { "Title": 500 } → { "Title": 500 } (passed through)
// Exported so other views (PNL, all-time, etc.) can reuse it.
function flattenAdProductBreakdown(raw) {
  if (!raw || typeof raw !== 'object') return {};
  const values = Object.values(raw);
  const isNested = values.length > 0 && values.every(v => v && typeof v === 'object' && !Array.isArray(v));
  if (!isNested) {
    // Legacy flat shape — already per-product.
    const out = {};
    Object.entries(raw).forEach(([k, v]) => { const n = Number(v); if (n > 0) out[k] = n; });
    return out;
  }
  const out = {};
  Object.values(raw).forEach(platformMap => {
    Object.entries(platformMap || {}).forEach(([title, amount]) => {
      const n = Number(amount) || 0;
      if (n > 0) out[title] = (out[title] || 0) + n;
    });
  });
  return out;
}

// ── ProductPNLModal ────────────────────────────────────────────────────────
function ProductPNLModal({ dateStr, prettyDate, dayOrders, adCosts, adProductBreakdown, productPricing, onClose }) {
  const dayAd = adCosts[dateStr] || 0;
  // Sum across all platforms so the PNL row shows total ad spend per product
  // regardless of which channel (Meta/Google/etc.) it came from.
  const dayAdSplits = flattenAdProductBreakdown(adProductBreakdown);

  const productMap = {};
  dayOrders.forEach(o => {
    const isCountedForRev = isOrderDelivered(o) || isOrderPrepaidRevenue(o);
    const lineItems = o.line_items ? (typeof o.line_items === 'string' ? JSON.parse(o.line_items) : o.line_items) : [];
    lineItems.forEach(li => {
      // Group by title + variant so "Pack of 2" and "Pack of 3" are separate rows
      const variantTitle = li.variant_title || '';
      const key = (li.title || 'Unknown') + (variantTitle ? '||' + variantTitle : '');
      const packSize = extractPackSize(variantTitle);
      if (!productMap[key]) {
        const pp = productPricing;
        const lookupKey = li.sku ? li.sku.trim().toLowerCase() : ('TITLE:' + (li.title||'').trim().toLowerCase());
        const altLookupKey = 'TITLE:' + (li.title||'').trim().toLowerCase();
        const pricing = pp[lookupKey] || pp[altLookupKey] ||
          Object.values(pp).find(p => p.title && p.title.toLowerCase() === (li.title||'').toLowerCase()) ||
          null;
        // Pack override (owner-defined): total cost is for the whole pack, so derive per-unit for display.
        const packOverride = packSize > 1 ? pp[`__pack__${lookupKey}__${packSize}`] : null;
        // Cost effective on this day (uses dated cost history when present).
        const cpPerUnit = packOverride
          ? effectiveCostPrice(packOverride.history, dateStr, packOverride.cp) / packSize
          : (pricing ? effectiveCostPrice(pricing.history, dateStr, pricing.cp ?? PRODUCT_COST) : PRODUCT_COST);
        const shippingPerUnit = packOverride && packOverride.shipping != null
          ? effectiveShippingCost(packOverride.history, dateStr, packOverride.shipping)
          : (pricing ? effectiveShippingCost(pricing.history, dateStr, pricing.shipping ?? SHIPPING_COST) : SHIPPING_COST);
        productMap[key] = {
          title: li.title || 'Unknown', variantTitle, sku: li.sku || '',
          pricingFound: !!pricing || !!packOverride, qty: 0, revenue: 0, packSize,
          cpPerUnit, shippingPerUnit, packOverride: !!packOverride,
        };
      }
      productMap[key].qty += parseInt(li.quantity || 1);
      if (isCountedForRev) productMap[key].revenue += parseFloat(li.price || 0) * parseInt(li.quantity || 1);
    });
  });

  const products = Object.values(productMap);
  let totRev = 0, totCP = 0, totShip = 0, totAd = 0, totPNL = 0;
  const rows = products.map(p => {
    const cp = p.cpPerUnit * (p.packSize || 1) * p.qty, shipping = p.shippingPerUnit * p.qty;
    const adSpend = dayAdSplits[p.title] || 0;
    const pnl = p.revenue - cp - shipping - adSpend;
    totRev += p.revenue; totCP += cp; totShip += shipping; totAd += adSpend; totPNL += pnl;
    const pnlColor = pnl >= 0 ? '#34d399' : '#f87171';
    return (
      <tr key={p.title}>
        <td>
          <span style={{ fontWeight:600,color:'#fff' }}>{p.title}</span>
          {p.variantTitle && <span style={{ fontSize:10,fontWeight:600,color:'#a78bfa',background:'rgba(167,139,250,0.1)',border:'1px solid rgba(167,139,250,0.25)',borderRadius:4,padding:'1px 6px',marginLeft:5 }}>{p.variantTitle}</span>}
          <span style={{ display:'inline-flex',alignItems:'center',justifyContent:'center',background:'rgba(251,191,36,0.12)',color:'#fbbf24',border:'1px solid rgba(251,191,36,0.25)',borderRadius:5,fontSize:10,fontWeight:800,padding:'2px 7px',marginLeft:6 }}>{p.qty}×</span>
          <div style={{ marginTop:3,fontSize:9,padding:'1px 6px',borderRadius:4,display:'inline-block',
            background: p.pricingFound?'rgba(52,211,153,0.12)':'rgba(255,255,255,0.05)',
            color: p.pricingFound?'#34d399':'var(--text-muted)',
            border: p.pricingFound?'1px solid rgba(52,211,153,0.25)':'1px solid rgba(255,255,255,0.1)' }}>
            {p.pricingFound ? '✓ Pricing synced' : '⚠ Default'}
          </div>
        </td>
        <td style={{ color:'#f87171',textAlign:'right' }}>₹{Math.round(cp).toLocaleString('en-IN')}<div style={{ fontSize:10,color:'var(--text-muted)' }}>₹{Math.round(p.cpPerUnit)}/u</div></td>
        <td style={{ color:'#60a5fa',textAlign:'right' }}>₹{Math.round(shipping).toLocaleString('en-IN')}<div style={{ fontSize:10,color:'var(--text-muted)' }}>₹{Math.round(p.shippingPerUnit)}/u</div></td>
        <td style={{ color:'#a78bfa',textAlign:'right' }}>{adSpend > 0 ? '₹'+Math.round(adSpend).toLocaleString('en-IN') : <span style={{ opacity:0.35 }}>—</span>}</td>
        <td style={{ color:'#34d399',textAlign:'right' }}>{p.revenue > 0 ? '₹'+Math.round(p.revenue).toLocaleString('en-IN') : <span style={{ opacity:0.35 }}>—</span>}</td>
        <td style={{ color:pnlColor,fontWeight:700,textAlign:'right' }}>{pnl>=0?'+':'-'}₹{Math.round(Math.abs(pnl)).toLocaleString('en-IN')}</td>
      </tr>
    );
  });

  const summaryItems = [
    { label:'Products', val:products.length, color:'#fbbf24' },
    { label:'Revenue', val:'₹'+Math.round(totRev).toLocaleString('en-IN'), color:'#34d399' },
    { label:'Total Cost', val:'₹'+Math.round(totCP+totShip+totAd).toLocaleString('en-IN'), color:'#f87171' },
    { label:'Net PNL', val:(totPNL>=0?'+':'')+'₹'+Math.round(Math.abs(totPNL)).toLocaleString('en-IN'), color:totPNL>=0?'#34d399':'#f87171' },
  ];

  return (
    <div className="modal-overlay active" id="day-pnl-modal" onClick={e => e.target===e.currentTarget && onClose()}>
      <div className="dpnl-sheet">
        <div className="dpnl-header">
          <div className="dpnl-header-left">
            <div className="dpnl-eyebrow">📊 Product PNL</div>
            <h2>Daily Product Breakdown</h2>
            <div className="dpnl-date">{prettyDate}</div>
          </div>
          <button className="dpnl-close-btn" onClick={onClose}>×</button>
        </div>
        <div className="dpnl-summary-bar" id="dpnl-summary-bar">
          {summaryItems.map(s => (
            <div key={s.label} className="dpnl-summary-item">
              <div className="dpnl-summary-label">{s.label}</div>
              <div className="dpnl-summary-val" style={{ color:s.color }}>{s.val}</div>
            </div>
          ))}
        </div>
        <div className="dpnl-table-wrap">
          <table className="dpnl-table">
            <thead><tr>
              <th>Product</th><th style={{ textAlign:'right' }}>CP</th><th style={{ textAlign:'right' }}>Shipping</th>
              <th style={{ textAlign:'right' }}>Ad Spend</th><th style={{ textAlign:'right' }}>Revenue</th><th style={{ textAlign:'right' }}>PNL</th>
            </tr></thead>
            <tbody>{rows.length ? rows : <tr><td colSpan={6} className="dpnl-empty">No product data for this day.</td></tr>}</tbody>
            <tfoot><tr className="dpnl-total-row">
              <td style={{ color:'var(--text-muted)',fontSize:11,textTransform:'uppercase',letterSpacing:'0.5px' }}>TOTAL</td>
              <td style={{ color:'#f87171',textAlign:'right' }}>₹{Math.round(totCP).toLocaleString('en-IN')}</td>
              <td style={{ color:'#60a5fa',textAlign:'right' }}>₹{Math.round(totShip).toLocaleString('en-IN')}</td>
              <td style={{ color:'#a78bfa',textAlign:'right' }}>₹{Math.round(totAd).toLocaleString('en-IN')}</td>
              <td style={{ color:'#34d399',textAlign:'right' }}>₹{Math.round(totRev).toLocaleString('en-IN')}</td>
              <td style={{ color:totPNL>=0?'#34d399':'#f87171',fontWeight:700,fontSize:14,textAlign:'right' }}>{totPNL>=0?'+':'-'}₹{Math.round(Math.abs(totPNL)).toLocaleString('en-IN')}</td>
            </tr></tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── AdSpendModal ───────────────────────────────────────────────────────────
// Two-level UX:
//   List view — shows only the platforms the owner has enabled in Settings.
//     Each row is clickable and drills into the per-product breakdown for THAT
//     platform. Inline input is kept for owners who don't care about the split
//     and just want to log a total.
//   Drilldown view — per-product spend for one platform, with a dropdown to
//     pick any product from inventory (even ones that didn't receive orders).
//
// Persisted shape (ad_costs.product_breakdown JSONB):
//   { meta: { "Product A": 500, "Product B": 200 }, google: { "Product A": 100 } }
//
// Legacy flat shape { "Product A": 500 } is read transparently and migrated
// into the owner's first enabled platform on the next save.
const ALL_PLATFORMS = [
  { key: 'meta',    label: 'Meta',    color: '#1877f2' },
  { key: 'google',  label: 'Google',  color: '#fbbc05' },
  { key: 'youtube', label: 'YouTube', color: '#ff0000' },
  { key: 'tiktok',  label: 'TikTok',  color: '#69c9d0' },
  { key: 'other',   label: 'Other',   color: '#9ca3af' },
];

function AdSpendModal({ store, dateStr, dayOrders, adCosts, initialProductBreakdown, enabledPlatforms, allProducts = [], onSave, onClose }) {
  const enabledKeys = (Array.isArray(enabledPlatforms) && enabledPlatforms.length > 0) ? enabledPlatforms : ['meta'];
  const visiblePlatforms = ALL_PLATFORMS.filter(p => enabledKeys.includes(p.key));
  const fallbackPlatform = enabledKeys[0];

  // Platform-level totals: { meta: 1240, google: 500 } — used when the owner
  // skips the breakdown and just logs a flat number per channel.
  const [breakdown, setBreakdown] = useState({});
  // Per-platform per-product splits: { meta: { "Title": 500 }, google: {...} }
  const [productSplits, setProductSplits] = useState({});
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrError, setOcrError] = useState(null);
  const [lastExtracted, setLastExtracted] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [drilldown, setDrilldown] = useState(null); // platform key when in sub-view
  const fileInputRef = useRef(null);

  // Products that received orders today — surfaced first in the picker.
  const dayProducts = [...new Set(dayOrders.flatMap(o => {
    const items = typeof o.line_items === 'string' ? JSON.parse(o.line_items) : (o.line_items || []);
    return items.map(li => li.title);
  }).filter(Boolean))];

  const prettyDate = parseDateStr(dateStr).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' });

  // Seed splits from the prop (handles both nested and legacy flat shapes).
  useEffect(() => {
    if (!initialProductBreakdown || typeof initialProductBreakdown !== 'object') return;
    const values = Object.values(initialProductBreakdown);
    const isNested = values.length > 0 && values.every(v => v && typeof v === 'object' && !Array.isArray(v));
    if (isNested) {
      setProductSplits(initialProductBreakdown);
    } else {
      // Legacy flat — migrate into the first enabled platform.
      setProductSplits({ [fallbackPlatform]: { ...initialProductBreakdown } });
    }
  }, [initialProductBreakdown, fallbackPlatform]);

  // Lazy-load the platform totals saved on this date.
  useEffect(() => {
    if (!store?.id || !dateStr) return;
    (async () => {
      const { data } = await supabase.from('ad_costs')
        .select('amount, breakdown')
        .eq('store_id', store.id).eq('date', dateStr).maybeSingle();
      if (data?.breakdown && typeof data.breakdown === 'object') {
        setBreakdown(data.breakdown);
      } else if (data?.amount > 0) {
        // Legacy row with only a total — stash under the fallback platform.
        setBreakdown({ [fallbackPlatform]: data.amount });
      }
    })();
  }, [store?.id, dateStr, fallbackPlatform]);

  // Per-platform total: prefer the sum of product splits when the owner has
  // started a breakdown for that platform, otherwise the flat platform total.
  const platformTotal = (key) => {
    const splits = productSplits[key];
    if (splits && Object.keys(splits).length > 0) {
      return Object.values(splits).reduce((s, v) => s + (Number(v) || 0), 0);
    }
    return Number(breakdown[key]) || 0;
  };

  const total = visiblePlatforms.reduce((sum, p) => sum + platformTotal(p.key), 0);

  const handleFile = async (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) { setOcrError('Please upload an image file'); return; }
    if (file.size > 9 * 1024 * 1024) { setOcrError('Image too large (max 9 MB)'); return; }
    setOcrLoading(true); setOcrError(null); setLastExtracted(null);
    try {
      const reader = new FileReader();
      const dataUrl = await new Promise((resolve, reject) => {
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
      });
      const apiUrl = import.meta.env.VITE_API_URL || '';
      const res = await fetch(`${apiUrl}/api/ad-spend/extract`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeId: store.id,
          dateStr,
          imageBase64: dataUrl,
          mimeType: file.type,
          productTitles: dayProducts,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Extraction failed');
      // Route the extracted platform — but only if it's enabled. If the owner
      // hasn't toggled that channel on, fall back to their first enabled one.
      let key = json.platform || 'other';
      if (!enabledKeys.includes(key)) key = fallbackPlatform;
      const amt = Number(json.amount) || 0;
      setBreakdown(b => ({ ...b, [key]: amt }));

      if (json.productSplits && typeof json.productSplits === 'object') {
        setProductSplits(prev => {
          const next = { ...prev };
          const platformSplit = { ...(next[key] || {}) };
          Object.entries(json.productSplits).forEach(([title, amount]) => {
            const n = Number(amount) || 0;
            if (n > 0) platformSplit[title] = n;
          });
          next[key] = platformSplit;
          return next;
        });
      }
      setLastExtracted({ ...json, platform: key });
    } catch (e) {
      setOcrError(e.message);
    } finally {
      setOcrLoading(false);
    }
  };

  const handleSave = async () => {
    // Clean per-platform per-product splits — drop empties.
    const cleanSplits = {};
    Object.entries(productSplits).forEach(([platform, map]) => {
      const inner = {};
      Object.entries(map || {}).forEach(([title, amount]) => {
        const n = Number(amount) || 0;
        if (n > 0) inner[title] = n;
      });
      if (Object.keys(inner).length > 0) cleanSplits[platform] = inner;
    });

    // Clean platform totals — when a platform has a product breakdown, the
    // total is recomputed from products so the row in `breakdown` reflects the
    // actual spend (in case the owner increased product amounts past the
    // original flat input).
    const cleanBreakdown = {};
    visiblePlatforms.forEach(p => {
      const t = platformTotal(p.key);
      if (t > 0) cleanBreakdown[p.key] = t;
    });

    const source = lastExtracted ? 'screenshot_ocr' : 'manual';
    await onSave(dateStr, total, cleanBreakdown, source, cleanSplits);
    onClose();
  };

  // ── Drilldown sub-view: per-product breakdown for one platform ────────────
  if (drilldown) {
    const platform = ALL_PLATFORMS.find(p => p.key === drilldown);
    const platformSplits = productSplits[drilldown] || {};
    const recordedTitles = Object.keys(platformSplits);

    // Show: products from today's orders + any titles already recorded for
    // this platform (covers products owner added previously, even if no orders today).
    const visibleTitles = [...new Set([...dayProducts, ...recordedTitles])];

    // Picker: any inventory product not already in this platform's split.
    const pickerOptions = allProducts.filter(t => !visibleTitles.includes(t)).sort();

    return (
      <div className="modal-overlay active" onClick={e => e.target===e.currentTarget && onClose()}>
        <div className="modal" style={{ maxWidth:520, overflow:'hidden' }}>
          <div style={{ display:'flex',alignItems:'center',gap:10,marginBottom:6 }}>
            <button onClick={() => setDrilldown(null)} style={{ background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',color:'rgba(255,255,255,0.7)',borderRadius:8,padding:'5px 12px',cursor:'pointer',fontSize:12,flexShrink:0 }}>← Back</button>
            <div style={{ width:10,height:10,borderRadius:'50%',background:platform.color,flexShrink:0 }}/>
            <h2 style={{ margin:0,fontSize:17,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{platform.label} — {prettyDate}</h2>
          </div>
          <p style={{ color:'var(--text-muted)',fontSize:13,marginBottom:16 }}>
            Split your {platform.label} spend across products. Pick from inventory to add products that didn't receive orders today.
          </p>

          {/* Total for this platform */}
          <div style={{ background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:10,padding:14,marginBottom:18 }}>
            <div style={{ fontSize:11,fontWeight:700,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:0.6,marginBottom:6 }}>
              Total {platform.label} Spend for the Day
            </div>
            <div style={{ display:'flex',alignItems:'center',gap:8 }}>
              <span style={{ color:'rgba(255,255,255,0.4)',fontSize:18,fontWeight:700 }}>₹</span>
              <input type="number" value={platformTotal(drilldown) === 0 ? '' : platformTotal(drilldown)} placeholder="0"
                onChange={e => {
                  const v = e.target.value === '' ? 0 : parseFloat(e.target.value) || 0;
                  // Setting the platform total clears the product split — owner
                  // explicitly chose to log a flat number for this channel.
                  setBreakdown(b => ({ ...b, [drilldown]: v }));
                  setProductSplits(s => { const next = { ...s }; delete next[drilldown]; return next; });
                }}
                onFocus={e => e.target.select()}
                style={{ flex:1,padding:'10px 12px',background:'rgba(0,0,0,0.35)',border:'1px solid rgba(255,255,255,0.1)',color:'white',borderRadius:8,outline:'none',fontSize:20,fontWeight:700 }} />
            </div>
          </div>

          {/* Per-product list */}
          <div style={{ fontSize:11,fontWeight:700,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:0.6,marginBottom:8 }}>
            Per-Product Breakdown
          </div>
          <div style={{ display:'flex',flexDirection:'column',gap:6,marginBottom:14,maxHeight:280,overflowY:'auto' }}>
            {visibleTitles.length === 0 ? (
              <div style={{ padding:'14px',background:'rgba(0,0,0,0.2)',borderRadius:8,fontSize:12,color:'var(--text-muted)',textAlign:'center' }}>
                No orders today — pick a product below to log spend.
              </div>
            ) : visibleTitles.map(title => (
              <div key={title} style={{ display:'flex',alignItems:'center',gap:10,background:'rgba(0,0,0,0.2)',padding:'10px 12px',borderRadius:8,border:'1px solid rgba(255,255,255,0.06)' }}>
                <span style={{ flex:1,fontSize:13,fontWeight:600,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{title}</span>
                <span style={{ color:'rgba(255,255,255,0.3)',fontSize:12 }}>₹</span>
                <input type="number" value={platformSplits[title] || ''} placeholder="0"
                  onChange={e => {
                    const v = e.target.value === '' ? 0 : parseFloat(e.target.value) || 0;
                    setProductSplits(s => {
                      const next = { ...s };
                      const inner = { ...(next[drilldown] || {}) };
                      if (v > 0) inner[title] = v; else delete inner[title];
                      next[drilldown] = inner;
                      return next;
                    });
                  }}
                  onFocus={e => e.target.select()}
                  style={{ width:100,padding:'6px 8px',background:'rgba(0,0,0,0.3)',border:'1px solid rgba(255,255,255,0.08)',color:'white',borderRadius:6,outline:'none',fontSize:13,textAlign:'right' }} />
              </div>
            ))}
          </div>

          {/* Inventory picker */}
          {pickerOptions.length > 0 && (
            <InventoryPicker
              options={pickerOptions}
              onPick={(title) => {
                setProductSplits(s => {
                  const next = { ...s };
                  const inner = { ...(next[drilldown] || {}) };
                  if (!(title in inner)) inner[title] = 0;
                  next[drilldown] = inner;
                  return next;
                });
              }}
            />
          )}

          <div style={{ display:'flex',gap:12,marginTop:14 }}>
            <button onClick={() => setDrilldown(null)} className="primary" style={{ flex:1 }}>Done</button>
            <button onClick={() => setDrilldown(null)} style={{ flex:1 }}>Cancel</button>
          </div>
        </div>
        <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  // ── List view: enabled platforms + total ─────────────────────────────────
  return (
    <div className="modal-overlay active" onClick={e => e.target===e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth:520 }}>
        <h2 style={{ margin:'0 0 4px' }}>Ad Spend — {prettyDate}</h2>
        <p style={{ color:'var(--text-muted)',fontSize:14,marginBottom:18 }}>
          Drop a screenshot of your ad dashboard — AI auto-fills the platform &amp; amount. Or click a platform to add a per-product breakdown.
        </p>

        {/* OCR drop zone */}
        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files?.[0]; if (f) handleFile(f); }}
          onClick={() => fileInputRef.current?.click()}
          onPaste={e => { const f = Array.from(e.clipboardData?.files || [])[0]; if (f) handleFile(f); }}
          tabIndex={0}
          style={{
            border: `2px dashed ${dragOver ? 'rgba(167,139,250,0.6)' : 'rgba(255,255,255,0.15)'}`,
            background: dragOver ? 'rgba(167,139,250,0.06)' : 'rgba(0,0,0,0.2)',
            borderRadius: 12, padding: '20px 16px', textAlign: 'center', cursor: 'pointer',
            transition: 'all 0.2s', marginBottom: 16, outline: 'none',
          }}
        >
          <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }}
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }} />
          {ocrLoading ? (
            <div style={{ color: 'rgba(167,139,250,0.9)', fontSize: 13, fontWeight: 600 }}>
              <span style={{ display: 'inline-block', width: 14, height: 14, border: '2px solid rgba(167,139,250,0.3)', borderTopColor: 'rgba(167,139,250,1)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', marginRight: 8, verticalAlign: 'middle' }}/>
              Reading your screenshot…
            </div>
          ) : (
            <>
              <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
                📷 Drop screenshot here · click to browse · paste (⌘V)
              </div>
              <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11 }}>
                AI auto-detects the platform &amp; matches campaign names to your products
              </div>
            </>
          )}
        </div>

        {lastExtracted && !ocrLoading && (() => {
          const matchCount = lastExtracted.productSplits ? Object.keys(lastExtracted.productSplits).length : 0;
          return (
            <div style={{
              background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.25)',
              borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 13,
              color: 'rgba(52,211,153,0.95)',
            }}>
              ✓ Extracted <strong style={{ textTransform: 'capitalize' }}>{lastExtracted.platform}</strong> spend: <strong>₹{Number(lastExtracted.amount).toLocaleString('en-IN')}</strong>
              <span style={{ opacity: 0.6, marginLeft: 6 }}>({Math.round(lastExtracted.confidence * 100)}% confidence)</span>
              {matchCount > 0 && (
                <div style={{ fontSize: 11, opacity: 0.9, marginTop: 3 }}>
                  Auto-matched {matchCount} product{matchCount > 1 ? 's' : ''} — open the platform to review.
                </div>
              )}
            </div>
          );
        })()}
        {ocrError && (
          <div style={{
            background: 'rgba(251,113,133,0.1)', border: '1px solid rgba(251,113,133,0.3)',
            borderRadius: 10, padding: '8px 12px', marginBottom: 16, fontSize: 12,
            color: '#fb7185',
          }}>⚠ {ocrError}</div>
        )}

        {/* Enabled platforms list — each row is clickable + inline editable */}
        <div style={{ fontSize:12,color:'var(--text-muted)',marginBottom:8,fontWeight:700,textTransform:'uppercase',letterSpacing:0.5 }}>
          By Platform <span style={{ opacity:0.5,fontWeight:600,textTransform:'none',letterSpacing:0 }}>· click a row for per-product breakdown</span>
        </div>
        <div style={{ display:'flex',flexDirection:'column',gap:8,marginBottom:16 }}>
          {visiblePlatforms.map(p => {
            const t = platformTotal(p.key);
            const splitCount = Object.keys(productSplits[p.key] || {}).filter(k => productSplits[p.key][k] > 0).length;
            return (
              <div
                key={p.key}
                onClick={() => setDrilldown(p.key)}
                style={{
                  display:'flex',alignItems:'center',gap:10,
                  background:'rgba(0,0,0,0.2)',padding:'12px 14px',borderRadius:10,
                  border:'1px solid rgba(255,255,255,0.06)',cursor:'pointer',
                  transition:'all 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,0.2)'}
              >
                <div style={{ width:10,height:10,borderRadius:'50%',background:p.color,flexShrink:0 }}/>
                <div style={{ flex:1,minWidth:0 }}>
                  <div style={{ fontSize:14,fontWeight:700 }}>{p.label}</div>
                  {splitCount > 0 ? (
                    <div style={{ fontSize:11,color:'rgba(52,211,153,0.85)',marginTop:2 }}>
                      ✓ {splitCount} product{splitCount > 1 ? 's' : ''} broken down
                    </div>
                  ) : (
                    <div style={{ fontSize:11,color:'rgba(255,255,255,0.35)',marginTop:2 }}>
                      Tap to add per-product spend
                    </div>
                  )}
                </div>
                <div style={{ textAlign:'right' }}>
                  <div style={{ fontSize:15,fontWeight:700,color:t > 0 ? '#fff' : 'rgba(255,255,255,0.3)' }}>
                    ₹{t.toLocaleString('en-IN')}
                  </div>
                </div>
                <span style={{ color:'rgba(255,255,255,0.3)',fontSize:18,marginLeft:4 }}>›</span>
              </div>
            );
          })}
        </div>

        {/* Total */}
        <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',background:'rgba(167,139,250,0.08)',border:'1px solid rgba(167,139,250,0.2)',padding:'12px 16px',borderRadius:10,marginBottom:16 }}>
          <span style={{ fontSize:13,fontWeight:700,color:'rgba(167,139,250,0.95)' }}>Total Ad Spend</span>
          <span style={{ fontSize:18,fontWeight:800,color:'#fff' }}>₹{total.toLocaleString('en-IN')}</span>
        </div>

        <div style={{ display:'flex',gap:12 }}>
          <button onClick={handleSave} className="primary" style={{ flex:1 }}>Save</button>
          <button onClick={onClose} style={{ flex:1 }}>Cancel</button>
        </div>
      </div>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

// Small picker used inside the AdSpendModal drilldown view.
function InventoryPicker({ options, onPick }) {
  const [value, setValue] = useState('');
  return (
    <div style={{ paddingTop:12, borderTop:'1px solid rgba(255,255,255,0.06)' }}>
      <div style={{ fontSize:11,fontWeight:700,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:0.6,marginBottom:8 }}>
        Add product from inventory
      </div>
      <div style={{ display:'flex', gap:8, width:'100%', boxSizing:'border-box' }}>
        <select
          value={value}
          onChange={e => setValue(e.target.value)}
          style={{
            flex:1, minWidth:0,
            padding:'10px 12px',
            background:'rgba(0,0,0,0.3)',
            border:'1px solid rgba(255,255,255,0.1)',
            color: value ? 'white' : 'rgba(255,255,255,0.4)',
            borderRadius:8, outline:'none', fontSize:13,
            appearance:'none', WebkitAppearance:'none',
            backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='rgba(255,255,255,0.4)' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
            backgroundRepeat:'no-repeat', backgroundPosition:'right 12px center',
            paddingRight:36,
          }}
        >
          <option value="">Select a product…</option>
          {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
        <button
          onClick={() => { if (value) { onPick(value); setValue(''); } }}
          disabled={!value}
          className="primary"
          style={{
            flexShrink:0, width:72, padding:'10px 0',
            opacity: value ? 1 : 0.4,
            cursor: value ? 'pointer' : 'not-allowed',
            fontWeight:700, fontSize:13,
          }}
        >
          Add
        </button>
      </div>
    </div>
  );
}
// ── NetProfitModal ──────────────────────────────────────────────────────────
function NetProfitModal({ dateStr, prettyDate, pl, tCounts = {}, pCounts = {}, itemsCount = 0, cpp = 0, totalOrders = 0, revBreakdown = {}, grossSales = 0, allItems = [], productPricing = {}, onClose }) {
  // Per-product COGS from delivered items
  const cogsMap = {};
  allItems.filter(item => item.isDelivered).forEach(item => {
    const lookupKey = item.sku ? item.sku.trim().toLowerCase() : ('TITLE:' + (item.title||'').trim().toLowerCase());
    const altLookupKey = 'TITLE:' + (item.title||'').trim().toLowerCase();
    const pricing = productPricing[lookupKey] || productPricing[altLookupKey] || { cp: PRODUCT_COST };
    const packSize = item.packSize || 1;
    const packOverride = packSize > 1 ? productPricing[`__pack__${lookupKey}__${packSize}`] : null;
    const costPerUnit = packOverride
      ? effectiveCostPrice(packOverride.history, item.orderDate, packOverride.cp)
      : effectiveCostPrice(pricing.history, item.orderDate, pricing.cp) * packSize;
    const qty = parseInt(item.quantity || 1);
    const variantTitle = item.variant_title || '';
    const key = (item.title || 'Unknown') + (variantTitle ? '||' + variantTitle : '');
    if (!cogsMap[key]) cogsMap[key] = { title: item.title || 'Unknown', variantTitle, units: 0, costPerUnit, total: 0 };
    cogsMap[key].units += qty;
    cogsMap[key].total += costPerUnit * qty;
  });
  const cogsRows = Object.values(cogsMap);
  const revenueUnits = allItems.filter(i => i.isDelivered).reduce((s, i) => s + parseInt(i.quantity || 1), 0);

  const revenueOrderCount = (revBreakdown.deliveredCount || 0) + (revBreakdown.prepaidCount || 0);

  // Split shipping cost: delivered orders vs non-delivered fulfilled (in-transit, RTO, OFD, etc.)
  let deliveredShipping = 0, nonDeliveredShipping = 0;
  if (allItems.some(i => i.isFulfilled)) {
    allItems.filter(i => i.isFulfilled).forEach(item => {
      const lookupKey = item.sku ? item.sku.trim().toLowerCase() : ('TITLE:' + (item.title||'').trim().toLowerCase());
      const altLookupKey = 'TITLE:' + (item.title||'').trim().toLowerCase();
      const pricing = productPricing[lookupKey] || productPricing[altLookupKey] || { shipping: SHIPPING_COST };
      const packSize = item.packSize || 1;
      const packOverride = packSize > 1 ? productPricing[`__pack__${lookupKey}__${packSize}`] : null;
      const shipPerUnit = packOverride && packOverride.shipping != null
        ? effectiveShippingCost(packOverride.history, item.orderDate, packOverride.shipping)
        : effectiveShippingCost(pricing.history, item.orderDate, pricing.shipping != null ? pricing.shipping : SHIPPING_COST);
      const cost = (shipPerUnit ?? SHIPPING_COST) * parseInt(item.quantity || 1);
      if (item.isDelivered) deliveredShipping += cost;
      else nonDeliveredShipping += cost;
    });
  } else {
    // No item data — split proportionally by count
    const avgRate = (pl.fulfilledCount || 0) > 0 ? pl.shippingCost / pl.fulfilledCount : 0;
    deliveredShipping = (tCounts['Delivered'] || 0) * avgRate;
    nonDeliveredShipping = pl.shippingCost - deliveredShipping;
  }
  const deliveredFulfilledCount = tCounts['Delivered'] || 0;
  const nonDeliveredFulfilledCount = Math.max(0, (pl.fulfilledCount || 0) - deliveredFulfilledCount);

  const grossProfit = pl.revenue - pl.productCost;
  const grossMargin = pl.revenue > 0 ? ((grossProfit / pl.revenue) * 100).toFixed(1) : '0.0';
  const netMargin = pl.revenue > 0 ? ((pl.profit / pl.revenue) * 100).toFixed(1) : '0.0';
  const roas = pl.adCost > 0 ? (pl.revenue / pl.adCost).toFixed(2) : null;
  const isProfit = pl.profit >= 0;
  const profitColor = isProfit ? 'var(--profit-color)' : 'var(--loss-color)';

  const sec = (children, mb = 10) => (
    <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, overflow: 'hidden', marginBottom: mb }}>
      {children}
    </div>
  );

  const SecHead = ({ label, total, totalColor, icon }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 16px', background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
      <span style={{ color: 'var(--text-muted)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700 }}>{icon && <span style={{ marginRight: 6 }}>{icon}</span>}{label}</span>
      {total !== undefined && <span style={{ color: totalColor || 'var(--text-main)', fontSize: 14, fontWeight: 700 }}>{total}</span>}
    </div>
  );

  const RevRow = ({ label, sub, value, valueColor }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '11px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
      <div style={{ flex: 1, minWidth: 0, marginRight: 12 }}>
        <div style={{ color: 'var(--text-main)', fontSize: 14 }}>{label}</div>
        {sub && <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 3 }}>{sub}</div>}
      </div>
      <span style={{ color: valueColor || 'var(--text-main)', fontSize: 14, fontWeight: 600, flexShrink: 0 }}>{value}</span>
    </div>
  );

  return (
    <div className="modal-overlay active" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 480, padding: 0, maxHeight: '92vh', overflowY: 'auto', borderRadius: 18 }}>

        {/* Sticky header */}
        <div style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--card-bg, #1a1a2e)', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '18px 20px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>📊 P&L Statement</div>
            <h2 style={{ margin: 0, fontSize: 19, fontWeight: 700 }}>Net Profit Breakdown</h2>
            <div style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 2 }}>{prettyDate}</div>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)', borderRadius: 8, width: 34, height: 34, cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>×</button>
        </div>

        <div style={{ padding: '14px 14px 20px' }}>

          {/* REVENUE */}
          {sec(<>
            <SecHead label="Revenue" total={fmt(pl.revenue)} totalColor="var(--profit-color)" icon="💰" />
            <RevRow label="Delivered COD" sub={`${revBreakdown.deliveredCount || 0} orders · cash collected at delivery`} value={fmt(revBreakdown.deliveredRevenue || 0)} valueColor="var(--profit-color)" />
            <RevRow label="Prepaid Online" sub={`${revBreakdown.prepaidCount || 0} orders · paid upfront (may include discount)`} value={fmt(revBreakdown.prepaidRevenue || 0)} valueColor="var(--profit-color)" />
            <RevRow label="Shopify Gross Sales" sub="all orders placed, incl. pending / canceled / RTO" value={fmt(grossSales)} valueColor="var(--text-muted)" />
          </>)}

          {/* COGS */}
          {sec(<>
            <SecHead label="Cost of Goods Sold (COGS)" total={`– ${fmt(pl.productCost)}`} totalColor="var(--loss-color)" icon="📦" />
            {cogsRows.length > 0 ? (
              <div>
                {cogsRows.map((row, i) => (
                  <div key={row.title + row.variantTitle} style={{ padding: '12px 16px', borderBottom: i < cogsRows.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ color: 'var(--text-main)', fontSize: 14, fontWeight: 500, wordBreak: 'break-word', lineHeight: 1.4 }}>{row.title}</div>
                      {row.variantTitle && <div style={{ color: '#a78bfa', fontSize: 12, marginTop: 2 }}>{row.variantTitle}</div>}
                      <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 4 }}>
                        <span style={{ color: '#f59e0b', fontWeight: 600 }}>{row.units} unit{row.units !== 1 ? 's' : ''}</span>
                        {' × '}{fmt(row.costPerUnit)}/unit
                      </div>
                    </div>
                    <span style={{ color: 'var(--loss-color)', fontSize: 14, fontWeight: 700, flexShrink: 0 }}>– {fmt(row.total)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: '14px 16px', color: 'var(--text-muted)', fontSize: 13 }}>No delivered items with cost data.</div>
            )}
            {revenueUnits > 0 && (
              <div style={{ margin: '0 12px 12px', background: 'rgba(251,191,36,0.07)', border: '1px solid rgba(251,191,36,0.18)', borderRadius: 8, padding: '9px 12px', fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                <span style={{ color: '#f59e0b' }}>ⓘ </span>
                <strong style={{ color: 'var(--text-main)' }}>{revenueUnits} unit{revenueUnits !== 1 ? 's' : ''} from {revenueOrderCount} revenue order{revenueOrderCount !== 1 ? 's' : ''}</strong>
                {' — '}Sale prices vary per customer but cost/unit is fixed in your Pricing table.
              </div>
            )}
          </>)}

          {/* Gross Profit */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, marginBottom: 10 }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700 }}>Gross Profit</div>
              <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 2 }}>Revenue – COGS · Gross Margin: {grossMargin}%</div>
            </div>
            <span style={{ color: grossProfit >= 0 ? 'var(--profit-color)' : 'var(--loss-color)', fontSize: 18, fontWeight: 800 }}>{fmt(grossProfit)}</span>
          </div>

          {/* Operating Expenses */}
          {sec(<>
            <SecHead label="Operating Expenses" total={`– ${fmt(pl.shippingCost + pl.adCost)}`} totalColor="var(--loss-color)" icon="🚚" />
            <RevRow
              label="Shipping & Logistics"
              sub={`${pl.fulfilledCount || 0} fulfilled orders × avg courier rate`}
              value={`– ${fmt(pl.shippingCost)}`}
              valueColor="var(--loss-color)"
            />
            {pl.shippingCost > 0 && <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 16px 8px 28px', borderBottom: '1px solid rgba(255,255,255,0.03)', background: 'rgba(0,0,0,0.12)' }}>
                <div>
                  <span style={{ color: 'var(--profit-color)', fontSize: 12, fontWeight: 600 }}>✓ Delivered</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: 12 }}> · {deliveredFulfilledCount} order{deliveredFulfilledCount !== 1 ? 's' : ''}</span>
                </div>
                <span style={{ color: 'var(--loss-color)', fontSize: 13, fontWeight: 600, opacity: 0.85 }}>– {fmt(deliveredShipping)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 16px 8px 28px', borderBottom: '1px solid rgba(255,255,255,0.04)', background: 'rgba(0,0,0,0.12)' }}>
                <div>
                  <span style={{ color: '#f59e0b', fontSize: 12, fontWeight: 600 }}>↗ Non-Delivered</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: 12 }}> · {nonDeliveredFulfilledCount} order{nonDeliveredFulfilledCount !== 1 ? 's' : ''} (in-transit / RTO / OFD)</span>
                </div>
                <span style={{ color: 'var(--loss-color)', fontSize: 13, fontWeight: 600, opacity: 0.85 }}>– {fmt(nonDeliveredShipping)}</span>
              </div>
            </>}
            <div style={{ borderBottom: 'none' }}>
              <RevRow
                label="Marketing / Ad Spend"
                sub={`paid campaigns${roas ? ` · ROAS: ${roas}x` : ''}`}
                value={`– ${fmt(pl.adCost)}`}
                valueColor={pl.adCost > 0 ? 'var(--loss-color)' : 'var(--text-muted)'}
              />
            </div>
          </>)}

          {/* Net Profit */}
          <div style={{ background: isProfit ? 'rgba(52,211,153,0.08)' : 'rgba(248,113,113,0.08)', border: `1px solid ${isProfit ? 'rgba(52,211,153,0.25)' : 'rgba(248,113,113,0.25)'}`, borderRadius: 14, padding: '16px', marginBottom: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 17, fontWeight: 800 }}>Net Profit</span>
              <span style={{ color: profitColor, fontSize: 26, fontWeight: 800, lineHeight: 1 }}>{isProfit ? '' : '–'}{fmt(Math.abs(pl.profit))}</span>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ padding: '3px 10px', borderRadius: 20, background: `${isProfit ? 'rgba(52,211,153,0.15)' : 'rgba(248,113,113,0.15)'}`, color: profitColor, fontSize: 12, fontWeight: 600 }}>Net Margin: {netMargin}%</span>
              {roas && <span style={{ padding: '3px 10px', borderRadius: 20, background: 'rgba(167,139,250,0.12)', color: '#a78bfa', fontSize: 12, fontWeight: 600 }}>ROAS: {roas}x</span>}
              {itemsCount > 0 && <span style={{ padding: '3px 10px', borderRadius: 20, background: 'rgba(167,139,250,0.12)', color: '#a78bfa', fontSize: 12, fontWeight: 600 }}>CPP: {fmt(cpp)}</span>}
            </div>
          </div>

          <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 11, marginBottom: 16 }}>Revenue – COGS – Shipping – Marketing</div>

          <button onClick={onClose} className="primary" style={{ width: '100%', padding: '13px', fontSize: 15, borderRadius: 10, fontWeight: 600 }}>Close Breakdown</button>
        </div>
      </div>
    </div>
  );
}

// ── ItemsModal ──────────────────────────────────────────────────────────────
// mode: 'ordered' (all items) | 'delivered' (delivered items only)
function ItemsModal({ prettyDate, allItems, mode = 'ordered', onClose }) {
  const label    = mode === 'delivered' ? 'Items Delivered' : 'Items Ordered';
  const icon     = mode === 'delivered' ? '✅' : '📦';
  const accent   = mode === 'delivered' ? '#34d399' : '#a78bfa';
  const accentBg = mode === 'delivered' ? 'rgba(52,211,153,0.1)' : 'rgba(167,139,250,0.1)';
  const accentBd = mode === 'delivered' ? 'rgba(52,211,153,0.25)' : 'rgba(167,139,250,0.25)';

  // Group by title + variant so "Pack of 2" and "Pack of 3" appear as separate rows
  const productMap = {};
  allItems.forEach(li => {
    const variantTitle = li.variant_title || '';
    const key = (li.title || 'Unknown Product') + (variantTitle ? '||' + variantTitle : '');
    if (!productMap[key]) {
      productMap[key] = { title: li.title || 'Unknown Product', variantTitle, sku: li.sku || '', qty: 0 };
    }
    // qty here is packs ordered; display actual units via packSize
    productMap[key].qty += parseInt(li.quantity || 1) * (li.packSize || extractPackSize(variantTitle));
  });

  const products = Object.values(productMap).sort((a, b) => b.qty - a.qty);
  const totalUnits = products.reduce((s, p) => s + p.qty, 0);

  return (
    <div className="modal-overlay active" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 480, padding: '28px 24px' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: accent, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>{icon} {label}</div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#fff' }}>{prettyDate}</h2>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
        </div>

        {/* Summary pill */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
          <div style={{ padding: '6px 14px', borderRadius: 8, background: accentBg, border: `1px solid ${accentBd}`, fontSize: 13, fontWeight: 600, color: accent }}>
            {totalUnits} total units
          </div>
          <div style={{ padding: '6px 14px', borderRadius: 8, background: 'rgba(56,189,248,0.08)', border: '1px solid rgba(56,189,248,0.2)', fontSize: 13, fontWeight: 600, color: '#38bdf8' }}>
            {products.length} SKU{products.length !== 1 ? 's' : ''}
          </div>
        </div>

        {/* Product list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 360, overflowY: 'auto' }}>
          {products.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'rgba(255,255,255,0.3)', fontSize: 14 }}>No {mode === 'delivered' ? 'delivered ' : ''}items for this day</div>
          ) : products.map((p, i) => {
            const pct = totalUnits > 0 ? (p.qty / totalUnits) * 100 : 0;
            return (
              <div key={i} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, padding: '12px 14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <div style={{ flex: 1, minWidth: 0, marginRight: 12 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.title}</div>
                    {p.variantTitle && (
                      <div style={{ fontSize: 11, color: '#a78bfa', marginTop: 2, fontWeight: 600 }}>{p.variantTitle}</div>
                    )}
                    {p.sku && !p.sku.startsWith('TITLE:') && (
                      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginTop: 1, fontFamily: 'monospace' }}>SKU: {p.sku}</div>
                    )}
                  </div>
                  <div style={{ flexShrink: 0, background: 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.3)', borderRadius: 6, padding: '3px 10px', fontSize: 14, fontWeight: 800, color: '#fbbf24' }}>
                    {p.qty}×
                  </div>
                </div>
                {/* Quantity bar */}
                <div style={{ height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg, #a78bfa, #38bdf8)', borderRadius: 2, transition: 'width 0.4s ease' }} />
                </div>
              </div>
            );
          })}
        </div>

        <button onClick={onClose} className="primary" style={{ width: '100%', marginTop: 20, padding: '12px', fontSize: 14, borderRadius: 10, fontWeight: 600 }}>Close</button>
      </div>
    </div>
  );
}

export { ProductPNLModal, AdSpendModal, NetProfitModal, MetricCard, ItemsModal };
