import React, { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '../supabaseClient';
import {
  TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Zap,
  Brain, Package, DollarSign, Users, MapPin, BarChart2,
  ArrowUp, ArrowDown, RefreshCw, Star, ShoppingCart,
  CreditCard, Truck, RotateCcw, Activity, Target, Shield,
  ChevronRight, Lightbulb, AlertCircle,
} from 'lucide-react';

/* ─── Colors ─── */
const C = {
  bg: '#030307', surface: '#0d0d1a', card: '#0e0e1c',
  card2: '#111122', border: '#1c1c32', border2: '#222238',
  textMain: '#eeeef8', textSub: '#9090b8', textMuted: '#6060a0',
  profit: '#10b981', loss: '#f43f5e', primary: '#22d3ee',
  purple: '#6366f1', amber: '#f59e0b', blue: '#60a5fa',
  indigo: '#818cf8', orange: '#f97316',
};

/* ─── Formatters ─── */
const fmt = n => '₹' + Math.abs(Number(n) || 0).toLocaleString('en-IN');
const fmtK = n => {
  const v = Math.abs(Number(n) || 0);
  if (v >= 1e7) return '₹' + (v / 1e7).toFixed(2) + 'Cr';
  if (v >= 1e5) return '₹' + (v / 1e5).toFixed(2) + 'L';
  if (v >= 1e3) return '₹' + (v / 1e3).toFixed(1) + 'K';
  return fmt(v);
};
const pct = n => (Number(n) >= 0 ? '+' : '') + Number(n).toFixed(1) + '%';
const pctAbs = n => Math.abs(Number(n)).toFixed(1) + '%';

/* ─── Tag Parsers ─── */
const tag = o => (o.tags || '').toLowerCase();
const isDelivered = o => { const t = tag(o); return (t.includes('delivered') && !t.includes('not delivered') && !t.includes('rto')) || t.includes('del'); };
const isRTO = o => { const t = tag(o); return t.includes('rto') || t.includes('returned') || t.includes('undelivered') || t.includes('ndr'); };
const isCanceled = o => tag(o).includes('cancel');
const isInTransit = o => { const t = tag(o); return (t.includes('transit') || t.includes('shipped') || t.includes('out for delivery')) && !isDelivered(o) && !isRTO(o); };
const isCOD = o => tag(o).includes('cod') || tag(o).includes('cash on delivery');

/* ─── Date Helpers ─── */
function getPeriodDates(period) {
  const end = new Date(); end.setHours(23, 59, 59, 999);
  const start = new Date();
  if (period === '7d') start.setDate(start.getDate() - 6);
  else if (period === '30d') start.setDate(start.getDate() - 29);
  else if (period === '90d') start.setDate(start.getDate() - 89);
  else if (period === 'month') { start.setDate(1); start.setHours(0, 0, 0, 0); }
  else start.setDate(start.getDate() - 29);
  start.setHours(0, 0, 0, 0);
  return { start: start.toISOString(), end: end.toISOString(), days: Math.ceil((end - start) / 86400000) };
}
function getPrevDates(period) {
  const curr = getPeriodDates(period);
  const days = curr.days;
  const prevEnd = new Date(curr.start); prevEnd.setDate(prevEnd.getDate() - 1); prevEnd.setHours(23, 59, 59, 999);
  const prevStart = new Date(prevEnd); prevStart.setDate(prevStart.getDate() - days + 1); prevStart.setHours(0, 0, 0, 0);
  return { start: prevStart.toISOString(), end: prevEnd.toISOString() };
}
function getStateName(o) {
  try {
    const addr = o.shipping_address;
    if (!addr) return null;
    const a = typeof addr === 'string' ? JSON.parse(addr) : addr;
    return a.province || a.province_code || a.state || null;
  } catch { return null; }
}
function getDailyBuckets(orders, days) {
  const buckets = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split('T')[0];
    const dayOrders = orders.filter(o => o.created_at && o.created_at.startsWith(key));
    buckets.push({ date: key, revenue: dayOrders.reduce((s, o) => s + parseFloat(o.total_price || 0), 0), orders: dayOrders.length });
  }
  return buckets;
}

/* ─── Metric Engine ─── */
function computeMetrics(currOrders, prevOrders, adRows, prevAdRows, dashFeatures) {
  const df = dashFeatures || {};
  const cogsRate    = (df.biz_cogs_pct   ?? 43) / 100;
  const shipPer     = df.biz_shipping_per ?? 150;
  const rtoCostPer  = df.biz_rto_cost    ?? 600;
  const payGatePct  = 0.018;

  const calc = (orders, adSpend) => {
    const revenue   = orders.reduce((s, o) => s + parseFloat(o.total_price || 0), 0);
    const n         = orders.length;
    const rtoList   = orders.filter(isRTO);
    const delList   = orders.filter(isDelivered);
    const codList   = orders.filter(isCOD);
    const cancelList= orders.filter(isCanceled);
    const cogs      = revenue * cogsRate;
    const shipping  = n * shipPer;
    const rtoLoss   = rtoList.length * rtoCostPer;
    const payFees   = revenue * ((n - codList.length) / Math.max(n, 1)) * payGatePct;
    const netProfit = revenue - cogs - adSpend - shipping - rtoLoss - payFees;
    return { revenue, orders: n, rtoCount: rtoList.length, delivCount: delList.length,
             codCount: codList.length, cancelCount: cancelList.length,
             cogs, shipping, rtoLoss, payFees, adSpend, netProfit };
  };

  const adSpend     = adRows.reduce((s, a) => s + parseFloat(a.amount || 0), 0);
  const prevAdSpend = prevAdRows.reduce((s, a) => s + parseFloat(a.amount || 0), 0);
  const c  = calc(currOrders, adSpend);
  const p  = calc(prevOrders, prevAdSpend);

  const growth = (curr, prev) => prev ? ((curr - prev) / Math.abs(prev)) * 100 : 0;
  const rtoRate = c.orders ? (c.rtoCount / c.orders) * 100 : 0;
  const delRate = c.orders ? (c.delivCount / c.orders) * 100 : 0;
  const mer     = adSpend ? c.revenue / adSpend : 0;
  const cac     = (c.orders - c.codCount) ? adSpend / (c.orders - c.codCount) : 0;
  const aov     = c.orders ? c.revenue / c.orders : 0;

  // Health subscores
  const hs = {
    rev:  Math.min(100, Math.max(0, growth(c.revenue, p.revenue) > 10 ? 90 : growth(c.revenue, p.revenue) > 0 ? 70 : growth(c.revenue, p.revenue) > -10 ? 50 : 30)),
    prof: Math.min(100, Math.max(0, c.netProfit > 0 ? (c.netProfit / c.revenue > 0.15 ? 90 : c.netProfit / c.revenue > 0.08 ? 70 : 55) : 25)),
    rto:  Math.min(100, Math.max(0, rtoRate < 4 ? 92 : rtoRate < 7 ? 72 : rtoRate < 11 ? 50 : 28)),
    ad:   Math.min(100, Math.max(0, mer > 4 ? 92 : mer > 2.5 ? 72 : mer > 1.5 ? 52 : 30)),
    ops:  Math.min(100, Math.max(0, delRate > 82 ? 90 : delRate > 72 ? 70 : delRate > 60 ? 52 : 32)),
  };
  const healthScore = Math.round(hs.rev * 0.25 + hs.prof * 0.30 + hs.rto * 0.20 + hs.ad * 0.15 + hs.ops * 0.10);

  return {
    ...c,
    prev: p,
    revGrowth:    growth(c.revenue, p.revenue),
    profGrowth:   growth(c.netProfit, p.netProfit),
    ordGrowth:    growth(c.orders, p.orders),
    rtoGrowth:    growth(c.rtoCount, p.rtoCount),
    adGrowth:     growth(adSpend, prevAdSpend),
    rtoRate, delRate, mer, cac, aov,
    healthScore, hs,
    profitMargin: c.revenue ? (c.netProfit / c.revenue) * 100 : 0,
    waterfall: [
      { label: 'Revenue',              value: c.revenue,    type: 'start'  },
      { label: 'Ad Spend',             value: -adSpend,     type: 'cost',  color: '#f43f5e' },
      { label: 'Cost of Goods (COGS)', value: -c.cogs,      type: 'cost',  color: '#ef4444' },
      { label: 'Shipping Charges',     value: -c.shipping,  type: 'cost',  color: '#f97316' },
      { label: 'RTO Losses',           value: -c.rtoLoss,   type: 'cost',  color: '#f59e0b' },
      { label: 'Payment Gateway Fees', value: -c.payFees,   type: 'cost',  color: '#a78bfa' },
      { label: 'Money in My Pocket',   value: c.netProfit,  type: 'result' },
    ],
  };
}

