import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import {
  fmt, toDateStr, getOrderDateIST, parseDateStr,
  isOrderDelivered, isOrderPrepaidRevenue, categorizeOrders,
  getPaymentCounts, getRevenueBreakdown, getTotalRevenue, calcPL,
  PREPAID_LAUNCH_DATE, PRODUCT_COST, SHIPPING_COST
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

// ── ProductPNLModal ────────────────────────────────────────────────────────
function ProductPNLModal({ dateStr, prettyDate, dayOrders, adCosts, productPricing, onClose }) {
  const dayAd = adCosts[dateStr] || 0;
  const dailyProductAdCosts = JSON.parse(localStorage.getItem('dailyProductAdCosts') || '{}');
  const dayAdSplits = dailyProductAdCosts[dateStr] || {};

  const productMap = {};
  dayOrders.forEach(o => {
    const isCountedForRev = isOrderDelivered(o) || isOrderPrepaidRevenue(o);
    const lineItems = o.line_items ? (typeof o.line_items === 'string' ? JSON.parse(o.line_items) : o.line_items) : [];
    lineItems.forEach(li => {
      const key = li.title || 'Unknown';
      if (!productMap[key]) {
        const pp = productPricing;
        const lookupKey = li.sku || ('TITLE:' + li.title);
        const pricing = pp[lookupKey] || pp['TITLE:' + li.title] ||
          Object.values(pp).find(p => p.title && p.title.toLowerCase() === (li.title||'').toLowerCase()) ||
          null;
        productMap[key] = {
          title: key, sku: li.sku || '', pricingFound: !!pricing, qty: 0, revenue: 0,
          cpPerUnit: pricing ? (pricing.cp ?? PRODUCT_COST) : PRODUCT_COST,
          shippingPerUnit: pricing ? (pricing.shipping ?? SHIPPING_COST) : SHIPPING_COST,
        };
      }
      productMap[key].qty += parseInt(li.quantity || 1);
      if (isCountedForRev) productMap[key].revenue += parseFloat(li.price || 0) * parseInt(li.quantity || 1);
    });
  });

  const products = Object.values(productMap);
  let totRev = 0, totCP = 0, totShip = 0, totAd = 0, totPNL = 0;
  const rows = products.map(p => {
    const cp = p.cpPerUnit * p.qty, shipping = p.shippingPerUnit * p.qty;
    const adSpend = dayAdSplits[p.title] || 0;
    const pnl = p.revenue - cp - shipping - adSpend;
    totRev += p.revenue; totCP += cp; totShip += shipping; totAd += adSpend; totPNL += pnl;
    const pnlColor = pnl >= 0 ? '#34d399' : '#f87171';
    return (
      <tr key={p.title}>
        <td>
          <span style={{ fontWeight:600,color:'#fff' }}>{p.title}</span>
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
function AdSpendModal({ dateStr, dayOrders, adCosts, onSave, onClose }) {
  const currentTotal = adCosts[dateStr] || 0;
  const [total, setTotal] = useState(currentTotal);
  const dailyProductAdCosts = JSON.parse(localStorage.getItem('dailyProductAdCosts') || '{}');
  const [splits, setSplits] = useState(dailyProductAdCosts[dateStr] || {});

  const products = [...new Set(dayOrders.flatMap(o => (o.line_items||[]).map(li => li.title)).filter(Boolean))];
  const prettyDate = parseDateStr(dateStr).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' });

  const handleSave = () => {
    const newDPC = JSON.parse(localStorage.getItem('dailyProductAdCosts') || '{}');
    newDPC[dateStr] = {};
    Object.entries(splits).forEach(([k,v]) => { if (v > 0) newDPC[dateStr][k] = v; });
    localStorage.setItem('dailyProductAdCosts', JSON.stringify(newDPC));
    onSave(dateStr, total);
    onClose();
  };

  return (
    <div className="modal-overlay active" onClick={e => e.target===e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth:480 }}>
        <h2 style={{ margin:'0 0 4px' }}>Ad Spend — {prettyDate}</h2>
        <p style={{ color:'var(--text-muted)',fontSize:14,marginBottom:20 }}>Set total ad spend and optional per-product breakdown.</p>
        <div className="form-group">
          <label>Total Ad Spend (₹)</label>
          <input type="number" value={total} onChange={e=>setTotal(parseFloat(e.target.value)||0)}
            style={{ width:'100%',padding:12,background:'rgba(0,0,0,0.2)',border:'1px solid var(--border)',color:'white',borderRadius:8,boxSizing:'border-box' }} />
        </div>
        {products.length > 0 && (
          <div>
            <div style={{ fontSize:13,color:'var(--text-muted)',marginBottom:12,fontWeight:600 }}>Per-Product Breakdown (optional)</div>
            <div style={{ display:'flex',flexDirection:'column',gap:8,maxHeight:240,overflowY:'auto' }}>
              {products.map(p => (
                <div key={p} style={{ display:'flex',justifyContent:'space-between',alignItems:'center',background:'rgba(0,0,0,0.2)',padding:'8px 12px',borderRadius:6,border:'1px solid var(--border)' }}>
                  <span style={{ fontWeight:600,fontSize:13,flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',marginRight:12 }}>{p}</span>
                  <input type="number" value={splits[p]||''} placeholder="0"
                    onChange={e => setSplits(s => ({ ...s, [p]: parseFloat(e.target.value)||0 }))}
                    style={{ width:80,padding:6,background:'rgba(0,0,0,0.3)',border:'1px solid var(--border)',color:'white',borderRadius:4,outline:'none' }} />
                </div>
              ))}
            </div>
          </div>
        )}
        <div style={{ display:'flex',gap:12,marginTop:24 }}>
          <button onClick={handleSave} className="primary" style={{ flex:1 }}>Save</button>
          <button onClick={onClose} style={{ flex:1 }}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
// ── NetProfitModal ──────────────────────────────────────────────────────────
function NetProfitModal({ dateStr, prettyDate, pl, onClose }) {
  const isProfit = pl.profit >= 0;
  
  return (
    <div className="modal-overlay active" onClick={e => e.target===e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 420, padding: '32px 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>{isProfit ? '💰' : '📉'}</div>
          <h2 style={{ margin: '0 0 6px', fontSize: 22 }}>Net Profit Breakdown</h2>
          <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>{prettyDate}</div>
        </div>
        
        <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: 24, marginBottom: 28, boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.2)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, alignItems: 'center' }}>
            <span style={{ color: 'var(--text-main)', fontSize: 15, fontWeight: 500 }}>Total Revenue</span>
            <span style={{ color: 'var(--profit-color)', fontSize: 16, fontWeight: 600 }}>{fmt(pl.revenue)}</span>
          </div>
          
          <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)', margin: '16px 0' }}></div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
            <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>Product Cost</span>
            <span style={{ color: 'var(--loss-color)', fontSize: 14, fontWeight: 500 }}>- {fmt(pl.productCost)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
            <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>Shipping Cost</span>
            <span style={{ color: 'var(--loss-color)', fontSize: 14, fontWeight: 500 }}>- {fmt(pl.shippingCost)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
            <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>Ad Spend</span>
            <span style={{ color: 'var(--loss-color)', fontSize: 14, fontWeight: 500 }}>- {fmt(pl.adCost)}</span>
          </div>
          
          <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)', margin: '16px 0' }}></div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
            <span style={{ color: 'var(--text-main)', fontSize: 16, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>Net Profit</span>
            <div style={{ 
              background: isProfit ? 'rgba(52, 211, 153, 0.15)' : 'rgba(248, 113, 113, 0.15)',
              border: `1px solid ${isProfit ? 'rgba(52, 211, 153, 0.3)' : 'rgba(248, 113, 113, 0.3)'}`,
              padding: '6px 14px',
              borderRadius: 8,
              color: isProfit ? 'var(--profit-color)' : 'var(--loss-color)',
              fontSize: 20,
              fontWeight: 700,
              boxShadow: `0 0 15px ${isProfit ? 'rgba(52, 211, 153, 0.2)' : 'rgba(248, 113, 113, 0.2)'}`
            }}>
              {isProfit ? '+' : '-'}{fmt(Math.abs(pl.profit))}
            </div>
          </div>
        </div>
        
        <button onClick={onClose} className="primary" style={{ width: '100%', padding: '14px', fontSize: 15, borderRadius: 10, fontWeight: 600 }}>Close Breakdown</button>
      </div>
    </div>
  );
}

// ── ItemsModal ──────────────────────────────────────────────────────────────
function ItemsModal({ prettyDate, allItems, onClose }) {
  // Group by product title, sum quantities
  const productMap = {};
  allItems.forEach(li => {
    const key = li.title || 'Unknown Product';
    if (!productMap[key]) {
      productMap[key] = { title: key, sku: li.sku || '', qty: 0 };
    }
    productMap[key].qty += parseInt(li.quantity || 1);
  });

  const products = Object.values(productMap).sort((a, b) => b.qty - a.qty);
  const totalUnits = products.reduce((s, p) => s + p.qty, 0);

  return (
    <div className="modal-overlay active" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 480, padding: '28px 24px' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>📦 Items Ordered</div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#fff' }}>{prettyDate}</h2>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
        </div>

        {/* Summary pill */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
          <div style={{ padding: '6px 14px', borderRadius: 8, background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.25)', fontSize: 13, fontWeight: 600, color: '#a78bfa' }}>
            {totalUnits} total units
          </div>
          <div style={{ padding: '6px 14px', borderRadius: 8, background: 'rgba(56,189,248,0.08)', border: '1px solid rgba(56,189,248,0.2)', fontSize: 13, fontWeight: 600, color: '#38bdf8' }}>
            {products.length} SKU{products.length !== 1 ? 's' : ''}
          </div>
        </div>

        {/* Product list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 360, overflowY: 'auto' }}>
          {products.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'rgba(255,255,255,0.3)', fontSize: 14 }}>No items for this day</div>
          ) : products.map((p, i) => {
            const pct = totalUnits > 0 ? (p.qty / totalUnits) * 100 : 0;
            return (
              <div key={i} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, padding: '12px 14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <div style={{ flex: 1, minWidth: 0, marginRight: 12 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.title}</div>
                    {p.sku && !p.sku.startsWith('TITLE:') && (
                      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginTop: 2, fontFamily: 'monospace' }}>SKU: {p.sku}</div>
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
