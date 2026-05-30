// ── BnB Dashboard Utility Functions ─────────────────────────────────────────
// Ported from BnB/shopify-dashboard.html

export const PRODUCT_COST = 555;
export const SHIPPING_COST = 135;

// Extracts pack size from a Shopify variant_title like "Pack of 2" → 2
// Returns 1 for single-unit products or when variant_title is absent
export function extractPackSize(variantTitle) {
  if (!variantTitle) return 1;
  const m = variantTitle.match(/pack\s+of\s+(\d+)/i);
  return m ? parseInt(m[1]) : 1;
}
export const PREPAID_LAUNCH_DATE = '2026-03-28';

export function fmt(n) {
  return '₹' + Math.round(n).toLocaleString('en-IN');
}

export function toDateStr(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Returns IST date string (UTC+5:30) for an order's created_at
export function getOrderDateIST(o) {
  if (!o.created_at) return '';
  const utcMs = new Date(o.created_at).getTime();
  const istMs = utcMs + 5.5 * 60 * 60 * 1000;
  const d = new Date(istMs);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function parseDateStr(s) {
  const [y, mo, d] = s.split('-').map(Number);
  return new Date(y, mo - 1, d, 12, 0, 0);
}

// ── Time-effective cost prices ──────────────────────────────────────────────
// A product's cost changes over time. `history` is a list of dated cost entries
// (newest first). For a given order date we use the most recent entry whose
// effective_from is on/before that date. Orders that predate every entry fall
// back to the oldest entry; with no history we use the product's base cost.
//
// history entry shape: { effective_from: 'YYYY-MM-DD', cost_price, shipping_cost }

// Loads the cost-history rows for a store and returns them grouped by product_id,
// each group sorted newest-first. Fails soft to {} so the dashboard still works
// before the migration is run.
export async function loadCostHistory(supabase, storeId) {
  if (!supabase || !storeId) return {};
  try {
    const { data, error } = await supabase
      .from('product_cost_history')
      .select('product_id, cost_price, shipping_cost, effective_from')
      .eq('store_id', storeId)
      .order('effective_from', { ascending: false });
    if (error) return {};
    const byProduct = {};
    (data || []).forEach(h => { (byProduct[h.product_id] ||= []).push(h); });
    return byProduct;
  } catch { return {}; }
}

// Resolves the cost price effective on `orderDate` (a 'YYYY-MM-DD' string).
// `history` must be sorted newest-first. Returns a Number, or `fallback` when
// there is no usable history.
export function effectiveCostPrice(history, orderDate, fallback) {
  if (Array.isArray(history) && history.length) {
    if (orderDate) {
      for (const h of history) {                // newest first
        if (orderDate >= h.effective_from) return Number(h.cost_price);
      }
    }
    return Number(history[history.length - 1].cost_price); // predates all → oldest
  }
  return fallback;
}

// Same resolution but for shipping (history rows may carry a shipping_cost).
export function effectiveShippingCost(history, orderDate, fallback) {
  if (Array.isArray(history) && history.length) {
    const pick = (h) => (h && h.shipping_cost != null ? Number(h.shipping_cost) : fallback);
    if (orderDate) {
      for (const h of history) {
        if (orderDate >= h.effective_from) return pick(h);
      }
    }
    return pick(history[history.length - 1]);
  }
  return fallback;
}

/**
 * isOrderDelivered — determines if an order counts as delivered.
 * Priority: Shiprocket (carrier truth) > Shopify __ss: synthetic tag > plain tags.
 * shipmentsMap: { [orderName]: { status, ... } } — pass empty object when not connected.
 * When Shiprocket has a non-pending record, it wins unconditionally.
 * When it has a 'pending' record (shipment created but not yet picked up) we fall
 * through to Shopify tags so the order is still categorized correctly in transit views.
 */
export function isOrderDelivered(o, shipmentsMap = {}) {
  // ── 1. Shiprocket source of truth ─────────────────────────────────────────
  const shipment = shipmentsMap[o.name];
  if (shipment && shipment.status && shipment.status !== 'pending') {
    return shipment.status === 'delivered';
  }

  // ── 2. Shopify __ss: synthetic tag (set by our syncService) ───────────────
  const rawTags = (o.tags || '').split(',').map(t => t.trim().toLowerCase());
  const syntheticSS = rawTags.find(t => t.startsWith('__ss:'));
  const shipmentStatus = syntheticSS ? syntheticSS.replace('__ss:', '') : '';

  if (shipmentStatus === 'delivered') return true;

  // ── 3. Plain "Delivered" tag (manual / courier webhook) ───────────────────
  const hasDeliveredTag = rawTags.some(t =>
    !t.startsWith('__ss:') &&
    t.includes('delivered') &&
    !t.includes('undelivered') &&
    !t.includes('failed')
  );
  if (!hasDeliveredTag) return false;

  // Courier __ss: signals RTO/failure → override the plain Delivered tag
  const courierRTO = syntheticSS && (
    shipmentStatus.includes('rto') ||
    shipmentStatus === 'returned' ||
    shipmentStatus === 'failure' ||
    shipmentStatus === 'undelivered'
  );
  // Plain RTO tags only respected when NO synthetic tag exists at all
  const plainRTO = !syntheticSS && rawTags.some(t =>
    !t.startsWith('__ss:') &&
    ((t.includes('rto') && !t.includes('rto_prediction')) || t.includes('undelivered'))
  );

  return !courierRTO && !plainRTO;
}

export function isOrderPrepaidRevenue(o) {
  const orderDate = o.created_at ? o.created_at.substring(0, 10) : '';
  if (orderDate < PREPAID_LAUNCH_DATE) return false;
  const st = (o.shipping_title || '').toLowerCase();
  // Primary: shipping_title contains 'prepaid' (most reliable — set by shipping zone name)
  if (st) return st.includes('prepaid');
  // Fallback: financial_status === 'paid' when shipping_title not yet synced to Supabase.
  // COD = 'pending', Prepaid/Online = 'paid'. Note: refunded prepaid = 'refunded' (won't count — acceptable).
  return (o.financial_status || '').toLowerCase() === 'paid';
}

/**
 * categorizeOrders — counts orders into status buckets for the metric cards.
 * shipmentsMap: { [orderName]: { status } } — Shiprocket wins when non-pending.
 */
export function categorizeOrders(orders, shipmentsMap = {}) {
  const STATUS_TAGS = ['Delivered','Canceled','Attempted Delivery','In Transit','Out for Delivery',
    'Failed Delivery','Paid','Payment Pending','Unfulfilled','Fulfilled','RTO','Unreachable','RTO Prediction','Not Confirmed'];
  const counts = {};
  STATUS_TAGS.forEach(t => (counts[t] = 0));
  counts['Other'] = 0;

  orders.forEach(o => {
    // ── Shiprocket source of truth ─────────────────────────────────────────
    const shipment = shipmentsMap[o.name];
    const srStatus = shipment?.status;
    if (srStatus && srStatus !== 'pending') {
      // Use carrier status directly — no Shopify tag parsing needed
      const isDel  = srStatus === 'delivered';
      const isIT   = srStatus === 'in_transit';
      const isOFD  = srStatus === 'out_for_delivery';
      const isRTO  = srStatus === 'rto' || srStatus === 'undelivered';
      const isCan  = srStatus === 'cancelled';
      const isFul  = isDel || isIT || isOFD; // anything shipped counts as fulfilled

      if (isFul)  counts['Fulfilled']++;
      if (isDel)  counts['Delivered']++;
      if (isIT)   counts['In Transit']++;
      if (isOFD)  counts['Out for Delivery']++;
      if (isRTO)  counts['RTO']++;
      if (isCan)  counts['Canceled']++;
      if (!isDel && !isIT && !isOFD && !isRTO && !isCan) counts['Other']++;
      return; // skip Shopify tag logic entirely
    }

    // ── Shopify tag fallback ────────────────────────────────────────────────
    const rawTags = (o.tags || '').split(',').map(t => t.trim().toLowerCase());
    const fs = (o.fulfillment_status || '').toLowerCase();
    const fin = (o.financial_status || '').toLowerCase();
    const syntheticSS = rawTags.find(t => t.startsWith('__ss:'));
    const shipmentStatus = syntheticSS ? syntheticSS.replace('__ss:', '') : '';

    const isDelivered = isOrderDelivered(o, shipmentsMap);
    const isRTO = !isDelivered && rawTags.some(t =>
      !t.startsWith('__ss:') && ((t.includes('rto') && !t.includes('rto_prediction')) || t.includes('undelivered'))
    );
    const isRTOPrediction = rawTags.some(t => !t.startsWith('__ss:') && t.includes('rto_prediction'));
    const isUnreachable = rawTags.some(t => !t.startsWith('__ss:') && t.includes('unreachable'));
    const isFulfilled = fs === 'fulfilled' || fs === 'partial' || isDelivered;
    const ssInTransit = shipmentStatus === 'in_transit' || rawTags.some(t => t.includes('in transit') && !t.startsWith('__ss:'));
    const ssOutForDel = shipmentStatus === 'out_for_delivery' || rawTags.some(t => t.includes('out for delivery') && !t.startsWith('__ss:'));
    const ssFailure = shipmentStatus === 'failure' || shipmentStatus === 'attempted_delivery'
      || rawTags.some(t => (t.includes('failed delivery') || t.includes('attempted delivery')) && !t.startsWith('__ss:'));
    const ssDelivered = shipmentStatus === 'delivered' || rawTags.some(t => t === 'delivered' && !t.startsWith('__ss:'));
    const isInTransit = ssInTransit && !ssOutForDel && !ssFailure && !ssDelivered && !isRTO;
    const isOutForDelivery = ssOutForDel && !ssFailure && !ssDelivered && !isRTO;
    const isFailedDelivery = ssFailure && !isRTO;
    const isCanceled =
      rawTags.some(t => t === 'canceled' || t === 'cancelled') ||
      fin === 'voided' || fin === 'refunded' ||
      !!o.cancelled_at;
    const isCOD = fin === 'pending';
    const hasConfirmTag = rawTags.some(t => t === 'confirm' || t === 'confirmed');
    const isNotConfirmed = isCOD && !hasConfirmTag && !isCanceled && !isFulfilled;
    const isUnfulfilled = !isFulfilled && !isCanceled && !isNotConfirmed && (!fs || fs === 'unfulfilled');

    if (isFulfilled)      counts['Fulfilled']++;
    if (isDelivered)      counts['Delivered']++;
    if (isRTO)            counts['RTO']++;
    if (isRTOPrediction)  counts['RTO Prediction']++;
    if (isUnreachable)    counts['Unreachable']++;
    if (isInTransit)      counts['In Transit']++;
    if (isOutForDelivery) counts['Out for Delivery']++;
    if (isFailedDelivery) counts['Failed Delivery']++;
    if (isCanceled)       counts['Canceled']++;
    if (isUnfulfilled)    counts['Unfulfilled']++;
    if (isNotConfirmed)   counts['Not Confirmed']++;
    const any = isFulfilled || isDelivered || isRTO || isUnreachable || isInTransit ||
      isOutForDelivery || isFailedDelivery || isCanceled || isUnfulfilled || isNotConfirmed;
    if (!any) counts['Other']++;
  });
  return counts;
}

export function getPaymentCounts(orders) {
  let prepaid = 0, cash = 0;
  orders.forEach(o => {
    const st = (o.shipping_title || '').toLowerCase();
    // Primary check: shipping_title (set from Shopify shipping zone name)
    // Fallback: financial_status === 'paid' when shipping_title column not yet in Supabase
    const isPrepaid = st
      ? st.includes('prepaid')
      : (o.financial_status || '').toLowerCase() === 'paid';
    if (isPrepaid) prepaid++;
    else cash++;
  });
  return { prepaid, cash };
}

export function getRevenueBreakdown(orders, shipmentsMap = {}) {
  let deliveredRev = 0, prepaidRev = 0, deliveredCount = 0, prepaidCount = 0;
  orders.forEach(o => {
    const isDel = isOrderDelivered(o, shipmentsMap);
    const isPre = isOrderPrepaidRevenue(o);
    if (!isDel && !isPre) return;
    let orderRev = parseFloat(o.total_price || 0);
    if (isPre) { prepaidRev += orderRev; prepaidCount++; }
    else if (isDel) { deliveredRev += orderRev; deliveredCount++; }
  });
  return { totalRevenue: deliveredRev + prepaidRev, deliveredRevenue: deliveredRev, prepaidRevenue: prepaidRev, deliveredCount, prepaidCount };
}

export function getTotalRevenue(orders, shipmentsMap = {}) {
  return getRevenueBreakdown(orders, shipmentsMap).totalRevenue;
}

export function calcPL(revenue, deliveredCount, adCost, fulfilledCount = 0, items = [], productPricing = {}, actualDeliveredCount = null) {
  let totalProductCost = 0;
  let totalLogisticsCost = 0;
  const totalRevenue = revenue || 0;

  if (items && items.length > 0) {
    items.forEach(item => {
      // Title fallback: products whose line items carry no SKU are indexed by
      // 'TITLE:<title>' in the pricing map, so resolve both the SKU and TITLE key.
      const skuKey = item.sku;
      const titleKey = item.title ? 'TITLE:' + item.title : null;
      const pricing =
        (skuKey && productPricing[skuKey]) ||
        (titleKey && productPricing[titleKey]) ||
        { cp: PRODUCT_COST, shipping: SHIPPING_COST };
      const packSize = item.packSize || 1;
      // Owner-defined pack override: cost is for the whole pack, so don't multiply by packSize again.
      const baseKey = (skuKey && productPricing[skuKey]) ? skuKey : (titleKey || skuKey);
      const packOverride = packSize > 1 ? productPricing[`__pack__${baseKey}__${packSize}`] : null;
      // Cost effective on this order's date (falls back to the entry's current cp).
      const cpUnit = effectiveCostPrice(pricing.history, item.orderDate, pricing.cp);
      const packCp = packOverride
        ? effectiveCostPrice(packOverride.history, item.orderDate, packOverride.cp)
        : null;
      if (item.isDelivered) {
        totalProductCost += packOverride
          ? packCp * item.quantity
          : cpUnit * packSize * item.quantity;
      }
      if (item.isFulfilled) {
        const baseShip = pricing.shipping;
        const shipPerUnit = packOverride && packOverride.shipping != null
          ? effectiveShippingCost(packOverride.history, item.orderDate, packOverride.shipping)
          : effectiveShippingCost(pricing.history, item.orderDate, baseShip);
        totalLogisticsCost += (shipPerUnit != null ? shipPerUnit : SHIPPING_COST) * item.quantity;
      }
    });
    if (totalProductCost === 0 && deliveredCount > 0) totalProductCost = deliveredCount * PRODUCT_COST;
    if (totalLogisticsCost === 0 && (fulfilledCount > 0 || deliveredCount > 0))
      totalLogisticsCost = (fulfilledCount || deliveredCount) * SHIPPING_COST;
  } else {
    totalProductCost = (deliveredCount || 0) * PRODUCT_COST;
    totalLogisticsCost = (fulfilledCount || deliveredCount || 0) * SHIPPING_COST;
  }

  const totalCost = totalProductCost + totalLogisticsCost + adCost;
  const profit = totalRevenue - totalCost;
  return { revenue: totalRevenue, productCost: totalProductCost, shippingCost: totalLogisticsCost, adCost, totalCost, profit,
    deliveredCount: actualDeliveredCount !== null ? actualDeliveredCount : deliveredCount,
    fulfilledCount: fulfilledCount || deliveredCount };
}
