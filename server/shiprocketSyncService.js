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
 * Pull Shiprocket orders/shipments for a store and upsert them into `shipments`.
 * Respects shiprocket_sync_from_date — only fetches orders on or after that date.
 * Stops paginating early once all orders on a page predate the cutoff.
 * @param {string} storeId
 * @param {object} opts  { maxPages, fromDateOverride }
 */
async function syncShiprocketShipments(storeId, { maxPages = 200, fromDateOverride = null } = {}) {
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

  // Resolve the date window.
  // IMPORTANT: Shiprocket's /orders endpoint only returns a recent default window
  // (~last 30-45 days) when NO from_date is sent. Sending no filter is therefore NOT
  // "fetch all" — it silently caps the pull to recent orders. So we ALWAYS send an
  // explicit from_date + to_date. When nothing is configured we default to a wide
  // 2-year lookback so the full history is pulled.
  // Shiprocket requires dates as DD-MMM-YYYY (e.g. 08-Jun-2024).
  // YYYY-MM-DD is silently ignored — the API returns only its default recent
  // window (~30 days) when the date can't be parsed. Confirmed via probe.
  const SR_MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const srDate = (ms) => {
    const d = new Date(ms);
    return `${String(d.getDate()).padStart(2,'0')}-${SR_MONTHS[d.getMonth()]}-${d.getFullYear()}`;
  };
  // Convert a stored YYYY-MM-DD string to DD-MMM-YYYY for the API.
  const toSrDate = (ymdStr) => {
    if (!ymdStr) return null;
    const [y, m, day] = ymdStr.split('-');
    return `${day}-${SR_MONTHS[parseInt(m, 10) - 1]}-${y}`;
  };

  const DEFAULT_LOOKBACK_DAYS = 730;
  const ymd = (ms) => new Date(ms).toISOString().substring(0, 10);
  const rawFrom    = fromDateOverride || store.shiprocket_sync_from_date || null;
  const fromDateYMD = rawFrom || ymd(Date.now() - DEFAULT_LOOKBACK_DAYS * 864e5); // YYYY-MM-DD for comparisons
  const fromDate   = toSrDate(fromDateYMD);                                        // DD-MMM-YYYY for API
  const toDate     = srDate(Date.now() + 864e5);                                   // tomorrow, DD-MMM-YYYY
  console.log(`[Shiprocket] Fetching orders from ${fromDate} to ${toDate} (DD-MMM-YYYY format)`);

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
    // Always pass an explicit from_date + to_date — otherwise Shiprocket caps the
    // response to a recent default window and the full history never syncs.
    const url = `${SR_BASE}/orders?per_page=100&page=${page}&sort=DESC&sort_by=created_at`
      + `&from_date=${fromDate}&to_date=${toDate}`;

    let body;
    try {
      body = await srFetch(url, getToken);
    } catch (err) {
      // Don't abort the whole sync on one bad page — log, count it, move on so the
      // remaining pages still get synced instead of leaving a partial, stuck count.
      failedPages++;
      console.warn(`[Shiprocket] ⚠ Page ${page} failed (${err.message}) — skipping`);
      page++;
      continue;
    }

    const orders = Array.isArray(body.data) ? body.data : [];
    totalPages = body.meta?.pagination?.total_pages || totalPages;

    if (orders.length === 0) break;

    // Client-side early stop: Shiprocket returns newest-first, so once we hit
    // an order older than fromDateYMD the rest of the pages will also be older.
    // Use YYYY-MM-DD (fromDateYMD) for date string comparison, not the API format.
    if (fromDateYMD) {
      const allOlderThanCutoff = orders.every(o => {
        const orderDate = (o.created_at || '').substring(0, 10);
        return orderDate && orderDate < fromDateYMD;
      });
      if (allOlderThanCutoff) {
        console.log(`[Shiprocket] All orders on page ${page} predate ${fromDateYMD} — stopping early`);
        break;
      }
    }

    // Filter out orders older than fromDateYMD before upserting
    const filteredOrders = fromDateYMD
      ? orders.filter(o => !o.created_at || (o.created_at || '').substring(0, 10) >= fromDateYMD)
      : orders;

    if (filteredOrders.length === 0) { page++; continue; }

    const rows = filteredOrders.map(o => {
      // shipments can be an array, a single object, or absent depending on order state
      let firstShipment = null;
      if (Array.isArray(o.shipments) && o.shipments.length > 0) firstShipment = o.shipments[0];
      else if (o.shipments && typeof o.shipments === 'object') firstShipment = o.shipments;

      const rawStatus = o.status || firstShipment?.status || '';

      return {
        store_id: storeId,
        shiprocket_order_id: String(o.id),
        shiprocket_shipment_id: firstShipment?.id ? String(firstShipment.id) : null,
        awb: firstShipment?.awb || o.awb || null,
        courier: firstShipment?.courier || o.courier_name || null,
        shopify_order_name: normalizeOrderName(o.channel_order_id),
        status: normalizeShiprocketStatus(rawStatus),
        raw_status: rawStatus || null,
        status_code: typeof o.status_code === 'number' ? o.status_code : null,
        status_updated_at: o.updated_at ? new Date(o.updated_at).toISOString() : new Date().toISOString(),
        source: 'shiprocket',
        updated_at: new Date().toISOString()
      };
    });

    const { error: upErr } = await supabase
      .from('shipments')
      .upsert(rows, { onConflict: 'store_id,shiprocket_order_id' });

    if (upErr) {
      // Skip this page's write but keep going — a single bad batch shouldn't strand
      // every later page and freeze the synced count.
      failedPages++;
      console.warn(`[Shiprocket] ⚠ Upsert failed on page ${page} (${upErr.message}) — skipping`);
      page++;
      continue;
    }

    totalUpserted += rows.length;
    console.log(`[Shiprocket] Page ${page}/${totalPages} — upserted ${rows.length} (total ${totalUpserted})`);
    page++;
  }

  if (failedPages > 0) {
    console.warn(`[Shiprocket] ⚠ ${failedPages} page(s) failed and were skipped — synced count may be incomplete until next run`);
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

  const variants = {
    A_no_date:               `per_page=50&page=1&sort=DESC&sort_by=created_at`,
    B_ddmmmyyyy_2y:          `per_page=50&page=1&sort=DESC&sort_by=created_at&from_date=${from2y}&to_date=${toTomorrow}`,
    C_ddmmmyyyy_1y:          `per_page=50&page=1&sort=DESC&sort_by=created_at&from_date=${from1y}&to_date=${toTomorrow}`,
    D_ddmmmyyyy_p100_2y:     `per_page=100&page=1&sort=DESC&sort_by=created_at&from_date=${from2y}&to_date=${toTomorrow}`,
    E_ddmmmyyyy_p100_1y:     `per_page=100&page=1&sort=DESC&sort_by=created_at&from_date=${from1y}&to_date=${toTomorrow}`,
  };

  const results = {};
  for (const [label, qs] of Object.entries(variants)) {
    try {
      const res = await fetch(`${SR_BASE}/orders?${qs}`, { headers: { Authorization: `Bearer ${token}` } });
      const body = await res.json().catch(() => ({}));
      const data = Array.isArray(body.data) ? body.data : [];
      const dates = data.map(o => (o.created_at || '').slice(0, 10)).filter(Boolean);
      results[label] = {
        status: res.status,
        returned: data.length,
        pagination: body.meta?.pagination || null,
        newestDate: dates[0] || null,
        oldestOnPage: dates[dates.length - 1] || null,
        message: body.message || null,
      };
    } catch (e) {
      results[label] = { error: e.message };
    }
    await sleep(600); // be gentle with rate limits
  }
  return { storeId, probedAt: new Date().toISOString(), results };
}

module.exports = {
  connectShiprocket,
  syncShiprocketShipments,
  normalizeShiprocketStatus,
  probeShiprocket
};