/* ─── AI Brief Generator ─── */
function buildBrief(m) {
  const bullets = [];
  if (m.revGrowth > 8)  bullets.push({ icon: '📈', text: `Revenue grew ${pctAbs(m.revGrowth)} vs last period — strong momentum.` });
  else if (m.revGrowth < -8) bullets.push({ icon: '📉', text: `Revenue declined ${pctAbs(m.revGrowth)} vs last period. Review marketing and demand.` });
  else bullets.push({ icon: '➡️', text: `Revenue is relatively stable at ${fmtK(m.revenue)}.` });

  if (m.netProfit < 0)  bullets.push({ icon: '🚨', text: `Business is loss-making. Net loss of ${fmtK(Math.abs(m.netProfit))}. Immediate review needed.` });
  else if (m.profitMargin > 15) bullets.push({ icon: '💰', text: `Healthy profit margin of ${pctAbs(m.profitMargin)} — ${fmtK(m.netProfit)} in your pocket.` });
  else bullets.push({ icon: '⚠️', text: `Thin margin at ${pctAbs(m.profitMargin)}. COGS or ad costs need optimisation.` });

  if (m.rtoRate > 10)   bullets.push({ icon: '🚚', text: `High RTO rate of ${pctAbs(m.rtoRate)} — losing ${fmtK(m.rtoLoss)} in returns. Critical.` });
  else if (m.rtoRate < 4) bullets.push({ icon: '✅', text: `Excellent RTO rate of ${pctAbs(m.rtoRate)} — well below industry average of 8%.` });
  else bullets.push({ icon: '📦', text: `RTO rate at ${pctAbs(m.rtoRate)} — within acceptable range but watch Tier-3 COD orders.` });

  if (m.mer > 0 && m.mer < 2) bullets.push({ icon: '📢', text: `Low MER of ${m.mer.toFixed(2)}x — ads generating ₹${m.mer.toFixed(2)} per rupee spent. Review campaigns.` });
  else if (m.mer > 3.5) bullets.push({ icon: '🎯', text: `Strong MER of ${m.mer.toFixed(2)}x — ads are highly efficient.` });
  else if (m.mer > 0) bullets.push({ icon: '📊', text: `MER at ${m.mer.toFixed(2)}x — moderate ad efficiency. Room to optimise targeting.` });

  const actions = [];
  if (m.rtoRate > 8) actions.push({ text: 'Reduce COD availability in Tier-3 states with high RTO', impact: 'high' });
  if (m.mer > 0 && m.mer < 2) actions.push({ text: 'Pause campaigns with ROAS below 1.5x. Reallocate to top performers', impact: 'high' });
  if (m.profitMargin < 8 && m.revenue > 0) actions.push({ text: 'Renegotiate COD + shipping rates with your logistics partner', impact: 'medium' });
  if (m.cogs / m.revenue > 0.5) actions.push({ text: 'COGS is above 50% — review supplier pricing or product mix', impact: 'medium' });
  if (m.rtoRate < 5 && m.mer > 3 && m.profitMargin > 12) actions.push({ text: 'Business is healthy — scale your best ad sets 20% this week', impact: 'growth' });

  return { bullets, actions };
}

/* ─── Action Generator ─── */
function buildActions(m, products) {
  const list = [];
  if (m.rtoRate > 8) list.push({ priority: 'Critical', icon: '🚚', title: 'Cut COD RTO losses', issue: `RTO rate is ${pctAbs(m.rtoRate)} — costing ${fmtK(m.rtoLoss)}`, action: 'Disable COD for Tier-3 cities. Offer ₹30–₹50 prepaid discount via SMS.', savings: fmtK(m.rtoLoss * 0.4), impact: 'high' });
  if (m.mer > 0 && m.mer < 2) list.push({ priority: 'Urgent', icon: '📢', title: 'Fix underperforming ads', issue: `MER of ${m.mer.toFixed(2)}x means ads barely pay for themselves`, action: 'Pause campaigns below 1.5x ROAS. Duplicate top 3 ad sets and scale.', savings: fmtK(m.adSpend * 0.25), impact: 'high' });
  if (m.profitMargin < 5 && m.revenue > 0) list.push({ priority: 'Urgent', icon: '💸', title: 'Improve profit margin', issue: `Margin at ${pctAbs(m.profitMargin)} — most revenue is going to expenses`, action: 'Increase prices 5–8% on top products. Review and cut lowest-margin SKUs.', savings: fmtK(m.revenue * 0.05), impact: 'high' });
  if (m.codCount / Math.max(m.orders, 1) > 0.6) list.push({ priority: 'High', icon: '💳', title: 'Shift COD buyers to prepaid', issue: `${pctAbs((m.codCount / Math.max(m.orders, 1)) * 100)} orders on COD — higher RTO risk`, action: 'Add prepaid discount at checkout. Show trust badges + delivery guarantees.', savings: fmtK((m.codCount * 0.15) * m.aov * 0.05), impact: 'medium' });
  if (m.shipping > m.revenue * 0.15) list.push({ priority: 'Medium', icon: '📦', title: 'Reduce shipping costs', issue: `Shipping is ${pctAbs((m.shipping / m.revenue) * 100)} of revenue`, action: 'Negotiate with Shiprocket/Delhivery for volume discount. Consider surface shipping for non-urgent.', savings: fmtK(m.shipping * 0.2), impact: 'medium' });
  if (m.rtoRate < 5 && m.mer > 3 && m.profitMargin > 12) list.push({ priority: 'Growth', icon: '🚀', title: 'Scale what\'s working', issue: 'Business metrics are healthy across the board', action: 'Increase top ad set budgets 20–30%. Test new lookalike audiences from delivered buyers.', savings: '+' + fmtK(m.revenue * 0.15) + ' potential', impact: 'growth' });
  if (list.length === 0) list.push({ priority: 'Monitor', icon: '🔍', title: 'Continue monitoring', issue: 'No critical issues detected this period', action: 'Review weekly trends and watch for seasonal demand shifts.', savings: '—', impact: 'low' });
  return list;
}

/* ─── Forecast ─── */
function buildForecast(m, dailyBuckets) {
  const avgDailyRev  = dailyBuckets.length ? dailyBuckets.reduce((s, b) => s + b.revenue, 0) / dailyBuckets.length : m.revenue / 30;
  const avgDailyOrd  = dailyBuckets.length ? dailyBuckets.reduce((s, b) => s + b.orders, 0) / dailyBuckets.length : m.orders / 30;
  const growthMult   = 1 + Math.max(-0.15, Math.min(0.3, m.revGrowth / 100));
  const projRevBase  = avgDailyRev * 30 * growthMult;
  const projRevBull  = projRevBase * 1.12;
  const projRevBear  = projRevBase * 0.88;
  const projProfBase = projRevBase * (m.revenue > 0 ? m.netProfit / m.revenue : 0.1);
  const projOrdBase  = avgDailyOrd * 30 * growthMult;
  return {
    rev:  { base: projRevBase, bull: projRevBull, bear: projRevBear },
    prof: { base: projProfBase },
    ord:  { base: projOrdBase },
    confidence: m.orders > 50 ? 'High' : m.orders > 20 ? 'Medium' : 'Low',
  };
}

/* ══════════════════════════════════════════
   MICRO COMPONENTS
══════════════════════════════════════════ */

function Sparkline({ data, color = C.profit, width = 80, height = 28 }) {
  if (!data || data.length < 2) return <svg width={width} height={height} />;
  const vals = data.map(Number);
  const max  = Math.max(...vals); const min = Math.min(...vals);
  const range = max - min || 1;
  const pts   = vals.map((v, i) => `${(i / (vals.length - 1)) * width},${height - 4 - ((v - min) / range) * (height - 8)}`).join(' ');
  return (
    <svg width={width} height={height}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function TrendBadge({ value, good = 'up', small }) {
  const up = Number(value) >= 0;
  const good_v = good === 'up' ? up : !up;
  const color = good_v ? C.profit : C.loss;
  const bg    = good_v ? 'rgba(16,185,129,0.12)' : 'rgba(244,63,94,0.12)';
  const Icon  = up ? ArrowUp : ArrowDown;
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:2, background:bg, color, borderRadius:999, padding: small ? '2px 7px' : '3px 9px', fontSize: small ? 11 : 12, fontWeight:700 }}>
      <Icon size={small ? 9 : 10} strokeWidth={2.5} />{pctAbs(value)}
    </span>
  );
}

