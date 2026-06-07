const { createClient } = require('@supabase/supabase-js');
const { encrypt, decrypt } = require('./cryptoUtils');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || 'https://missing.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'MISSING_KEY'
);

const SR_BASE = 'https://apiv2.shiprocket.in/v1/external';
// Shiprocket tokens are valid ~240h (10 days). Refresh a day early to be safe.
const TOKEN_TTL_MS = 9 * 24 * 60 * 60 * 1000;

/**
 * Normalize Shiprocket's free-text status into Pocket Dashboard's internal vocabulary.
 * RTO is checked first so "RTO DELIVERED" never counts as a successful delivery.
 */
function normalizeShiprocketStatus(raw) {
  const s = (raw || '').toString().trim().toUpperCase();
  if (!s) return 'pending';
  if (s.includes('RTO') || s.includes('RETURN')) return 'rto';
  if (s.includes('UNDELIVERED') || s.includes('LOST') || s.includes('DAMAGED')) return 'undelivered';
  if (s.includes('CANCEL')) return 'cancelled';
  if (s.includes('OUT FOR DELIVERY') || s === 'OFD') return 'out_for_delivery';
  if (s.includes('DELIVERED')) return 'delivered';
  if (s.includes('IN TRANSIT') || s.includes('IN-TRANSIT') || s.includes('SHIPPED') || s.includes('DISPATCHED')) return 'in_transit';
  if (s.includes('PICKUP') || s.includes('MANIFEST') || s.includes('READY') || s.includes('NEW') || s.includes('INVOICED') || s.includes('PENDING')) return 'pending';
  return 'pending';
}

/** Ensure a Shopify-style order name (with leading '#') so it joins to orders.name. */
function normalizeOrderName(channelOrderId) {
  if (channelOrderId === null || channelOrderId === undefined) return null;
  const v = channelOrderId.toString().trim();
  if (!v) return null;
  return v.startsWith('#') ? v : `#${v}`;
}

/**
 * Authenticate against Shiprocket and return a fresh bearer token.
 * Throws on invalid credentials.
 */
