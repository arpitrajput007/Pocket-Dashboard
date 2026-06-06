import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import { MetricCard } from './DashboardModals';
import {
  isOrderDelivered, isOrderFulfilled, isOrderPrepaidRevenue,
  calcPL, extractPackSize, loadCostHistory, getShipment, fmt,
} from '../utils/dashboardUtils';
import { dashboardCache } from '../utils/dashboardCache';

ChartJS.register(ArcElement, Tooltip, Legend);

const MONTHS      = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const FULL_MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const YEARS       = ['2024','2025','2026'];
const EXPENSE_CATS = ['team','software','packaging','warehouse','agency','other'];
const API_URL = import.meta.env.VITE_API_URL || '';

const fmtPct = (n) => `${Number(n || 0).toFixed(1)}%`;

// ── Cost row colors ────────────────────────────────────────────────────────────
const COST_COLORS = {
  product:  'rgba(96,165,250,1)',
  shipping: 'rgba(34,211,238,1)',
  ads:      'rgba(244,114,182,1)',
  cod:      'rgba(251,191,36,1)',
  rto:      'rgba(249,115,22,1)',
  refund:   'rgba(248,113,113,1)',
  gateway:  'rgba(167,139,250,1)',
  shopify:  'rgba(45,212,191,1)',
  manual:   'rgba(163,230,53,1)',
};

// ── P&L computation ────────────────────────────────────────────────────────────
function computePL(orders, shipmentsMap, adSpend, pricing, costConfig, expenses) {
  const cfg = costConfig || {};
  const active = orders.filter(o => !o.cancelled_at);

  const grossRevenue = active.reduce((s, o) => s + parseFloat(o.total_price || 0), 0);
  const refundAmount = active
    .filter(o => (o.financial_status || '').toLowerCase() === 'refunded')
    .reduce((s, o) => s + parseFloat(o.total_price || 0), 0);
  const netRevenue = grossRevenue - refundAmount;

  const codOrders     = active.filter(o => !isOrderPrepaidRevenue(o));
  const prepaidOrders = active.filter(o =>  isOrderPrepaidRevenue(o));
  const codCount      = codOrders.length;
  const prepaidRevenue = prepaidOrders.reduce((s, o) => s + parseFloat(o.total_price || 0), 0);

  const rtoCount = active.filter(o => getShipment(shipmentsMap, o.name)?.status === 'rto').length;

  const deliveredOrders = active.filter(o => isOrderDelivered(o, shipmentsMap));
  const fulfilledOrders = active.filter(o => isOrderFulfilled(o, shipmentsMap));
  const deliveredRevenue = deliveredOrders.reduce((s, o) => s + parseFloat(o.total_price || 0), 0);

  const items = [];
  active.forEach(o => {
    const isDel = isOrderDelivered(o, shipmentsMap);
    const isFul = isOrderFulfilled(o, shipmentsMap);
    const orderDate = (o.created_at || '').slice(0, 10);
    (o.line_items || []).forEach(li => {
      items.push({
        sku: li.sku, title: li.title, quantity: li.quantity || 1,
        isDelivered: isDel, isFulfilled: isFul, orderDate,
        packSize: extractPackSize(li.variant_title),
      });
    });
  });

  const pl = calcPL(deliveredRevenue, deliveredOrders.length, 0, fulfilledOrders.length, items, pricing);

  const codCharges  = codCount  * parseFloat(cfg.cod_charge_per_order || 29);
  const rtoLoss     = rtoCount  * parseFloat(cfg.rto_cost_per_order   || 135);
  const gatewayFees = prepaidRevenue * (parseFloat(cfg.gateway_pct || 2) / 100);
  const shopifyFee  = parseFloat(cfg.shopify_monthly || 0);
  const manualTotal = (expenses || []).reduce((s, e) => s + parseFloat(e.amount || 0), 0);

  const totalCosts = pl.productCost + pl.shippingCost + adSpend + codCharges + rtoLoss + gatewayFees + shopifyFee + manualTotal;
  const takeHome   = netRevenue - totalCosts;
  const margin     = netRevenue > 0 ? (takeHome / netRevenue) * 100 : 0;

  return {
    grossRevenue, refundAmount, netRevenue,
    productCost: pl.productCost,
    shippingCost: pl.shippingCost,
    adSpend, codCharges, rtoLoss, gatewayFees, shopifyFee, manualTotal,
    totalCosts, takeHome, margin,
    codCount, rtoCount, totalOrders: active.length,
    deliveredCount: deliveredOrders.length,
    prepaidRevenue,
  };
}

// ── Animated counter ───────────────────────────────────────────────────────────
function AnimatedNumber({ value, duration = 800 }) {
  const [display, setDisplay] = useState(value);
  const prev = useRef(value);
  useEffect(() => {
    const from = prev.current; const to = value; prev.current = to;
    if (from === to) return;
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(from + (to - from) * ease));
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [value, duration]);
  return <>₹{display.toLocaleString('en-IN')}</>;
}

