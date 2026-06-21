import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { RefreshCw } from 'lucide-react';

/* ─── Formatters ─── */
const fmt  = n => '₹' + Math.round(Math.abs(Number(n) || 0)).toLocaleString('en-IN');
const fmtK = n => {
  const v = Math.abs(Number(n) || 0);
  if (v >= 1e7) return '₹' + (v / 1e7).toFixed(2) + 'Cr';
  if (v >= 1e5) return '₹' + (v / 1e5).toFixed(2) + 'L';
  if (v >= 1e3) return '₹' + (v / 1e3).toFixed(1) + 'K';
  return fmt(v);
};
const pct    = n => (Number(n) >= 0 ? '+' : '') + Number(n).toFixed(1) + '%';
const pctAbs = n => Math.abs(Number(n)).toFixed(1) + '%';

/* ─── Tag helpers ─── */
const getTag = o => (o.tags || '').toLowerCase();
const isDelivered = o => { const t = getTag(o); return (t.includes('delivered') && !t.includes('rto') && !t.includes('not delivered')) || t.includes('del'); };
const isRTO       = o => { const t = getTag(o); return t.includes('rto') || t.includes('returned') || t.includes('undelivered') || t.includes('ndr'); };
const isCanceled  = o => getTag(o).includes('cancel');
const isCOD       = o => getTag(o).includes('cod') || getTag(o).includes('cash on delivery');

/* ─── Date helpers ─── */
function getPeriodDates(period) {
  const end = new Date(); end.setHours(23, 59, 59, 999);
  const start = new Date();
  if (period === '7d')    start.setDate(start.getDate() - 6);
  else if (period === '30d')   start.setDate(start.getDate() - 29);
  else if (period === '90d')   start.setDate(start.getDate() - 89);
  else if (period === 'month') { start.setDate(1); }
  start.setHours(0, 0, 0, 0);
  return { start: start.toISOString(), end: end.toISOString(), days: Math.ceil((end - start) / 86400000) };
}
function getPrevDates(period) {
  const curr = getPeriodDates(period);
  const prevEnd   = new Date(curr.start); prevEnd.setDate(prevEnd.getDate() - 1); prevEnd.setHours(23, 59, 59, 999);
  const prevStart = new Date(prevEnd); prevStart.setDate(prevStart.getDate() - curr.days + 1); prevStart.setHours(0, 0, 0, 0);
  return { start: prevStart.toISOString(), end: prevEnd.toISOString() };
}
function getState(o) {
  try {
    const a = typeof o.shipping_address === 'string' ? JSON.parse(o.shipping_address) : o.shipping_address;
    return a?.province || a?.province_code || a?.state || null;
  } catch { return null; }
}

/* ─── Metric engine ─── */
function computeMetrics(curr, prev, adRows, prevAdRows, df) {
  const cogsRate   = ((df?.biz_cogs_pct   ?? 43) / 100);
  const shipPer    = df?.biz_shipping_per  ?? 150;
  const rtoCostPer = df?.biz_rto_cost      ?? 600;

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
    const payFees   = revenue * ((n - codList.length) / Math.max(n, 1)) * 0.018;
    const netProfit = revenue - cogs - adSpend - shipping - rtoLoss - payFees;
    return { revenue, orders: n, rtoCount: rtoList.length, delivCount: delList.length,
             codCount: codList.length, cancelCount: cancelList.length,
             cogs, shipping, rtoLoss, payFees, adSpend, netProfit };
  };

  const adSpend     = adRows.reduce((s, a) => s + parseFloat(a.amount || 0), 0);
  const prevAdSpend = prevAdRows.reduce((s, a) => s + parseFloat(a.amount || 0), 0);
  const c = calc(curr, adSpend);
  const p = calc(prev, prevAdSpend);
  const g = (a, b) => b ? ((a - b) / Math.abs(b)) * 100 : 0;

  const rtoRate   = c.orders ? (c.rtoCount / c.orders) * 100 : 0;
  const delRate   = c.orders ? (c.delivCount / c.orders) * 100 : 0;
  const mer       = adSpend ? c.revenue / adSpend : 0;
  const cac       = (c.orders - c.codCount) > 0 ? adSpend / (c.orders - c.codCount) : 0;
  const aov       = c.orders ? c.revenue / c.orders : 0;
  const margin    = c.revenue ? (c.netProfit / c.revenue) * 100 : 0;

  const hs = {
    rev:  Math.min(100, Math.max(0, g(c.revenue, p.revenue) > 10 ? 88 : g(c.revenue, p.revenue) > 0 ? 68 : g(c.revenue, p.revenue) > -10 ? 48 : 28)),
    prof: Math.min(100, Math.max(0, c.netProfit > 0 ? (margin > 15 ? 88 : margin > 8 ? 68 : 52) : 24)),
    rto:  Math.min(100, Math.max(0, rtoRate < 4 ? 92 : rtoRate < 7 ? 72 : rtoRate < 11 ? 50 : 26)),
    ad:   Math.min(100, Math.max(0, mer > 4 ? 92 : mer > 2.5 ? 72 : mer > 1.5 ? 50 : 28)),
    ops:  Math.min(100, Math.max(0, delRate > 82 ? 88 : delRate > 72 ? 68 : delRate > 60 ? 50 : 30)),
  };
  const healthScore = Math.round(hs.rev * 0.25 + hs.prof * 0.30 + hs.rto * 0.20 + hs.ad * 0.15 + hs.ops * 0.10);

  return {
    ...c, prev: p,
    revGrowth: g(c.revenue, p.revenue), profGrowth: g(c.netProfit, p.netProfit),
    ordGrowth: g(c.orders, p.orders),   rtoGrowth: g(c.rtoCount, p.rtoCount),
    adGrowth:  g(adSpend, prevAdSpend),
    rtoRate, delRate, mer, cac, aov, margin,
    healthScore, hs,
  };
}