async function shiprocketLogin(email, password) {
  const res = await fetch(`${SR_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.token) {
    const msg = body.message || body.error || `Status ${res.status}`;
    throw new Error(`Shiprocket login failed: ${msg}`);
  }
  return body.token;
}

/**
 * Returns a valid token for the store, re-using the cached one when still fresh,
 * otherwise logging in again and persisting the new token.
 */
async function getValidToken(store) {
  const notExpired = store.shiprocket_token_expires_at &&
    new Date(store.shiprocket_token_expires_at).getTime() > Date.now() + 60 * 1000;

  if (store.shiprocket_token && notExpired) {
    return decrypt(store.shiprocket_token);
  }

  const email = decrypt(store.shiprocket_email);
  const password = decrypt(store.shiprocket_password);
  const token = await shiprocketLogin(email, password);

  await supabase.from('stores').update({
    shiprocket_token: encrypt(token),
    shiprocket_token_expires_at: new Date(Date.now() + TOKEN_TTL_MS).toISOString()
  }).eq('id', store.id);

  return token;
}

/**
 * Validate + connect a store's Shiprocket account.
 * Logs in once to confirm the credentials work, then stores them encrypted.
 * @param {string} syncFromDate  YYYY-MM-DD — how far back the initial pull goes.
 *   If null, fetches all available history.
 */
async function connectShiprocket(storeId, email, password, syncFromDate = null) {
  const cleanEmail = (email || '').trim();
  const cleanPassword = (password || '').trim();
  if (!cleanEmail || !cleanPassword) throw new Error('Shiprocket email and password are required');

  // Verify credentials before persisting anything
  const token = await shiprocketLogin(cleanEmail, cleanPassword);

  const updatePayload = {
    shiprocket_email: encrypt(cleanEmail),
    shiprocket_password: encrypt(cleanPassword),
    shiprocket_token: encrypt(token),
    shiprocket_token_expires_at: new Date(Date.now() + TOKEN_TTL_MS).toISOString(),
    shiprocket_connected: true
  };
  if (syncFromDate) updatePayload.shiprocket_sync_from_date = syncFromDate;

  const { error } = await supabase.from('stores').update(updatePayload).eq('id', storeId);
  if (error) throw new Error(`Failed to save Shiprocket connection: ${error.message}`);
  return { connected: true };
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

/**
 * Fetch a Shiprocket URL with retry + backoff on transient failures (429 rate-limit
 * and 5xx). Returns the parsed body, or throws only after exhausting retries.
 * A `getToken` callback lets us refresh the bearer token on a 401 mid-run.
 */
async function srFetch(url, getToken, { retries = 4 } = {}) {
  let token = await getToken(false);
  for (let attempt = 0; attempt <= retries; attempt++) {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });

    if (res.status === 401) {
      // Token expired mid-run — force a refresh and retry without counting it.
      token = await getToken(true);
      attempt--;
      continue;
    }

    if (res.status === 429 || res.status >= 500) {
      if (attempt === retries) {
        const body = await res.json().catch(() => ({}));
        const err = new Error(`status ${res.status}: ${body.message || 'transient error'}`);
        err.status = res.status;
        throw err;
      }
      const wait = Math.min(2000 * 2 ** attempt, 15000); // 2s,4s,8s,15s
      console.log(`[Shiprocket] ${res.status} on ${url} — retry ${attempt + 1}/${retries} in ${wait}ms`);
      await sleep(wait);
      continue;
    }

    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(`status ${res.status}: ${body.message || 'unknown error'}`);
      err.status = res.status;
      throw err;
    }
    return body;
  }
}

/**
 * Parse Shiprocket's non-standard date format: "28th Feb 2026 02:16 AM"
 */
function parseSrDate(str) {
  if (!str) return null;
  const MONTHS = { jan:0,feb:1,mar:2,apr:3,may:4,jun:5,jul:6,aug:7,sep:8,oct:9,nov:10,dec:11 };
  const m = String(str).match(/(\d+)\S*\s+(\w+)\s+(\d{4})(?:\s+(\d+):(\d+)\s*(AM|PM))?/i);
  if (!m) return null;
  const day = parseInt(m[1], 10);
  const mon = MONTHS[(m[2] || '').toLowerCase().slice(0, 3)];
  const year = parseInt(m[3], 10);
  let hour = parseInt(m[4] || '0', 10);
  const min = parseInt(m[5] || '0', 10);
  const ampm = (m[6] || '').toUpperCase();
  if (ampm === 'PM' && hour < 12) hour += 12;
  if (ampm === 'AM' && hour === 12) hour = 0;
  if (isNaN(day) || mon === undefined || isNaN(year)) return null;
  return new Date(Date.UTC(year, mon, day, hour, min)).toISOString();
}

/**
 * Sync Shiprocket shipments for a store. Automatically chooses mode:
 *
 *  FIRST SYNC (no prior shipments_synced_at OR forceFullSync=true):
 *   Phase 1: /orders    → all 472 active orders (channel_order_id)
 *   Phase 2: /shipments → full history, all pages (1600+ records)
 *   Phase 3: /orders/show/{id} → resolve channel_order_id for historical orders not in DB
 *   Phase 4: Upsert everything — takes ~5 min first time
 *
 *  INCREMENTAL (subsequent syncs):
 *   Phase 1: /orders    → all active orders (status updates for in-flight orders)
 *   Phase 2: /shipments → only since (last_sync − 7 day buffer) → usually 1–2 pages
 *   Phase 3: Skipped entirely — all order_ids already in DB from first sync
 *   Phase 4: Upsert only the new/changed records — takes seconds
 *
 * The 7-day buffer in incremental mode ensures we never miss a shipment even if
 * the previous sync was interrupted or had a partial write.
 */
async function syncShiprocketShipments(storeId, { forceFullSync = false, onProgress = null, signal = null } = {}) {
  const emit = (event, data = {}) => { try { if (onProgress) onProgress(event, data); } catch(e) {} };
  const checkAbort = () => { if (signal?.aborted) throw Object.assign(new Error('Sync cancelled by user'), { name: 'AbortError' }); };

  const { data: store, error } = await supabase
    .from('stores')
    .select('id, shiprocket_email, shiprocket_password, shiprocket_token, shiprocket_token_expires_at, shiprocket_connected, shiprocket_sync_from_date, shipments_synced_at')
    .eq('id', storeId).single();

  if (error || !store) throw new Error(`Store not found: ${error?.message}`);
  if (!store.shiprocket_connected || !store.shiprocket_email) throw new Error('Shiprocket not connected');

  // ── Determine sync mode ────────────────────────────────────────
  const isFirstSync = forceFullSync || !store.shipments_synced_at;
  const syncMode    = isFirstSync ? 'full' : 'incremental';

  // Date helpers (Shiprocket requires DD-MMM-YYYY in API URLs)
  const SR_MO = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const srFmt = (ms) => { const d = new Date(ms); return `${String(d.getDate()).padStart(2,'0')}-${SR_MO[d.getMonth()]}-${d.getFullYear()}`; };
  const toDate = srFmt(Date.now() + 864e5); // tomorrow

  // For incremental: fetch shipments from 7 days before last sync
  const fromDate = isFirstSync ? null : srFmt(new Date(store.shipments_synced_at).getTime() - 7 * 864e5);

  console.log(`[Shiprocket] ▶ ${syncMode.toUpperCase()} sync for store: ${storeId}` +
    (fromDate ? ` | from ${fromDate}` : ' | full history'));
  emit('sync_mode', { mode: syncMode, isFirstSync, fromDate });

  let token = await getValidToken(store);
  const getToken = async (forceRefresh) => {
    if (forceRefresh) token = await getValidToken({ ...store, shiprocket_token: null, shiprocket_token_expires_at: null });
    return token;
  };
  const forceHttps = (url) => url ? url.replace(/^http:\/\//i, 'https://') : url;

  // ── PHASE 1: active orders from /orders (always — gets latest status for in-flight orders) ──
  const orderMap = new Map();
  let ordPage = 1, ordTotalPages = 1;
  emit('phase_start', { phase: 1, label: isFirstSync ? 'Fetching active orders' : 'Refreshing active orders' });
  while (ordPage <= ordTotalPages && ordPage <= 20) {
    checkAbort();
    let body;
    try {
      body = await srFetch(`${SR_BASE}/orders?per_page=100&page=${ordPage}&sort=DESC&sort_by=created_at`, getToken);
    } catch(e) { ordPage++; await sleep(300); continue; }
    const orders = Array.isArray(body.data) ? body.data : [];
    ordTotalPages = body.meta?.pagination?.total_pages || ordTotalPages;
    for (const o of orders) {
      if (o.id && o.channel_order_id) orderMap.set(String(o.id), { channel_order_id: String(o.channel_order_id), status: o.status || '' });
    }
    ordPage++;
    await sleep(200);
  }
  console.log(`[Shiprocket] Phase 1 ✓ ${orderMap.size} active orders`);
  emit('phase_done', { phase: 1, label: isFirstSync ? 'Active orders fetched' : 'Active orders refreshed', detail: `${orderMap.size} orders` });

  // ── PHASE 2: shipments — full history on first sync, recent window on incremental ──
  const allShipments = [];
  const phase2Label  = isFirstSync ? 'Fetching full history' : 'Fetching new shipments';
  const phase2Params = fromDate
    ? `per_page=100&page=1&sort=DESC&sort_by=created_at&from_date=${fromDate}&to_date=${toDate}`
    : `per_page=100&page=1&sort=DESC&sort_by=created_at`;
  let nextUrl = forceHttps(`${SR_BASE}/shipments?${phase2Params}`);
  let shipPageCount = 0;
  emit('phase_start', { phase: 2, label: phase2Label, detail: isFirstSync ? 'Fetching all pages…' : `Since ${fromDate}` });
  while (nextUrl && shipPageCount < 300) {
    checkAbort();
    let body;
    try { body = await srFetch(nextUrl, getToken); }
    catch(e) { console.warn(`[Shiprocket] ⚠ Shipments page ${shipPageCount+1} failed — stopping`); break; }
    const data = Array.isArray(body.data) ? body.data : [];
    allShipments.push(...data);
    shipPageCount++;
    const rawNext = body.meta?.pagination?.links?.next || null;
    nextUrl = rawNext ? forceHttps(rawNext) : null;
    if (shipPageCount % 5 === 0) emit('phase_progress', { phase: 2, count: allShipments.length, page: shipPageCount, detail: `Page ${shipPageCount} · ${allShipments.length} shipments` });
    if (data.length < 100) break;
    await sleep(200);
  }
  console.log(`[Shiprocket] Phase 2 ✓ ${allShipments.length} shipments (${shipPageCount} pages, ${syncMode})`);
  emit('phase_done', { phase: 2, label: isFirstSync ? 'Full history fetched' : 'New shipments fetched', detail: `${allShipments.length} shipments · ${shipPageCount} pages` });

  // ── PHASE 3: resolve channel_order_id for unknown order_ids ──────
  // Seed orderMap from DB — on incremental, all order_ids are already here → Phase 3 is instant
  const { data: dbRows } = await supabase
    .from('shipments').select('shiprocket_order_id, shopify_order_name')
    .eq('store_id', storeId).not('shiprocket_order_id', 'is', null);

  for (const r of dbRows || []) {
    if (r.shiprocket_order_id && !orderMap.has(r.shiprocket_order_id) && r.shopify_order_name)
      orderMap.set(r.shiprocket_order_id, { channel_order_id: r.shopify_order_name.replace(/^#/, ''), status: '' });
  }

  const unknownIds = [...new Set(
    allShipments.map(s => String(s.order_id)).filter(id => id && id !== 'null' && id !== 'undefined' && !orderMap.has(id))
  )];

  const phase3Label = unknownIds.length === 0
    ? (isFirstSync ? 'No unknown orders' : 'All orders already synced')
    : `Resolving ${unknownIds.length} new orders`;
  emit('phase_start', { phase: 3, label: phase3Label, detail: unknownIds.length === 0 ? '✓ Skipped' : `Looking up ${unknownIds.length} orders` });
  console.log(`[Shiprocket] Phase 3: ${unknownIds.length} unknown order_ids to look up (${syncMode})`);

  let resolved = 0;
  for (let i = 0; i < unknownIds.length; i++) {
    checkAbort();
    try {
      const body = await srFetch(`${SR_BASE}/orders/show/${unknownIds[i]}`, getToken);
      const order = body.data || body;
      if (order?.channel_order_id) {
        orderMap.set(unknownIds[i], { channel_order_id: String(order.channel_order_id), status: order.status || '' });
        resolved++;
      }
    } catch(e) {}
    await sleep(250);
    if ((i + 1) % 50 === 0 || i === unknownIds.length - 1)
      emit('phase_progress', { phase: 3, resolved, total: unknownIds.length, detail: `${resolved}/${unknownIds.length} resolved` });
  }
  console.log(`[Shiprocket] Phase 3 ✓ resolved ${resolved}/${unknownIds.length}`);
  emit('phase_done', { phase: 3, label: unknownIds.length === 0 ? phase3Label : 'Orders resolved',
    detail: unknownIds.length === 0 ? '✓ Skipped — all known' : `${resolved}/${unknownIds.length} resolved` });

  // ── PHASE 4: upsert to DB ─────────────────────────────────────────────────
  let totalUpserted = 0, failedBatches = 0;
  const BATCH = 50;
  emit('phase_start', { phase: 4, label: 'Saving to database', detail: `Writing ${allShipments.length} records` });
  for (let i = 0; i < allShipments.length; i += BATCH) {
    checkAbort();
    const batch = allShipments.slice(i, i + BATCH);
    const rows = batch.map(s => {
      const orderId = String(s.order_id);
      const info    = orderMap.get(orderId);
      return {
        store_id:              storeId,
        shiprocket_order_id:   orderId !== 'null' ? orderId : null,
        shiprocket_shipment_id: s.id ? String(s.id) : null,
        awb:                   s.awb || s.awb_code || null,
        courier:               s.courier_name || s.last_mile_courier_name || null,
        shopify_order_name:    info ? normalizeOrderName(info.channel_order_id) : null,
        status:                normalizeShiprocketStatus(s.status || ''),
        raw_status:            s.status || null,
        status_code:           typeof s.status_id === 'number' ? s.status_id : null,
        status_updated_at:     parseSrDate(s.created_at) || new Date().toISOString(),
        source:                'shiprocket',
        updated_at:            new Date().toISOString()
      };
    });
    const { error: upErr } = await supabase.from('shipments').upsert(rows, { onConflict: 'store_id,shiprocket_order_id' });
    if (upErr) { failedBatches++; console.warn(`[Shiprocket] ⚠ Batch failed: ${upErr.message}`); }
    else totalUpserted += rows.length;
  }

  await supabase.from('stores').update({ shipments_synced_at: new Date().toISOString() }).eq('id', storeId);

  emit('phase_done', { phase: 4, label: 'Database updated', detail: `${totalUpserted} records saved` });
  console.log(`[Shiprocket] ✅ Done (${syncMode}). ${totalUpserted} upserted, ${resolved} lookups, ${failedBatches} failed`);
  return { success: true, totalSynced: totalUpserted, historicalResolved: resolved, failedBatches, syncMode };
}

/**
 * TEMPORARY diagnostic: probe the Shiprocket /orders endpoint with several
 * parameter variants and report what each returns (count + pagination + date
 * span on page 1). Lets us see ground truth without exposing credentials.
 * Remove once the sync window issue is resolved.
 */
async function probeShiprocket(storeId) {
  const { data: store, error } = await supabase
    .from('stores')
    .select('id, shiprocket_email, shiprocket_password, shiprocket_token, shiprocket_token_expires_at, shiprocket_connected')
    .eq('id', storeId).single();
  if (error || !store) throw new Error(`Store not found: ${error?.message}`);
  if (!store.shiprocket_connected) throw new Error('Shiprocket not connected');

  const token = await getValidToken(store);
  const MO = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const srFmt = (ms) => { const d=new Date(ms); return `${String(d.getDate()).padStart(2,'0')}-${MO[d.getMonth()]}-${d.getFullYear()}`; };
  const from1y = srFmt(Date.now() - 365 * 864e5);
  const from2y = srFmt(Date.now() - 730 * 864e5);
  const toTomorrow = srFmt(Date.now() + 864e5);

  // 1) Get a sample order_id from /shipments to test single-order lookup
  let sampleOrderId = null;
  try {
    const r = await fetch(`${SR_BASE}/shipments?per_page=5&page=1`, { headers: { Authorization: `Bearer ${token}` } });
    const b = await r.json().catch(() => ({}));
    sampleOrderId = (Array.isArray(b.data) ? b.data : [])[0]?.order_id || null;
  } catch(e) {}
  await sleep(500);

  // 2) Test single order lookup — does /orders/show/{id} return channel_order_id for old orders?
  let singleOrderTest = null;
  if (sampleOrderId) {
    try {
      const r = await fetch(`${SR_BASE}/orders/show/${sampleOrderId}`, { headers: { Authorization: `Bearer ${token}` } });
      const b = await r.json().catch(() => ({}));
      const order = b.data || b;
      singleOrderTest = {
        status: r.status,
        order_id_queried: sampleOrderId,
        channel_order_id: order.channel_order_id || order.data?.channel_order_id || null,
        order_status: order.status || null,
        all_keys: Object.keys(order).slice(0, 20),
        message: b.message || null,
      };
    } catch(e) { singleOrderTest = { error: e.message }; }
  }
  await sleep(500);

  // 3) How many pages does /shipments actually have?
  // IMPORTANT: Shiprocket's next URL uses http:// — must replace with https://
  // or the auth header is dropped on redirect and page 2+ returns empty.
  const from2yShipments = from2y;  // reuse already-computed 2-year date
  const toTmrw = toTomorrow;       // reuse already-computed tomorrow date
  let shipmentsPageCount = 0;
  let shipmentsTotalItems = 0;
  let nextUrl = `${SR_BASE}/shipments?per_page=100&page=1&sort=DESC&sort_by=created_at&from_date=${from2yShipments}&to_date=${toTmrw}`;
  while (nextUrl && shipmentsPageCount < 30) {
    // Force HTTPS — Shiprocket's pagination links use http://
    nextUrl = nextUrl.replace(/^http:\/\//i, 'https://');
    try {
      const r = await fetch(nextUrl, { headers: { Authorization: `Bearer ${token}` } });
      const b = await r.json().catch(() => ({}));
      const data = Array.isArray(b.data) ? b.data : [];
      shipmentsPageCount++;
      shipmentsTotalItems += data.length;
      const rawNext = b.meta?.pagination?.links?.next || null;
      nextUrl = rawNext ? rawNext.replace(/^http:\/\//i, 'https://') : null;
      if (data.length < 100) break;
    } catch(e) { break; }
    await sleep(300);
  }

  return {
    storeId,
    probedAt: new Date().toISOString(),
    results: {
      sampleShipmentOrderId: sampleOrderId,
      singleOrderLookup: singleOrderTest,
      shipmentsPagination: {
        pagesScanned: shipmentsPageCount,
        totalItemsCounted: shipmentsTotalItems,
        note: shipmentsPageCount >= 30 ? 'stopped at 30 pages' : 'reached end',
      },
    },
  };
}

module.exports = {
  connectShiprocket,
  syncShiprocketShipments,
  normalizeShiprocketStatus,
  probeShiprocket
};