// ── P&L cost row ───────────────────────────────────────────────────────────────
function CostRow({ icon, label, amount, color, pct, detail, configKey, onEdit }) {
  const bar = Math.min(Math.max(pct || 0, 0), 100);
  return (
    <div style={{ display:'flex', alignItems:'center', gap:14, padding:'11px 0', borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
      <div style={{ width:32, height:32, borderRadius:9, background:`${color}18`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:15, flexShrink:0 }}>{icon}</div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4 }}>
          <span style={{ fontSize:13, fontWeight:600, color:'var(--text-main)' }}>{label}</span>
          <span style={{ fontSize:14, fontWeight:700, color:'var(--text-main)', fontVariantNumeric:'tabular-nums', marginLeft:12 }}>{fmt(amount)}</span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <div style={{ flex:1, height:3, borderRadius:99, background:'rgba(255,255,255,0.06)' }}>
            <div style={{ height:'100%', width:`${bar}%`, borderRadius:99, background:color, transition:'width 0.7s cubic-bezier(0.4,0,0.2,1)' }} />
          </div>
          {detail && <span style={{ fontSize:11, color:'var(--text-muted)', whiteSpace:'nowrap' }}>{detail}</span>}
          {configKey && <button onClick={onEdit} style={{ fontSize:10, padding:'1px 7px', borderRadius:99, background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', color:'var(--text-muted)', cursor:'pointer', fontFamily:'inherit' }}>edit</button>}
        </div>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function MoneyInMyPocket({ store, refreshTrigger }) {
  const now = new Date();
  const [selMonth, setSelMonth] = useState(now.getMonth() + 1);
  const [selYear,  setSelYear]  = useState(now.getFullYear());

  const [orders,      setOrders]      = useState([]);
  const [prevOrders,  setPrevOrders]  = useState([]);
  const [shipmentsMap, setShipmentsMap] = useState({});
  const [adSpend,     setAdSpend]     = useState(0);
  const [prevAdSpend, setPrevAdSpend] = useState(0);
  const [pricing,     setPricing]     = useState({});
  const [costConfig,  setCostConfig]  = useState({ shopify_monthly:0, cod_charge_per_order:29, gateway_pct:2, rto_cost_per_order:135 });
  const [expenses,    setExpenses]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [insights,    setInsights]    = useState([]);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [showConfig,  setShowConfig]  = useState(false);
  const [configDraft, setConfigDraft] = useState({});
  const [addForm,     setAddForm]     = useState(null);
  const [savingConfig,    setSavingConfig]    = useState(false);
  const [addingExpense,   setAddingExpense]   = useState(false);

  // ── Date math ────────────────────────────────────────────────────────────────
  const monthStr = `${selYear}-${String(selMonth).padStart(2,'0')}`;
  const lastDay  = new Date(selYear, selMonth, 0).getDate();
  const startStr = `${monthStr}-01T00:00:00`;
  const endStr   = `${monthStr}-${String(lastDay).padStart(2,'0')}T23:59:59`;

  const prevDate    = new Date(selYear, selMonth - 2, 1);
  const prevMonthStr = `${prevDate.getFullYear()}-${String(prevDate.getMonth()+1).padStart(2,'0')}`;
  const prevLastDay  = new Date(prevDate.getFullYear(), prevDate.getMonth()+1, 0).getDate();

  // ── Fetchers ─────────────────────────────────────────────────────────────────
  const fetchOrders = useCallback(async () => {
    if (!store?.id) return;
    const ck = `pocket_orders_${store.id}_${monthStr}`;
    const hit = dashboardCache.get(ck);
    if (hit) { setOrders(hit); return; }
    const { data } = await supabase.from('orders')
      .select('id, name, created_at, total_price, tags, fulfillment_status, financial_status, cancelled_at, shipping_title, line_items')
      .eq('store_id', store.id).gte('created_at', startStr).lte('created_at', endStr)
      .order('created_at', { ascending: true });
    setOrders(data || []); dashboardCache.set(ck, data || []);
  }, [store?.id, monthStr]);

  const fetchPrevOrders = useCallback(async () => {
    if (!store?.id) return;
    const ck = `pocket_orders_${store.id}_${prevMonthStr}`;
    const hit = dashboardCache.get(ck);
    if (hit) { setPrevOrders(hit); return; }
    const { data } = await supabase.from('orders')
      .select('id, name, created_at, total_price, tags, fulfillment_status, financial_status, cancelled_at, shipping_title, line_items')
      .eq('store_id', store.id)
      .gte('created_at', `${prevMonthStr}-01T00:00:00`)
      .lte('created_at', `${prevMonthStr}-${String(prevLastDay).padStart(2,'0')}T23:59:59`);
    setPrevOrders(data || []); dashboardCache.set(ck, data || []);
  }, [store?.id, prevMonthStr]);

  const fetchShipments = useCallback(async () => {
    if (!store?.id || !store?.shiprocket_connected) return;
    const ck = `pocket_shipments_${store.id}`;
    const hit = dashboardCache.get(ck);
    if (hit) { setShipmentsMap(hit); return; }
    const map = {};
    for (let from = 0; ; from += 1000) {
      const { data } = await supabase.from('shipments')
        .select('shopify_order_name, status').eq('store_id', store.id).range(from, from + 999);
      (data || []).forEach(s => {
        if (!s.shopify_order_name) return;
        map[s.shopify_order_name] = s;
        const d = s.shopify_order_name.replace(/\D/g,'');
        if (d && !map[d]) map[d] = s;
      });
      if (!data || data.length < 1000) break;
    }
    setShipmentsMap(map); dashboardCache.set(ck, map, 300);
  }, [store?.id, store?.shiprocket_connected]);

  const fetchAdCosts = useCallback(async () => {
    if (!store?.id) return;
    const { data: cur }  = await supabase.from('ad_costs').select('amount')
      .eq('store_id', store.id).gte('date', `${monthStr}-01`).lte('date', `${monthStr}-${String(lastDay).padStart(2,'0')}`);
    setAdSpend((cur || []).reduce((s,r) => s + parseFloat(r.amount||0), 0));
    const { data: prv } = await supabase.from('ad_costs').select('amount')
      .eq('store_id', store.id)
      .gte('date', `${prevMonthStr}-01`)
      .lte('date', `${prevMonthStr}-${String(prevLastDay).padStart(2,'0')}`);
    setPrevAdSpend((prv || []).reduce((s,r) => s + parseFloat(r.amount||0), 0));
  }, [store?.id, monthStr, prevMonthStr]);

  const fetchPricing = useCallback(async () => {
    if (!store?.id) return;
    const ck = `pricing_${store.id}`;
    const hit = dashboardCache.get(ck);
    if (hit) { setPricing(hit); return; }
    const { data } = await supabase.from('products').select('*').eq('store_id', store.id);
    if (data) {
      const history = await loadCostHistory(supabase, store.id);
      const map = {};
      data.forEach(p => {
        p._costHistory = history[p.id] || null;
        if (p.sku)   map[p.sku.trim().toLowerCase()] = p;
        if (p.title) map['TITLE:' + p.title.trim().toLowerCase()] = p;
      });
      setPricing(map); dashboardCache.set(ck, map, 600);
    }
  }, [store?.id]);

  const fetchCostConfig = useCallback(async () => {
    if (!store?.id) return;
    const { data } = await supabase.from('store_cost_config').select('*').eq('store_id', store.id).maybeSingle();
    if (data) setCostConfig(data);
  }, [store?.id]);

  const fetchExpenses = useCallback(async () => {
    if (!store?.id) return;
    const { data } = await supabase.from('monthly_expenses')
      .select('*').eq('store_id', store.id).eq('month', monthStr).order('created_at');
    setExpenses(data || []);
  }, [store?.id, monthStr]);

  useEffect(() => {
    if (store?.id && refreshTrigger) dashboardCache.bust(store.id);
  }, [refreshTrigger, store?.id]);

  useEffect(() => {
    if (!store?.id) return;
    setLoading(true); setInsights([]);
    Promise.all([fetchOrders(), fetchPrevOrders(), fetchShipments(), fetchAdCosts(), fetchPricing(), fetchCostConfig(), fetchExpenses()])
      .finally(() => setLoading(false));
  }, [store?.id, selMonth, selYear, refreshTrigger]);

  // ── Computed P&L ─────────────────────────────────────────────────────────────
  const pl  = useMemo(() => computePL(orders,     shipmentsMap, adSpend,     pricing, costConfig, expenses), [orders, shipmentsMap, adSpend, pricing, costConfig, expenses]);
  const ppl = useMemo(() => computePL(prevOrders, shipmentsMap, prevAdSpend, pricing, costConfig, []),      [prevOrders, shipmentsMap, prevAdSpend, pricing, costConfig]);

  const momChange    = pl.takeHome - ppl.takeHome;
  const momChangePct = ppl.takeHome !== 0 ? (momChange / Math.abs(ppl.takeHome)) * 100 : 0;
  const isProfit     = pl.takeHome >= 0;

  // ── Expense management ────────────────────────────────────────────────────────
  const addExpense = async () => {
    if (!addForm?.label || !addForm?.amount) return;
    setAddingExpense(true);
    const { data } = await supabase.from('monthly_expenses')
      .insert({ store_id: store.id, month: monthStr, category: addForm.category || 'other', label: addForm.label, amount: parseFloat(addForm.amount) })
      .select().single();
    if (data) setExpenses(p => [...p, data]);
    setAddForm(null); setAddingExpense(false);
  };

  const deleteExpense = async (id) => {
    await supabase.from('monthly_expenses').delete().eq('id', id);
    setExpenses(p => p.filter(e => e.id !== id));
  };

  // ── Config save ───────────────────────────────────────────────────────────────
  const saveCostConfig = async () => {
    setSavingConfig(true);
    await supabase.from('store_cost_config').upsert({ store_id: store.id, ...configDraft, updated_at: new Date().toISOString() }, { onConflict: 'store_id' });
    setCostConfig(p => ({ ...p, ...configDraft }));
    setShowConfig(false); setSavingConfig(false);
  };

  // ── AI insights ───────────────────────────────────────────────────────────────
  const generateInsights = async () => {
    setInsightsLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/money-pocket-insights/${store.id}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month: `${FULL_MONTHS[selMonth-1]} ${selYear}`, plData: pl, prevPlData: ppl }),
      });
      const json = await res.json();
      if (Array.isArray(json.insights)) setInsights(json.insights);
    } catch { /* silent */ }
    setInsightsLoading(false);
  };

  // ── Doughnut data ─────────────────────────────────────────────────────────────
  const chartData = useMemo(() => ({
    labels: ['Product','Shipping','Ads','COD','RTO','Gateway','Shopify','Operations'],
    datasets: [{
      data: [pl.productCost, pl.shippingCost, pl.adSpend, pl.codCharges, pl.rtoLoss, pl.gatewayFees, pl.shopifyFee, pl.manualTotal],
      backgroundColor: Object.values(COST_COLORS),
      borderColor: 'var(--bg-primary, #07071a)',
      borderWidth: 3,
    }],
  }), [pl]);

  if (loading) return (
    <div className="view-content active" style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'60vh' }}>
      <div style={{ textAlign:'center', color:'var(--text-muted)' }}>
        <div style={{ fontSize:40, marginBottom:12 }}>💰</div>
        <div style={{ fontSize:14 }}>Calculating take-home profit…</div>
      </div>
    </div>
  );

  // Helper: percentage of net revenue (for bar widths)
  const barPct = (n) => pl.netRevenue > 0 ? (n / pl.netRevenue) * 100 : 0;

  return (
    <div className="view-content active" style={{ paddingBottom: 60 }}>

      {/* ── Controls bar ──────────────────────────────────────────────────────── */}
      <div className="controls-bar glass" style={{ marginBottom: 24 }}>
        <div style={{ flex: 1 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>💰 Money In My Pocket</h2>
          <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>
            True take-home profit for {FULL_MONTHS[selMonth-1]} {selYear} after every expense
          </p>
        </div>

        {/* Month pills */}
        <div style={{ display:'flex', gap:3, background:'rgba(255,255,255,0.04)', borderRadius:10, padding:4 }}>
          {MONTHS.map((m, i) => (
            <button key={m} onClick={() => setSelMonth(i+1)}
              style={{ padding:'5px 10px', borderRadius:7, border:'none', fontFamily:'inherit', fontSize:12, fontWeight:600, cursor:'pointer', transition:'all 0.15s', background: selMonth===i+1 ? 'rgba(99,102,241,0.9)' : 'transparent', color: selMonth===i+1 ? '#fff' : 'var(--text-muted)' }}>
              {m}
            </button>
          ))}
        </div>

        {/* Year */}
        <select value={selYear} onChange={e => setSelYear(Number(e.target.value))}
          style={{ padding:'7px 10px', borderRadius:8, border:'1px solid var(--border)', background:'rgba(255,255,255,0.05)', color:'var(--text-main)', fontSize:12, fontFamily:'inherit', cursor:'pointer' }}>
          {YEARS.map(y => <option key={y} value={y} style={{ background:'#111' }}>{y}</option>)}
        </select>

        {/* Config */}
        <button onClick={() => { setConfigDraft({ ...costConfig }); setShowConfig(true); }}
          style={{ padding:'7px 14px', borderRadius:8, border:'1px solid var(--border)', background:'rgba(255,255,255,0.04)', color:'var(--text-muted)', fontSize:12, fontFamily:'inherit', cursor:'pointer', display:'flex', alignItems:'center', gap:5 }}>
          ⚙️ Configure Rates
        </button>
      </div>

      {/* ── Hero take-home card ────────────────────────────────────────────────── */}
      <div className="card glass" style={{ marginBottom: 24, padding: '28px 28px', background: isProfit ? 'rgba(16,185,129,0.04)' : 'rgba(244,63,94,0.04)', borderColor: isProfit ? 'rgba(16,185,129,0.2)' : 'rgba(244,63,94,0.2)', position:'relative', overflow:'hidden' }}>
        {/* Ambient glow blob */}
        <div style={{ position:'absolute', width:500, height:500, borderRadius:'50%', background:`radial-gradient(circle, ${isProfit ? 'rgba(16,185,129,0.06)' : 'rgba(244,63,94,0.05)'} 0%, transparent 70%)`, top:-200, right:-100, pointerEvents:'none' }} />

        <div style={{ position:'relative', zIndex:1 }}>
          <div style={{ display:'flex', alignItems:'flex-end', flexWrap:'wrap', gap:20, marginBottom:24 }}>
            <div>
              <div style={{ fontSize:12, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', color:'var(--text-muted)', marginBottom:6 }}>
                TAKE-HOME PROFIT · {FULL_MONTHS[selMonth-1].toUpperCase()} {selYear}
              </div>
              <div style={{ fontSize:'clamp(40px,6vw,64px)', fontWeight:900, letterSpacing:'-0.04em', lineHeight:1, color: isProfit ? 'var(--profit-color)' : 'var(--loss-color)', textShadow: isProfit ? '0 0 40px rgba(16,185,129,0.35)' : '0 0 40px rgba(244,63,94,0.35)' }}>
                <AnimatedNumber value={pl.takeHome} />
              </div>
            </div>

            {/* MoM change */}
            {ppl.takeHome !== 0 && (
              <div style={{ paddingBottom: 6 }}>
                <div style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'8px 16px', borderRadius:99, background: momChange>=0 ? 'rgba(16,185,129,0.1)' : 'rgba(244,63,94,0.1)', border:`1px solid ${momChange>=0 ? 'rgba(16,185,129,0.3)' : 'rgba(244,63,94,0.3)'}` }}>
                  <span style={{ fontSize:14, color: momChange>=0 ? 'var(--profit-color)' : 'var(--loss-color)' }}>{momChange>=0 ? '▲' : '▼'}</span>
                  <div>
                    <div style={{ fontSize:13, fontWeight:700, color: momChange>=0 ? 'var(--profit-color)' : 'var(--loss-color)' }}>{fmt(Math.abs(momChange))}</div>
                    <div style={{ fontSize:11, color:'var(--text-muted)' }}>{momChangePct>=0?'+':''}{fmtPct(momChangePct)} vs {MONTHS[prevDate.getMonth()]} {prevDate.getFullYear()}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Margin pill */}
            <div style={{ paddingBottom: 6 }}>
              <div style={{ display:'inline-flex', flexDirection:'column', padding:'8px 16px', borderRadius:12, background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)' }}>
                <span style={{ fontSize:11, color:'var(--text-muted)', fontWeight:700, letterSpacing:'0.06em' }}>PROFIT MARGIN</span>
                <span style={{ fontSize:22, fontWeight:800, color: isProfit ? 'var(--profit-color)' : 'var(--loss-color)', letterSpacing:'-0.02em' }}>{fmtPct(pl.margin)}</span>
              </div>
            </div>
          </div>

          {/* Summary strip */}
          <div style={{ display:'flex', gap:16, flexWrap:'wrap', paddingTop:20, borderTop:'1px solid rgba(255,255,255,0.06)' }}>
            {[
              { label:'Gross Revenue',  value: fmt(pl.grossRevenue),   color:'rgba(167,139,250,1)' },
              { label:'Net Revenue',    value: fmt(pl.netRevenue),     color:'rgba(167,139,250,0.8)' },
              { label:'Total Costs',    value: fmt(pl.totalCosts),     color:'var(--loss-color)' },
              { label:'Total Orders',   value: pl.totalOrders,         color:'var(--text-main)' },
              { label:'Delivered',      value: pl.deliveredCount,      color:'rgba(34,211,238,1)' },
              { label:'COD Orders',     value: pl.codCount,            color:'rgba(251,191,36,1)' },
              { label:'RTO Count',      value: pl.rtoCount,            color: pl.rtoCount > 0 ? 'var(--loss-color)' : 'var(--text-muted)' },
            ].map(s => (
              <div key={s.label} style={{ display:'flex', flexDirection:'column', minWidth:90 }}>
                <span style={{ fontSize:10, fontWeight:700, letterSpacing:'0.07em', textTransform:'uppercase', color:'var(--text-muted)' }}>{s.label}</span>
                <span style={{ fontSize:18, fontWeight:800, color: s.color, marginTop:2, letterSpacing:'-0.02em' }}>{s.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Metric cards ──────────────────────────────────────────────────────── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(170px, 1fr))', gap:12, marginBottom:24 }}>
        <MetricCard label="Gross Revenue"     value={fmt(pl.grossRevenue)}          color="var(--profit-color)"       glow="green"  />
        <MetricCard label="Ad Spend"          value={fmt(pl.adSpend)}               color="rgba(244,114,182,1)"        glow="red"    />
        <MetricCard label="Product Cost"      value={fmt(pl.productCost)}           color="rgba(96,165,250,1)"         glow="blue"   />
        <MetricCard label="Shipping Cost"     value={fmt(pl.shippingCost)}          color="rgba(34,211,238,1)"         glow="blue"   />
        <MetricCard label="COD Charges"       value={fmt(pl.codCharges)}            color="rgba(251,191,36,1)"         glow="yellow" note={`${pl.codCount} orders`} />
        <MetricCard label="RTO Losses"        value={fmt(pl.rtoLoss)}               color={pl.rtoCount>0 ? 'rgba(249,115,22,1)' : 'var(--text-muted)'} glow="orange" note={`${pl.rtoCount} returns`} />
        <MetricCard label="Gateway Fees"      value={fmt(pl.gatewayFees)}           color="rgba(167,139,250,1)"        glow="purple" note={`${costConfig.gateway_pct}% prepaid`} />
        <MetricCard label="Manual Expenses"   value={fmt(pl.manualTotal)}           color="rgba(163,230,53,1)"         glow="green"  note={`${expenses.length} entries`} />
      </div>

      {/* ── P&L Breakdown + Chart (2-column) ─────────────────────────────────── */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 300px', gap:20, marginBottom:20, alignItems:'start' }}>

        {/* Left: P&L waterfall */}
        <div className="card glass">
          <h3 style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <span>P&amp;L Breakdown</span>
            <span style={{ fontSize:12, fontWeight:500, color:'var(--text-muted)' }}>{FULL_MONTHS[selMonth-1]} {selYear}</span>
          </h3>

          {/* Revenue */}
          <div style={{ marginBottom:6 }}>
            <div style={{ fontSize:11, fontWeight:700, letterSpacing:'0.07em', textTransform:'uppercase', color:'var(--text-muted)', marginBottom:8, paddingBottom:4, borderBottom:'1px solid rgba(255,255,255,0.05)' }}>Revenue</div>
            <CostRow icon="💰" label="Gross Revenue"    amount={pl.grossRevenue}  color="rgba(167,139,250,1)" pct={100} detail="all orders" />
            {pl.refundAmount > 0 && <CostRow icon="↩️" label="Refunds & Returns" amount={pl.refundAmount} color="rgba(248,113,113,1)" pct={barPct(pl.refundAmount)} detail="refunded orders" />}
            <div style={{ display:'flex', justifyContent:'space-between', padding:'10px 0 14px', marginBottom:2 }}>
              <span style={{ fontSize:13, fontWeight:700, color:'var(--text-muted)' }}>Net Revenue</span>
              <span style={{ fontSize:15, fontWeight:800, color:'rgba(167,139,250,1)' }}>{fmt(pl.netRevenue)}</span>
            </div>
          </div>

          {/* Costs */}
          <div>
            <div style={{ fontSize:11, fontWeight:700, letterSpacing:'0.07em', textTransform:'uppercase', color:'var(--text-muted)', marginBottom:8, paddingBottom:4, borderBottom:'1px solid rgba(255,255,255,0.05)' }}>Operating Costs</div>
            {pl.productCost  > 0 && <CostRow icon="📦" label="Product Cost"          amount={pl.productCost}  color={COST_COLORS.product}  pct={barPct(pl.productCost)}  detail="from pricing" />}
            {pl.shippingCost > 0 && <CostRow icon="🚚" label="Shipping (estimated)"   amount={pl.shippingCost} color={COST_COLORS.shipping} pct={barPct(pl.shippingCost)} detail="from pricing" />}
            {pl.adSpend      > 0 && <CostRow icon="📢" label="Ad Spend"               amount={pl.adSpend}      color={COST_COLORS.ads}      pct={barPct(pl.adSpend)}      detail="Meta / Google" />}
            <CostRow icon="💳" label="COD Charges" amount={pl.codCharges} color={COST_COLORS.cod} pct={barPct(pl.codCharges)} detail={`${pl.codCount} × ₹${costConfig.cod_charge_per_order}`} configKey="cod" onEdit={() => { setConfigDraft({...costConfig}); setShowConfig(true); }} />
            {pl.rtoCount > 0 && <CostRow icon="↩️" label="RTO Losses" amount={pl.rtoLoss} color={COST_COLORS.rto} pct={barPct(pl.rtoLoss)} detail={`${pl.rtoCount} × ₹${costConfig.rto_cost_per_order}`} configKey="rto" onEdit={() => { setConfigDraft({...costConfig}); setShowConfig(true); }} />}
            <CostRow icon="🏦" label="Payment Gateway" amount={pl.gatewayFees} color={COST_COLORS.gateway} pct={barPct(pl.gatewayFees)} detail={`${costConfig.gateway_pct}% of ₹${Math.round(pl.prepaidRevenue).toLocaleString('en-IN')}`} configKey="gateway" onEdit={() => { setConfigDraft({...costConfig}); setShowConfig(true); }} />
            {pl.shopifyFee > 0 && <CostRow icon="🛒" label="Shopify Subscription" amount={pl.shopifyFee} color={COST_COLORS.shopify} pct={barPct(pl.shopifyFee)} detail="monthly plan" />}
            {pl.manualTotal > 0 && <CostRow icon="👥" label="Team & Operations" amount={pl.manualTotal} color={COST_COLORS.manual} pct={barPct(pl.manualTotal)} detail={`${expenses.length} entries`} />}

            <div style={{ display:'flex', justifyContent:'space-between', padding:'10px 0 14px', marginTop:4, borderTop:'1px solid rgba(255,255,255,0.08)' }}>
              <span style={{ fontSize:13, fontWeight:700, color:'var(--text-muted)' }}>Total Costs</span>
              <span style={{ fontSize:15, fontWeight:800, color:'var(--loss-color)' }}>{fmt(pl.totalCosts)}</span>
            </div>
          </div>

          {/* Take-home result */}
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'16px 20px', borderRadius:14, background: isProfit ? 'rgba(16,185,129,0.08)' : 'rgba(244,63,94,0.08)', border:`1px solid ${isProfit ? 'rgba(16,185,129,0.25)' : 'rgba(244,63,94,0.25)'}`, marginTop:4 }}>
            <div>
              <div style={{ fontSize:11, fontWeight:800, letterSpacing:'0.07em', color:'var(--text-muted)' }}>💰 MONEY IN MY POCKET</div>
              <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:3 }}>{fmtPct(pl.margin)} net margin</div>
            </div>
            <div style={{ fontSize:26, fontWeight:900, color: isProfit ? 'var(--profit-color)' : 'var(--loss-color)', letterSpacing:'-0.03em', textShadow: isProfit ? '0 0 20px rgba(16,185,129,0.4)' : '0 0 20px rgba(244,63,94,0.4)' }}>
              {fmt(pl.takeHome)}
            </div>
          </div>
        </div>

        {/* Right: doughnut + legend */}
        <div className="card glass">
          <h3>Cost Breakdown</h3>
          {pl.totalCosts > 0 ? (
            <>
              <div style={{ width:'100%', maxWidth:220, margin:'0 auto 20px' }}>
                <Doughnut data={chartData} options={{ cutout:'68%', plugins:{ legend:{ display:false }, tooltip:{ callbacks:{ label:(c) => ` ${c.label}: ${fmt(c.raw)}` } } } }} />
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
                {[
                  { label:'Product Cost',   amt:pl.productCost,  c:COST_COLORS.product  },
                  { label:'Shipping',        amt:pl.shippingCost, c:COST_COLORS.shipping },
                  { label:'Ad Spend',        amt:pl.adSpend,      c:COST_COLORS.ads      },
                  { label:'COD Charges',     amt:pl.codCharges,   c:COST_COLORS.cod      },
                  { label:'RTO Losses',      amt:pl.rtoLoss,      c:COST_COLORS.rto      },
                  { label:'Gateway',         amt:pl.gatewayFees,  c:COST_COLORS.gateway  },
                  { label:'Shopify',         amt:pl.shopifyFee,   c:COST_COLORS.shopify  },
                  { label:'Operations',      amt:pl.manualTotal,  c:COST_COLORS.manual   },
                ].filter(r => r.amt > 0).map(r => (
                  <div key={r.label} style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <div style={{ width:9, height:9, borderRadius:3, background:r.c, flexShrink:0 }} />
                    <span style={{ flex:1, fontSize:12, color:'var(--text-muted)' }}>{r.label}</span>
                    <span style={{ fontSize:12, fontWeight:700, color:'var(--text-main)', fontVariantNumeric:'tabular-nums' }}>{fmt(r.amt)}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div style={{ textAlign:'center', padding:'40px 0', color:'var(--text-muted)', fontSize:13 }}>No cost data for this month</div>
          )}
        </div>
      </div>

      {/* ── Manual expenses + AI insights (2-column) ──────────────────────────── */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20, marginBottom:20 }}>

        {/* Manual expenses */}
        <div className="card glass">
          <h3 style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <span>👥 Team &amp; Operations</span>
            <button onClick={() => setAddForm({ category:'other', label:'', amount:'' })}
              style={{ fontSize:12, padding:'5px 12px', borderRadius:8, background:'rgba(163,230,53,0.12)', border:'1px solid rgba(163,230,53,0.25)', color:'rgba(163,230,53,1)', fontFamily:'inherit', cursor:'pointer' }}>
              + Add Expense
            </button>
          </h3>

          {/* Add form */}
          {addForm && (
            <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:12, padding:14, marginBottom:14, display:'flex', flexDirection:'column', gap:10 }}>
              <div style={{ display:'flex', gap:8 }}>
                <div style={{ flex:1 }}>
                  <label style={{ display:'block', fontSize:10, color:'var(--text-muted)', marginBottom:3, fontWeight:700 }}>LABEL</label>
                  <input value={addForm.label} onChange={e => setAddForm(p => ({...p, label:e.target.value}))} placeholder="e.g. Salaries" style={{ width:'100%', padding:'7px 10px', borderRadius:7, border:'1px solid rgba(255,255,255,0.1)', background:'rgba(255,255,255,0.05)', color:'var(--text-main)', fontSize:13, fontFamily:'inherit', boxSizing:'border-box' }} />
                </div>
                <div style={{ width:110 }}>
                  <label style={{ display:'block', fontSize:10, color:'var(--text-muted)', marginBottom:3, fontWeight:700 }}>AMOUNT (₹)</label>
                  <input type="number" value={addForm.amount} onChange={e => setAddForm(p => ({...p, amount:e.target.value}))} placeholder="0" style={{ width:'100%', padding:'7px 10px', borderRadius:7, border:'1px solid rgba(255,255,255,0.1)', background:'rgba(255,255,255,0.05)', color:'var(--text-main)', fontSize:13, fontFamily:'inherit', boxSizing:'border-box' }} />
                </div>
              </div>
              <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                <select value={addForm.category} onChange={e => setAddForm(p => ({...p, category:e.target.value}))} style={{ flex:1, padding:'7px 10px', borderRadius:7, border:'1px solid rgba(255,255,255,0.1)', background:'rgba(255,255,255,0.05)', color:'var(--text-main)', fontSize:13, fontFamily:'inherit' }}>
                  {EXPENSE_CATS.map(c => <option key={c} value={c} style={{ background:'#111' }}>{c.charAt(0).toUpperCase()+c.slice(1)}</option>)}
                </select>
                <button onClick={addExpense} disabled={addingExpense||!addForm.label||!addForm.amount} style={{ padding:'7px 16px', borderRadius:8, border:'none', background:'rgba(163,230,53,0.85)', color:'#07071a', fontSize:13, fontWeight:700, fontFamily:'inherit', cursor:'pointer', opacity:addingExpense||!addForm.label||!addForm.amount?0.5:1 }}>
                  {addingExpense ? '…' : 'Save'}
                </button>
                <button onClick={() => setAddForm(null)} style={{ padding:'7px 12px', borderRadius:8, border:'1px solid rgba(255,255,255,0.1)', background:'transparent', color:'var(--text-muted)', fontSize:13, fontFamily:'inherit', cursor:'pointer' }}>✕</button>
              </div>
            </div>
          )}

          {expenses.length === 0 && !addForm ? (
            <div style={{ textAlign:'center', padding:'32px 0', color:'var(--text-muted)', fontSize:13 }}>
              No expenses logged for {FULL_MONTHS[selMonth-1]} {selYear}.<br />
              <span style={{ fontSize:12, opacity:0.6 }}>Track salaries, rent, packaging, agency fees&hellip;</span>
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
              {expenses.map(e => (
                <div key={e.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 12px', borderRadius:10, background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ width:7, height:7, borderRadius:2, background:COST_COLORS.manual, flexShrink:0 }} />
                  <span style={{ flex:1, fontSize:13, color:'var(--text-main)' }}>{e.label}</span>
                  <span style={{ fontSize:10, color:'var(--text-muted)', background:'rgba(255,255,255,0.05)', padding:'2px 7px', borderRadius:99 }}>{e.category}</span>
                  <span style={{ fontSize:13, fontWeight:700, color:'var(--text-main)', fontVariantNumeric:'tabular-nums' }}>{fmt(e.amount)}</span>
                  <button onClick={() => deleteExpense(e.id)} style={{ background:'none', border:'none', color:'rgba(244,63,94,0.5)', cursor:'pointer', fontSize:15, padding:'0 2px', lineHeight:1 }}>×</button>
                </div>
              ))}
              <div style={{ display:'flex', justifyContent:'space-between', paddingTop:8, borderTop:'1px solid rgba(255,255,255,0.06)', marginTop:4 }}>
                <span style={{ fontSize:12, color:'var(--text-muted)', fontWeight:600 }}>Total</span>
                <span style={{ fontSize:14, fontWeight:800, color:'rgba(163,230,53,1)' }}>{fmt(pl.manualTotal)}</span>
              </div>
            </div>
          )}
        </div>

        {/* AI insights */}
        <div className="card glass" style={{ background:'rgba(99,102,241,0.04)', borderColor:'rgba(99,102,241,0.15)' }}>
          <h3 style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <span>✨ AI Insights</span>
            <button onClick={generateInsights} disabled={insightsLoading}
              style={{ fontSize:12, padding:'5px 12px', borderRadius:8, background:'rgba(167,139,250,0.12)', border:'1px solid rgba(167,139,250,0.3)', color:'rgba(167,139,250,1)', fontFamily:'inherit', cursor:'pointer', opacity:insightsLoading?0.6:1 }}>
              {insightsLoading ? 'Analysing…' : insights.length > 0 ? '↻ Refresh' : '✦ Generate'}
            </button>
          </h3>

          {insights.length > 0 ? (
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {insights.map((ins, i) => (
                <div key={i} style={{ display:'flex', gap:12, padding:'12px 14px', borderRadius:10, background:'rgba(255,255,255,0.03)', border:'1px solid rgba(99,102,241,0.12)' }}>
                  <span style={{ color:'rgba(167,139,250,0.8)', fontSize:14, marginTop:1, flexShrink:0 }}>◆</span>
                  <span style={{ fontSize:13, lineHeight:1.65, color:'var(--text-main)' }}>{ins}</span>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign:'center', padding:'40px 20px', color:'var(--text-muted)', fontSize:13 }}>
              {insightsLoading ? 'Analysing your P&L data…' : (
                <>
                  <div style={{ fontSize:32, marginBottom:10 }}>✨</div>
                  Click <strong style={{ color:'rgba(167,139,250,0.9)' }}>Generate</strong> for AI-powered analysis of where your profit is coming from and where money is leaking.
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Cost Config Modal ──────────────────────────────────────────────────── */}
      {showConfig && (
        <div style={{ position:'fixed', inset:0, zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
          <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.75)', backdropFilter:'blur(10px)' }} onClick={() => setShowConfig(false)} />
          <div style={{ position:'relative', zIndex:1, background:'#0f0f1e', border:'1px solid rgba(255,255,255,0.12)', borderRadius:20, padding:'28px 28px 24px', width:'100%', maxWidth:460, boxShadow:'0 24px 80px rgba(0,0,0,0.7)' }}>
            <h3 style={{ margin:'0 0 6px', fontSize:16, fontWeight:800 }}>⚙️ Configure Cost Rates</h3>
            <p style={{ margin:'0 0 22px', fontSize:12, color:'var(--text-muted)' }}>Set your actual fees — used to automatically estimate operating costs.</p>

            {[
              { key:'shopify_monthly',      label:'Shopify Plan (₹/month)',   help:'Your monthly Shopify subscription cost' },
              { key:'cod_charge_per_order', label:'COD Fee per Order (₹)',    help:'Shiprocket/courier COD collection charge' },
              { key:'gateway_pct',          label:'Payment Gateway Fee (%)',  help:'Razorpay/Cashfree/PhonePe rate on prepaid orders' },
              { key:'rto_cost_per_order',   label:'RTO Cost per Return (₹)', help:'Return shipping + restocking cost per RTO' },
            ].map(f => (
              <div key={f.key} style={{ marginBottom:16 }}>
                <label style={{ display:'block', fontSize:12, fontWeight:700, color:'var(--text-main)', marginBottom:2 }}>{f.label}</label>
                <p style={{ margin:'0 0 5px', fontSize:11, color:'var(--text-muted)' }}>{f.help}</p>
                <input type="number" value={configDraft[f.key] ?? costConfig[f.key] ?? ''}
                  onChange={e => setConfigDraft(p => ({...p, [f.key]: parseFloat(e.target.value)||0}))}
                  style={{ width:'100%', padding:'9px 12px', borderRadius:9, border:'1px solid rgba(255,255,255,0.1)', background:'rgba(255,255,255,0.05)', color:'var(--text-main)', fontSize:14, fontFamily:'inherit', boxSizing:'border-box' }}
                />
              </div>
            ))}

            <div style={{ display:'flex', gap:10, marginTop:22 }}>
              <button onClick={saveCostConfig} disabled={savingConfig} style={{ flex:1, padding:11, borderRadius:10, border:'none', background:'linear-gradient(135deg,rgba(99,102,241,1),rgba(167,139,250,1))', color:'#fff', fontSize:14, fontWeight:700, fontFamily:'inherit', cursor:'pointer', opacity:savingConfig?0.7:1 }}>
                {savingConfig ? 'Saving…' : 'Save Configuration'}
              </button>
              <button onClick={() => setShowConfig(false)} style={{ padding:'11px 20px', borderRadius:10, border:'1px solid rgba(255,255,255,0.1)', background:'transparent', color:'var(--text-muted)', fontSize:14, fontFamily:'inherit', cursor:'pointer' }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
