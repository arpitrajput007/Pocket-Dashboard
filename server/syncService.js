const { createClient } = require('@supabase/supabase-js');
const { decrypt } = require('./cryptoUtils');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || 'https://missing.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'MISSING_KEY'
);

/**
 * Main entry point — fetches store credentials then syncs orders from Shopify.
 * Uses incremental sync (updated_at_min) when last_synced_at is set on the store.
 * Falls back to full historical sync on first run.
 */
async function syncStoreData(storeId, { forceFullSync = false } = {}) {
  console.log(`[Sync] ▶ Starting sync for store: ${storeId}`);

  // Try fetching with shopify_client_id first, fall back without it
  let shopify_domain, encryptedToken, encryptedClientId, syncFromDate = '2000-01-01', lastSyncedAt = null;

  const { data: store, error } = await supabase
    .from('stores')
    .select('shopify_domain, shopify_access_token, shopify_client_id, dashboard_features, last_synced_at')
    .eq('id', storeId)
    .single();

  if (error) {
    console.warn('[Sync] shopify_client_id column may not exist, retrying:', error.message);
    const { data: store2, error: err2 } = await supabase
      .from('stores')
      .select('shopify_domain, shopify_access_token, dashboard_features, last_synced_at')
      .eq('id', storeId)
      .single();

    if (err2 || !store2) throw new Error(`Store not found: ${err2?.message}`);
    shopify_domain = store2.shopify_domain;
    encryptedToken = store2.shopify_access_token;
    encryptedClientId = null;
    lastSyncedAt = store2.last_synced_at || null;
    if (store2.dashboard_features?.sync_from_date) {
      syncFromDate = store2.dashboard_features.sync_from_date;
    }
  } else if (!store) {
    throw new Error(`Store not found for id=${storeId}`);
  } else {
    shopify_domain = store.shopify_domain;
    encryptedToken = store.shopify_access_token;
    encryptedClientId = store.shopify_client_id || null;
    lastSyncedAt = store.last_synced_at || null;
    if (store.dashboard_features?.sync_from_date) {
      syncFromDate = store.dashboard_features.sync_from_date;
    }
  }

  // Determine sync mode: incremental (updated_at_min) vs full (created_at_min)
  // Incremental sync fetches only orders modified since the last sync (±10 min buffer).
  // This turns a 5000-order full sync into a 10-20 order delta sync on subsequent runs.
  let syncUrl;
  const useIncremental = !forceFullSync && !!lastSyncedAt;

  if (useIncremental) {
    const buffer = 10 * 60 * 1000; // 10-minute buffer to catch edge cases
    const sinceMs = new Date(lastSyncedAt).getTime() - buffer;
    const sinceISO = new Date(sinceMs).toISOString();
    console.log(`[Sync] Incremental mode — fetching orders updated since ${sinceISO}`);
    syncUrl = `https://${shopify_domain || ''}.myshopify.com/admin/api/2024-01/orders.json?status=any&updated_at_min=${sinceISO}&limit=250`;
  }

  const accessToken = decrypt(encryptedToken);
  const clientId = encryptedClientId ? decrypt(encryptedClientId) : null;

  console.log(`[Sync] Store domain: ${shopify_domain}`);

  // Resolve final token (handle shpss_ OAuth client-secret flow)
  let finalToken = accessToken;
  if (clientId && accessToken && accessToken.startsWith('shpss_')) {
    console.log('[Sync] Attempting shpss_ token exchange...');
    try {
      const body = new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: accessToken
      });
      const res = await fetch(`https://${shopify_domain}.myshopify.com/admin/oauth/access_token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString()
      });
      if (res.ok) {
        const json = await res.json();
        if (json.access_token) {
          finalToken = json.access_token;
          console.log('[Sync] Token exchange successful');
        }
      } else {
        console.warn('[Sync] Token exchange failed, using original token');
      }
    } catch (e) {
      console.warn('[Sync] Token exchange error:', e.message);
    }
  }

  const headers = {
    'Content-Type': 'application/json',
    'X-Shopify-Access-Token': finalToken
  };

  // Verify credentials
  console.log(`[Sync] Verifying Shopify credentials...`);
  const verifyRes = await fetch(`https://${shopify_domain}.myshopify.com/admin/api/2024-01/shop.json`, {
    method: 'GET', headers
  });

  if (!verifyRes.ok) {
    const txt = await verifyRes.text();
    throw new Error(`Shopify auth failed (${verifyRes.status}): ${txt.substring(0, 200)}`);
  }
  console.log('[Sync] ✅ Credentials verified. Fetching orders...');

  // Paginate orders — use incremental URL if set, otherwise full historical sync
  if (!syncUrl) {
    syncUrl = `https://${shopify_domain}.myshopify.com/admin/api/2024-01/orders.json?status=any&created_at_min=${syncFromDate}T00:00:00Z&limit=250`;
    console.log(`[Sync] Full sync mode — fetching all orders since ${syncFromDate}`);
  }

  let url = syncUrl;
  let totalSynced = 0;
  let pageCount = 0;

  while (url) {
    const res = await fetch(url, { method: 'GET', headers });
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`Shopify orders API error (${res.status}): ${txt.substring(0, 300)}`);
    }

    const body = await res.json();
    const orders = body.orders;
    pageCount++;

    if (pageCount === 1 && (!orders || orders.length === 0)) {
      console.warn('[Sync] ⚠️  Shopify returned 0 orders on first page. Possible causes:');
      console.warn('  1. Your Shopify app token is missing the "read_orders" scope');
      console.warn('  2. The store genuinely has no orders');
      console.warn('  Fix: Shopify Admin → Apps → Your App → Configuration → add read_orders → reinstall → get new token');
      break;
    }

    if (!orders || orders.length === 0) break;


    const rows = orders.map(o => {
      // Extract the latest shipment_status from Shopify fulfillments
      // and encode as a synthetic '__ss:' tag so the dashboard can categorize orders
      // without a schema change (same approach as BnB source).
      const shipmentStatus = o.fulfillments && o.fulfillments.length > 0
        ? (o.fulfillments[o.fulfillments.length - 1].shipment_status || '')
        : '';

      // Remove any old __ss: synthetic tag first, then append the fresh one
      let tagsWithStatus = o.tags || '';
      tagsWithStatus = tagsWithStatus.split(',').filter(t => !t.trim().startsWith('__ss:')).join(',');
      if (shipmentStatus) {
        tagsWithStatus = tagsWithStatus
          ? `${tagsWithStatus},__ss:${shipmentStatus}`
          : `__ss:${shipmentStatus}`;
      }

      return {
        store_id: storeId,
        id: o.id,
        name: o.name,
        created_at: o.created_at,
        total_price: parseFloat(o.total_price || 0),
        tags: tagsWithStatus,
        fulfillment_status: o.fulfillment_status || null,
        financial_status: o.financial_status || null,
        cancelled_at: o.cancelled_at || null,
        shipping_title: o.shipping_lines && o.shipping_lines.length > 0
          ? (o.shipping_lines[0].title || '')
          : '',
        customer_fn: o.customer?.first_name || null,
        customer_ln: o.customer?.last_name || null,
        line_items: o.line_items || []
      };
    });

    const { error: upsertErr } = await supabase
      .from('orders')
      .upsert(rows, { onConflict: 'id' });

    if (upsertErr) {
      console.error('[Sync] Upsert error:', JSON.stringify(upsertErr));
      throw new Error(`DB upsert failed: ${upsertErr.message}`);
    }

    totalSynced += rows.length;
    console.log(`[Sync] Synced ${totalSynced} orders so far...`);

    const link = res.headers.get('Link');
    const next = link ? link.match(/<([^>]+)>;\s*rel="next"/) : null;
    url = next ? next[1] : null;
  }

  // Record successful sync time — enables incremental sync on next run
  await supabase
    .from('stores')
    .update({ last_synced_at: new Date().toISOString() })
    .eq('id', storeId);

  console.log(`[Sync] ✅ Done. Total synced: ${totalSynced} orders for store ${storeId} (${useIncremental ? 'incremental' : 'full'})`);
  return { success: true, totalSynced, mode: useIncremental ? 'incremental' : 'full' };
}

module.exports = { syncStoreData };
