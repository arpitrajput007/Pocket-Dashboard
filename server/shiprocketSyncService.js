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
 * Pull Shiprocket shipments for a store and upsert them into `shipments`.
 *
 * IMPORTANT LESSONS LEARNED (probe-confirmed):
 *  1. Use /shipments endpoint, NOT /orders.
 *     /orders caps at ~472 active orders regardless of any date filter.
 *     /shipments returns all historical delivery records (the 1645 in the dashboard).
 *  2. Date format must be DD-MMM-YYYY (e.g. 08-Jun-2024).
 *     YYYY-MM-DD is silently ignored by the Shiprocket API.
 *  3. /shipments field names differ from /orders:
 *     awb_code (not awb), order_id (not id for the order reference),
 *     courier_name (not courier), channel_order_id same.
 *
 * @param {string} storeId
 * @param {object} opts  { maxPages, fromDateOverride }
 */
async function syncShiprocketShipments(storeId, { maxPages = 300, fromDateOverride = null } = {}) {
  console.log(`[Shiprocket] ▶ Starting shipment sync for store: ${storeId}`);

  const { data: store, error } = await supabase
    .from('stores')
    .select('id, shiprocket_email, shiprocket_password, shiprocket_token, shiprocket_token_expires_at, shiprocket_connected, shiprocket_sync_from_date')
    .eq('id', storeId)
    .single();

  if (error || !store) throw new Error(`Store not found: ${error?.message}`);
  if (!store.shiprocket_connected || !store.shiprocket_email) {
    throw new Error('Shiprocket is not connected for this store');
  }

  // Date helpers — Shiprocket requires DD-MMM-YYYY for the API but we compare
  // dates as YYYY-MM-DD strings for ordering.
  const SR_MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const srDate = (ms) => {
    const d = new Date(ms);
    return `${String(d.getDate()).padStart(2,'0')}-${SR_MONTHS[d.getMonth()]}-${d.getFullYear()}`;
  };
  const toSrDate = (ymdStr) => {
    if (!ymdStr) return null;
    const [y, m, day] = ymdStr.split('-');
    return `${day}-${SR_MONTHS[parseInt(m, 10) - 1]}-${y}`;
  };

  const DEFAULT_LOOKBACK_DAYS = 730;
  const ymd = (ms) => new Date(ms).toISOString().substring(0, 10);
  const rawFrom     = fromDateOverride || store.shiprocket_sync_from_date || null;
  const fromDateYMD = rawFrom || ymd(Date.now() - DEFAULT_LOOKBACK_DAYS * 864e5); // YYYY-MM-DD for comparisons
  const fromDate    = toSrDate(fromDateYMD);                                       // DD-MMM-YYYY for API
  const toDate      = srDate(Date.now() + 864e5);                                  // tomorrow, DD-MMM-YYYY
  console.log(`[Shiprocket] Fetching /shipments from ${fromDate} to ${toDate} (DD-MMM-YYYY)`);

  // Token holder shared across pages; srFetch refreshes it on 401.
  let token = await getValidToken(store);
  const getToken = async (forceRefresh) => {
    if (forceRefresh) {
      console.log('[Shiprocket] Refreshing token mid-run');
      token = await getValidToken({ ...store, shiprocket_token: null, shiprocket_token_expires_at: null });
    }
    return token;
  };

  let page = 1;
  let totalUpserted = 0;
  let totalPages = 1;
  let failedPages = 0;

  while (page <= totalPages && page <= maxPages) {
    // Use /shipments — returns all historical records unlike /orders which caps at ~472.
    // DD-MMM-YYYY date format confirmed required; YYYY-MM-DD is silently ignored.
    const url = `${SR_BASE}/shipments?per_page=100&page=${page}&sort=DESC&sort_by=created_at`
      + `&from_date=${fromDate}&to_date=${toDate}`;

    let body;
    try {
      body = await srFetch(url, getToken);
    } catch (err) {
      failedPages++;
      console.warn(`[Shiprocket] ⚠ Page ${page} failed (${err.message}) — skipping`);
      page++;
      continue;
    }

    // /shipments response: body.data is the array (same as /orders)
    const shipments = Array.isArray(body.data) ? body.data : [];
    totalPages = body.meta?.pagination?.total_pages || totalPages;

    if (shipments.length === 0) break;

    // Client-side early stop: newest-first, so once all records on a page predate
    // the cutoff the rest of the pages will also be older.
    if (fromDateYMD) {
      const allOlderThanCutoff = shipments.every(s => {
        const d = (s.created_at || '').substring(0, 10);
        return d && d < fromDateYMD;
      });
      if (allOlderThanCutoff) {
        console.log(`[Shiprocket] All records on page ${page} predate ${fromDateYMD} — stopping early`);
        break;
      }
    }

    const filtered = fromDateYMD
      ? shipments.filter(s => !s.created_at || (s.created_at || '').substring(0, 10) >= fromDateYMD)
      : shipments;

    if (filtered.length === 0) { page++; continue; }

    // /shipments field mapping (differs from /orders):
    //   s.id              → shiprocket_shipment_id
    //   s.order_id        → shiprocket_order_id  (the parent order)
    //   s.awb_code        → awb
    //   s.courier_name    → courier
    //   s.channel_order_id→ shopify_order_name (same as /orders)
    //   s.status          → raw_status (string like "Delivered", "RTO")
    //   s.updated_at      → status_updated_at
    const rows = filtered.map(s => ({
      store_id: storeId,
      shiprocket_order_id: s.order_id ? String(s.order_id) : null,
      shiprocket_shipment_id: s.id ? String(s.id) : null,
      awb: s.awb_code || null,
      courier: s.courier_name || null,
      shopify_order_name: normalizeOrderName(s.channel_order_id),
      status: normalizeShiprocketStatus(s.status || ''),
      raw_status: s.status || null,
      status_code: typeof s.status_id === 'number' ? s.status_id : null,
      status_updated_at: s.updated_at ? new Date(s.updated_at).toISOString() : new Date().toISOString(),
      source: 'shiprocket',
      updated_at: new Date().toISOString()
    }));

    // Conflict on shiprocket_shipment_id — each shipment is unique by its own ID,
    // not the parent order ID (an order can have multiple shipment attempts).
    const { error: upErr } = await supabase
      .from('shipments')
      .upsert(rows, { onConflict: 'store_id,shiprocket_shipment_id' });

    if (upErr) {
      // Fall back to order_id conflict in case shiprocket_shipment_id column
      // doesn't have the unique constraint yet.
      const { error: upErr2 } = await supabase
        .from('shipments')
        .upsert(rows, { onConflict: 'store_id,shiprocket_order_id' });
      if (upErr2) {
        failedPages++;
        console.warn(`[Shiprocket] ⚠ Upsert failed page ${page} (${upErr2.message}) — skipping`);
        page++;
        continue;
      }
    }

    totalUpserted += rows.length;
    console.log(`[Shiprocket] Page ${page}/${totalPages} — upserted ${rows.length} (total ${totalUpserted})`);
    page++;
  }

  if (failedPages > 0) {
    console.warn(`[Shiprocket] ⚠ ${failedPages} page(s) skipped — count may be incomplete`);
  }

  await supabase.from('stores')
    .update({ shipments_synced_at: new Date().toISOString() })
    .eq('id', storeId);

  console.log(`[Shiprocket] ✅ Done. ${totalUpserted} shipments synced for store ${storeId} (${failedPages} page(s) skipped)`);
  return { success: true, totalSynced: totalUpserted, failedPages };
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
  const MO2 = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const srFmt2 = (ms) => { const d=new Date(ms); return `${String(d.getDate()).padStart(2,'0')}-${MO2[d.getMonth()]}-${d.getFullYear()}`; };
  const from2y = srFmt2(Date.now() - 730 * 864e5);
  const toTmrw = srFmt2(Date.now() + 864e5);
  let shipmentsPageCount = 0;
  let shipmentsTotalItems = 0;
  let nextUrl = `${SR_BASE}/shipments?per_page=100&page=1&sort=DESC&sort_by=created_at&from_date=${from2y}&to_date=${toTmrw}`;
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
