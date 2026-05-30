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

  // Resolve the date cutoff: override > stored value > null (fetch all)
  const fromDate = fromDateOverride || store.shiprocket_sync_from_date || null;
  if (fromDate) console.log(`[Shiprocket] Fetching orders from ${fromDate} onwards`);

  let token = await getValidToken(store);

  let page = 1;
  let totalUpserted = 0;
  let totalPages = 1;

  while (page <= totalPages && page <= maxPages) {
    // Shiprocket supports from_date / to_date filters on the orders list
    let url = `${SR_BASE}/orders?per_page=100&page=${page}&sort=DESC&sort_by=created_at`;
    if (fromDate) url += `&from_date=${fromDate}`;
    let res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });

    // Token might have expired mid-run — refresh once and retry this page
    if (res.status === 401) {
      console.log('[Shiprocket] Token rejected (401) — refreshing and retrying');
      token = await getValidToken({ ...store, shiprocket_token: null, shiprocket_token_expires_at: null });
      res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    }

    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(`Shiprocket /orders failed (status ${res.status}): ${body.message || 'unknown error'}`);
    }

    const orders = Array.isArray(body.data) ? body.data : [];
    totalPages = body.meta?.pagination?.total_pages || totalPages;

    if (orders.length === 0) break;

    // Client-side early stop: Shiprocket returns newest-first, so once we hit
    // an order older than fromDate the rest of the pages will also be older.
    if (fromDate) {
      const allOlderThanCutoff = orders.every(o => {
        const orderDate = (o.created_at || '').substring(0, 10);
        return orderDate && orderDate < fromDate;
      });
      if (allOlderThanCutoff) {
        console.log(`[Shiprocket] All orders on page ${page} predate ${fromDate} — stopping early`);
        break;
      }
    }

    // Filter out orders older than fromDate before upserting
    const filteredOrders = fromDate
      ? orders.filter(o => !o.created_at || (o.created_at || '').substring(0, 10) >= fromDate)
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

    if (upErr) throw new Error(`Shipments upsert failed: ${upErr.message}`);

    totalUpserted += rows.length;
    console.log(`[Shiprocket] Page ${page}/${totalPages} — upserted ${rows.length} (total ${totalUpserted})`);
    page++;
  }

  await supabase.from('stores')
    .update({ shipments_synced_at: new Date().toISOString() })
    .eq('id', storeId);

  console.log(`[Shiprocket] ✅ Done. ${totalUpserted} shipments synced for store ${storeId}`);
  return { success: true, totalSynced: totalUpserted };
}

module.exports = {
  connectShiprocket,
  syncShiprocketShipments,
  normalizeShiprocketStatus
};
