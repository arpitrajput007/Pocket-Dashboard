import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import {
  isOrderDelivered, isOrderFulfilled, isOrderPrepaidRevenue,
  calcPL, extractPackSize, loadCostHistory, getShipment,
} from '../utils/dashboardUtils';
import { dashboardCache } from '../utils/dashboardCache';

ChartJS.register(ArcElement, Tooltip, Legend);

// ── Design tokens ─────────────────────────────────────────────────────────────
const C = {
  bg: '#07071a',
  card: 'rgba(255,255,255,0.03)',
  cardHover: 'rgba(255,255,255,0.05)',
  border: 'rgba(255,255,255,0.07)',
  borderBright: 'rgba(255,255,255,0.12)',
  text: '#f1f5f9',
  muted: 'rgba(255,255,255,0.45)',
  subtle: 'rgba(255,255,255,0.25)',
  profit: '#22c55e',
  loss: '#ef4444',
  revenue: '#a78bfa',
  product: '#60a5fa',
  shipping: '#22d3ee',
  ads: '#f472b6',
  cod: '#fbbf24',
  rto: '#fb923c',
  refund: '#f87171',
  gateway: '#a78bfa',
  shopify: '#2dd4bf',
  manual: '#a3e635',
};

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const FULL_MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const YEARS = ['2024','2025','2026'];
const EXPENSE_CATEGORIES = ['team','software','packaging','warehouse','agency','other'];
const API_URL = import.meta.env.VITE_API_URL || '';

const fmt = (n) => '₹' + Math.round(n || 0).toLocaleString('en-IN');
const fmtPct = (n) => `${Number(n || 0).toFixed(1)}%`;

