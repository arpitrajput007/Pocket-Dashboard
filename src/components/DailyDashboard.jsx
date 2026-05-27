import React, { useState, useEffect, useMemo } from 'react';
import { LayoutDashboard } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { dashboardCache } from '../utils/dashboardCache';
import { ProductPNLModal, AdSpendModal, NetProfitModal, MetricCard, ItemsModal } from './DashboardModals';
import {
  fmt, toDateStr, getOrderDateIST, parseDateStr,
  categorizeOrders, getPaymentCounts, getRevenueBreakdown, getTotalRevenue, calcPL,
  PREPAID_LAUNCH_DATE, isOrderPrepaidRevenue, isOrderDelivered, extractPackSize
} from '../utils/dashboardUtils';

const today = () => toDateStr(new Date());
const daysAgo = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return toDateStr(d); };

export default function DailyDashboard({ store, refreshTrigger }) {
  const [orders, setOrders] = useState([]);
  const [adCosts, setAdCosts] = useState({});
  // Per-product ad-spend splits keyed by date. Synced via ad_costs.product_breakdown.
  // Shape: { [date]: { meta: { "Title": amount }, google: {...} } }
  // Legacy flat shape { "Title": amount } is still accepted and shown under the
  // owner's first enabled platform on the next save (handled in AdSpendModal).
  const [adProductBreakdowns, setAdProductBreakdowns] = useState({});
  const [productPricing, setProductPricing] = useState({});
  // Full inventory list for the "+ Pick product from inventory" picker in AdSpendModal.
  const [allProducts, setAllProducts] = useState([]);
  // Owner-toggled ad platforms from settings. Falls back to ['meta'] if not set.
  const enabledAdPlatforms = Array.isArray(store?.enabled_ad_platforms) && store.enabled_ad_platforms.length > 0
    ? store.enabled_ad_platforms
    : ['meta'];
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [feedStart, setFeedStart] = useState(daysAgo(29));
  const [feedEnd, setFeedEnd] = useState(today());
  const [scoreStart, setScoreStart] = useState(daysAgo(7));
  const [scoreEnd, setScoreEnd] = useState(today());
  const [tempScoreStart, setTempScoreStart] = useState(daysAgo(7));
  const [tempScoreEnd, setTempScoreEnd] = useState(today());

  const [expandedOrders, setExpandedOrders] = useState(new Set());
  const [dayFilterState, setDayFilterState] = useState({});
  const [showTileView, setShowTileView] = useState(false);
  const [tilePage, setTilePage] = useState(1);
  const [modalState, setModalState] = useState({ type: null, date: null, prettyDate: null });

  useEffect(() => {
    if (store?.id) fetchPricing();
  }, [store?.id, refreshTrigger]);

  // Bust cache when a sync completes so the fresh data is loaded
  useEffect(() => {
    if (store?.id && refreshTrigger) dashboardCache.bust(store.id);
  }, [refreshTrigger, store?.id]);

  useEffect(() => {
    if (store?.id) fetchData();
  }, [store?.id, feedStart, feedEnd, scoreStart, scoreEnd, refreshTrigger]);

  // Pricing map shape:
  //   pricing[sku] = { cp, sp, shipping, title }                    ← base product (per unit)
  //   pricing['__pack__<base_sku>__<N>'] = { cp, shipping }         ← owner-defined pack override (totals for the whole pack)
  // calcPL and ProductPNLModal both look up the __pack__ key when item.packSize > 1 and fall back to the base entry.
  const fetchPricing = async () => {
    if (!store?.id) return;
    try {
      const { data, error } = await supabase
        .from('products')
        .select('id, sku, title, cost_price, selling_price, shipping_cost, parent_product_id, pack_size')
        .eq('store_id', store.id);
      if (error) throw error;

      const baseById = new Map();
      (data || []).forEach(p => { if (!p.parent_product_id) baseById.set(p.id, p); });

      // Distinct base-product titles for the AdSpendModal product picker.
      const titles = [...new Set((data || [])
        .filter(p => !p.parent_product_id && p.title)
        .map(p => p.title))].sort((a, b) => a.localeCompare(b));
      setAllProducts(titles);

      const pricing = {};
      (data || []).forEach(p => {
        if (!p.parent_product_id) {
          if (p.sku) {
            pricing[p.sku] = {
              cp: Number(p.cost_price) || 0,
              sp: Number(p.selling_price) || 0,
              shipping: Number(p.shipping_cost) || 0,
              title: p.title,
            };
          }
        } else {
          // Pack row — index by parent SKU + pack size.
          const parent = baseById.get(p.parent_product_id);
          if (parent?.sku && p.pack_size > 1) {
            pricing[`__pack__${parent.sku}__${p.pack_size}`] = {
              cp: Number(p.cost_price) || 0,
              shipping: Number(p.shipping_cost) || 0,
            };
          }
        }
      });
      setProductPricing(pricing);
    } catch (err) { console.error('Error fetching pricing:', err); }
  };

  const fetchData = async () => {
    setLoading(true); setError(null);
    try {
      const minD = [feedStart, scoreStart].sort()[0];
      const maxD = [feedEnd, scoreEnd].sort().reverse()[0];
      const minISO = new Date(minD + 'T00:00:00+05:30').toISOString();
      const maxISO = new Date(maxD + 'T23:59:59+05:30').toISOString();

      // Serve from cache when available — avoids re-fetching on tab switches
      const ordersCacheKey = `${store.id}_orders_${minD}_${maxD}`;
      const adCacheKey = `${store.id}_adcosts_${minD}_${maxD}`;
      const cachedOrders = dashboardCache.get(ordersCacheKey);
      const cachedAds = dashboardCache.get(adCacheKey);

      if (cachedOrders && cachedAds) {
        setOrders(cachedOrders);
        setAdCosts(cachedAds);
        setLoading(false);
        return;
      }

      let allOrders = [], from = 0, step = 1000, hasMore = true;
      while (hasMore) {
        const { data, error: err } = await supabase.from('orders')
          .select('id, store_id, name, created_at, total_price, tags, fulfillment_status, financial_status, cancelled_at, shipping_title, customer_fn, customer_ln, line_items')
          .eq('store_id', store.id)
          .gte('created_at', minISO).lte('created_at', maxISO)
          .order('created_at', { ascending: false }).range(from, from + step - 1);
        if (err) throw err;
        allOrders = allOrders.concat(data || []);
        if ((data || []).length < step) hasMore = false; else from += step;
      }
      setOrders(allOrders);
      dashboardCache.set(ordersCacheKey, allOrders);

      const { data: adData } = await supabase.from('ad_costs').select('date, amount, product_breakdown')
        .eq('store_id', store.id).gte('date', minD).lte('date', maxD);
      const newAdCosts = {};
      const newProductBreakdowns = {};
      adData?.forEach(r => {
        newAdCosts[r.date] = r.amount;
        if (r.product_breakdown && typeof r.product_breakdown === 'object' && Object.keys(r.product_breakdown).length > 0) {
          newProductBreakdowns[r.date] = r.product_breakdown;
        }
      });
      setAdCosts(newAdCosts);
      setAdProductBreakdowns(newProductBreakdowns);
      dashboardCache.set(adCacheKey, newAdCosts);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const handleSaveAdCost = async (dateStr, total, breakdown = null, source = 'manual', productBreakdown = null) => {
    setAdCosts(prev => ({ ...prev, [dateStr]: total }));
    if (productBreakdown) {
      setAdProductBreakdowns(prev => ({ ...prev, [dateStr]: productBreakdown }));
    }
    const row = { date: dateStr, amount: total, store_id: store.id, source };
    if (breakdown) row.breakdown = breakdown;
    if (productBreakdown) row.product_breakdown = productBreakdown;
    await supabase.from('ad_costs').upsert(row, { onConflict: 'date,store_id' });
  };

  const toggleOrderExpanded = (id) => {
    const newSet = new Set(expandedOrders);
    if (newSet.has(id)) newSet.delete(id); else newSet.add(id);
    setExpandedOrders(newSet);
  };

  const toggleDayFilter = (dateStr, key) => {
    setDayFilterState(prev => ({ ...prev, [dateStr]: prev[dateStr] === key ? null : key }));
  };

  const dayBlocks = useMemo(() => {
    const blocks = [];
    const dStart = parseDateStr(feedStart), dEnd = parseDateStr(feedEnd);
    for (let d = new Date(dEnd); d >= dStart; d.setDate(d.getDate() - 1)) {
      const dateStr = toDateStr(d);
      blocks.push(dateStr);
    }
    return blocks;
  }, [feedStart, feedEnd]);

  const scoreboardData = useMemo(() => {
    let totNet = 0, maxProfit = 0, maxLoss = 0;
    let totAd = 0, totItems = 0, profDays = 0, profAmt = 0, lossDays = 0, lossAmt = 0;
    const dStart = parseDateStr(scoreStart), dEnd = parseDateStr(scoreEnd);
    const dayData = [];

    for (let d = new Date(dEnd); d >= dStart; d.setDate(d.getDate() - 1)) {
      const dateStr = toDateStr(d);
      const dayOrders = orders.filter(o => getOrderDateIST(o) === dateStr);
      const tagsCounts = categorizeOrders(dayOrders);
      const rev = getTotalRevenue(dayOrders);
      const ad = adCosts[dateStr] || 0;
      const allItems = [];
      dayOrders.forEach(o => {
        const isCounted = isOrderDelivered(o) || isOrderPrepaidRevenue(o);
        const lineItems = o.line_items ? (typeof o.line_items === 'string' ? JSON.parse(o.line_items) : o.line_items) : [];
        lineItems.forEach(li => allItems.push({ ...li, sku: li.sku||('TITLE:'+li.title), packSize: extractPackSize(li.variant_title), isDelivered: isCounted, isFulfilled: isCounted }));
      });
      const pl = calcPL(rev, tagsCounts['Delivered']||0, ad, tagsCounts['Fulfilled']||0, allItems, productPricing);

      if (dayOrders.length > 0 || pl.profit !== 0) {
        let itemsCount = 0;
        dayOrders.forEach(o => {
          const lineItems = o.line_items ? (typeof o.line_items === 'string' ? JSON.parse(o.line_items) : o.line_items) : [];
          lineItems.forEach(li => itemsCount += parseInt(li.quantity||1));
        });
        totAd += ad; totItems += itemsCount;
        if (pl.profit > 0) { profDays++; profAmt += pl.profit; }
        else if (pl.profit < 0) { lossDays++; lossAmt += pl.profit; }
        dayData.push({ date: new Date(d), profit: pl.profit, cpp: itemsCount > 0 ? ad / itemsCount : 0 });
        if (pl.profit > 0 && pl.profit > maxProfit) maxProfit = pl.profit;
        if (pl.profit < 0 && Math.abs(pl.profit) > maxLoss) maxLoss = Math.abs(pl.profit);
        totNet += pl.profit;
      }
    }
    return { totNet, avgCpp: totItems > 0 ? totAd / totItems : 0, profDays, profAmt, lossDays, lossAmt, dayData, maxProfit, maxLoss };
  }, [orders, adCosts, scoreStart, scoreEnd, productPricing]);

  return (
    <div className="view-content active" style={{ paddingBottom: 60 }}>
      {/* SCOREBOARD */}
      <div className="controls-bar glass" style={{ marginBottom: 24 }}>
        <div style={{ flex: 1 }}><h2 style={{ margin: 0, fontSize: 18 }}>Profit/Loss Scoreboard</h2></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div><label style={{ display:'block',fontSize:12,color:'var(--text-muted)',marginBottom:4 }}>Start Date</label><input type="date" value={tempScoreStart} onChange={e=>setTempScoreStart(e.target.value)} style={{ padding:'6px 10px',borderRadius:4,border:'1px solid var(--border)',background:'rgba(0,0,0,0.2)',color:'white',colorScheme:'dark' }} /></div>
          <div><label style={{ display:'block',fontSize:12,color:'var(--text-muted)',marginBottom:4 }}>End Date</label><input type="date" value={tempScoreEnd} onChange={e=>setTempScoreEnd(e.target.value)} style={{ padding:'6px 10px',borderRadius:4,border:'1px solid var(--border)',background:'rgba(0,0,0,0.2)',color:'white',colorScheme:'dark' }} /></div>
          <button 
            onClick={() => { setScoreStart(tempScoreStart); setScoreEnd(tempScoreEnd); setTilePage(1); }} 
            style={{ alignSelf: 'flex-end', height: '34px', padding: '0 16px', borderRadius: 4, background: 'linear-gradient(90deg, #38bdf8 0%, #3b82f6 100%)', color: 'white', border: 'none', fontWeight: 500, cursor: 'pointer', fontSize: 13 }}>
            Calculate
          </button>
        </div>
      </div>

      <div className="card glass" style={{ marginBottom: 32, padding: 24, background: 'rgba(5,5,5,0.4)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 14, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>Cumulative Net Profit</h3>
            <div style={{ fontSize: 36, fontWeight: 700, marginTop: 8, color: scoreboardData.totNet >= 0 ? 'var(--profit-color)' : 'var(--loss-color)', textShadow: scoreboardData.totNet >= 0 ? '0 0 20px rgba(52, 211, 153, 0.4)' : '0 0 20px rgba(248, 113, 113, 0.4)' }}>{fmt(scoreboardData.totNet)}</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>{new Date(parseDateStr(scoreStart)).toLocaleDateString()} to {new Date(parseDateStr(scoreEnd)).toLocaleDateString()}</div>
            <div style={{ marginTop: 16, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '10px 16px', borderRadius: 10 }}>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', marginBottom: 6, fontWeight: 600 }}>Profitable Days ({scoreboardData.profDays})</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--profit-color)' }}>+{fmt(scoreboardData.profAmt)}</div>
              </div>
              <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '10px 16px', borderRadius: 10 }}>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', marginBottom: 6, fontWeight: 600 }}>Loss Days ({scoreboardData.lossDays})</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--loss-color)' }}>-{fmt(Math.abs(scoreboardData.lossAmt))}</div>
              </div>
            </div>
          </div>
          <div>
            <button 
              onClick={() => setShowTileView(!showTileView)}
              style={{ padding: '8px 16px', borderRadius: 8, background: showTileView ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255,255,255,0.05)', border: `1px solid ${showTileView ? 'rgba(56, 189, 248, 0.4)' : 'rgba(255,255,255,0.1)'}`, color: showTileView ? '#38bdf8' : 'white', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.2s' }}>
              <LayoutDashboard size={16} /> {showTileView ? 'Hide Tiles' : 'Tile View'}
            </button>
          </div>
        </div>
        {showTileView && (() => {
          const TILE_PAGE_SIZE = 30;
          const totalPages = Math.ceil(scoreboardData.dayData.length / TILE_PAGE_SIZE);
          const currentTiles = scoreboardData.dayData.slice((tilePage - 1) * TILE_PAGE_SIZE, tilePage * TILE_PAGE_SIZE);
          
          return (
            <div style={{ marginTop: 24, borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 24 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12 }}>
                {currentTiles.map(d => {
                  const isP = d.profit >= 0;
                  const op = isP ? (scoreboardData.maxProfit > 0 ? 0.15 + 0.5 * (d.profit / scoreboardData.maxProfit) : 0.2) : (scoreboardData.maxLoss > 0 ? 0.15 + 0.5 * (Math.abs(d.profit) / scoreboardData.maxLoss) : 0.2);
                  return (
                    <div key={d.date} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 16, background: isP ? `rgba(16, 185, 129, ${op})` : `rgba(239, 68, 68, ${op})`, borderRadius: 12, border: `1px solid ${isP ? `rgba(16, 185, 129, ${op + 0.3})` : `rgba(239, 68, 68, ${op + 0.3})`}` }}>
                      <span style={{ color: 'rgba(255,255,255,0.9)', fontWeight: 600, fontSize: 13, textTransform: 'uppercase' }}>{d.date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}</span>
                      <span style={{ color: isP ? '#a7f3d0' : '#fecaca', fontWeight: 700, fontSize: 18 }}>{isP ? '+' : '-'}{fmt(Math.abs(d.profit))}</span>
                    </div>
                  );
                })}
              </div>
              {totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 16, marginTop: 24 }}>
                  <button 
                    onClick={() => setTilePage(p => Math.max(1, p - 1))} 
                    disabled={tilePage === 1}
                    style={{ padding: '6px 12px', borderRadius: 6, background: 'rgba(255,255,255,0.1)', color: tilePage === 1 ? 'rgba(255,255,255,0.3)' : 'white', border: 'none', cursor: tilePage === 1 ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 500 }}>
                    Previous
                  </button>
                  <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 }}>Page {tilePage} of {totalPages}</span>
                  <button 
                    onClick={() => setTilePage(p => Math.min(totalPages, p + 1))} 
                    disabled={tilePage === totalPages}
                    style={{ padding: '6px 12px', borderRadius: 6, background: 'rgba(255,255,255,0.1)', color: tilePage === totalPages ? 'rgba(255,255,255,0.3)' : 'white', border: 'none', cursor: tilePage === totalPages ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 500 }}>
                    Next
                  </button>
                </div>
              )}
            </div>
          );
        })()}
      </div>

      {/* FEED */}
      <div className="controls-bar">
        <h2 style={{ margin: 0, fontSize: 18, flex: 1 }}>Daily Feed</h2>
        <div className="date-picker"><label>Start Date:</label><input type="date" value={feedStart} onChange={e=>setFeedStart(e.target.value)} /></div>
        <div className="date-picker"><label>End Date:</label><input type="date" value={feedEnd} onChange={e=>setFeedEnd(e.target.value)} /></div>
      </div>

      <div className="daily-feed-container">
        {loading && orders.length === 0 && <div style={{ padding: 40, textAlign: 'center' }}>Loading feed...</div>}
        {error && <div style={{ padding: 40, textAlign: 'center', color: 'var(--loss-color)' }}>{error}</div>}
        {(!loading || orders.length > 0) && !error && dayBlocks.map(dateStr => {
          const dayOrders = orders.filter(o => getOrderDateIST(o) === dateStr);
          const tCounts = categorizeOrders(dayOrders);
          const rev = getTotalRevenue(dayOrders);
          const ad = adCosts[dateStr] || 0;
          const allItems = [];
          let itemsCount = 0; // total UNITS across ALL orders (for CPP and Number of Items card)
          dayOrders.forEach(o => {
            const isCounted = isOrderDelivered(o) || isOrderPrepaidRevenue(o);
            const lineItems = o.line_items ? (typeof o.line_items === 'string' ? JSON.parse(o.line_items) : o.line_items) : [];
            lineItems.forEach(li => {
              const packSize = extractPackSize(li.variant_title);
              itemsCount += parseInt(li.quantity || 1) * packSize; // count actual units (pack size × qty)
              allItems.push({ ...li, sku: li.sku||('TITLE:'+li.title), packSize, isDelivered: isCounted, isFulfilled: isCounted });
            });
          });
          const pl = calcPL(rev, tCounts['Delivered']||0, ad, tCounts['Fulfilled']||0, allItems, productPricing);
          const pCounts = getPaymentCounts(dayOrders);
          const cpp = itemsCount > 0 ? ad / itemsCount : 0;
          const pretty = parseDateStr(dateStr).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
          const filterKey = dayFilterState[dateStr] || 'all';

          const filteredOrders = dayOrders.filter(o => {
            if (filterKey === 'all' || filterKey === 'orders') return true;
            const tc = categorizeOrders([o]);
            if (filterKey === 'fulfilled') return tc['Fulfilled'] > 0;
            if (filterKey === 'delivered') return tc['Delivered'] > 0;
            if (filterKey === 'in-transit') return tc['In Transit'] > 0;
            if (filterKey === 'out-delivery') return tc['Out for Delivery'] > 0;
            if (filterKey === 'failed-delivery') return tc['Failed Delivery'] > 0;
            if (filterKey === 'canceled') return tc['Canceled'] > 0;
            if (filterKey === 'rto-prediction') return tc['RTO Prediction'] > 0;
            if (filterKey === 'rto') return tc['RTO'] > 0;
            if (filterKey === 'unreachable') return tc['Unreachable'] > 0;
            if (filterKey === 'not-confirmed') return tc['Not Confirmed'] > 0;
            if (filterKey === 'prepaid') return isOrderPrepaidRevenue(o);
            if (filterKey === 'cash') return !isOrderPrepaidRevenue(o);
            return true;
          });

          return (
            <div key={dateStr} className="day-block glass">
              <div className="day-header">
                <h2>{pretty}</h2>
                <div className="day-actions">
                  <span className="badge" style={{ fontSize: 14, background: 'rgba(167, 139, 250, 0.2)', color: '#a78bfa', border: '1px solid #a78bfa' }}>CPP: {itemsCount > 0 ? fmt(cpp) : '₹0'}</span>
                  <span className="badge" style={{ fontSize: 14, background: pl.profit >= 0 ? 'rgba(52, 211, 153, 0.2)' : 'rgba(248, 113, 113, 0.2)', color: pl.profit >= 0 ? 'var(--profit-color)' : 'var(--loss-color)', border: `1px solid ${pl.profit >= 0 ? 'var(--profit-color)' : 'var(--loss-color)'}` }}>Net: {pl.profit >= 0 ? '▲' : '▼'}{fmt(Math.abs(pl.profit))}</span>
                </div>
              </div>

              <div className="metrics-grid" style={{ marginBottom: 24 }}>
                <MetricCard label="Orders" value={dayOrders.length} glow="white" active={filterKey === 'orders'} onClick={() => toggleDayFilter(dateStr, 'orders')} />
                <MetricCard label="Number of Items" value={itemsCount} glow="white" note="Click to see breakdown" onClick={() => setModalState({ type: 'items', date: dateStr, prettyDate: pretty, allItems })} />
                <MetricCard label="CPP" value={itemsCount > 0 ? fmt(cpp) : '₹0'} glow="white" note="Click for product breakdown" />
                <MetricCard label="Fulfilled" value={tCounts['Fulfilled'] || 0} color="var(--profit-color)" glow="green" active={filterKey === 'fulfilled'} onClick={() => toggleDayFilter(dateStr, 'fulfilled')} />
                <MetricCard label="Delivered" value={tCounts['Delivered'] || 0} color="var(--profit-color)" glow="green" active={filterKey === 'delivered'} onClick={() => toggleDayFilter(dateStr, 'delivered')} />
                <MetricCard label="In Transit" value={tCounts['In Transit'] || 0} color="#60a5fa" glow="blue" active={filterKey === 'in-transit'} onClick={() => toggleDayFilter(dateStr, 'in-transit')} />
                <MetricCard label="Out for Delivery" value={tCounts['Out for Delivery'] || 0} color="#a78bfa" glow="purple" active={filterKey === 'out-delivery'} onClick={() => toggleDayFilter(dateStr, 'out-delivery')} />
                <MetricCard label="Failed Delivery" value={tCounts['Failed Delivery'] || 0} color="#f97316" glow="orange" active={filterKey === 'failed-delivery'} onClick={() => toggleDayFilter(dateStr, 'failed-delivery')} />
                <MetricCard label="Canceled" value={tCounts['Canceled'] || 0} color="var(--loss-color)" glow="red" active={filterKey === 'canceled'} onClick={() => toggleDayFilter(dateStr, 'canceled')} />
                {dateStr >= '2026-03-28' && <MetricCard label="Possibility of RTO" value={tCounts['RTO Prediction'] || 0} color="#f59e0b" glow="yellow" active={filterKey === 'rto-prediction'} onClick={() => toggleDayFilter(dateStr, 'rto-prediction')} />}
                {dateStr >= '2026-02-25' && <MetricCard label="RTO / Undelivered" value={tCounts['RTO'] || 0} color="var(--loss-color)" glow="red" active={filterKey === 'rto'} onClick={() => toggleDayFilter(dateStr, 'rto')} />}
                <MetricCard label="Unreachable" value={tCounts['Unreachable'] || 0} color="#facc15" glow="yellow" active={filterKey === 'unreachable'} onClick={() => toggleDayFilter(dateStr, 'unreachable')} />
                <MetricCard label="Order Not Confirmed" value={tCounts['Not Confirmed'] || 0} color="var(--loss-color)" glow="red" active={filterKey === 'not-confirmed'} onClick={() => toggleDayFilter(dateStr, 'not-confirmed')} />
                <MetricCard label="Revenue" value={fmt(rev)} glow="blue" />
                <MetricCard label="Ad Spend" value={fmt(ad)} glow="white" note="Click to edit breakdown" onClick={() => setModalState({ type: 'ad', date: dateStr })} />
                {dateStr >= PREPAID_LAUNCH_DATE && <MetricCard label="Prepaid Orders" value={pCounts.prepaid} color="#818cf8" glow="indigo" active={filterKey === 'prepaid'} onClick={() => toggleDayFilter(dateStr, 'prepaid')} />}
                {dateStr >= PREPAID_LAUNCH_DATE && <MetricCard label="Cash Orders" value={pCounts.cash} color="#fb923c" glow="amber" active={filterKey === 'cash'} onClick={() => toggleDayFilter(dateStr, 'cash')} />}
                <MetricCard label="Net Profit" value={fmt(pl.profit)} color={pl.profit >= 0 ? 'var(--profit-color)' : 'var(--loss-color)'} glow="white" note="Click for full breakdown" badge onClick={() => setModalState({ type: 'netprofit', date: dateStr, prettyDate: pretty, pl, tCounts, pCounts, itemsCount, cpp, totalOrders: dayOrders.length })} />
                <MetricCard label="PNL of Products" value="📊" color="#fbbf24" glow="yellow" note="Click for breakdown" badge onClick={() => setModalState({ type: 'pnl', date: dateStr, prettyDate: pretty })} />
              </div>

              {filterKey !== 'all' && (
                <div style={{ marginTop: 16 }}>
                  <div className="orders-table-wrapper" style={{ margin: 0, padding: 0 }}>
                    <table>
                      <thead><tr><th>Order #</th><th>Customer</th><th>Amount</th><th>Payment</th><th>Revenue</th><th>Tags</th><th>Time</th></tr></thead>
                      <tbody>
                        {filteredOrders.length === 0 ? <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No orders match this filter</td></tr> :
                          filteredOrders.slice(0, 50).map(o => {
                            const isPre = isOrderPrepaidRevenue(o);
                            const isDel = isOrderDelivered(o);
                            const revCounted = isDel || isPre;
                            const isExpanded = expandedOrders.has(o.id);
                            return (
                              <React.Fragment key={o.id}>
                                <tr className={`order-row ${isExpanded ? 'expanded' : ''}`} onClick={() => toggleOrderExpanded(o.id)} style={{ cursor: 'pointer' }}>
                                  <td style={{ verticalAlign: 'top', paddingTop: 14 }}>
                                    <div style={{ fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4 }}>{o.name}
                                      <span style={{ fontSize: 10, fontWeight: 700, background: isPre ? 'rgba(129,140,248,0.15)' : 'rgba(251,146,60,0.15)', color: isPre ? '#818cf8' : '#fb923c', border: `1px solid ${isPre ? 'rgba(129,140,248,0.4)' : 'rgba(251,146,60,0.4)'}`, padding: '2px 7px', borderRadius: 4, marginLeft: 6 }}>{isPre ? 'PREPAID' : 'COD'}</span>
                                    </div>
                                    {(o.order_items && o.order_items.length > 0) && (
                                      <div style={{ marginTop: 10, fontSize: 12, color: 'var(--text-muted)', background: 'rgba(0,0,0,0.3)', padding: '8px 10px', borderRadius: 6 }}>
                                        {o.order_items.map(li => (
                                          <div key={li.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: 10 }}>{li.quantity}x {li.title}</span>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </td>
                                  <td style={{ verticalAlign: 'top', paddingTop: 14 }}>{o.customer_fn} {o.customer_ln}</td>
                                  <td style={{ verticalAlign: 'top', paddingTop: 14 }}>{fmt(o.total_price)}</td>
                                  <td style={{ verticalAlign: 'top', paddingTop: 14, fontSize: 12, color: 'var(--text-muted)' }}>{isPre ? 'Prepaid' : 'COD'}</td>
                                  <td style={{ verticalAlign: 'top', paddingTop: 14 }}>{revCounted ? <span style={{ color: isPre && !isDel ? '#818cf8' : 'var(--profit-color)', fontWeight: 600 }}>{fmt(o.total_price)}</span> : <span style={{ color: 'var(--text-muted)', opacity: 0.5 }}>-</span>}</td>
                                  <td style={{ verticalAlign: 'top', paddingTop: 14 }}><div className="order-tags">{(o.tags || '').split(',').filter(t => t.trim()).map((t, i) => <span key={i} className="order-tag">{t.trim()}</span>)}</div></td>
                                  <td style={{ verticalAlign: 'top', paddingTop: 14 }}>{o.created_at ? new Date(o.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</td>
                                </tr>
                                {isExpanded && (
                                  <tr className="expanded-details"><td colSpan="7"><div style={{ padding: 16, background: 'rgba(0,0,0,0.2)', borderRadius: 8 }}>Details expanded</div></td></tr>
                                )}
                              </React.Fragment>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {modalState.type === 'pnl' && <ProductPNLModal dateStr={modalState.date} prettyDate={modalState.prettyDate} dayOrders={orders.filter(o => getOrderDateIST(o) === modalState.date)} adCosts={adCosts} adProductBreakdown={adProductBreakdowns[modalState.date]} productPricing={productPricing} onClose={() => setModalState({ type: null })} />}
      {modalState.type === 'ad' && <AdSpendModal store={store} dateStr={modalState.date} dayOrders={orders.filter(o => getOrderDateIST(o) === modalState.date)} adCosts={adCosts} initialProductBreakdown={adProductBreakdowns[modalState.date]} enabledPlatforms={enabledAdPlatforms} allProducts={allProducts} onSave={handleSaveAdCost} onClose={() => setModalState({ type: null })} />}
      {modalState.type === 'netprofit' && <NetProfitModal dateStr={modalState.date} prettyDate={modalState.prettyDate} pl={modalState.pl} tCounts={modalState.tCounts} pCounts={modalState.pCounts} itemsCount={modalState.itemsCount} cpp={modalState.cpp} totalOrders={modalState.totalOrders} onClose={() => setModalState({ type: null })} />}
      {modalState.type === 'items' && <ItemsModal prettyDate={modalState.prettyDate} allItems={modalState.allItems} onClose={() => setModalState({ type: null })} />}
    </div>
  );
}