function SectionHeader({ icon: Icon, iconColor, title, sub, id }) {
  return (
    <div id={id} style={{ display:'flex', alignItems:'center', gap:14, marginBottom:24, paddingTop:4 }}>
      <div style={{ width:42, height:42, borderRadius:13, background:`${iconColor}18`, border:`1px solid ${iconColor}30`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
        <Icon size={20} color={iconColor} />
      </div>
      <div>
        <div style={{ fontFamily:'Outfit,sans-serif', fontSize:19, fontWeight:800, color:C.textMain, letterSpacing:'-0.3px' }}>{title}</div>
        {sub && <div style={{ fontSize:12, color:C.textMuted, marginTop:1 }}>{sub}</div>}
      </div>
    </div>
  );
}

function HealthGauge({ score }) {
  const r  = 78, cx = 110, cy = 110;
  const circ = 2 * Math.PI * r;
  const totalArc  = (270 / 360) * circ;
  const scoreArc  = (Math.max(0, Math.min(100, score)) / 100) * totalArc;
  const rot = 135;
  const scoreColor = score >= 75 ? C.profit : score >= 50 ? C.amber : C.loss;
  const label = score >= 80 ? 'Excellent' : score >= 65 ? 'Good' : score >= 50 ? 'Fair' : 'Needs Work';
  return (
    <div style={{ position:'relative', display:'inline-block' }}>
      <svg width={220} height={190} viewBox="0 0 220 190">
        <defs>
          <filter id="glow"><feGaussianBlur stdDeviation="3" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        </defs>
        {/* Track */}
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={12} strokeLinecap="round"
          strokeDasharray={`${totalArc} ${circ - totalArc}`} transform={`rotate(${rot},${cx},${cy})`} />
        {/* Score arc */}
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={scoreColor} strokeWidth={12} strokeLinecap="round"
          strokeDasharray={`${scoreArc} ${circ - scoreArc}`} transform={`rotate(${rot},${cx},${cy})`}
          filter="url(#glow)" style={{ transition:'stroke-dasharray 1.2s cubic-bezier(.4,0,.2,1)' }} />
        {/* Score number */}
        <text x={cx} y={cy + 6} textAnchor="middle" fill="#fff" fontSize={46} fontWeight={800} fontFamily="Outfit,sans-serif">{score}</text>
        <text x={cx} y={cy + 26} textAnchor="middle" fill={C.textMuted} fontSize={11} fontFamily="Outfit,sans-serif">out of 100</text>
        <text x={cx} y={cy - 18} textAnchor="middle" fill={scoreColor} fontSize={13} fontWeight={700} fontFamily="Outfit,sans-serif">{label}</text>
        {/* Tick marks */}
        {[0, 25, 50, 75, 100].map(v => {
          const angle = (rot + (v / 100) * 270) * Math.PI / 180;
          const x1 = cx + (r - 18) * Math.cos(angle); const y1 = cy + (r - 18) * Math.sin(angle);
          const x2 = cx + (r - 10) * Math.cos(angle); const y2 = cy + (r - 10) * Math.sin(angle);
          return <line key={v} x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(255,255,255,0.12)" strokeWidth={1.5} />;
        })}
      </svg>
    </div>
  );
}

function MiniBar({ value, max, color = C.profit, height = 6, showLabel = false, label }) {
  const pctW = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div>
      {showLabel && <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
        <span style={{ fontSize:11, color:C.textMuted }}>{label}</span>
        <span style={{ fontSize:11, color:C.textSub, fontWeight:600 }}>{pctAbs(pctW)}</span>
      </div>}
      <div style={{ height, background:'rgba(255,255,255,0.06)', borderRadius:999, overflow:'hidden' }}>
        <div style={{ width:`${pctW}%`, height:'100%', background:color, borderRadius:999, transition:'width 1s ease' }} />
      </div>
    </div>
  );
}

function KPICard({ label, value, sub, spark, trend, trendGood = 'up', color = C.primary, icon: Icon, detail }) {
  return (
    <div style={{ padding:'20px', borderRadius:16, background:C.card, border:`1px solid ${C.border}`, display:'flex', flexDirection:'column', gap:10, position:'relative', overflow:'hidden' }}>
      <div style={{ position:'absolute', top:0, left:0, right:0, height:2, background:`linear-gradient(90deg,${color}60,transparent)` }} />
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          {Icon && <div style={{ width:28, height:28, borderRadius:8, background:`${color}15`, border:`1px solid ${color}30`, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Icon size={14} color={color} />
          </div>}
          <span style={{ fontSize:11, fontWeight:700, color:C.textMuted, textTransform:'uppercase', letterSpacing:'0.8px' }}>{label}</span>
        </div>
        {spark && <Sparkline data={spark} color={color} />}
      </div>
      <div style={{ fontFamily:'Outfit,sans-serif', fontSize:28, fontWeight:800, color, letterSpacing:'-0.5px', lineHeight:1 }}>{value}</div>
      <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
        {trend !== undefined && <TrendBadge value={trend} good={trendGood} small />}
        {sub && <span style={{ fontSize:11, color:C.textMuted }}>{sub}</span>}
      </div>
      {detail && <div style={{ fontSize:11.5, color:C.textMuted, lineHeight:1.5, borderTop:`1px solid ${C.border}`, paddingTop:10, marginTop:2 }}>{detail}</div>}
    </div>
  );
}

function WaterfallChart({ items, revenue }) {
  let running = revenue;
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
      {items.map((item, i) => {
        const isStart  = item.type === 'start';
        const isResult = item.type === 'result';
        const val      = Math.abs(item.value);
        const barPct   = revenue > 0 ? (val / revenue) * 100 : 0;
        const color    = isStart ? C.primary : isResult ? (item.value >= 0 ? C.profit : C.loss) : item.color || C.loss;
        let startPct   = 0;
        if (item.type === 'cost') {
          startPct = revenue > 0 ? ((running - val) / revenue) * 100 : 0;
          running -= val;
        }
        return (
          <div key={i} style={{ display:'flex', alignItems:'center', gap:12,
            paddingTop: isResult ? 10 : 0,
            borderTop: isResult ? `1px solid ${C.border}` : 'none',
            marginTop: isResult ? 4 : 0 }}>
            <div style={{ width:180, fontSize:12, color: isResult ? C.textSub : C.textMuted, textAlign:'right', fontWeight: isResult ? 700 : 400, flexShrink:0 }}>{item.label}</div>
            <div style={{ flex:1, position:'relative', height:30 }}>
              <div style={{
                position:'absolute', height:'100%', borderRadius:6,
                left: isStart ? '0%' : item.type === 'cost' ? `${Math.max(0, startPct)}%` : '0%',
                width: isStart ? '100%' : `${Math.max(0.5, barPct)}%`,
                background: isStart ? `linear-gradient(90deg,${C.primary}35,${C.purple}20)` :
                             isResult ? (item.value >= 0 ? `linear-gradient(90deg,${C.profit}30,${C.profit}15)` : `linear-gradient(90deg,${C.loss}30,${C.loss}15)`) :
                             `${color}18`,
                border: `1px solid ${isStart ? C.primary+'50' : isResult ? (item.value >= 0 ? C.profit+'45' : C.loss+'45') : color+'35'}`,
              }} />
            </div>
            <div style={{ width:130, textAlign:'right', fontSize:13, fontWeight:700, fontFamily:'Outfit,sans-serif', flexShrink:0,
              color: isStart ? C.primary : isResult ? (item.value >= 0 ? C.profit : C.loss) : C.loss }}>
              {isStart ? '' : isResult ? (item.value >= 0 ? '+' : '−') : '−'}{fmtK(val)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function LeakageBar({ label, value, total, icon, color = C.loss }) {
  const pctW = total > 0 ? Math.min(100, (value / total) * 100) : 0;
  return (
    <div style={{ display:'flex', alignItems:'center', gap:12 }}>
      <div style={{ width:32, height:32, borderRadius:9, background:`${color}12`, border:`1px solid ${color}25`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
        <span style={{ fontSize:14 }}>{icon}</span>
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
          <span style={{ fontSize:12.5, color:C.textSub }}>{label}</span>
          <span style={{ fontSize:12.5, fontWeight:700, color }}>−{fmtK(value)}</span>
        </div>
        <div style={{ height:5, background:'rgba(255,255,255,0.05)', borderRadius:999 }}>
          <div style={{ width:`${pctW}%`, height:'100%', background:color, borderRadius:999, opacity:0.7 }} />
        </div>
      </div>
      <div style={{ fontSize:11, color:C.textMuted, flexShrink:0, minWidth:36, textAlign:'right' }}>{pctAbs(pctW)}</div>
    </div>
  );
}

function ActionCard({ item }) {
  const colorMap = { Critical:'#f43f5e', Urgent:'#f97316', High:'#f59e0b', Medium:'#22d3ee', Growth:'#10b981', Monitor:'#7878a3' };
  const bgMap    = { Critical:'rgba(244,63,94,0.08)', Urgent:'rgba(249,115,22,0.08)', High:'rgba(245,158,11,0.08)', Medium:'rgba(34,211,238,0.08)', Growth:'rgba(16,185,129,0.08)', Monitor:'rgba(120,120,163,0.05)' };
  const col = colorMap[item.priority] || C.textMuted;
  return (
    <div style={{ padding:'18px 20px', borderRadius:14, background:bgMap[item.priority] || 'rgba(255,255,255,0.03)', border:`1px solid ${col}30` }}>
      <div style={{ display:'flex', alignItems:'flex-start', gap:12 }}>
        <div style={{ fontSize:22, flexShrink:0, marginTop:1 }}>{item.icon}</div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:6, flexWrap:'wrap' }}>
            <span style={{ fontFamily:'Outfit,sans-serif', fontSize:14.5, fontWeight:700, color:C.textMain }}>{item.title}</span>
            <span style={{ fontSize:10, fontWeight:800, color:col, background:`${col}18`, border:`1px solid ${col}30`, borderRadius:999, padding:'2px 9px', textTransform:'uppercase', letterSpacing:'0.6px' }}>{item.priority}</span>
          </div>
          <div style={{ fontSize:12.5, color:C.textMuted, marginBottom:10, lineHeight:1.6 }}>{item.issue}</div>
          <div style={{ fontSize:12.5, color:C.textSub, lineHeight:1.6, background:'rgba(255,255,255,0.03)', borderRadius:8, padding:'10px 12px', borderLeft:`3px solid ${col}50` }}>
            <span style={{ color:col, fontWeight:700 }}>Action: </span>{item.action}
          </div>
        </div>
        <div style={{ textAlign:'right', flexShrink:0 }}>
          <div style={{ fontSize:10, color:C.textMuted, marginBottom:2 }}>Potential Impact</div>
          <div style={{ fontSize:14, fontWeight:800, color:col, fontFamily:'Outfit,sans-serif' }}>{item.savings}</div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════ */
export default function BusinessAnalytics({ store, refreshTrigger }) {
  const [period, setPeriod]     = useState('30d');
  const [currOrders, setCurr]   = useState([]);
  const [prevOrders, setPrev]   = useState([]);
  const [adRows, setAdRows]     = useState([]);
  const [prevAdRows, setPrevAd] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [activeSection, setActive] = useState('overview');
  const scrollRef = useRef(null);

  const SECTIONS = [
    { id:'overview',  label:'Overview' },
    { id:'health',    label:'Health Score' },
    { id:'waterfall', label:'P&L' },
    { id:'brief',     label:'AI Brief' },
    { id:'products',  label:'Products' },
    { id:'leakage',   label:'Leakage' },
    { id:'marketing', label:'Marketing' },
    { id:'rto',       label:'RTO' },
    { id:'customers', label:'Customers' },
    { id:'forecast',  label:'Forecast' },
    { id:'actions',   label:'Actions' },
  ];

  useEffect(() => {
    if (store?.id) fetchAll();
  }, [store?.id, period, refreshTrigger]);

  async function fetchAll() {
    if (!store?.id) return;
    setLoading(true);
    const curr = getPeriodDates(period);
    const prev = getPrevDates(period);
    const [r1, r2, r3, r4, r5] = await Promise.all([
      supabase.from('orders').select('total_price,tags,created_at,shipping_address').eq('store_id', store.id).gte('created_at', curr.start).lte('created_at', curr.end),
      supabase.from('orders').select('total_price,tags,created_at').eq('store_id', store.id).gte('created_at', prev.start).lte('created_at', prev.end),
      supabase.from('ad_costs').select('amount,date,platform').eq('store_id', store.id).gte('date', curr.start.split('T')[0]).lte('date', curr.end.split('T')[0]),
      supabase.from('ad_costs').select('amount,date').eq('store_id', store.id).gte('date', prev.start.split('T')[0]).lte('date', prev.end.split('T')[0]),
      supabase.from('products').select('title,price,cost_price,variants').eq('store_id', store.id).limit(50),
    ]);
    setCurr(r1.data || []);
    setPrev(r2.data || []);
    setAdRows(r3.data || []);
    setPrevAd(r4.data || []);
    setProducts(r5.data || []);
    setLoading(false);
  }

  const m = useMemo(() => computeMetrics(currOrders, prevOrders, adRows, prevAdRows, store?.dashboard_features), [currOrders, prevOrders, adRows, prevAdRows, store]);
  const brief   = useMemo(() => buildBrief(m), [m]);
  const actions = useMemo(() => buildActions(m, products), [m, products]);
  const forecast = useMemo(() => {
    const days = period === '7d' ? 7 : period === '30d' ? 30 : period === '90d' ? 90 : 30;
    return buildForecast(m, getDailyBuckets(currOrders, Math.min(days, 14)));
  }, [m, currOrders, period]);
  const daily = useMemo(() => getDailyBuckets(currOrders, period === '7d' ? 7 : 14), [currOrders, period]);
  const revSpark = daily.map(d => d.revenue);

  // Product enrichment
  const enrichedProducts = useMemo(() => {
    if (!products.length) return [];
    return products.map(p => {
      let price = parseFloat(p.price || 0);
      let cost  = parseFloat(p.cost_price || 0);
      if (!price && p.variants) {
        try {
          const v = typeof p.variants === 'string' ? JSON.parse(p.variants) : p.variants;
          if (Array.isArray(v) && v[0]) { price = parseFloat(v[0].price || 0); cost = parseFloat(v[0].cost || cost); }
        } catch {}
      }
      const margin = price > 0 ? ((price - cost) / price) * 100 : 0;
      return { title: p.title, price, cost, margin };
    }).sort((a, b) => b.margin - a.margin);
  }, [products]);

  // State-wise RTO
  const stateRTO = useMemo(() => {
    const map = {};
    currOrders.forEach(o => {
      const s = getStateName(o); if (!s) return;
      if (!map[s]) map[s] = { total: 0, rto: 0 };
      map[s].total++;
      if (isRTO(o)) map[s].rto++;
    });
    return Object.entries(map)
      .map(([state, d]) => ({ state, total: d.total, rto: d.rto, rate: d.total ? (d.rto / d.total) * 100 : 0 }))
      .sort((a, b) => b.rto - a.rto).slice(0, 8);
  }, [currOrders]);

  function scrollTo(id) {
    setActive(id);
    const el = document.getElementById(`biz-${id}`);
    if (el) el.scrollIntoView({ behavior:'smooth', block:'start' });
  }

  // Intersection observer for active section
  useEffect(() => {
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting) setActive(e.target.id.replace('biz-', '')); });
    }, { threshold: 0.2, rootMargin: '-60px 0px -60% 0px' });
    SECTIONS.forEach(s => { const el = document.getElementById(`biz-${s.id}`); if (el) obs.observe(el); });
    return () => obs.disconnect();
  }, [loading]);

  const periodLabels = { '7d':'Last 7 Days', '30d':'Last 30 Days', '90d':'Last 90 Days', 'month':'This Month' };
  const prevLabel = { '7d':'prior 7D', '30d':'prior 30D', '90d':'prior 90D', 'month':'last month' };

  if (!store?.id) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'60vh', color:C.textMuted, fontSize:14, flexDirection:'column', gap:12 }}>
      <BarChart2 size={40} color={C.border2} />
      <span>Connect a store to see Business Analytics</span>
    </div>
  );

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', background:C.bg, overflow:'hidden' }}>

      {/* ── Top Bar ── */}
      <div style={{ flexShrink:0, padding:'16px 28px', borderBottom:`1px solid ${C.border}`, background:C.surface, display:'flex', alignItems:'center', gap:16, flexWrap:'wrap', zIndex:10 }}>
        <div style={{ flex:1, minWidth:200 }}>
          <div style={{ fontFamily:'Outfit,sans-serif', fontSize:17, fontWeight:800, color:C.textMain, letterSpacing:'-0.3px' }}>Business Analytics</div>
          <div style={{ fontSize:11, color:C.textMuted, marginTop:1 }}>CEO Command Center · {periodLabels[period]}</div>
        </div>
        {/* Period selector */}
        <div style={{ display:'flex', gap:4, background:'rgba(255,255,255,0.04)', borderRadius:10, padding:3, border:`1px solid ${C.border}` }}>
          {[['7d','7D'],['30d','30D'],['90d','90D'],['month','Month']].map(([v,l]) => (
            <button key={v} onClick={() => setPeriod(v)} style={{ padding:'5px 12px', borderRadius:7, border:'none', cursor:'pointer', fontSize:12, fontWeight:700, fontFamily:'inherit', transition:'all 0.15s',
              background: period===v ? C.primary : 'transparent',
              color: period===v ? '#000' : C.textMuted,
            }}>{l}</button>
          ))}
        </div>
        <button onClick={fetchAll} title="Refresh" style={{ width:34, height:34, borderRadius:9, background:'rgba(255,255,255,0.04)', border:`1px solid ${C.border}`, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
          <RefreshCw size={14} color={C.textMuted} />
        </button>
      </div>

      {/* ── Section Nav ── */}
      <div style={{ flexShrink:0, overflowX:'auto', padding:'0 28px', borderBottom:`1px solid ${C.border}`, background:C.surface, display:'flex', gap:2, scrollbarWidth:'none' }}>
        {SECTIONS.map(s => (
          <button key={s.id} onClick={() => scrollTo(s.id)} style={{
            padding:'10px 14px', border:'none', cursor:'pointer', fontSize:12, fontWeight:600, fontFamily:'inherit',
            background:'transparent', whiteSpace:'nowrap', borderBottom:`2px solid ${activeSection===s.id ? C.primary : 'transparent'}`,
            color: activeSection===s.id ? C.primary : C.textMuted,
            transition:'all 0.15s',
          }}>{s.label}</button>
        ))}
      </div>

      {/* ── Scrollable Content ── */}
      <div ref={scrollRef} style={{ flex:1, overflowY:'auto', padding:'28px', display:'flex', flexDirection:'column', gap:40 }}>

        {loading ? (
          <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'50vh', flexDirection:'column', gap:16, color:C.textMuted }}>
            <div style={{ width:48, height:48, border:`3px solid ${C.border}`, borderTopColor:C.primary, borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
            <span style={{ fontSize:13 }}>Loading your business data...</span>
          </div>
        ) : (
          <>

          {/* ══ S1: EXECUTIVE OVERVIEW ══ */}
          <section id="biz-overview">
            <SectionHeader icon={BarChart2} iconColor={C.primary} title="Executive Overview" sub={`${periodLabels[period]} vs ${prevLabel[period]}`} />
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))', gap:12 }}>
              <KPICard label="Revenue" value={fmtK(m.revenue)} sub={`was ${fmtK(m.prev.revenue)} last period`} trend={m.revGrowth} spark={revSpark} color={C.primary} icon={TrendingUp}
                detail={`${m.orders} orders · AOV ${fmtK(m.aov)}`} />
              <KPICard label="Net Profit" value={fmtK(m.netProfit)} sub={`Margin: ${pctAbs(m.profitMargin)}`} trend={m.profGrowth} color={m.netProfit >= 0 ? C.profit : C.loss} icon={DollarSign}
                detail={`was ${fmtK(m.prev.netProfit)} last period`} />
              <KPICard label="Money In Pocket" value={fmtK(Math.max(0, m.netProfit))} sub="after all costs" color={C.profit} icon={CreditCard}
                detail={`COGS ${fmtK(m.cogs)} · Shipping ${fmtK(m.shipping)}`} />
              <KPICard label="Total Orders" value={m.orders.toLocaleString()} sub={`was ${m.prev.orders} last period`} trend={m.ordGrowth} color={C.blue} icon={ShoppingCart}
                detail={`Delivered ${m.delivCount} · RTO ${m.rtoCount} · Canceled ${m.cancelCount}`} />
              <KPICard label="Ad Spend" value={fmtK(m.adSpend)} sub={`MER: ${m.mer > 0 ? m.mer.toFixed(2) : '—'}x`} trend={-m.adGrowth} trendGood="down" color={C.purple} icon={Activity}
                detail={`CAC: ${m.cac > 0 ? fmtK(m.cac) : '—'} per paid order`} />
              <KPICard label="RTO Losses" value={fmtK(m.rtoLoss)} sub={`RTO rate: ${pctAbs(m.rtoRate)}`} trend={-m.rtoGrowth} trendGood="down" color={C.loss} icon={RotateCcw}
                detail={`${m.rtoCount} orders returned · Recover by reducing COD in bad zones`} />
            </div>
          </section>

          {/* ══ S2: HEALTH SCORE ══ */}
          <section id="biz-health">
            <SectionHeader icon={Activity} iconColor={C.amber} title="Business Health Score" sub="Composite score across 5 key dimensions" />
            <div style={{ display:'grid', gridTemplateColumns:'auto 1fr', gap:32, alignItems:'center', background:C.card, border:`1px solid ${C.border}`, borderRadius:20, padding:'28px 32px', flexWrap:'wrap' }}>
              <div style={{ display:'flex', flexDirection:'column', alignItems:'center' }}>
                <HealthGauge score={m.healthScore} />
                <div style={{ fontSize:12, color:C.textMuted, marginTop:-8 }}>Business Health</div>
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                {[
                  { label:'Revenue Growth', score:m.hs.rev, icon:'📈', tip:'Based on revenue change vs prior period' },
                  { label:'Profit Health',  score:m.hs.prof,icon:'💰', tip:'Profit margin and direction' },
                  { label:'RTO Performance',score:m.hs.rto, icon:'🚚', tip:`${pctAbs(m.rtoRate)} RTO rate (industry: 8%)` },
                  { label:'Ad Efficiency',  score:m.hs.ad,  icon:'📢', tip:`MER of ${m.mer > 0 ? m.mer.toFixed(2) : '—'}x` },
                  { label:'Operations',     score:m.hs.ops, icon:'⚙️', tip:`${pctAbs(m.delRate)} delivery rate` },
                ].map(item => (
                  <div key={item.label} style={{ display:'flex', alignItems:'center', gap:12 }}>
                    <span style={{ fontSize:16, width:24 }}>{item.icon}</span>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
                        <span style={{ fontSize:12.5, color:C.textSub }}>{item.label}</span>
                        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                          <span style={{ fontSize:11, color:C.textMuted }}>{item.tip}</span>
                          <span style={{ fontSize:12, fontWeight:800, color: item.score >= 70 ? C.profit : item.score >= 50 ? C.amber : C.loss, minWidth:28, textAlign:'right' }}>{item.score}</span>
                        </div>
                      </div>
                      <div style={{ height:6, background:'rgba(255,255,255,0.06)', borderRadius:999 }}>
                        <div style={{ width:`${item.score}%`, height:'100%', borderRadius:999, transition:'width 1.2s ease',
                          background: item.score >= 70 ? `linear-gradient(90deg,${C.profit},${C.profit}80)` : item.score >= 50 ? `linear-gradient(90deg,${C.amber},${C.amber}80)` : `linear-gradient(90deg,${C.loss},${C.loss}80)`,
                        }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ══ S3: REVENUE VS PROFIT WATERFALL ══ */}
          <section id="biz-waterfall">
            <SectionHeader icon={DollarSign} iconColor={C.profit} title="Revenue → Profit Breakdown" sub="See exactly where your money goes" />
            <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:20, padding:'28px 32px' }}>
              {/* Summary row */}
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:16, marginBottom:28, paddingBottom:24, borderBottom:`1px solid ${C.border}` }}>
                {[
                  { label:'Revenue',            value:m.revenue,   color:C.primary },
                  { label:'Total Costs',         value:m.adSpend+m.cogs+m.shipping+m.rtoLoss+m.payFees, color:C.loss },
                  { label:'Money In Pocket',     value:m.netProfit, color:m.netProfit >= 0 ? C.profit : C.loss },
                ].map(s => (
                  <div key={s.label} style={{ textAlign:'center' }}>
                    <div style={{ fontSize:11, color:C.textMuted, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.7px', marginBottom:6 }}>{s.label}</div>
                    <div style={{ fontFamily:'Outfit,sans-serif', fontSize:24, fontWeight:800, color:s.color }}>{fmtK(s.value)}</div>
                  </div>
                ))}
              </div>
              <WaterfallChart items={m.waterfall} revenue={m.revenue} />
            </div>
          </section>

          {/* ══ S4: AI BUSINESS BRIEF ══ */}
          <section id="biz-brief">
            <SectionHeader icon={Brain} iconColor={C.indigo} title="AI Business Brief" sub="What happened, why it happened, what to do" />
            <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:20, padding:'28px 32px' }}>
              <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:20 }}>
                <div style={{ width:40, height:40, borderRadius:12, background:'linear-gradient(135deg,rgba(99,102,241,0.3),rgba(34,211,238,0.2))', border:`1px solid ${C.indigo}40`, display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <Brain size={18} color={C.indigo} />
                </div>
                <div>
                  <div style={{ fontSize:14, fontWeight:700, color:C.textMain }}>Executive Briefing</div>
                  <div style={{ fontSize:11, color:C.textMuted }}>{periodLabels[period]} · Generated from your real store data</div>
                </div>
                <div style={{ marginLeft:'auto', fontSize:11, color:C.textMuted, background:'rgba(99,102,241,0.1)', border:`1px solid ${C.indigo}30`, borderRadius:999, padding:'3px 10px' }}>AI-generated</div>
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:20 }}>
                {brief.bullets.map((b, i) => (
                  <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:12, padding:'12px 14px', background:'rgba(255,255,255,0.025)', borderRadius:10, border:`1px solid ${C.border}` }}>
                    <span style={{ fontSize:18, flexShrink:0 }}>{b.icon}</span>
                    <span style={{ fontSize:13, color:C.textSub, lineHeight:1.6 }}>{b.text}</span>
                  </div>
                ))}
              </div>
              {brief.actions.length > 0 && (
                <div style={{ borderTop:`1px solid ${C.border}`, paddingTop:20 }}>
                  <div style={{ fontSize:12, fontWeight:700, color:C.textMuted, textTransform:'uppercase', letterSpacing:'0.8px', marginBottom:12 }}>Recommended Actions</div>
                  {brief.actions.map((a, i) => (
                    <div key={i} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', background:`rgba(34,211,238,0.05)`, borderRadius:9, marginBottom:6, border:`1px solid ${C.primary}20` }}>
                      <div style={{ width:20, height:20, borderRadius:6, background:`${a.impact==='high'?C.loss:a.impact==='growth'?C.profit:C.amber}20`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                        <ChevronRight size={12} color={a.impact==='high'?C.loss:a.impact==='growth'?C.profit:C.amber} />
                      </div>
                      <span style={{ fontSize:12.5, color:C.textSub, lineHeight:1.5 }}>{a.text}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* ══ S5: PRODUCT INTELLIGENCE ══ */}
          <section id="biz-products">
            <SectionHeader icon={Package} iconColor={C.blue} title="Product Intelligence" sub="Margin analysis across your catalog" />
            <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:20, overflow:'hidden' }}>
              {enrichedProducts.length === 0 ? (
                <div style={{ padding:'40px', textAlign:'center', color:C.textMuted, fontSize:13 }}>
                  <Package size={32} color={C.border2} style={{ marginBottom:12 }} />
                  <div>No products found. Make sure your catalog is synced.</div>
                  <div style={{ fontSize:11, marginTop:6, color:C.textDim }}>Products sync automatically after Shopify connection.</div>
                </div>
              ) : (
                <>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 100px 100px 100px 90px', gap:0, padding:'12px 24px', borderBottom:`1px solid ${C.border}`, background:'rgba(255,255,255,0.02)' }}>
                    {['Product','Price','Cost','Margin','Status'].map(h => (
                      <div key={h} style={{ fontSize:10, fontWeight:800, color:C.textMuted, textTransform:'uppercase', letterSpacing:'0.7px', textAlign:h!=='Product'?'center':undefined }}>{h}</div>
                    ))}
                  </div>
                  {enrichedProducts.map((p, i) => {
                    const tag = p.margin > 50 ? { label:'Top Performer', color:C.profit } : p.margin > 30 ? { label:'Healthy', color:C.blue } : p.margin > 15 ? { label:'Review', color:C.amber } : { label:'Loss Risk', color:C.loss };
                    return (
                      <div key={i} style={{ display:'grid', gridTemplateColumns:'1fr 100px 100px 100px 90px', gap:0, padding:'14px 24px', borderBottom:`1px solid ${C.border}`, alignItems:'center',
                        background: i === 0 ? 'rgba(16,185,129,0.04)' : 'transparent' }}>
                        <div>
                          <div style={{ fontSize:13, color:C.textMain, fontWeight:500 }}>{p.title}</div>
                          {i === 0 && <div style={{ fontSize:10, color:C.profit, marginTop:2 }}>⭐ Top margin product</div>}
                        </div>
                        <div style={{ textAlign:'center', fontSize:13, color:C.textSub }}>{p.price > 0 ? fmt(p.price) : '—'}</div>
                        <div style={{ textAlign:'center', fontSize:13, color:C.textMuted }}>{p.cost > 0 ? fmt(p.cost) : '—'}</div>
                        <div style={{ textAlign:'center' }}>
                          <span style={{ fontSize:13, fontWeight:700, color: p.margin > 30 ? C.profit : p.margin > 15 ? C.amber : C.loss }}>{p.price > 0 && p.cost > 0 ? pctAbs(p.margin) : '—'}</span>
                        </div>
                        <div style={{ textAlign:'center' }}>
                          <span style={{ fontSize:10, fontWeight:700, color:tag.color, background:`${tag.color}18`, border:`1px solid ${tag.color}30`, borderRadius:999, padding:'2px 8px' }}>{tag.label}</span>
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          </section>

          {/* ══ S6: PROFIT LEAKAGE ══ */}
          <section id="biz-leakage">
            <SectionHeader icon={AlertTriangle} iconColor={C.amber} title="Profit Leakage Center" sub="Where your money is slipping away" />
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
              <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:20, padding:'24px' }}>
                <div style={{ fontSize:12, fontWeight:700, color:C.textMuted, textTransform:'uppercase', letterSpacing:'0.7px', marginBottom:18 }}>Cost Breakdown</div>
                <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                  <LeakageBar label="Ad Spend"        value={m.adSpend}  total={m.revenue} icon="📢" color={C.purple} />
                  <LeakageBar label="Cost of Goods"   value={m.cogs}     total={m.revenue} icon="🏭" color="#ef4444" />
                  <LeakageBar label="Shipping"        value={m.shipping} total={m.revenue} icon="🚚" color={C.orange} />
                  <LeakageBar label="RTO Losses"      value={m.rtoLoss}  total={m.revenue} icon="↩️" color={C.amber} />
                  <LeakageBar label="Payment Fees"    value={m.payFees}  total={m.revenue} icon="💳" color={C.indigo} />
                </div>
              </div>
              <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:20, padding:'24px', display:'flex', flexDirection:'column', gap:16 }}>
                <div style={{ fontSize:12, fontWeight:700, color:C.textMuted, textTransform:'uppercase', letterSpacing:'0.7px' }}>Recovery Opportunity</div>
                {[
                  { label:'Reduce RTO 30%',           saving: m.rtoLoss * 0.30,  tip:'Target high-RTO states with prepaid incentives' },
                  { label:'Improve MER to 3x',        saving: m.adSpend > 0 ? Math.max(0, m.adSpend - m.revenue/3) : 0, tip:'Pause low-ROAS campaigns, scale winners' },
                  { label:'Renegotiate shipping 10%', saving: m.shipping * 0.10, tip:'Volume discounts with Delhivery/Shiprocket' },
                ].map((r, i) => (
                  <div key={i} style={{ padding:'14px 16px', background:'rgba(16,185,129,0.05)', border:`1px solid ${C.profit}25`, borderRadius:12 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:8 }}>
                      <div>
                        <div style={{ fontSize:13, color:C.textMain, fontWeight:600, marginBottom:4 }}>{r.label}</div>
                        <div style={{ fontSize:11, color:C.textMuted, lineHeight:1.5 }}>{r.tip}</div>
                      </div>
                      <div style={{ textAlign:'right', flexShrink:0 }}>
                        <div style={{ fontSize:10, color:C.textMuted }}>Savings</div>
                        <div style={{ fontSize:15, fontWeight:800, color:C.profit, fontFamily:'Outfit,sans-serif' }}>+{fmtK(r.saving)}</div>
                      </div>
                    </div>
                  </div>
                ))}
                <div style={{ marginTop:'auto', padding:'14px 16px', background:'rgba(34,211,238,0.06)', border:`1px solid ${C.primary}30`, borderRadius:12 }}>
                  <div style={{ fontSize:11, color:C.textMuted, marginBottom:4 }}>Total Recoverable</div>
                  <div style={{ fontFamily:'Outfit,sans-serif', fontSize:22, fontWeight:800, color:C.primary }}>
                    +{fmtK(m.rtoLoss * 0.30 + (m.adSpend > 0 ? Math.max(0, m.adSpend - m.revenue/3) : 0) + m.shipping * 0.10)}
                  </div>
                  <div style={{ fontSize:11, color:C.textMuted, marginTop:2 }}>if all three actions taken</div>
                </div>
              </div>
            </div>
          </section>

          {/* ══ S7: MARKETING INTELLIGENCE ══ */}
          <section id="biz-marketing">
            <SectionHeader icon={Zap} iconColor={C.purple} title="Marketing Intelligence" sub="Ad efficiency and channel performance" />
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
              {/* Key metrics */}
              <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:20, padding:'24px', display:'flex', flexDirection:'column', gap:20 }}>
                <div style={{ fontSize:12, fontWeight:700, color:C.textMuted, textTransform:'uppercase', letterSpacing:'0.7px' }}>Marketing KPIs</div>
                {[
                  { label:'Marketing Efficiency Ratio (MER)', value: m.mer > 0 ? m.mer.toFixed(2) + 'x' : '—', good: m.mer >= 2.5, tip:'Revenue ÷ Ad Spend (target: 3x+)' },
                  { label:'Customer Acquisition Cost (CAC)',   value: m.cac > 0 ? fmtK(m.cac) : '—',          good: m.cac > 0 && m.cac < m.aov * 0.3, tip:'Ad Spend ÷ Paid Orders' },
                  { label:'Average Order Value (AOV)',         value: fmtK(m.aov),                              good: true, tip:'Revenue ÷ Total Orders' },
                  { label:'Ad Spend % of Revenue',            value: m.revenue > 0 ? pctAbs((m.adSpend/m.revenue)*100) : '—', good: m.adSpend/m.revenue < 0.3, tip:'Target: <25% of revenue' },
                  { label:'COD Orders',                       value: `${m.codCount} (${m.orders > 0 ? pctAbs((m.codCount/m.orders)*100) : '0%'})`, good: m.codCount/m.orders < 0.55, tip:'Higher COD = more RTO risk' },
                ].map(s => (
                  <div key={s.label} style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:12, paddingBottom:14, borderBottom:`1px solid ${C.border}` }}>
                    <div>
                      <div style={{ fontSize:12.5, color:C.textSub }}>{s.label}</div>
                      <div style={{ fontSize:11, color:C.textMuted, marginTop:2 }}>{s.tip}</div>
                    </div>
                    <span style={{ fontSize:16, fontWeight:800, color: s.good ? C.profit : C.amber, fontFamily:'Outfit,sans-serif', flexShrink:0 }}>{s.value}</span>
                  </div>
                ))}
              </div>
              {/* Channel estimate */}
              <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:20, padding:'24px' }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:18 }}>
                  <div style={{ fontSize:12, fontWeight:700, color:C.textMuted, textTransform:'uppercase', letterSpacing:'0.7px' }}>Estimated Channel Mix</div>
                  <span style={{ fontSize:10, color:C.textMuted, background:'rgba(255,255,255,0.05)', borderRadius:999, padding:'2px 8px', border:`1px solid ${C.border}` }}>estimated</span>
                </div>
                {m.adSpend > 0 ? (
                  <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                    {[
                      { channel:'Meta Ads',   pct:62, color:'#1877f2', icon:'📘' },
                      { channel:'Google Ads', pct:18, color:'#ea4335', icon:'🔴' },
                      { channel:'Organic',    pct:12, color:C.profit,  icon:'🌿' },
                      { channel:'Repeat',     pct:8,  color:C.purple,  icon:'🔄' },
                    ].map(ch => (
                      <div key={ch.channel} style={{ display:'flex', alignItems:'center', gap:12 }}>
                        <span style={{ fontSize:16, width:24 }}>{ch.icon}</span>
                        <div style={{ flex:1 }}>
                          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
                            <span style={{ fontSize:12.5, color:C.textSub }}>{ch.channel}</span>
                            <span style={{ fontSize:12, fontWeight:700, color:ch.color }}>{ch.pct}%</span>
                          </div>
                          <div style={{ height:6, background:'rgba(255,255,255,0.06)', borderRadius:999 }}>
                            <div style={{ width:`${ch.pct}%`, height:'100%', background:ch.color, borderRadius:999, opacity:0.75 }} />
                          </div>
                        </div>
                        <div style={{ fontSize:12, color:C.textMuted, minWidth:70, textAlign:'right' }}>{fmtK((m.revenue * ch.pct) / 100)}</div>
                      </div>
                    ))}
                    <div style={{ fontSize:11, color:C.textDim, marginTop:6, lineHeight:1.5 }}>Connect Meta & Google Ads API for exact channel attribution.</div>
                  </div>
                ) : (
                  <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:200, gap:12 }}>
                    <Zap size={32} color={C.border2} />
                    <div style={{ fontSize:13, color:C.textMuted, textAlign:'center' }}>No ad spend recorded.<br/>Add ad costs to see marketing metrics.</div>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* ══ S8: RTO COMMAND CENTER ══ */}
          <section id="biz-rto">
            <SectionHeader icon={RotateCcw} iconColor={C.loss} title="RTO Command Center" sub="Return-to-origin analysis and risk zones" />
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
              {/* Overview stats */}
              <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:20, padding:'24px' }}>
                <div style={{ fontSize:12, fontWeight:700, color:C.textMuted, textTransform:'uppercase', letterSpacing:'0.7px', marginBottom:18 }}>RTO Summary</div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:20 }}>
                  {[
                    { label:'RTO Rate',      value:pctAbs(m.rtoRate),           color: m.rtoRate > 8 ? C.loss : m.rtoRate > 4 ? C.amber : C.profit },
                    { label:'RTO Orders',    value:m.rtoCount,                  color:C.textMain },
                    { label:'Total Loss',    value:fmtK(m.rtoLoss),             color:C.loss },
                    { label:'Delivery Rate', value:pctAbs(m.delRate),           color: m.delRate > 80 ? C.profit : m.delRate > 65 ? C.amber : C.loss },
                  ].map(s => (
                    <div key={s.label} style={{ background:'rgba(255,255,255,0.025)', borderRadius:12, padding:'14px 16px', border:`1px solid ${C.border}` }}>
                      <div style={{ fontSize:10, color:C.textMuted, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.6px', marginBottom:6 }}>{s.label}</div>
                      <div style={{ fontSize:20, fontWeight:800, color:s.color, fontFamily:'Outfit,sans-serif' }}>{s.value}</div>
                    </div>
                  ))}
                </div>
                {/* Benchmark */}
                <div style={{ background: m.rtoRate > 8 ? 'rgba(244,63,94,0.08)' : 'rgba(16,185,129,0.06)', border:`1px solid ${m.rtoRate > 8 ? C.loss+'35' : C.profit+'35'}`, borderRadius:10, padding:'12px 14px' }}>
                  <div style={{ fontSize:12, color:C.textSub, lineHeight:1.6 }}>
                    {m.rtoRate > 10 ? `🚨 RTO is critically high (${pctAbs(m.rtoRate)}). Industry benchmark is 5–8%. You're losing ${fmtK(m.rtoLoss)} this period.`
                     : m.rtoRate > 7 ? `⚠️ RTO at ${pctAbs(m.rtoRate)} — above the 8% threshold. Focus on Tier-3 COD orders.`
                     : m.rtoRate > 0 ? `✅ RTO at ${pctAbs(m.rtoRate)} — within healthy range. Monitor Tier-3 states.`
                     : '✅ No RTO data available for this period.'}
                  </div>
                </div>
              </div>
              {/* State-wise */}
              <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:20, padding:'24px' }}>
                <div style={{ fontSize:12, fontWeight:700, color:C.textMuted, textTransform:'uppercase', letterSpacing:'0.7px', marginBottom:18 }}>State-wise RTO</div>
                {stateRTO.length === 0 ? (
                  <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:200, gap:10, color:C.textMuted, fontSize:13 }}>
                    <MapPin size={28} color={C.border2} />
                    <div style={{ textAlign:'center' }}>State data not available.<br/><span style={{ fontSize:11, color:C.textDim }}>Shipping address not stored in this period's orders.</span></div>
                  </div>
                ) : (
                  <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                    {stateRTO.map((s, i) => (
                      <div key={s.state} style={{ display:'flex', alignItems:'center', gap:10 }}>
                        <div style={{ width:22, fontSize:12, color:C.textMuted, textAlign:'center', flexShrink:0 }}>#{i+1}</div>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                            <span style={{ fontSize:12.5, color:C.textSub }}>{s.state}</span>
                            <span style={{ fontSize:12, color: s.rate > 10 ? C.loss : s.rate > 6 ? C.amber : C.profit, fontWeight:700 }}>{s.rto} RTO ({pctAbs(s.rate)})</span>
                          </div>
                          <div style={{ height:5, background:'rgba(255,255,255,0.05)', borderRadius:999 }}>
                            <div style={{ width:`${Math.min(100, s.rate * 5)}%`, height:'100%', borderRadius:999,
                              background: s.rate > 10 ? C.loss : s.rate > 6 ? C.amber : C.profit }} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* ══ S9: CUSTOMER INTELLIGENCE ══ */}
          <section id="biz-customers">
            <SectionHeader icon={Users} iconColor={C.blue} title="Customer Intelligence" sub="Order behavior and payment pattern analysis" />
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))', gap:12 }}>
              {[
                { label:'Total Orders',     value:m.orders,                    color:C.primary, sub:periodLabels[period] },
                { label:'COD Orders',       value:`${m.codCount} (${m.orders > 0 ? pctAbs((m.codCount/m.orders)*100) : '0%'})`, color: m.codCount/Math.max(m.orders,1) > 0.6 ? C.amber : C.blue, sub:'Higher RTO risk' },
                { label:'Prepaid Orders',   value:`${m.orders - m.codCount} (${m.orders > 0 ? pctAbs(((m.orders-m.codCount)/m.orders)*100) : '0%'})`, color:C.profit, sub:'Lower RTO · Better margins' },
                { label:'Avg Order Value',  value:fmtK(m.aov),                 color:C.indigo,  sub:'Revenue ÷ Orders' },
                { label:'Delivered',        value:`${m.delivCount} (${pctAbs(m.delRate)})`, color:C.profit, sub:'Successfully fulfilled' },
                { label:'Canceled Orders',  value:m.cancelCount,               color: m.cancelCount > m.orders * 0.05 ? C.amber : C.textSub, sub:'Cancellation count' },
              ].map(s => (
                <div key={s.label} style={{ padding:'18px', borderRadius:14, background:C.card, border:`1px solid ${C.border}` }}>
                  <div style={{ fontSize:10, fontWeight:700, color:C.textMuted, textTransform:'uppercase', letterSpacing:'0.7px', marginBottom:8 }}>{s.label}</div>
                  <div style={{ fontFamily:'Outfit,sans-serif', fontSize:22, fontWeight:800, color:s.color, marginBottom:4 }}>{s.value}</div>
                  <div style={{ fontSize:11, color:C.textMuted }}>{s.sub}</div>
                </div>
              ))}
            </div>
            {/* COD vs Prepaid visual */}
            <div style={{ marginTop:12, background:C.card, border:`1px solid ${C.border}`, borderRadius:20, padding:'24px' }}>
              <div style={{ fontSize:12, fontWeight:700, color:C.textMuted, textTransform:'uppercase', letterSpacing:'0.7px', marginBottom:16 }}>COD vs Prepaid Split</div>
              <div style={{ display:'flex', height:20, borderRadius:999, overflow:'hidden', gap:2 }}>
                <div style={{ flex: m.codCount, background:`${C.amber}80`, transition:'flex 0.8s ease' }} />
                <div style={{ flex: m.orders - m.codCount, background:`${C.profit}80`, transition:'flex 0.8s ease' }} />
              </div>
              <div style={{ display:'flex', gap:24, marginTop:12 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <div style={{ width:10, height:10, borderRadius:3, background:`${C.amber}80` }} />
                  <span style={{ fontSize:12, color:C.textMuted }}>COD: {m.orders > 0 ? pctAbs((m.codCount/m.orders)*100) : '0%'}</span>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <div style={{ width:10, height:10, borderRadius:3, background:`${C.profit}80` }} />
                  <span style={{ fontSize:12, color:C.textMuted }}>Prepaid: {m.orders > 0 ? pctAbs(((m.orders-m.codCount)/m.orders)*100) : '0%'}</span>
                </div>
              </div>
              {m.codCount / Math.max(m.orders, 1) > 0.6 && (
                <div style={{ marginTop:14, padding:'10px 14px', background:'rgba(245,158,11,0.08)', border:`1px solid ${C.amber}30`, borderRadius:10, fontSize:12, color:C.textSub, lineHeight:1.6 }}>
                  ⚠️ Over 60% of orders are COD. High-COD stores typically have 2–3x higher RTO rates. Consider offering a ₹30–50 prepaid discount.
                </div>
              )}
            </div>
          </section>

          {/* ══ S10: GROWTH FORECAST ══ */}
          <section id="biz-forecast">
            <SectionHeader icon={TrendingUp} iconColor={C.profit} title="Growth Forecast" sub={`Next 30-day projection based on ${period} trend · Confidence: ${forecast.confidence}`} />
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12 }}>
              {[
                { label:'Projected Revenue', base:forecast.rev.base, bull:forecast.rev.bull, bear:forecast.rev.bear, color:C.primary, icon:'📈' },
                { label:'Projected Profit',  base:forecast.prof.base, bull:forecast.prof.base*1.12, bear:forecast.prof.base*0.85, color: forecast.prof.base >= 0 ? C.profit : C.loss, icon:'💰' },
                { label:'Projected Orders',  base:forecast.ord.base, bull:forecast.ord.base*1.12, bear:forecast.ord.base*0.88, color:C.blue, icon:'📦', isCount:true },
              ].map(f => (
                <div key={f.label} style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:18, padding:'24px' }}>
                  <div style={{ fontSize:11, color:C.textMuted, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.7px', marginBottom:10 }}>{f.label}</div>
                  <div style={{ fontFamily:'Outfit,sans-serif', fontSize:28, fontWeight:800, color:f.color, marginBottom:14 }}>
                    {f.isCount ? Math.round(f.base).toLocaleString() : fmtK(f.base)}
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', fontSize:11 }}>
                      <span style={{ color:C.profit }}>▲ Bull</span>
                      <span style={{ color:C.profit, fontWeight:700 }}>{f.isCount ? Math.round(f.bull).toLocaleString() : fmtK(f.bull)}</span>
                    </div>
                    <div style={{ display:'flex', justifyContent:'space-between', fontSize:11 }}>
                      <span style={{ color:C.loss }}>▼ Bear</span>
                      <span style={{ color:C.loss, fontWeight:700 }}>{f.isCount ? Math.round(f.bear).toLocaleString() : fmtK(f.bear)}</span>
                    </div>
                  </div>
                  <div style={{ fontSize:10, color:C.textMuted, marginTop:12, paddingTop:10, borderTop:`1px solid ${C.border}`, lineHeight:1.5 }}>
                    Confidence: <span style={{ color:forecast.confidence==='High'?C.profit:forecast.confidence==='Medium'?C.amber:C.loss, fontWeight:700 }}>{forecast.confidence}</span>
                    {forecast.confidence === 'Low' && ' — more orders needed for accuracy'}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ marginTop:12, padding:'14px 18px', background:'rgba(255,255,255,0.02)', border:`1px solid ${C.border}`, borderRadius:12, fontSize:11.5, color:C.textMuted, lineHeight:1.7 }}>
              <strong style={{ color:C.textSub }}>How this is calculated:</strong> Projections are based on your daily average revenue trend over the selected period, adjusted for detected growth rate ({pct(m.revGrowth)}). Bull case adds 12%, bear case reduces 12% from base projection. For high-confidence forecasts, you need 50+ orders in the period.
            </div>
          </section>

          {/* ══ S11: ACTION CENTER ══ */}
          <section id="biz-actions">
            <SectionHeader icon={Target} iconColor={C.profit} title="Action Center" sub="Prioritized recommendations to improve your business" />
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              {actions.map((a, i) => <ActionCard key={i} item={a} />)}
            </div>
            <div style={{ marginTop:12, padding:'16px 20px', background:'rgba(34,211,238,0.04)', border:`1px solid ${C.primary}25`, borderRadius:14, display:'flex', alignItems:'center', gap:12 }}>
              <Lightbulb size={18} color={C.primary} style={{ flexShrink:0 }} />
              <span style={{ fontSize:12.5, color:C.textMuted, lineHeight:1.6 }}>
                Actions are generated from your real store data. High-priority items were flagged based on industry benchmarks for D2C brands in India.
              </span>
            </div>
          </section>

          <div style={{ height:40 }} />
          </>
        )}
      </div>
    </div>
  );
}