function buildActions(m) {
  const list = [];
  if (m.rtoRate > 8) list.push({ label: 'Critical', color: 'var(--loss-color)', title: 'High RTO Rate', detail: `RTO at ${pctAbs(m.rtoRate)} — costing ${fmtK(m.rtoLoss)} this period.`, action: 'Disable COD for Tier-3 cities. Offer ₹30–50 prepaid discount via SMS.' });
  if (m.mer > 0 && m.mer < 2) list.push({ label: 'Urgent', color: 'var(--loss-color)', title: 'Poor Ad Efficiency', detail: `MER of ${m.mer.toFixed(2)}x — spend barely pays for itself.`, action: 'Pause campaigns below 1.5x ROAS. Scale top-3 ad sets.' });
  if (m.margin < 5 && m.revenue > 0) list.push({ label: 'Urgent', color: 'var(--loss-color)', title: 'Thin Profit Margin', detail: `Margin at ${pctAbs(m.margin)} — most revenue is going to costs.`, action: 'Raise prices 5–8% on top SKUs. Cut lowest-margin products.' });
  if (m.codCount / Math.max(m.orders, 1) > 0.65) list.push({ label: 'High', color: 'var(--primary)', title: 'High COD Exposure', detail: `${pctAbs((m.codCount / Math.max(m.orders, 1)) * 100)} of orders are COD — increases RTO risk.`, action: 'Add a prepaid discount at checkout. Show delivery trust badges.' });
  if (m.shipping > m.revenue * 0.16) list.push({ label: 'Medium', color: 'var(--info-color)', title: 'Shipping Cost High', detail: `Shipping at ${pctAbs((m.shipping / m.revenue) * 100)} of revenue.`, action: 'Negotiate with logistics partner for volume rates. Explore surface shipping.' });
  if (m.rtoRate < 5 && m.mer > 3 && m.margin > 12) list.push({ label: 'Growth', color: 'var(--profit-color)', title: 'Scale What\'s Working', detail: 'Metrics are healthy — good time to push for growth.', action: 'Increase best ad set budgets 20–30%. Test new lookalike audiences.' });
  if (list.length === 0) list.push({ label: 'Healthy', color: 'var(--profit-color)', title: 'No Critical Issues', detail: 'Business metrics look good across the board.', action: 'Continue monitoring weekly trends and seasonal demand shifts.' });
  return list;
}

/* ─── Health gauge SVG ─── */
function HealthGauge({ score }) {
  const r = 70, cx = 90, cy = 90;
  const circ = 2 * Math.PI * r;
  const totalArc = (270 / 360) * circ;
  const scoreArc = (Math.max(0, Math.min(100, score)) / 100) * totalArc;
  const col = score >= 70 ? 'var(--profit-color)' : score >= 50 ? 'var(--primary)' : 'var(--loss-color)';
  const label = score >= 80 ? 'Excellent' : score >= 65 ? 'Good' : score >= 50 ? 'Fair' : 'Needs Work';
  return (
    <svg width={180} height={165} viewBox="0 0 180 165">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={10} strokeLinecap="round"
        strokeDasharray={`${totalArc} ${circ - totalArc}`} transform={`rotate(135,${cx},${cy})`} />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={col} strokeWidth={10} strokeLinecap="round"
        strokeDasharray={`${scoreArc} ${circ - scoreArc}`} transform={`rotate(135,${cx},${cy})`}
        style={{ filter: `drop-shadow(0 0 6px ${col})`, transition: 'stroke-dasharray 1s ease' }} />
      <text x={cx} y={cy + 8} textAnchor="middle" fill="white" fontSize={38} fontWeight={800} fontFamily="Outfit,sans-serif">{score}</text>
      <text x={cx} y={cy + 24} textAnchor="middle" fill="var(--text-dim)" fontSize={10} fontFamily="Inter,sans-serif">out of 100</text>
      <text x={cx} y={cy - 16} textAnchor="middle" fill={col} fontSize={12} fontWeight={700} fontFamily="Outfit,sans-serif">{label}</text>
    </svg>
  );
}