// ── P&L computation ───────────────────────────────────────────────────────────
function computePL(orders, shipmentsMap, adSpend, pricing, costConfig, expenses) {
  const cfg = costConfig || {};
  const active = orders.filter(o => !o.cancelled_at);

  const grossRevenue = active.reduce((s, o) => s + parseFloat(o.total_price || 0), 0);
  const refundAmount = active
    .filter(o => (o.financial_status || '').toLowerCase() === 'refunded')
    .reduce((s, o) => s + parseFloat(o.total_price || 0), 0);
  const netRevenue = grossRevenue - refundAmount;

  const codOrders  = active.filter(o => !isOrderPrepaidRevenue(o));
  const prepaidOrders = active.filter(o => isOrderPrepaidRevenue(o));
  const codCount   = codOrders.length;
  const prepaidRevenue = prepaidOrders.reduce((s, o) => s + parseFloat(o.total_price || 0), 0);

  const rtoOrders = active.filter(o => getShipment(shipmentsMap, o.name)?.status === 'rto');
  const rtoCount  = rtoOrders.length;

  // Build items array for calcPL product/shipping cost calculation
  const deliveredOrders = active.filter(o => isOrderDelivered(o, shipmentsMap));
  const fulfilledOrders = active.filter(o => isOrderFulfilled(o, shipmentsMap));
  const deliveredRevenue = deliveredOrders.reduce((s, o) => s + parseFloat(o.total_price || 0), 0);
  const items = [];
  active.forEach(o => {
    const isDel = isOrderDelivered(o, shipmentsMap);
    const isFul = isOrderFulfilled(o, shipmentsMap);
    const orderDate = (o.created_at || '').slice(0, 10);
    (o.line_items || []).forEach(li => {
      const ps = extractPackSize ? extractPackSize(li, pricing) : 1;
      items.push({ sku: li.sku, title: li.title, quantity: li.quantity || 1, isDelivered: isDel, isFulfilled: isFul, orderDate, packSize: ps });
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

// ── Animated number ───────────────────────────────────────────────────────────
function AnimatedNumber({ value, prefix = '₹', duration = 900 }) {
  const [display, setDisplay] = useState(value);
  const prev = useRef(value);
  useEffect(() => {
    const from = prev.current;
    const to   = value;
    prev.current = to;
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
  return <>{prefix}{display.toLocaleString('en-IN')}</>;
}

// ── Sub-components ────────────────────────────────────────────────────────────
function CostRow({ label, amount, color, pct, extra }) {
  const barWidth = Math.min(Math.max(pct || 0, 0), 100);
  return (
    <div style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 0', borderBottom:`1px solid ${C.border}` }}>
      <div style={{ width:10, height:10, borderRadius:'50%', background:color, flexShrink:0 }} />
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
          <span style={{ fontSize:13, color:C.text, fontWeight:500 }}>{label}</span>
          {extra && <span style={{ fontSize:11, color:C.muted, fontWeight:400 }}>{extra}</span>}
        </div>
        <div style={{ height:3, borderRadius:99, background:'rgba(255,255,255,0.06)' }}>
          <div style={{ height:'100%', width:`${barWidth}%`, borderRadius:99, background:color, transition:'width 0.6s ease' }} />
        </div>
      </div>
      <span style={{ fontSize:13, fontWeight:600, color:C.text, fontVariantNumeric:'tabular-nums', flexShrink:0 }}>{fmt(amount)}</span>
    </div>
  );
}

function StatChip({ label, value, color }) {
  return (
    <div style={{ background:'rgba(255,255,255,0.04)', border:`1px solid ${C.border}`, borderRadius:12, padding:'12px 16px', minWidth:0 }}>
      <div style={{ fontSize:11, color:C.muted, fontWeight:600, letterSpacing:'0.06em', textTransform:'uppercase', marginBottom:4 }}>{label}</div>
      <div style={{ fontSize:18, fontWeight:700, color: color || C.text, fontVariantNumeric:'tabular-nums' }}>{value}</div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function MoneyInMyPocket({ store, refreshTrigger }) {
  const now = new Date();
  const [selMonth, setSelMonth] = useState(now.getMonth() + 1);
  const [selYear,  setSelYear]  = useState(now.getFullYear());

  // Core data
  const [orders,     setOrders]     = useState([]);
  const [prevOrders, setPrevOrders] = useState([]);
  const [shipmentsMap, setShipmentsMap] = useState({});
  const [adSpend,    setAdSpend]    = useState(0);
  const [prevAdSpend, setPrevAdSpend] = useState(0);
  const [pricing,    setPricing]    = useState({});
  const [costConfig, setCostConfig] = useState({ shopify_monthly:0, cod_charge_per_order:29, gateway_pct:2, rto_cost_per_order:135 });
  const [expenses,   setExpenses]   = useState([]);

  // UI
  const [loading,          setLoading]          = useState(true);
  const [insights,         setInsights]          = useState([]);
  const [insightsLoading,  setInsightsLoading]   = useState(false);
  const [showConfig,       setShowConfig]        = useState(false);
  const [configDraft,      setConfigDraft]       = useState({});
  const [addForm,          setAddForm]           = useState(null);
  const [savingConfig,     setSavingConfig]      = useState(false);
  const [addingExpense,    setAddingExpense]      = useState(false);

  // Derived month strings
  const monthStr  = `${selYear}-${String(selMonth).padStart(2,'0')}`;
  const startStr  = `${monthStr}-01T00:00:00`;
  const lastDay   = new Date(selYear, selMonth, 0).getDate();
  const endStr    = `${monthStr}-${String(lastDay).padStart(2,'0')}T23:59:59`;

  const prevMonthDate = new Date(selYear, selMonth - 2, 1);
  const prevMonthStr  = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth()+1).padStart(2,'0')}`;
  const prevStartStr  = `${prevMonthStr}-01T00:00:00`;
  const prevLastDay   = new Date(prevMonthDate.getFullYear(), prevMonthDate.getMonth()+1, 0).getDate();
  const prevEndStr    = `${prevMonthStr}-${String(prevLastDay).padStart(2,'0')}T23:59:59`;

  // ── Data fetching ──────────────────────────────────────────────────────────
  const fetchOrders = useCallback(async () => {
    if (!store?.id) return;
    const cacheKey = `pocket_orders_${store.id}_${monthStr}`;
    const cached = dashboardCache.get(cacheKey);
    if (cached) { setOrders(cached); return; }
    const { data } = await supabase.from('orders')
      .select('id, name, created_at, total_price, tags, fulfillment_status, financial_status, cancelled_at, shipping_title, line_items')
      .eq('store_id', store.id)
      .gte('created_at', startStr)
      .lte('created_at', endStr)
      .order('created_at', { ascending: true });
    setOrders(data || []);
    dashboardCache.set(cacheKey, data || []);
  }, [store?.id, monthStr]);

  const fetchPrevOrders = useCallback(async () => {
    if (!store?.id) return;
    const cacheKey = `pocket_orders_${store.id}_${prevMonthStr}`;
    const cached = dashboardCache.get(cacheKey);
    if (cached) { setPrevOrders(cached); return; }
    const { data } = await supabase.from('orders')
      .select('id, name, created_at, total_price, tags, fulfillment_status, financial_status, cancelled_at, shipping_title, line_items')
      .eq('store_id', store.id)
      .gte('created_at', prevStartStr)
      .lte('created_at', prevEndStr);
    setPrevOrders(data || []);
    dashboardCache.set(cacheKey, data || []);
  }, [store?.id, prevMonthStr]);

  const fetchShipments = useCallback(async () => {
    if (!store?.id || !store?.shiprocket_connected) return;
    const cacheKey = `pocket_shipments_${store.id}`;
    const cached = dashboardCache.get(cacheKey);
    if (cached) { setShipmentsMap(cached); return; }
    const map = {};
    const PAGE = 1000;
    for (let from = 0; ; from += PAGE) {
      const { data } = await supabase.from('shipments')
        .select('shopify_order_name, status, courier, awb')
        .eq('store_id', store.id)
        .range(from, from + PAGE - 1);
      (data || []).forEach(s => {
        if (!s.shopify_order_name) return;
        map[s.shopify_order_name] = s;
        const digits = s.shopify_order_name.replace(/\D/g, '');
        if (digits && !map[digits]) map[digits] = s;
      });
      if (!data || data.length < PAGE) break;
    }
    setShipmentsMap(map);
    dashboardCache.set(cacheKey, map, 300);
  }, [store?.id, store?.shiprocket_connected]);

  const fetchAdCosts = useCallback(async () => {
    if (!store?.id) return;
    const { data } = await supabase.from('ad_costs')
      .select('date, amount')
      .eq('store_id', store.id)
      .gte('date', `${monthStr}-01`)
      .lte('date', `${monthStr}-${String(lastDay).padStart(2,'0')}`);
    setAdSpend((data || []).reduce((s, r) => s + parseFloat(r.amount || 0), 0));

    const { data: prev } = await supabase.from('ad_costs')
      .select('date, amount')
      .eq('store_id', store.id)
      .gte('date', `${prevMonthStr}-01`)
      .lte('date', `${prevMonthStr}-${String(prevLastDay).padStart(2,'0')}`);
    setPrevAdSpend((prev || []).reduce((s, r) => s + parseFloat(r.amount || 0), 0));
  }, [store?.id, monthStr, prevMonthStr]);

  const fetchPricing = useCallback(async () => {
    if (!store?.id) return;
    const cacheKey = `pricing_${store.id}`;
    const cached = dashboardCache.get(cacheKey);
    if (cached) { setPricing(cached); return; }
    const { data } = await supabase.from('products').select('*').eq('store_id', store.id);
    if (data) {
      const history = await loadCostHistory(supabase, store.id);
      const map = {};
      data.forEach(p => {
        p._costHistory = history[p.id] || null;
        if (p.sku)   map[p.sku.trim().toLowerCase()] = p;
        if (p.title) map['TITLE:' + p.title.trim().toLowerCase()] = p;
      });
      setPricing(map);
      dashboardCache.set(cacheKey, map, 600);
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
    setLoading(true);
    setInsights([]);
    Promise.all([
      fetchOrders(),
      fetchPrevOrders(),
      fetchShipments(),
      fetchAdCosts(),
      fetchPricing(),
      fetchCostConfig(),
      fetchExpenses(),
    ]).finally(() => setLoading(false));
  }, [store?.id, selMonth, selYear, refreshTrigger]);

  // ── P&L memos ──────────────────────────────────────────────────────────────
  const plData = useMemo(
    () => computePL(orders, shipmentsMap, adSpend, pricing, costConfig, expenses),
    [orders, shipmentsMap, adSpend, pricing, costConfig, expenses]
  );

  const prevPLData = useMemo(
    () => computePL(prevOrders, shipmentsMap, prevAdSpend, pricing, costConfig, []),
    [prevOrders, shipmentsMap, prevAdSpend, pricing, costConfig]
  );

  const momChange   = plData.takeHome - prevPLData.takeHome;
  const momChangePct = prevPLData.takeHome !== 0 ? (momChange / Math.abs(prevPLData.takeHome)) * 100 : 0;
  const isProfit    = plData.takeHome >= 0;

  // ── Expense management ─────────────────────────────────────────────────────
  const addExpense = async () => {
    if (!addForm?.label || !addForm?.amount) return;
    setAddingExpense(true);
    const row = { store_id: store.id, month: monthStr, category: addForm.category || 'other', label: addForm.label, amount: parseFloat(addForm.amount) };
    const { data } = await supabase.from('monthly_expenses').insert(row).select().single();
    if (data) setExpenses(prev => [...prev, data]);
    setAddForm(null);
    setAddingExpense(false);
  };

  const deleteExpense = async (id) => {
    await supabase.from('monthly_expenses').delete().eq('id', id);
    setExpenses(prev => prev.filter(e => e.id !== id));
  };

  // ── Cost config save ───────────────────────────────────────────────────────
  const saveCostConfig = async () => {
    setSavingConfig(true);
    const row = { store_id: store.id, ...configDraft, updated_at: new Date().toISOString() };
    await supabase.from('store_cost_config').upsert(row, { onConflict: 'store_id' });
    setCostConfig(prev => ({ ...prev, ...configDraft }));
    setShowConfig(false);
    setSavingConfig(false);
  };

  // ── AI Insights ────────────────────────────────────────────────────────────
  const generateInsights = async () => {
    setInsightsLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/money-pocket-insights/${store.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month: `${FULL_MONTHS[selMonth-1]} ${selYear}`, plData, prevPlData }),
      });
      const json = await res.json();
      if (Array.isArray(json.insights)) setInsights(json.insights);
    } catch { /* silent */ }
    setInsightsLoading(false);
  };

  // ── Chart data ─────────────────────────────────────────────────────────────
  const doughnutData = useMemo(() => ({
    labels: ['Product Cost','Shipping','Ad Spend','COD Charges','RTO Losses','Gateway','Shopify','Operations'],
    datasets: [{
      data: [
        plData.productCost, plData.shippingCost, plData.adSpend,
        plData.codCharges, plData.rtoLoss, plData.gatewayFees,
        plData.shopifyFee, plData.manualTotal,
      ],
      backgroundColor: [C.product, C.shipping, C.ads, C.cod, C.rto, C.gateway, C.shopify, C.manual],
      borderColor: '#07071a',
      borderWidth: 2,
    }],
  }), [plData]);

  const doughnutOpts = {
    cutout: '70%',
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) => ` ${ctx.label}: ${fmt(ctx.raw)}`,
        },
      },
    },
  };

  // ── Styles ─────────────────────────────────────────────────────────────────
  const card = {
    background: C.card,
    border: `1px solid ${C.border}`,
    borderRadius: 16,
    padding: '20px 24px',
  };

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'60vh', color:C.muted, fontSize:14, fontFamily:'Outfit,sans-serif' }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ fontSize:32, marginBottom:12 }}>💰</div>
        <div>Calculating your take-home...</div>
      </div>
    </div>
  );

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ fontFamily:'Outfit,sans-serif', color:C.text, minHeight:'100vh', padding:'24px 20px 60px', maxWidth:900, margin:'0 auto' }}>

      {/* ── Header ── */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', flexWrap:'wrap', gap:12, marginBottom:28 }}>
        <div>
          <h1 style={{ margin:0, fontSize:22, fontWeight:800, letterSpacing:'-0.02em' }}>💰 Money In My Pocket</h1>
          <p style={{ margin:'4px 0 0', fontSize:13, color:C.muted }}>True take-home profit after every business expense</p>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
          {/* Month pills */}
          <div style={{ display:'flex', gap:4, background:'rgba(255,255,255,0.04)', borderRadius:10, padding:4 }}>
            {MONTHS.map((m, i) => (
              <button key={m} onClick={() => setSelMonth(i+1)} style={{ padding:'5px 10px', borderRadius:7, border:'none', fontFamily:'Outfit,sans-serif', fontSize:12, fontWeight:600, cursor:'pointer', transition:'all 0.15s', background: selMonth === i+1 ? 'rgba(99,102,241,0.9)' : 'transparent', color: selMonth === i+1 ? '#fff' : C.muted }}>
                {m}
              </button>
            ))}
          </div>
          {/* Year selector */}
          <select value={selYear} onChange={e => setSelYear(Number(e.target.value))} style={{ padding:'7px 10px', borderRadius:9, border:`1px solid ${C.border}`, background:'rgba(255,255,255,0.05)', color:C.text, fontSize:12, fontFamily:'Outfit,sans-serif', cursor:'pointer' }}>
            {YEARS.map(y => <option key={y} value={y} style={{ background:'#111' }}>{y}</option>)}
          </select>
          {/* Config button */}
          <button onClick={() => { setConfigDraft({ ...costConfig }); setShowConfig(true); }} style={{ padding:'7px 14px', borderRadius:9, border:`1px solid ${C.border}`, background:'rgba(255,255,255,0.04)', color:C.muted, fontSize:12, fontFamily:'Outfit,sans-serif', cursor:'pointer', display:'flex', alignItems:'center', gap:5 }}>
            ⚙️ <span>Configure</span>
          </button>
        </div>
      </div>

      {/* ── Hero card ── */}
      <div style={{ ...card, background:'linear-gradient(135deg, rgba(34,197,94,0.08) 0%, rgba(99,102,241,0.08) 100%)', border:`1px solid ${isProfit ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`, marginBottom:20, position:'relative', overflow:'hidden' }}>
        {/* Ambient glow */}
        <div style={{ position:'absolute', width:300, height:300, borderRadius:'50%', background:`radial-gradient(circle, ${isProfit ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.06)'} 0%, transparent 70%)`, top:-100, right:-80, pointerEvents:'none' }} />

        <div style={{ position:'relative', zIndex:1 }}>
          <div style={{ fontSize:12, color:C.muted, fontWeight:600, letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:8 }}>
            {FULL_MONTHS[selMonth-1]} {selYear} · Estimated Take-Home
          </div>
          <div style={{ display:'flex', alignItems:'flex-end', gap:16, flexWrap:'wrap', marginBottom:20 }}>
            <div style={{ fontSize:'clamp(36px,6vw,56px)', fontWeight:900, letterSpacing:'-0.03em', color: isProfit ? C.profit : C.loss, lineHeight:1 }}>
              <AnimatedNumber value={plData.takeHome} />
            </div>
            {/* MoM badge */}
            {prevPLData.takeHome !== 0 && (
              <div style={{ display:'flex', alignItems:'center', gap:5, padding:'5px 12px', borderRadius:99, background: momChange >= 0 ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)', border:`1px solid ${momChange >= 0 ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'}`, marginBottom:4 }}>
                <span style={{ fontSize:14 }}>{momChange >= 0 ? '▲' : '▼'}</span>
                <span style={{ fontSize:13, fontWeight:700, color: momChange >= 0 ? C.profit : C.loss }}>
                  {fmt(Math.abs(momChange))} vs last month
                </span>
              </div>
            )}
          </div>

          {/* Key metrics row */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(140px, 1fr))', gap:10 }}>
            <StatChip label="Gross Revenue"   value={fmt(plData.grossRevenue)}  color={C.revenue} />
            <StatChip label="Total Costs"     value={fmt(plData.totalCosts)}    color={C.rto} />
            <StatChip label="Profit Margin"   value={fmtPct(plData.margin)}     color={isProfit ? C.profit : C.loss} />
            <StatChip label="Total Orders"    value={plData.totalOrders}        color={C.text} />
            <StatChip label="Delivered"       value={plData.deliveredCount}     color={C.shipping} />
            <StatChip label="RTO Orders"      value={plData.rtoCount}           color={plData.rtoCount > 0 ? C.rto : C.muted} />
          </div>
        </div>
      </div>

      {/* ── P&L Breakdown + Chart ── */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr minmax(0,280px)', gap:16, marginBottom:20, alignItems:'start' }}>

        {/* Breakdown */}
        <div style={{ ...card }}>
          <h3 style={{ margin:'0 0 4px', fontSize:14, fontWeight:700 }}>P&L Breakdown</h3>
          <p style={{ margin:'0 0 16px', fontSize:12, color:C.muted }}>How your revenue flows to take-home</p>

          {/* Revenue block */}
          <div style={{ marginBottom:8 }}>
            <div style={{ fontSize:11, color:C.muted, fontWeight:700, letterSpacing:'0.07em', textTransform:'uppercase', marginBottom:4 }}>Revenue</div>
            <CostRow label="Gross Revenue"     amount={plData.grossRevenue}  color={C.revenue} pct={100} />
            {plData.refundAmount > 0 &&
              <CostRow label="Refunds & Returns" amount={plData.refundAmount} color={C.refund}  pct={plData.grossRevenue > 0 ? plData.refundAmount/plData.grossRevenue*100 : 0} />
            }
            <div style={{ display:'flex', justifyContent:'space-between', padding:'8px 0 12px', borderBottom:`1px solid ${C.borderBright}` }}>
              <span style={{ fontSize:13, fontWeight:700 }}>Net Revenue</span>
              <span style={{ fontSize:13, fontWeight:700, color:C.revenue }}>{fmt(plData.netRevenue)}</span>
            </div>
          </div>

          {/* Costs block */}
          <div style={{ marginTop:12, marginBottom:8 }}>
            <div style={{ fontSize:11, color:C.muted, fontWeight:700, letterSpacing:'0.07em', textTransform:'uppercase', marginBottom:4 }}>Operating Costs</div>
            {plData.productCost  > 0 && <CostRow label="Product Cost"         amount={plData.productCost}  color={C.product}  pct={plData.netRevenue > 0 ? plData.productCost/plData.netRevenue*100 : 0} extra="from pricing" />}
            {plData.shippingCost > 0 && <CostRow label="Shipping (estimated)"  amount={plData.shippingCost} color={C.shipping} pct={plData.netRevenue > 0 ? plData.shippingCost/plData.netRevenue*100 : 0} extra="from pricing" />}
            {plData.adSpend      > 0 && <CostRow label="Ad Spend"              amount={plData.adSpend}      color={C.ads}      pct={plData.netRevenue > 0 ? plData.adSpend/plData.netRevenue*100 : 0} extra="Meta / Google" />}
            <CostRow label="COD Charges" amount={plData.codCharges} color={C.cod} pct={plData.netRevenue > 0 ? plData.codCharges/plData.netRevenue*100 : 0} extra={`${plData.codCount} orders × ₹${costConfig.cod_charge_per_order}`} />
            {plData.rtoCount > 0 && <CostRow label="RTO Losses" amount={plData.rtoLoss} color={C.rto} pct={plData.netRevenue > 0 ? plData.rtoLoss/plData.netRevenue*100 : 0} extra={`${plData.rtoCount} returns × ₹${costConfig.rto_cost_per_order}`} />}
            <CostRow label="Payment Gateway" amount={plData.gatewayFees} color={C.gateway} pct={plData.netRevenue > 0 ? plData.gatewayFees/plData.netRevenue*100 : 0} extra={`${costConfig.gateway_pct}% of prepaid`} />
            {plData.shopifyFee > 0 && <CostRow label="Shopify Subscription" amount={plData.shopifyFee} color={C.shopify} pct={plData.netRevenue > 0 ? plData.shopifyFee/plData.netRevenue*100 : 0} extra="monthly" />}
            {plData.manualTotal > 0 && <CostRow label="Team & Operations" amount={plData.manualTotal} color={C.manual} pct={plData.netRevenue > 0 ? plData.manualTotal/plData.netRevenue*100 : 0} extra={`${expenses.length} entries`} />}

            {/* Total costs */}
            <div style={{ display:'flex', justifyContent:'space-between', padding:'8px 0 12px', borderBottom:`1px solid ${C.borderBright}` }}>
              <span style={{ fontSize:13, fontWeight:700 }}>Total Costs</span>
              <span style={{ fontSize:13, fontWeight:700, color:C.rto }}>{fmt(plData.totalCosts)}</span>
            </div>
          </div>

          {/* Take-home */}
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 16px', borderRadius:12, background: isProfit ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)', border:`1px solid ${isProfit ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`, marginTop:8 }}>
            <div>
              <div style={{ fontSize:12, fontWeight:700, color:C.muted }}>💰 MONEY IN MY POCKET</div>
              <div style={{ fontSize:11, color:C.subtle, marginTop:2 }}>{fmtPct(plData.margin)} margin</div>
            </div>
            <div style={{ fontSize:22, fontWeight:900, color: isProfit ? C.profit : C.loss, letterSpacing:'-0.02em' }}>{fmt(plData.takeHome)}</div>
          </div>
        </div>

        {/* Doughnut chart */}
        <div style={{ ...card }}>
          <h3 style={{ margin:'0 0 4px', fontSize:14, fontWeight:700 }}>Cost Breakdown</h3>
          <p style={{ margin:'0 0 16px', fontSize:12, color:C.muted }}>Where your money goes</p>
          {plData.totalCosts > 0 ? (
            <>
              <div style={{ width:'100%', maxWidth:200, margin:'0 auto 16px' }}>
                <Doughnut data={doughnutData} options={doughnutOpts} />
              </div>
              {/* Legend */}
              <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                {[
                  { label:'Product Cost',  amt: plData.productCost,  color: C.product  },
                  { label:'Shipping',      amt: plData.shippingCost, color: C.shipping },
                  { label:'Ad Spend',      amt: plData.adSpend,      color: C.ads      },
                  { label:'COD Charges',   amt: plData.codCharges,   color: C.cod      },
                  { label:'RTO Losses',    amt: plData.rtoLoss,      color: C.rto      },
                  { label:'Gateway',       amt: plData.gatewayFees,  color: C.gateway  },
                  { label:'Shopify',       amt: plData.shopifyFee,   color: C.shopify  },
                  { label:'Operations',    amt: plData.manualTotal,  color: C.manual   },
                ].filter(r => r.amt > 0).map(r => (
                  <div key={r.label} style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <div style={{ width:8, height:8, borderRadius:2, background:r.color, flexShrink:0 }} />
                    <span style={{ flex:1, fontSize:11, color:C.muted }}>{r.label}</span>
                    <span style={{ fontSize:11, fontWeight:600, color:C.text }}>{fmt(r.amt)}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div style={{ textAlign:'center', padding:'40px 0', color:C.subtle, fontSize:13 }}>No cost data yet</div>
          )}
        </div>
      </div>

      {/* ── Manual Expenses ── */}
      <div style={{ ...card, marginBottom:20 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
          <div>
            <h3 style={{ margin:'0 0 2px', fontSize:14, fontWeight:700 }}>Team & Operations</h3>
            <p style={{ margin:0, fontSize:12, color:C.muted }}>Salaries, rent, software, packaging, agency fees</p>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ fontSize:14, fontWeight:700, color:C.manual }}>{fmt(plData.manualTotal)}</span>
            <button onClick={() => setAddForm({ category:'other', label:'', amount:'' })} style={{ padding:'7px 14px', borderRadius:9, border:'none', background:'rgba(163,230,53,0.12)', color:C.manual, fontSize:12, fontWeight:600, fontFamily:'Outfit,sans-serif', cursor:'pointer' }}>
              + Add Expense
            </button>
          </div>
        </div>

        {/* Add form */}
        {addForm && (
          <div style={{ background:'rgba(255,255,255,0.04)', border:`1px solid ${C.border}`, borderRadius:12, padding:'14px 16px', marginBottom:14, display:'flex', gap:10, flexWrap:'wrap', alignItems:'flex-end' }}>
            <div style={{ flex:'1 1 160px' }}>
              <label style={{ display:'block', fontSize:11, color:C.muted, marginBottom:4, fontWeight:600 }}>LABEL</label>
              <input value={addForm.label} onChange={e => setAddForm(p => ({ ...p, label:e.target.value }))} placeholder="e.g. Salaries, Packaging" style={{ width:'100%', padding:'8px 10px', borderRadius:8, border:`1px solid ${C.border}`, background:'rgba(255,255,255,0.06)', color:C.text, fontSize:13, fontFamily:'Outfit,sans-serif', boxSizing:'border-box' }} />
            </div>
            <div style={{ flex:'0 1 130px' }}>
              <label style={{ display:'block', fontSize:11, color:C.muted, marginBottom:4, fontWeight:600 }}>AMOUNT (₹)</label>
              <input type="number" value={addForm.amount} onChange={e => setAddForm(p => ({ ...p, amount:e.target.value }))} placeholder="0" style={{ width:'100%', padding:'8px 10px', borderRadius:8, border:`1px solid ${C.border}`, background:'rgba(255,255,255,0.06)', color:C.text, fontSize:13, fontFamily:'Outfit,sans-serif', boxSizing:'border-box' }} />
            </div>
            <div style={{ flex:'0 1 130px' }}>
              <label style={{ display:'block', fontSize:11, color:C.muted, marginBottom:4, fontWeight:600 }}>CATEGORY</label>
              <select value={addForm.category} onChange={e => setAddForm(p => ({ ...p, category:e.target.value }))} style={{ width:'100%', padding:'8px 10px', borderRadius:8, border:`1px solid ${C.border}`, background:'rgba(255,255,255,0.06)', color:C.text, fontSize:13, fontFamily:'Outfit,sans-serif', boxSizing:'border-box' }}>
                {EXPENSE_CATEGORIES.map(c => <option key={c} value={c} style={{ background:'#111' }}>{c.charAt(0).toUpperCase()+c.slice(1)}</option>)}
              </select>
            </div>
            <div style={{ display:'flex', gap:6 }}>
              <button onClick={addExpense} disabled={addingExpense || !addForm.label || !addForm.amount} style={{ padding:'8px 16px', borderRadius:9, border:'none', background:'rgba(163,230,53,0.9)', color:'#07071a', fontSize:13, fontWeight:700, fontFamily:'Outfit,sans-serif', cursor:'pointer', opacity: addingExpense || !addForm.label || !addForm.amount ? 0.5 : 1 }}>
                {addingExpense ? 'Saving…' : 'Save'}
              </button>
              <button onClick={() => setAddForm(null)} style={{ padding:'8px 14px', borderRadius:9, border:`1px solid ${C.border}`, background:'transparent', color:C.muted, fontSize:13, fontFamily:'Outfit,sans-serif', cursor:'pointer' }}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Expense list */}
        {expenses.length === 0 && !addForm ? (
          <div style={{ textAlign:'center', padding:'28px 0', color:C.subtle, fontSize:13 }}>
            No expenses logged for {FULL_MONTHS[selMonth-1]} {selYear}.
            <br /><span style={{ color:C.muted }}>Click "+ Add Expense" to track team costs, subscriptions, etc.</span>
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            {expenses.map(e => (
              <div key={e.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'8px 12px', borderRadius:9, background:'rgba(255,255,255,0.03)', border:`1px solid ${C.border}` }}>
                <span style={{ width:8, height:8, borderRadius:2, background:C.manual, flexShrink:0, display:'inline-block' }} />
                <span style={{ flex:1, fontSize:13, color:C.text }}>{e.label}</span>
                <span style={{ fontSize:11, color:C.subtle, background:'rgba(255,255,255,0.05)', padding:'2px 8px', borderRadius:99 }}>{e.category}</span>
                <span style={{ fontSize:13, fontWeight:700, color:C.text, fontVariantNumeric:'tabular-nums' }}>{fmt(e.amount)}</span>
                <button onClick={() => deleteExpense(e.id)} style={{ background:'none', border:'none', color:'rgba(239,68,68,0.5)', cursor:'pointer', fontSize:14, padding:'0 4px', lineHeight:1 }}>×</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── AI Insights ── */}
      <div style={{ ...card, marginBottom:20, background:'linear-gradient(135deg, rgba(99,102,241,0.06), rgba(167,139,250,0.04))' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
          <div>
            <h3 style={{ margin:'0 0 2px', fontSize:14, fontWeight:700 }}>✨ AI Insights</h3>
            <p style={{ margin:0, fontSize:12, color:C.muted }}>Auto-generated observations from your P&L</p>
          </div>
          <button onClick={generateInsights} disabled={insightsLoading} style={{ padding:'7px 14px', borderRadius:9, border:`1px solid rgba(167,139,250,0.3)`, background:'rgba(167,139,250,0.1)', color:'rgba(167,139,250,1)', fontSize:12, fontWeight:600, fontFamily:'Outfit,sans-serif', cursor:'pointer', opacity: insightsLoading ? 0.6 : 1 }}>
            {insightsLoading ? 'Analysing…' : insights.length > 0 ? '↻ Refresh' : '✦ Generate'}
          </button>
        </div>
        {insights.length > 0 ? (
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {insights.map((ins, i) => (
              <div key={i} style={{ display:'flex', gap:12, padding:'12px 14px', borderRadius:10, background:'rgba(255,255,255,0.03)', border:`1px solid ${C.border}` }}>
                <span style={{ color:'rgba(167,139,250,0.8)', fontSize:14, marginTop:1, flexShrink:0 }}>{'◆'}</span>
                <span style={{ fontSize:13, lineHeight:1.6, color:C.text }}>{ins}</span>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign:'center', padding:'24px 0', color:C.subtle, fontSize:13 }}>
            {insightsLoading ? 'Analysing your P&L data…' : 'Click "Generate" to get AI-powered insights about your profit and losses.'}
          </div>
        )}
      </div>

      {/* ── Cost Config Modal ── */}
      {showConfig && (
        <div style={{ position:'fixed', inset:0, zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
          <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.7)', backdropFilter:'blur(8px)' }} onClick={() => setShowConfig(false)} />
          <div style={{ position:'relative', zIndex:1, background:'#0f0f1e', border:`1px solid ${C.borderBright}`, borderRadius:20, padding:'28px 28px 24px', width:'100%', maxWidth:480, boxShadow:'0 24px 80px rgba(0,0,0,0.6)' }}>
            <h3 style={{ margin:'0 0 6px', fontSize:16, fontWeight:800 }}>⚙️ Cost Configuration</h3>
            <p style={{ margin:'0 0 22px', fontSize:12, color:C.muted }}>These rates are used to automatically estimate costs. Adjust to match your actual fees.</p>

            {[
              { key:'shopify_monthly',       label:'Shopify Subscription (₹/month)',   help:'Your monthly Shopify plan cost', type:'number' },
              { key:'cod_charge_per_order',  label:'COD Charge per Order (₹)',          help:'Shiprocket or courier COD collection fee', type:'number' },
              { key:'gateway_pct',           label:'Payment Gateway Fee (%)',            help:'Razorpay / Cashfree / PhonePe % on prepaid orders', type:'number' },
              { key:'rto_cost_per_order',    label:'RTO Cost per Return (₹)',           help:'Return shipping + handling cost per RTO shipment', type:'number' },
            ].map(f => (
              <div key={f.key} style={{ marginBottom:16 }}>
                <label style={{ display:'block', fontSize:12, fontWeight:600, color:C.text, marginBottom:2 }}>{f.label}</label>
                <p style={{ margin:'0 0 6px', fontSize:11, color:C.muted }}>{f.help}</p>
                <input
                  type={f.type}
                  value={configDraft[f.key] ?? costConfig[f.key] ?? ''}
                  onChange={e => setConfigDraft(p => ({ ...p, [f.key]: parseFloat(e.target.value) || 0 }))}
                  style={{ width:'100%', padding:'9px 12px', borderRadius:9, border:`1px solid ${C.border}`, background:'rgba(255,255,255,0.05)', color:C.text, fontSize:14, fontFamily:'Outfit,sans-serif', boxSizing:'border-box' }}
                />
              </div>
            ))}

            <div style={{ display:'flex', gap:10, marginTop:20 }}>
              <button onClick={saveCostConfig} disabled={savingConfig} style={{ flex:1, padding:'11px', borderRadius:10, border:'none', background:'linear-gradient(135deg, rgba(99,102,241,1), rgba(167,139,250,1))', color:'#fff', fontSize:14, fontWeight:700, fontFamily:'Outfit,sans-serif', cursor:'pointer', opacity: savingConfig ? 0.7 : 1 }}>
                {savingConfig ? 'Saving…' : 'Save Configuration'}
              </button>
              <button onClick={() => setShowConfig(false)} style={{ padding:'11px 20px', borderRadius:10, border:`1px solid ${C.border}`, background:'transparent', color:C.muted, fontSize:14, fontFamily:'Outfit,sans-serif', cursor:'pointer' }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