/* ─── Mini progress bar ─── */
function ScoreBar({ value, label, note }) {
  const col = value >= 70 ? 'var(--profit-color)' : value >= 50 ? 'var(--primary)' : 'var(--loss-color)';
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
        <span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>{label}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {note && <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>{note}</span>}
          <span style={{ fontSize: 12, fontWeight: 700, color: col, minWidth: 24, textAlign: 'right' }}>{value}</span>
        </div>
      </div>
      <div style={{ height: 5, background: 'rgba(255,255,255,0.06)', borderRadius: 999 }}>
        <div style={{ width: `${value}%`, height: '100%', borderRadius: 999, background: col, opacity: 0.85, transition: 'width 1s ease' }} />
      </div>
    </div>
  );
}

/* ─── Waterfall row ─── */
function WaterfallChart({ revenue, adSpend, cogs, shipping, rtoLoss, payFees, netProfit }) {
  const items = [
    { label: 'Revenue',             value: revenue,    type: 'start'  },
    { label: 'Ad Spend',            value: adSpend,    type: 'cost'   },
    { label: 'Cost of Goods',       value: cogs,       type: 'cost'   },
    { label: 'Shipping',            value: shipping,   type: 'cost'   },
    { label: 'RTO Losses',          value: rtoLoss,    type: 'cost'   },
    { label: 'Payment Fees',        value: payFees,    type: 'cost'   },
    { label: 'Money in My Pocket',  value: netProfit,  type: 'result' },
  ];
  let running = revenue;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {items.map((item, i) => {
        const val    = Math.abs(item.value);
        const barPct = revenue > 0 ? (val / revenue) * 100 : 0;
        let leftPct  = 0;
        if (item.type === 'cost') {
          leftPct = revenue > 0 ? ((running - val) / revenue) * 100 : 0;
          running -= val;
        }
        const isResult = item.type === 'result';
        const isStart  = item.type === 'start';
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12,
            paddingTop: isResult ? 10 : 0, marginTop: isResult ? 4 : 0,
            borderTop: isResult ? '1px solid var(--border)' : 'none' }}>
            <div style={{ width: 168, fontSize: 12, color: isResult ? 'var(--text-main)' : 'var(--text-muted)', textAlign: 'right',
              fontWeight: isResult ? 700 : 400, flexShrink: 0 }}>{item.label}</div>
            <div style={{ flex: 1, position: 'relative', height: 28 }}>
              <div style={{
                position: 'absolute', height: '100%', borderRadius: 5,
                left: isStart ? 0 : isResult ? 0 : `${Math.max(0, leftPct)}%`,
                width: isStart ? '100%' : `${Math.max(0.5, barPct)}%`,
                background: isResult
                  ? (item.value >= 0 ? 'rgba(16,185,129,0.18)' : 'rgba(244,63,94,0.18)')
                  : isStart
                  ? 'rgba(34,211,238,0.15)'
                  : 'rgba(244,63,94,0.12)',
                border: `1px solid ${isResult ? (item.value >= 0 ? 'rgba(16,185,129,0.35)' : 'rgba(244,63,94,0.35)') : isStart ? 'rgba(34,211,238,0.3)' : 'rgba(244,63,94,0.25)'}`,
              }} />
            </div>
            <div style={{ width: 110, textAlign: 'right', fontSize: 13, fontWeight: 700, fontFamily: 'Outfit,sans-serif', flexShrink: 0,
              color: isResult ? (item.value >= 0 ? 'var(--profit-color)' : 'var(--loss-color)') : isStart ? 'var(--primary)' : 'var(--loss-color)' }}>
              {isResult ? (item.value >= 0 ? '+' : '−') : isStart ? '' : '−'}{fmtK(val)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ─── Trend indicator ─── */
function Trend({ value, goodDir = 'up', suffix = '' }) {
  const up  = Number(value) >= 0;
  const good = goodDir === 'up' ? up : !up;
  return (
    <span style={{ fontSize: 11, fontWeight: 700, color: good ? 'var(--profit-color)' : 'var(--loss-color)' }}>
      {up ? '▲' : '▼'} {pctAbs(value)}{suffix} vs prior
    </span>
  );
}

/* ─── Bar within a card ─── */
function HBar({ value, max, color = 'var(--profit-color)' }) {
  const w = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div style={{ height: 5, background: 'rgba(255,255,255,0.06)', borderRadius: 999, marginTop: 5 }}>
      <div style={{ width: `${w}%`, height: '100%', borderRadius: 999, background: color, transition: 'width 0.8s ease' }} />
    </div>
  );
}

/* ══════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════ */
const PERIOD_LABELS = { '7d': 'Last 7 Days', '30d': 'Last 30 Days', '90d': 'Last 90 Days', 'month': 'This Month' };

export default function BusinessAnalytics({ store, refreshTrigger }) {
  const [period, setPeriod]     = useState('30d');
  const [currOrders, setCurr]   = useState([]);
  const [prevOrders, setPrev]   = useState([]);
  const [adRows, setAdRows]     = useState([]);
  const [prevAdRows, setPrevAd] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => { if (store?.id) fetchAll(); }, [store?.id, period, refreshTrigger]);

  async function fetchAll() {
    if (!store?.id) return;
    setLoading(true);
    const curr = getPeriodDates(period);
    const prev = getPrevDates(period);
    const [r1, r2, r3, r4, r5] = await Promise.all([
      supabase.from('orders').select('total_price,tags,created_at,shipping_address').eq('store_id', store.id).gte('created_at', curr.start).lte('created_at', curr.end),
      supabase.from('orders').select('total_price,tags').eq('store_id', store.id).gte('created_at', prev.start).lte('created_at', prev.end),
      supabase.from('ad_costs').select('amount,date').eq('store_id', store.id).gte('date', curr.start.split('T')[0]).lte('date', curr.end.split('T')[0]),
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
  const actions = useMemo(() => buildActions(m), [m]);

  /* Product margins */
  const enrichedProducts = useMemo(() => {
    return products.map(p => {
      let price = parseFloat(p.price || 0);
      let cost  = parseFloat(p.cost_price || 0);
      if (!price && p.variants) {
        try { const v = typeof p.variants === 'string' ? JSON.parse(p.variants) : p.variants; if (Array.isArray(v) && v[0]) { price = parseFloat(v[0].price || 0); cost = parseFloat(v[0].cost || cost); } } catch {}
      }
      const margin = price > 0 ? ((price - cost) / price) * 100 : 0;
      return { title: p.title, price, cost, margin };
    }).filter(p => p.price > 0).sort((a, b) => b.margin - a.margin);
  }, [products]);

  /* State-wise RTO */
  const stateRTO = useMemo(() => {
    const map = {};
    currOrders.forEach(o => {
      const s = getState(o); if (!s) return;
      if (!map[s]) map[s] = { total: 0, rto: 0 };
      map[s].total++;
      if (isRTO(o)) map[s].rto++;
    });
    return Object.entries(map)
      .map(([state, d]) => ({ state, total: d.total, rto: d.rto, rate: d.total ? (d.rto / d.total) * 100 : 0 }))
      .sort((a, b) => b.rto - a.rto).slice(0, 8);
  }, [currOrders]);

  /* Forecast */
  const forecast = useMemo(() => {
    const growthFactor = 1 + Math.max(-0.15, Math.min(0.3, m.revGrowth / 100));
    const avgDaily = m.orders > 0 ? m.revenue / getPeriodDates(period).days : 0;
    return {
      revenue:  avgDaily * 30 * growthFactor,
      profit:   avgDaily * 30 * growthFactor * (m.revenue > 0 ? m.netProfit / m.revenue : 0.08),
      confidence: m.orders > 50 ? 'High' : m.orders > 20 ? 'Medium' : 'Low',
    };
  }, [m, period]);

  const prevLabel = { '7d': 'prior 7D', '30d': 'prior 30D', '90d': 'prior 90D', 'month': 'last month' };

  return (
    <div className="view-content active" style={{ animation: 'fadeInUp 0.4s ease forwards' }}>

      {/* ── Controls bar ── */}
      <div className="controls-bar glass">
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 17, fontWeight: 800, fontFamily: 'Outfit', color: 'var(--text-main)', letterSpacing: '-0.4px' }}>Business Analytics</div>
          <p style={{ margin: '3px 0 0 0', color: 'var(--text-muted)', fontSize: 11.5 }}>{PERIOD_LABELS[period]} — {m.orders} orders · {fmtK(m.revenue)} revenue</p>
        </div>
        <div className="filter-chips">
          {[['7d','7D'],['30d','30D'],['90d','90D'],['month','Month']].map(([v, l]) => (
            <button key={v} className={`filter-chip${period === v ? ' active' : ''}`} onClick={() => setPeriod(v)}>{l}</button>
          ))}
        </div>
        <button className="icon-btn ghost" onClick={fetchAll} title="Refresh" style={{ width: 34, height: 34, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <RefreshCw size={14} color="var(--text-muted)" />
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300, gap: 12, color: 'var(--text-dim)' }}>
          <div className="spinner" /> Loading analytics...
        </div>
      ) : (
        <>

        {/* ── KPI Cards ── */}
        <div className="metrics-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
          <div className="metric-card glow-green clickable">
            <div className="metric-label">Revenue</div>
            <div className="metric-value text-profit">{fmtK(m.revenue)}</div>
            <div className="metric-sub">
              <Trend value={m.revGrowth} /> · was {fmtK(m.prev.revenue)}
            </div>
          </div>
          <div className={`metric-card clickable ${m.netProfit >= 0 ? 'glow-green' : 'glow-red'}`}>
            <div className="metric-label">Net Profit</div>
            <div className={`metric-value ${m.netProfit >= 0 ? 'text-profit' : 'text-loss'}`}>{fmtK(m.netProfit)}</div>
            <div className="metric-sub">
              Margin: {pctAbs(m.margin)} · <Trend value={m.profGrowth} />
            </div>
          </div>
          <div className="metric-card glow-white clickable">
            <div className="metric-label">Total Orders</div>
            <div className="metric-value">{m.orders.toLocaleString()}</div>
            <div className="metric-sub">
              <Trend value={m.ordGrowth} /> · AOV {fmtK(m.aov)}
            </div>
          </div>
          <div className={`metric-card clickable ${m.adSpend > 0 ? 'glow-purple' : 'glow-white'}`}>
            <div className="metric-label">Ad Spend</div>
            <div className="metric-value" style={{ color: 'var(--purple)' }}>{fmtK(m.adSpend)}</div>
            <div className="metric-sub">
              MER: {m.mer > 0 ? m.mer.toFixed(2) + 'x' : '—'} · CAC: {m.cac > 0 ? fmtK(m.cac) : '—'}
            </div>
          </div>
          <div className={`metric-card clickable ${m.rtoRate > 8 ? 'glow-red' : m.rtoRate > 5 ? 'glow-yellow' : 'glow-green'}`}>
            <div className="metric-label">RTO Rate</div>
            <div className={`metric-value ${m.rtoRate > 8 ? 'text-loss' : m.rtoRate > 5 ? 'text-warning' : 'text-profit'}`}>{pctAbs(m.rtoRate)}</div>
            <div className="metric-sub">
              {m.rtoCount} orders · Loss: {fmtK(m.rtoLoss)}
            </div>
          </div>
          <div className={`metric-card clickable ${m.healthScore >= 70 ? 'glow-green' : m.healthScore >= 50 ? 'glow-yellow' : 'glow-red'}`}>
            <div className="metric-label">Health Score</div>
            <div className={`metric-value ${m.healthScore >= 70 ? 'text-profit' : m.healthScore >= 50 ? 'text-warning' : 'text-loss'}`}>{m.healthScore}<span style={{ fontSize: 14, fontWeight: 500, opacity: 0.5 }}>/100</span></div>
            <div className="metric-sub">{m.healthScore >= 80 ? 'Excellent — keep it up' : m.healthScore >= 65 ? 'Good — minor improvements possible' : m.healthScore >= 50 ? 'Fair — focus on RTO & ads' : 'Needs attention across the board'}</div>
          </div>
        </div>

        {/* ── Row 1: Health + Waterfall ── */}
        <div className="main-grid" style={{ marginBottom: 20 }}>

          {/* Health Score */}
          <div className="card glass">
            <h3>Business Health Score</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
              <HealthGauge score={m.healthScore} />
              <div style={{ flex: 1 }}>
                <ScoreBar value={m.hs.rev}  label="Revenue Growth" note={`${pct(m.revGrowth)} vs prior`} />
                <ScoreBar value={m.hs.prof} label="Profit Health"   note={`${pctAbs(m.margin)} margin`} />
                <ScoreBar value={m.hs.rto}  label="RTO Performance" note={`${pctAbs(m.rtoRate)} RTO rate`} />
                <ScoreBar value={m.hs.ad}   label="Ad Efficiency"   note={m.mer > 0 ? `${m.mer.toFixed(2)}x MER` : 'No ad data'} />
                <ScoreBar value={m.hs.ops}  label="Operations"      note={`${pctAbs(m.delRate)} delivery`} />
              </div>
            </div>
          </div>

          {/* Revenue Waterfall */}
          <div className="card glass">
            <h3>Revenue → Profit Breakdown</h3>
            <div style={{ display: 'flex', gap: 20, marginBottom: 20 }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: 4 }}>Revenue</div>
                <div style={{ fontFamily: 'Outfit,sans-serif', fontSize: 20, fontWeight: 800, color: 'var(--primary)' }}>{fmtK(m.revenue)}</div>
              </div>
              <div style={{ width: 1, background: 'var(--border)' }} />
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: 4 }}>Total Costs</div>
                <div style={{ fontFamily: 'Outfit,sans-serif', fontSize: 20, fontWeight: 800, color: 'var(--loss-color)' }}>{fmtK(m.adSpend + m.cogs + m.shipping + m.rtoLoss + m.payFees)}</div>
              </div>
              <div style={{ width: 1, background: 'var(--border)' }} />
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: 4 }}>In My Pocket</div>
                <div style={{ fontFamily: 'Outfit,sans-serif', fontSize: 20, fontWeight: 800, color: m.netProfit >= 0 ? 'var(--profit-color)' : 'var(--loss-color)' }}>{fmtK(m.netProfit)}</div>
              </div>
            </div>
            <WaterfallChart revenue={m.revenue} adSpend={m.adSpend} cogs={m.cogs} shipping={m.shipping} rtoLoss={m.rtoLoss} payFees={m.payFees} netProfit={m.netProfit} />
          </div>
        </div>

        {/* ── Row 2: Profit Leakage + Marketing ── */}
        <div className="main-grid" style={{ marginBottom: 20 }}>

          {/* Profit Leakage */}
          <div className="card glass">
            <h3>Profit Leakage</h3>
            {m.revenue > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {[
                  { label: 'Ad Spend',       value: m.adSpend,  pct: m.adSpend / m.revenue * 100 },
                  { label: 'Cost of Goods',  value: m.cogs,     pct: m.cogs / m.revenue * 100 },
                  { label: 'Shipping',       value: m.shipping, pct: m.shipping / m.revenue * 100 },
                  { label: 'RTO Losses',     value: m.rtoLoss,  pct: m.rtoLoss / m.revenue * 100 },
                  { label: 'Payment Fees',   value: m.payFees,  pct: m.payFees / m.revenue * 100 },
                ].map(c => (
                  <div key={c.label}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                      <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{c.label}</span>
                      <div>
                        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--loss-color)', marginRight: 8 }}>−{fmtK(c.value)}</span>
                        <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>{pctAbs(c.pct)}</span>
                      </div>
                    </div>
                    <HBar value={c.pct} max={60} color={c.pct > 30 ? 'var(--loss-color)' : c.pct > 15 ? 'var(--primary)' : 'rgba(255,255,255,0.2)'} />
                  </div>
                ))}
                <div style={{ marginTop: 4, padding: '12px 14px', background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 10 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 3 }}>Estimated Recoverable</div>
                  <div style={{ fontFamily: 'Outfit,sans-serif', fontSize: 18, fontWeight: 800, color: 'var(--profit-color)' }}>
                    +{fmtK(m.rtoLoss * 0.3 + Math.max(0, m.adSpend - m.revenue / 3) + m.shipping * 0.1)}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>if key actions taken this month</div>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '30px 0' }}>No revenue data for this period.</div>
            )}
          </div>

          {/* Marketing */}
          <div className="card glass">
            <h3>Marketing Efficiency</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {[
                { label: 'Marketing Efficiency Ratio (MER)', value: m.mer > 0 ? m.mer.toFixed(2) + 'x' : '—',    good: m.mer >= 2.5,  tip: 'Revenue ÷ Ad Spend · Target: 3x+' },
                { label: 'Customer Acquisition Cost (CAC)',  value: m.cac > 0 ? fmtK(m.cac) : '—',              good: m.cac < m.aov * 0.3, tip: 'Ad Spend ÷ Paid Orders' },
                { label: 'Average Order Value (AOV)',        value: fmtK(m.aov),                                  good: true, tip: 'Revenue ÷ Total Orders' },
                { label: 'Ad Spend as % of Revenue',        value: m.revenue > 0 ? pctAbs(m.adSpend / m.revenue * 100) : '—', good: m.adSpend / m.revenue < 0.28, tip: 'Target: below 25%' },
                { label: 'COD Order Share',                 value: m.orders > 0 ? pctAbs(m.codCount / m.orders * 100) : '—', good: m.codCount / Math.max(m.orders,1) < 0.6, tip: 'Higher COD = more RTO risk' },
                { label: 'Delivery Rate',                   value: pctAbs(m.delRate),                             good: m.delRate > 75, tip: 'Delivered ÷ Total Orders' },
              ].map((row, i, arr) => (
                <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none' }}>
                  <div>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{row.label}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>{row.tip}</div>
                  </div>
                  <span style={{ fontFamily: 'Outfit,sans-serif', fontSize: 17, fontWeight: 800, color: row.good ? 'var(--profit-color)' : 'var(--loss-color)' }}>{row.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Row 3: RTO + Products ── */}
        <div className="main-grid" style={{ marginBottom: 20 }}>

          {/* RTO */}
          <div className="card glass">
            <h3>RTO Summary</h3>
            <div className="tags-grid" style={{ marginBottom: 18 }}>
              <div className="tag-item tag-delivered">
                <div className="tag-count" style={{ fontSize: 22 }}>{pctAbs(m.rtoRate)}</div>
                <div className="tag-name">RTO Rate</div>
              </div>
              <div className="tag-item">
                <div className="tag-count tag-canceled" style={{ fontSize: 22, color: 'var(--loss-color)' }}>{m.rtoCount}</div>
                <div className="tag-name">RTO Orders</div>
              </div>
              <div className="tag-item">
                <div className="tag-count" style={{ fontSize: 22, color: 'var(--profit-color)' }}>{pctAbs(m.delRate)}</div>
                <div className="tag-name">Delivered</div>
              </div>
            </div>

            <div style={{ padding: '10px 14px', borderRadius: 10, marginBottom: 16,
              background: m.rtoRate > 8 ? 'rgba(244,63,94,0.07)' : 'rgba(16,185,129,0.07)',
              border: `1px solid ${m.rtoRate > 8 ? 'rgba(244,63,94,0.25)' : 'rgba(16,185,129,0.2)'}` }}>
              <div style={{ fontSize: 12.5, color: 'var(--text-muted)', lineHeight: 1.6 }}>
                {m.rtoRate > 10 ? `RTO is critically high at ${pctAbs(m.rtoRate)}. Industry benchmark is 5–8%. You're losing ${fmtK(m.rtoLoss)} this period.`
                 : m.rtoRate > 7 ? `RTO at ${pctAbs(m.rtoRate)} — above the 8% threshold. Focus on Tier-3 COD orders.`
                 : m.rtoRate > 0 ? `RTO at ${pctAbs(m.rtoRate)} — healthy range. Monitor Tier-3 states.`
                 : 'No RTO data available for this period.'}
              </div>
            </div>

            {stateRTO.length > 0 && (
              <>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 10 }}>State-wise RTO</div>
                {stateRTO.slice(0, 5).map((s, i) => (
                  <div key={s.state} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <div style={{ width: 18, fontSize: 11, color: 'var(--text-dim)', textAlign: 'center' }}>#{i+1}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{s.state}</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: s.rate > 10 ? 'var(--loss-color)' : s.rate > 6 ? 'var(--primary)' : 'var(--profit-color)' }}>{s.rto} ({pctAbs(s.rate)})</span>
                      </div>
                      <HBar value={s.rate} max={25} color={s.rate > 10 ? 'var(--loss-color)' : s.rate > 6 ? 'var(--primary)' : 'var(--profit-color)'} />
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>

          {/* Products */}
          <div className="card glass">
            <h3>Product Margins</h3>
            {enrichedProducts.length > 0 ? (
              <table>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th style={{ textAlign: 'right' }}>Price</th>
                    <th style={{ textAlign: 'right' }}>Cost</th>
                    <th style={{ textAlign: 'right' }}>Margin</th>
                  </tr>
                </thead>
                <tbody>
                  {enrichedProducts.slice(0, 8).map((p, i) => {
                    const col = p.margin > 40 ? 'var(--profit-color)' : p.margin > 20 ? 'var(--primary)' : p.margin > 0 ? 'var(--text-muted)' : 'var(--loss-color)';
                    return (
                      <tr key={i}>
                        <td style={{ maxWidth: 160 }}>
                          <div style={{ fontSize: 13, color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.title}</div>
                          {i === 0 && <div style={{ fontSize: 10, color: 'var(--profit-color)', marginTop: 2 }}>Top margin</div>}
                        </td>
                        <td style={{ textAlign: 'right', color: 'var(--text-muted)' }}>{fmt(p.price)}</td>
                        <td style={{ textAlign: 'right', color: 'var(--text-dim)' }}>{p.cost > 0 ? fmt(p.cost) : '—'}</td>
                        <td style={{ textAlign: 'right' }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: col }}>{p.price > 0 && p.cost > 0 ? pctAbs(p.margin) : '—'}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '30px 0', fontSize: 13 }}>
                No products found. Sync your catalog from Settings → Products.
              </div>
            )}
          </div>
        </div>

        {/* ── Row 4: Forecast + COD split ── */}
        <div className="main-grid" style={{ marginBottom: 20 }}>

          {/* 30-Day Forecast */}
          <div className="card glass">
            <h3>30-Day Projection <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-dim)' }}>Confidence: {forecast.confidence}</span></h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {[
                { label: 'Projected Revenue', value: forecast.revenue, color: 'var(--primary)', prev: m.revenue },
                { label: 'Projected Profit',  value: forecast.profit,  color: forecast.profit >= 0 ? 'var(--profit-color)' : 'var(--loss-color)', prev: m.netProfit },
              ].map(f => (
                <div key={f.label} style={{ padding: '14px 16px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: 12 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: 6 }}>{f.label}</div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
                    <span style={{ fontFamily: 'Outfit,sans-serif', fontSize: 24, fontWeight: 800, color: f.color }}>{fmtK(f.value)}</span>
                    <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>vs {fmtK(f.prev)} this period</span>
                  </div>
                  <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
                    <span style={{ fontSize: 11, color: 'var(--profit-color)' }}>▲ Bull {fmtK(f.value * 1.12)}</span>
                    <span style={{ fontSize: 11, color: 'var(--loss-color)' }}>▼ Bear {fmtK(f.value * 0.88)}</span>
                  </div>
                </div>
              ))}
              <div style={{ fontSize: 11.5, color: 'var(--text-dim)', lineHeight: 1.6 }}>
                Based on daily average trend over {PERIOD_LABELS[period].toLowerCase()}, adjusted for {pct(m.revGrowth)} growth rate. {forecast.confidence === 'Low' ? 'Add more orders for higher accuracy.' : ''}
              </div>
            </div>
          </div>

          {/* Customer split */}
          <div className="card glass">
            <h3>Customer Behaviour</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ padding: '14px 16px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: 10 }}>COD vs Prepaid</div>
                <div style={{ display: 'flex', height: 16, borderRadius: 999, overflow: 'hidden', gap: 2 }}>
                  <div style={{ flex: m.codCount, background: 'rgba(245,158,11,0.6)', transition: 'flex 0.8s ease' }} />
                  <div style={{ flex: m.orders - m.codCount, background: 'rgba(16,185,129,0.6)', transition: 'flex 0.8s ease' }} />
                </div>
                <div style={{ display: 'flex', gap: 20, marginTop: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 8, height: 8, borderRadius: 2, background: 'rgba(245,158,11,0.8)' }} />
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>COD: {m.orders > 0 ? pctAbs(m.codCount / m.orders * 100) : '0%'}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 8, height: 8, borderRadius: 2, background: 'rgba(16,185,129,0.8)' }} />
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Prepaid: {m.orders > 0 ? pctAbs((m.orders - m.codCount) / m.orders * 100) : '0%'}</span>
                  </div>
                </div>
                {m.codCount / Math.max(m.orders, 1) > 0.6 && (
                  <div style={{ marginTop: 10, fontSize: 12, color: 'var(--primary)', lineHeight: 1.5 }}>
                    Over 60% COD — offer ₹30–50 prepaid discount to reduce RTO risk.
                  </div>
                )}
              </div>

              {[
                { label: 'Total Orders',    value: m.orders },
                { label: 'Delivered',       value: `${m.delivCount} (${pctAbs(m.delRate)})` },
                { label: 'Canceled',        value: m.cancelCount },
                { label: 'Avg Order Value', value: fmtK(m.aov) },
              ].map(row => (
                <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{row.label}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-main)' }}>{row.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Action Center ── */}
        <div className="card glass" style={{ marginBottom: 20 }}>
          <h3>Action Center <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-dim)' }}>Prioritized recommendations from your data</span></h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
            {actions.map((a, i) => (
              <div key={i} style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: 12, position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: a.color, opacity: 0.6 }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: 10, fontWeight: 800, color: a.color, background: `${a.color}18`, border: `1px solid ${a.color}30`, borderRadius: 999, padding: '2px 9px', textTransform: 'uppercase', letterSpacing: '0.6px' }}>{a.label}</span>
                  <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-main)' }}>{a.title}</span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 10, lineHeight: 1.5 }}>{a.detail}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6, borderLeft: `3px solid ${a.color}40`, paddingLeft: 10 }}>{a.action}</div>
              </div>
            ))}
          </div>
        </div>

        </>
      )}
    </div>
  );
}
