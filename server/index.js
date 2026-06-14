const express = require('express');
const cors = require('cors');
const cron = require('node-cron');
const { createClient } = require('@supabase/supabase-js');
const { OpenAI } = require('openai');
const nodemailer = require('nodemailer');
const { syncStoreData } = require('./syncService');
const { connectShiprocket, syncShiprocketShipments, probeShiprocket } = require('./shiprocketSyncService');
const { encrypt, decrypt } = require('./cryptoUtils');

const VITE_SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://missing.supabase.co';
// Use the Service Role Key on the server — this bypasses RLS safely
// NEVER expose this key to the frontend/browser
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'MISSING_KEY';
const supabase = createClient(VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const app = express();
const PORT = process.env.PORT || 3001;

// ─── In-memory sync job tracker ───────────────────────────────────────────────
// Keeps the latest sync state per storeId so the UI can poll for live progress.
// Entries are kept for 10 minutes after completion then pruned.
const syncJobs = new Map();

// AbortControllers — one per store, cancelled via /api/sync-cancel/:storeId
const syncAbortControllers = new Map();

function startJob(storeId, type) {
  // Cancel any existing run first
  const prev = syncAbortControllers.get(storeId);
  if (prev) { try { prev.abort(); } catch(_) {} }
  const controller = new AbortController();
  syncAbortControllers.set(storeId, controller);

  const job = {
    running: true,
    type,                   // 'shopify' | 'shiprocket'
    startedAt: new Date().toISOString(),
    endedAt: null,
    phases: [],             // [{id, label, status, detail, pct}]
    logs:  [],              // [{time, msg}]  — last 80 lines
    result: null,
    error: null,
    cancelled: false,
  };
  syncJobs.set(storeId, job);
  return { job, signal: controller.signal };
}

function jobLog(job, msg) {
  job.logs.push({ time: new Date().toISOString(), msg });
  if (job.logs.length > 80) job.logs.shift();
}

function applyProgress(job, event, data) {
  const { phase, label, detail, resolved, total, count, page, mode, isFirstSync } = data || {};
  jobLog(job, detail || label || event);

  if (event === 'sync_mode') {
    // Store the sync mode on the job so the UI can display it
    job.syncMode = mode;        // 'full' | 'incremental'
    job.isFirstSync = !!isFirstSync;
    return;
  }
  if (event === 'phase_start') {
    const existing = job.phases.find(p => p.id === phase);
    if (existing) { existing.status = 'running'; existing.detail = detail || ''; }
    else job.phases.push({ id: phase, label: label || `Phase ${phase}`, status: 'running', detail: detail || '', pct: 0 });
  } else if (event === 'phase_progress') {
    const p = job.phases.find(p => p.id === phase);
    if (p) {
      p.detail = detail || p.detail;
      if (resolved !== undefined && total) p.pct = Math.round((resolved / total) * 100);
      else if (count !== undefined && page) p.pct = Math.min(95, page * 6);
    }
  } else if (event === 'phase_done') {
    const p = job.phases.find(p => p.id === phase);
    if (p) { p.status = 'done'; p.detail = detail || p.detail; p.pct = 100; }
    else job.phases.push({ id: phase, label: label || `Phase ${phase}`, status: 'done', detail: detail || '', pct: 100 });
  }
}

// Prune completed jobs older than 10 minutes
setInterval(() => {
  const cutoff = Date.now() - 10 * 60 * 1000;
  for (const [id, job] of syncJobs) {
    if (!job.running && job.endedAt && new Date(job.endedAt).getTime() < cutoff) {
      syncJobs.delete(id);
    }
  }
}, 5 * 60 * 1000);
// ──────────────────────────────────────────────────────────────────────────────

const corsOptions = {
  origin: process.env.NODE_ENV === 'production'
    ? [
        'https://pocketdashboard.app',
        'https://www.pocketdashboard.app',
        'https://admin.pocketdashboard.app',
      ]
    : '*',
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  credentials: true,
};
app.use(cors(corsOptions));
// 10MB body limit — screenshots for the ad-spend OCR endpoint can be 1-3MB
// once base64-encoded, so the default 100kb limit is too small.
app.use(express.json({ limit: '10mb' }));

/**
 * Registers Webhooks in Shopify automatically
 */
async function registerShopifyWebhooks(domain, accessToken, clientId = null) {
  const backendUrl = process.env.RENDER_EXTERNAL_URL || process.env.VITE_API_URL || 'https://pocket-dashboard-mwjn.onrender.com';
  const webhookUrl = `${backendUrl}/api/webhooks/shopify`;
  const topics = ['orders/create', 'orders/updated'];

  let finalAccessToken = accessToken;
  if (clientId && accessToken.startsWith('shpss_')) {
    const body = new URLSearchParams();
    body.append('grant_type', 'client_credentials');
    body.append('client_id', clientId);
    body.append('client_secret', accessToken);
    try {
      const exchangeRes = await fetch(`https://${domain}.myshopify.com/admin/oauth/access_token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString()
      });
      if (exchangeRes.ok) {
        const data = await exchangeRes.json();
        if (data.access_token) finalAccessToken = data.access_token;
      }
    } catch (e) {
      console.warn('Webhook token exchange error:', e.message);
    }
  }

  for (const topic of topics) {
    try {
      const res = await fetch(`https://${domain}.myshopify.com/admin/api/2024-01/webhooks.json`, {
        method: 'POST',
        headers: {
          'X-Shopify-Access-Token': finalAccessToken,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          webhook: { topic, address: webhookUrl, format: 'json' }
        })
      });
      const data = await res.json();
      if (!res.ok) {
        console.warn(`[Webhook] ${topic} warning for ${domain}:`, JSON.stringify(data.errors));
      } else {
        console.log(`[Webhook] ${topic} registered for ${domain}`);
      }
    } catch (err) {
      console.error(`[Webhook] Network error for ${topic}:`, err.message);
    }
  }
}

/**
 * POST /api/store
 * Validates Shopify credentials, then creates a store record in Supabase.
 */
app.post('/api/store', async (req, res) => {
  const { owner_id, store_name, shopify_domain, shopify_client_id, shopify_access_token, primary_color, dashboard_style, sync_from_date, sync_to_date } = req.body;

  if (!owner_id || !shopify_domain || !shopify_access_token) {
    return res.status(400).json({ error: 'Missing required fields: owner_id, shopify_domain, shopify_access_token' });
  }

  // Aggressively clean both domain and token — copy-paste often adds whitespace
  const cleanDomain = shopify_domain
    .replace(/https?:\/\//i, '')
    .replace('.myshopify.com', '')
    .replace(/\//g, '')
    .trim()
    .toLowerCase();

  const cleanToken = shopify_access_token.trim();

  if (!cleanDomain) {
    return res.status(400).json({ error: 'Invalid Shopify domain' });
  }
  if (!cleanToken) {
    return res.status(400).json({ error: 'Access token cannot be empty' });
  }

  console.log(`[Store Connect] Attempting to connect domain="${cleanDomain}" token_prefix="${cleanToken.substring(0, 8)}..." token_length=${cleanToken.length}`);

  // Trial abuse protection: Check if domain already registered
  const { data: existingStore } = await supabase
    .from('stores')
    .select('id, owner_id')
    .eq('shopify_domain', cleanDomain)
    .maybeSingle();

  if (existingStore) {
    if (existingStore.owner_id === owner_id) {
      // Same owner reconnecting with NEW token — update it instead of returning stale record
      console.log(`[Store Connect] Same owner reconnecting — updating token for store ${existingStore.id}`);
      const encryptedToken = encrypt(cleanToken);
      await supabase.from('stores').update({ shopify_access_token: encryptedToken }).eq('id', existingStore.id);
      const { data: ownStore } = await supabase.from('stores').select('*').eq('id', existingStore.id).single();
      return res.json(ownStore);
    }
    return res.status(403).json({
      error: 'This Shopify store is already connected to another account.'
    });
  }

  // Resolve the actual API token to use for validation + API calls
  // Newer Shopify Dev Dashboard apps give shpss_ (client secret) + Client ID
  // These require an OAuth client_credentials exchange to get a real shpat_ token
  let apiToken = cleanToken;
  const cleanClientId = shopify_client_id ? shopify_client_id.trim() : null;

  if (cleanToken.startsWith('shpss_') && cleanClientId) {
    console.log(`[Store Connect] shpss_ token detected — attempting OAuth client_credentials exchange...`);
    try {
      const body = new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: cleanClientId,
        client_secret: cleanToken
      });
      const exchangeRes = await fetch(`https://${cleanDomain}.myshopify.com/admin/oauth/access_token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString()
      });
      const exchangeBody = await exchangeRes.json().catch(() => ({}));
      console.log(`[Store Connect] Token exchange response (${exchangeRes.status}):`, JSON.stringify(exchangeBody).substring(0, 200));

      if (exchangeRes.ok && exchangeBody.access_token) {
        apiToken = exchangeBody.access_token;
        console.log(`[Store Connect] ✅ Token exchange successful. Got token starting with: ${apiToken.substring(0, 8)}`);
      } else {
        const errMsg = exchangeBody.error_description || exchangeBody.error || `Status ${exchangeRes.status}`;
        console.error(`[Store Connect] Token exchange failed: ${errMsg}`);
        return res.status(401).json({
          error: `OAuth token exchange failed: ${errMsg}. Make sure your Client ID and Client Secret (shpss_) are correct.`
        });
      }
    } catch (exchErr) {
      console.error('[Store Connect] Token exchange network error:', exchErr.message);
      return res.status(502).json({ error: `Network error during token exchange: ${exchErr.message}` });
    }
  }

  // Validate the resolved token against Shopify
  try {
    console.log(`[Store Connect] Validating token (prefix: ${apiToken.substring(0, 8)}) for ${cleanDomain}...`);
    const verifyRes = await fetch(`https://${cleanDomain}.myshopify.com/admin/api/2024-01/shop.json`, {
      method: 'GET',
      headers: { 'X-Shopify-Access-Token': apiToken, 'Content-Type': 'application/json' }
    });

    if (!verifyRes.ok) {
      const errBody = await verifyRes.text();
      console.error(`[Store Connect] Validation failed (${verifyRes.status}) for ${cleanDomain}:`, errBody.substring(0, 300));
      return res.status(401).json({
        error: `Could not connect to Shopify. Please check your domain and access token. (Status: ${verifyRes.status})`
      });
    }
    const shopData = await verifyRes.json();
    console.log(`[Store Connect] ✅ Credentials verified. Shop: "${shopData.shop?.name}"`);
  } catch (verifyErr) {
    console.error('[Store Connect] Network error during credential check:', verifyErr.message);
    return res.status(502).json({ error: `Network error while connecting to Shopify: ${verifyErr.message}` });
  }

  // Encrypt credentials for storage
  // Store original shpss_ (client secret) so future syncs can re-exchange
  // Store clientId so sync service can perform exchange
  const encryptedToken = encrypt(cleanToken);   // original shpss_ or shpat_
  const encryptedClientId = cleanClientId ? encrypt(cleanClientId) : null;

  const { data, error } = await supabase
    .from('stores')
    .insert([{
      owner_id,
      store_name: store_name || cleanDomain,
      shopify_domain: cleanDomain,
      shopify_client_id: encryptedClientId,
      shopify_access_token: encryptedToken,
      primary_color: primary_color || '#6366f1',
      dashboard_style: dashboard_style || 'dark-modern',
      dashboard_features: {
        daily_view: true,
        scoreboard: true,
        weekly_view: false,
        monthly_view: false,
        all_time_view: false,
        business_analytics: true,
        sync_from_date: sync_from_date || '2000-01-01',
        sync_to_date: sync_to_date || null
      }
    }])
    .select()
    .single();

  if (error) {
    console.error('[Store Connect] Failed to create store record:', error);
    return res.status(500).json({ error: error.message });
  }

  // Register webhooks (non-blocking) — use the resolved API token
  registerShopifyWebhooks(cleanDomain, apiToken, cleanClientId).catch(err =>
    console.warn('[Store Connect] Webhook registration failed (non-critical):', err.message)
  );

  console.log(`[Store Connect] ✅ Store created: ${data.id} for ${cleanDomain}`);
  res.json(data);
});


/**
 * PUT /api/store/:id
 * Edit Store Connection Credentials — validates new creds before saving
 */
app.put('/api/store/:id', async (req, res) => {
  const { id } = req.params;
  const { shopify_domain, shopify_client_id, shopify_access_token } = req.body;

  if (!id) return res.status(400).json({ error: 'Store ID is required' });
  if (!shopify_domain && !shopify_access_token) {
    return res.status(400).json({ error: 'At least shopify_domain or shopify_access_token must be provided' });
  }

  // Fetch current store to merge fields
  const { data: currentStore, error: fetchErr } = await supabase
    .from('stores')
    .select('shopify_domain, shopify_access_token, shopify_client_id')
    .eq('id', id)
    .single();

  if (fetchErr || !currentStore) {
    return res.status(404).json({ error: 'Store not found' });
  }

  const cleanDomain = shopify_domain
    ? shopify_domain.replace('.myshopify.com', '').trim().toLowerCase()
    : currentStore.shopify_domain;

  const plainToken = shopify_access_token ? shopify_access_token.trim() : null;
  const plainClientId = shopify_client_id ? shopify_client_id.trim() : null;

  // Validate credentials if either domain or token changed
  if (shopify_domain || shopify_access_token) {
    // Use new token if provided, else we can't re-validate without decrypting old one
    // Only validate if we have a new plain-text token
    if (plainToken) {
      try {
        const verifyRes = await fetch(`https://${cleanDomain}.myshopify.com/admin/api/2024-01/shop.json`, {
          method: 'GET',
          headers: {
            'X-Shopify-Access-Token': plainToken,
            'Content-Type': 'application/json'
          }
        });

        if (!verifyRes.ok) {
          const errBody = await verifyRes.text();
          console.error(`[Store Edit] Credential validation failed (${verifyRes.status}):`, errBody.substring(0, 200));
          return res.status(401).json({
            error: `Could not connect to Shopify with new credentials. (Status: ${verifyRes.status})`
          });
        }
        console.log(`[Store Edit] New credentials verified for ${cleanDomain}`);
      } catch (verifyErr) {
        console.error('[Store Edit] Network error during credential check:', verifyErr.message);
        return res.status(502).json({
          error: `Network error while validating new credentials: ${verifyErr.message}`
        });
      }
    }
  }

  const updates = {};
  updates.shopify_domain = cleanDomain;
  if (plainToken) updates.shopify_access_token = encrypt(plainToken);
  if (plainClientId) updates.shopify_client_id = encrypt(plainClientId);
  else if (shopify_client_id === '') updates.shopify_client_id = null; // Allow clearing

  const { error: updateErr } = await supabase.from('stores').update(updates).eq('id', id);
  if (updateErr) {
    console.error('[Store Edit] Failed to update store:', updateErr);
    return res.status(500).json({ error: updateErr.message });
  }

  // Register webhooks with new credentials (non-blocking)
  if (plainToken) {
    registerShopifyWebhooks(cleanDomain, plainToken, plainClientId).catch(err =>
      console.warn('[Store Edit] Webhook registration failed (non-critical):', err.message)
    );
  }

  res.json({ success: true });
});

/**
 * DELETE /api/store/:id
 * Disconnect/Delete Store — removes ALL associated data to bypass FK constraints
 */
app.delete('/api/store/:id', async (req, res) => {
  const { id } = req.params;

  if (!id) return res.status(400).json({ error: 'Store ID is required' });

  console.log(`[Store Delete] Starting delete for store id=${id}`);

  try {
    // Step 1: Delete orders (has store_id FK)
    const { error: ordersErr } = await supabase.from('orders').delete().eq('store_id', id);
    if (ordersErr) {
      console.error('[Store Delete] orders delete error:', JSON.stringify(ordersErr));
      // Don't abort — try to continue
    } else {
      console.log(`[Store Delete] orders cleared for store ${id}`);
    }

    // Step 2: Delete products (has store_id FK)
    const { error: productsErr } = await supabase.from('products').delete().eq('store_id', id);
    if (productsErr) {
      console.error('[Store Delete] products delete error:', JSON.stringify(productsErr));
    } else {
      console.log(`[Store Delete] products cleared for store ${id}`);
    }

    // Step 3: Try any other FK tables (ignore if they don't exist)
    for (const table of ['ad_spends', 'daily_settings']) {
      const { error: tErr } = await supabase.from(table).delete().eq('store_id', id);
      if (tErr && tErr.code !== '42P01') {
        console.warn(`[Store Delete] ${table} delete warning:`, tErr.message);
      }
    }

    // Step 4: Delete the store record itself
    const { error: storeErr, data: storeData } = await supabase
      .from('stores')
      .delete()
      .eq('id', id)
      .select();

    if (storeErr) {
      console.error('[Store Delete] FAILED to delete store record:', JSON.stringify(storeErr));
      return res.status(500).json({
        error: `Failed to delete store: ${storeErr.message}`,
        code: storeErr.code,
        details: storeErr.details,
        hint: storeErr.hint
      });
    }

    console.log(`[Store Delete] ✅ Store ${id} deleted. Rows affected:`, storeData?.length ?? 'unknown');
    res.json({ success: true });

  } catch (err) {
    console.error('[Store Delete] Unexpected exception:', err);
    res.status(500).json({ error: `Unexpected error: ${err.message}` });
  }
});


/**
 * POST /api/webhooks/shopify
 * Listens for orders/create and orders/updated from Shopify
 * Uses the SAME schema as syncService for consistency
 */
app.post('/api/webhooks/shopify', async (req, res) => {
  // Always respond 200 immediately to Shopify
  res.status(200).send('OK');

  try {
    const shopDomain = req.headers['x-shopify-shop-domain'];
    const topic = req.headers['x-shopify-topic'];
    const orderData = req.body;

    console.log(`[Webhook] Received ${topic} from ${shopDomain}`);

    if (!shopDomain || !orderData || !orderData.id) return;

    const cleanDomain = shopDomain.replace('.myshopify.com', '').toLowerCase();
    const { data: store } = await supabase
      .from('stores')
      .select('id')
      .eq('shopify_domain', cleanDomain)
      .single();

    if (!store) {
      console.warn(`[Webhook] No store found for domain: ${cleanDomain}`);
      return;
    }

    // Use the SAME schema as syncService
    const toInsert = [{
      store_id: store.id,
      id: orderData.id,                                        // bigint shopify order id
      name: orderData.name,                                    // e.g. "#1001"
      created_at: orderData.created_at,
      total_price: parseFloat(orderData.total_price || 0),
      tags: orderData.tags || '',                              // comma-separated string
      customer_fn: orderData.customer?.first_name || null,
      customer_ln: orderData.customer?.last_name || null,
      line_items: orderData.line_items || []                   // jsonb array
    }];

    const { error } = await supabase.from('orders').upsert(toInsert, { onConflict: 'id' });
    if (error) {
      console.error('[Webhook] Failed to upsert order:', error);
    } else {
      console.log(`[Webhook] ✅ Order ${orderData.id} (${orderData.name}) saved for store ${store.id}`);
    }
  } catch (err) {
    console.error('[Webhook] Error handling webhook:', err);
  }
});

/**
 * POST /api/sync/:storeId
 * Triggers Shopify → Supabase order sync. Waits for completion and returns result.
 */
app.post('/api/sync/:storeId', async (req, res) => {
  const { storeId } = req.params;
  if (!storeId) return res.status(400).json({ error: 'storeId is required' });

  const forceFullSync = req.query.full === 'true';
  const fromDate = req.body?.fromDate || null;
  const toDate   = req.body?.toDate   || null;
  const dateStr  = fromDate ? ` | range: ${fromDate} → ${toDate || 'today'}` : '';
  console.log(`[Sync API] Triggered for store: ${storeId} full=${forceFullSync}${dateStr}`);

  const existing = syncJobs.get(storeId);
  if (existing?.running && existing.type === 'shopify') {
    return res.json({ status: 'already_running', storeId });
  }

  const { job } = startJob(storeId, 'shopify');
  job.phases = [
    { id: 1, label: 'Fetching orders from Shopify', status: 'running', detail: 'Connecting…', pct: 0 },
    { id: 2, label: 'Saving to database',            status: 'pending', detail: '',            pct: 0 },
  ];
  jobLog(job, `Shopify sync started${dateStr}`);
  res.json({ status: 'sync_started', storeId });

  syncStoreData(storeId, { forceFullSync, fromDate, toDate }).then(result => {
    job.running  = false;
    job.endedAt  = new Date().toISOString();
    job.result   = result;
    job.phases.forEach(p => { p.status = 'done'; p.pct = 100; });
    job.phases[0].detail = `${result.totalSynced} orders fetched`;
    job.phases[1].detail = `${result.totalSynced} orders saved`;
    jobLog(job, `✅ Done — ${result.totalSynced} orders synced (${result.mode})`);
    syncAbortControllers.delete(storeId);
    console.log(`[Sync API] ✅ Completed for ${storeId}:`, result);
  }).catch(err => {
    job.running = false;
    job.endedAt = new Date().toISOString();
    job.error   = err.message;
    job.phases.forEach(p => { if (p.status === 'running') p.status = 'error'; });
    jobLog(job, `❌ Error: ${err.message}`);
    syncAbortControllers.delete(storeId);
    console.error(`[Sync API] ❌ Failed for ${storeId}:`, err.message);
  });
});

/**
 * POST /api/sync-products/:storeId
 * Pulls the catalog (products + first variant/image) from Shopify into Supabase.
 * Preserves cost_price the owner has entered — sync only refreshes
 * title/sku/selling_price/status/image_url.
 * Owner-created pack rows (parent_product_id IS NOT NULL) are left untouched.
 */
app.post('/api/sync-products/:storeId', async (req, res) => {
  const { storeId } = req.params;
  if (!storeId) return res.status(400).json({ error: 'storeId is required' });

  console.log(`[ProductSync] ▶ Triggered for store: ${storeId}`);
  try {
    // 1. Load credentials (mirrors syncService pattern).
    const { data: store, error: storeErr } = await supabase
      .from('stores')
      .select('shopify_domain, shopify_access_token, shopify_client_id')
      .eq('id', storeId)
      .single();
    if (storeErr || !store) throw new Error(`Store not found: ${storeErr?.message}`);

    const accessToken = decrypt(store.shopify_access_token);
    const clientId = store.shopify_client_id ? decrypt(store.shopify_client_id) : null;

    // shpss_ exchange (same as orders sync)
    let finalToken = accessToken;
    if (clientId && accessToken && accessToken.startsWith('shpss_')) {
      const body = new URLSearchParams({ grant_type: 'client_credentials', client_id: clientId, client_secret: accessToken });
      try {
        const r = await fetch(`https://${store.shopify_domain}.myshopify.com/admin/oauth/access_token`, {
          method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: body.toString()
        });
        if (r.ok) {
          const j = await r.json();
          if (j.access_token) finalToken = j.access_token;
        }
      } catch (e) { console.warn('[ProductSync] Token exchange failed:', e.message); }
    }

    const headers = { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': finalToken };

    // 2. Existing cost_prices keyed by shopify_product_id (so we don't overwrite them).
    const { data: existing } = await supabase
      .from('products')
      .select('shopify_product_id, cost_price')
      .eq('store_id', storeId)
      .is('parent_product_id', null);
    const costMap = new Map((existing || []).map(p => [p.shopify_product_id, p.cost_price]));

    // 3. Paginate Shopify Products API.
    let url = `https://${store.shopify_domain}.myshopify.com/admin/api/2024-01/products.json?limit=250`;
    let totalSynced = 0;
    const seenIds = new Set();

    while (url) {
      const r = await fetch(url, { method: 'GET', headers });
      if (!r.ok) {
        const txt = await r.text();
        throw new Error(`Shopify products API error (${r.status}): ${txt.substring(0, 300)}`);
      }
      const body = await r.json();
      const products = body.products || [];
      if (products.length === 0) break;

      const rows = products.map(p => {
        const firstVariant = (p.variants && p.variants[0]) || {};
        const firstImage = (p.images && p.images[0]) || {};
        const shopifyId = String(p.id);
        seenIds.add(shopifyId);
        return {
          store_id: storeId,
          shopify_product_id: shopifyId,
          title: p.title || 'Untitled',
          sku: firstVariant.sku || '',
          selling_price: parseFloat(firstVariant.price || 0),
          // Preserve owner's cost_price; default 0 for new rows.
          cost_price: costMap.has(shopifyId) ? costMap.get(shopifyId) : 0,
          status: p.status || 'active',
          image_url: firstImage.src || null,
          parent_product_id: null,
          pack_size: null,
        };
      });

      const { error: upErr } = await supabase
        .from('products')
        .upsert(rows, { onConflict: 'store_id,shopify_product_id' });
      if (upErr) throw new Error(`Upsert failed: ${upErr.message}`);

      totalSynced += rows.length;
      const link = r.headers.get('Link');
      const next = link ? link.match(/<([^>]+)>;\s*rel="next"/) : null;
      url = next ? next[1] : null;
    }

    // 4. Mark products that disappeared from Shopify as archived (don't delete — they may
    //    still appear in historical orders, and the owner may have pack rows hanging off them).
    if (seenIds.size > 0) {
      const { data: storedBases } = await supabase
        .from('products')
        .select('shopify_product_id')
        .eq('store_id', storeId)
        .is('parent_product_id', null);
      const stale = (storedBases || [])
        .map(p => p.shopify_product_id)
        .filter(id => !id.startsWith('custom_') && !seenIds.has(id));
      if (stale.length > 0) {
        await supabase
          .from('products')
          .update({ status: 'archived' })
          .eq('store_id', storeId)
          .in('shopify_product_id', stale);
        console.log(`[ProductSync] Marked ${stale.length} missing products as archived`);
      }
    }

    await supabase.from('stores').update({ products_synced_at: new Date().toISOString() }).eq('id', storeId);

    console.log(`[ProductSync] ✅ Done. Synced ${totalSynced} products for store ${storeId}`);
    res.json({ status: 'sync_complete', storeId, totalSynced });
  } catch (err) {
    console.error(`[ProductSync] ❌ Failed for ${storeId}:`, err.message);
    res.status(500).json({ status: 'sync_failed', error: err.message });
  }
});

/**
 * GET /api/test-creds
 * Quick credential test: ?domain=bnb-toys&token=shpat_xxx
 * Tests if Shopify accepts the credentials without saving anything
 */
app.get('/api/test-creds', async (req, res) => {
  const domain = (req.query.domain || '').replace('.myshopify.com','').trim().toLowerCase();
  const token = (req.query.token || '').trim();
  if (!domain || !token) return res.json({ error: 'Pass ?domain=bnb-toys&token=shpat_xxx' });

  console.log(`[Test Creds] domain=${domain} token_prefix=${token.substring(0,8)} length=${token.length}`);
  try {
    const r = await fetch(`https://${domain}.myshopify.com/admin/api/2024-01/shop.json`, {
      headers: { 'X-Shopify-Access-Token': token }
    });
    const body = await r.json().catch(() => ({}));
    res.json({
      status: r.status,
      ok: r.ok,
      shopName: body.shop?.name,
      errors: body.errors || null
    });
  } catch(e) {
    res.json({ error: e.message });
  }
});

/**
 * GET /api/debug/:domain
 * Diagnostic: find store by shopify domain, test credentials + orders fetch
 */
app.get('/api/debug/:domain', async (req, res) => {
  const { domain } = req.params;
  const { decrypt } = require('./cryptoUtils');
  const result = { domain, steps: {} };

  try {
    // Find store by domain (more reliable than UUID after re-connect)
    const { data: stores, error: storeErr } = await supabase
      .from('stores')
      .select('id, shopify_domain, shopify_access_token, store_name, owner_id')
      .ilike('shopify_domain', `%${domain}%`);

    if (storeErr) {
      result.steps.db = { ok: false, error: storeErr.message };
      return res.json(result);
    }

    if (!stores || stores.length === 0) {
      result.steps.db = { ok: false, error: `No store found matching domain "${domain}"` };
      return res.json(result);
    }

    const store = stores[0];
    result.steps.db = {
      ok: true,
      storeId: store.id,
      domain: store.shopify_domain,
      storeName: store.store_name,
      hasToken: !!store.shopify_access_token
    };

    // Decrypt token
    const rawToken = store.shopify_access_token || '';
    const decrypted = decrypt(rawToken);
    result.steps.decrypt = {
      storedPrefix: rawToken.substring(0, 8),
      decryptedPrefix: decrypted?.substring(0, 8),
      decryptedLength: decrypted?.length,
      looksEncrypted: rawToken.includes(':'),
      looksLikeShopifyToken: decrypted?.startsWith('shpat_') || decrypted?.startsWith('shpss_') || decrypted?.startsWith('shpca_')
    };

    const d = store.shopify_domain;
    const token = decrypted;
    const headers = { 'X-Shopify-Access-Token': token, 'Content-Type': 'application/json' };

    // Test shop.json
    const shopRes = await fetch(`https://${d}.myshopify.com/admin/api/2024-01/shop.json`, { headers });
    result.steps.shopJson = { status: shopRes.status, ok: shopRes.ok };
    if (!shopRes.ok) result.steps.shopJson.body = (await shopRes.text()).substring(0, 200);

    // Test orders count
    const countRes = await fetch(`https://${d}.myshopify.com/admin/api/2024-01/orders/count.json?status=any`, { headers });
    result.steps.ordersCount = { status: countRes.status, ok: countRes.ok };
    result.steps.ordersCount.body = await countRes.json().catch(() => ({}));

    // Test orders fetch (1 order)
    const ordersRes = await fetch(`https://${d}.myshopify.com/admin/api/2024-01/orders.json?status=any&limit=1`, { headers });
    result.steps.ordersFetch = { status: ordersRes.status };
    const ordersBody = await ordersRes.json().catch(() => ({}));
    result.steps.ordersFetch.orderCount = ordersBody.orders?.length ?? 'error';
    result.steps.ordersFetch.errors = ordersBody.errors || null;
    if (ordersBody.orders?.[0]) {
      result.steps.ordersFetch.firstOrder = { id: ordersBody.orders[0].id, name: ordersBody.orders[0].name };
    }

    result.success = true;
  } catch (e) {
    result.error = e.message;
  }

  res.json(result);
});



/**
 * GET /api/store/:id/status
 * Returns live connection status for a store (useful for post-connect verification)
 */
app.get('/api/store/:id/status', async (req, res) => {
  const { id } = req.params;

  const { data: store, error } = await supabase
    .from('stores')
    .select('id, store_name, shopify_domain, created_at')
    .eq('id', id)
    .single();

  if (error || !store) return res.status(404).json({ error: 'Store not found' });

  // Count orders to confirm sync worked
  const { count } = await supabase
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .eq('store_id', id);

  res.json({
    store,
    orderCount: count || 0,
    connected: true
  });
});

/**
 * POST /api/copilot
 * Handles AI Co-Pilot chat messages with RAG
 */
app.post('/api/copilot', async (req, res) => {
  const { storeId, messages } = req.body;

  if (!storeId || !messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Missing storeId or messages' });
  }

  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: orders, error } = await supabase
      .from('orders')
      .select('id, total_price, created_at, tags, line_items')
      .eq('store_id', storeId)
      .gte('created_at', thirtyDaysAgo.toISOString());

    if (error) throw error;

    let totalRevenue = 0;
    let totalOrders = orders.length;
    let rtoCount = 0;

    orders.forEach(o => {
      totalRevenue += parseFloat(o.total_price || 0);
      const tags = (o.tags || '').toLowerCase();
      if (tags.includes('rto') || tags.includes('return to origin') || tags.includes('returned')) {
        rtoCount++;
      }
    });

    const rtoRate = totalOrders > 0 ? ((rtoCount / totalOrders) * 100).toFixed(1) : 0;

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const systemPrompt = `You are the AI Co-Pilot for a D2C E-commerce dashboard called "Pocket Dashboard".
You are an expert in D2C e-commerce, specifically in the Indian market (handling COD, RTOs, Net Profit).
Here is the live data context for this user's store over the last 30 days:
- Total Orders: ${totalOrders}
- Total Revenue: ₹${totalRevenue.toLocaleString('en-IN')}
- RTO / Returned Orders: ${rtoCount} (${rtoRate}%)

Your job is to answer the user's questions about their business using this context.
Keep your answers concise, highly actionable, and professional. Use formatting (bullet points, bold text) where appropriate.`;

    const chatResponse = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages.map(m => ({ role: m.role, content: m.content }))
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    res.json({ reply: chatResponse.choices[0].message.content });

  } catch (err) {
    console.error('[Copilot Error]', err);
    res.status(500).json({ error: 'Failed to process AI request.' });
  }
});

/**
 * POST /api/ad-spend/extract
 * OCR an ad-platform screenshot via GPT-4o Vision and return structured spend.
 * Body: { storeId, dateStr (YYYY-MM-DD), imageBase64, mimeType }
 * Returns: { platform, amount, currency, confidence, notes }
 *
 * The endpoint does NOT save to ad_costs by itself — the frontend lets the
 * owner review the extraction before committing. This keeps the workflow
 * "AI suggests, human confirms" rather than blind automation.
 */
app.post('/api/ad-spend/extract', async (req, res) => {
  const { storeId, dateStr, imageBase64, mimeType, productTitles } = req.body || {};
  if (!storeId || !dateStr || !imageBase64) {
    return res.status(400).json({ error: 'storeId, dateStr and imageBase64 are required' });
  }
  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({ error: 'OpenAI API key not configured on server' });
  }

  const dataUrl = imageBase64.startsWith('data:')
    ? imageBase64
    : `data:${mimeType || 'image/png'};base64,${imageBase64}`;

  // Trim product list — large lists waste tokens and confuse matching.
  const products = Array.isArray(productTitles) ? productTitles.slice(0, 40).filter(t => typeof t === 'string' && t.trim()) : [];

  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const systemPrompt = `You are an OCR assistant that extracts ad-spend data from screenshots of advertising dashboards (Meta Ads Manager, Google Ads, TikTok Ads, etc).

Your job:
1. Identify the platform from UI cues:
   - "meta": Meta Ads Manager / Facebook Ads (blue, Facebook/Instagram icons, "Ads Manager")
   - "google": Google Ads (multi-color G logo, "Google Ads" header)
   - "youtube": YouTube Ads (red play button branding) — only if it's a YouTube-specific view
   - "tiktok": TikTok Ads Manager (black UI)
   - "other": anything else

2. Extract the TOTAL ad spend visible (usually labeled "Amount spent", "Total spend", "Cost", or the top-of-page summary).

3. If campaign-level / ad-set-level breakdown is visible AND a list of the user's product titles is provided, attempt to MATCH each campaign row to one of the user's products. Only return matches you are CONFIDENT about — campaign names usually contain the product name as a substring or close variant (e.g. "BNB_Conv_Paper-Paint_May25" matches "BNB Paper Paint for kids"). If no clear match, skip that campaign — do NOT force matches.

Return STRICT JSON (no markdown, no fences):
{
  "platform": "meta" | "google" | "youtube" | "tiktok" | "other",
  "amount": <number, no symbols/commas>,
  "currency": "INR" | "USD" | "EUR" | <ISO code>,
  "confidence": <0-1>,
  "notes": <1 short sentence>,
  "productSplits": { "<exact product title from the provided list>": <amount>, ... }
}

Rules:
- "productSplits" keys MUST match the provided product titles exactly (copy/paste them).
- If no product list is provided OR no clear matches exist, productSplits = {}.
- The sum of productSplits should be <= amount. They don't have to add up exactly (some campaigns may not match any product).
- Currency defaults to "INR" if you see ₹ or "Rs".
- If you can't extract a clear total with >= 0.5 confidence, return amount: 0.
- Output JSON only.`;

    const userText = products.length > 0
      ? `Screenshot date: ${dateStr}.\n\nThe user's products are:\n${products.map((t, i) => `${i+1}. ${t}`).join('\n')}\n\nExtract total spend and match campaigns to these products if visible.`
      : `Screenshot date: ${dateStr}. Extract the total ad spend. No product list provided — return productSplits: {}.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: [
            { type: 'text', text: userText },
            { type: 'image_url', image_url: { url: dataUrl, detail: 'high' } },
          ],
        },
      ],
      temperature: 0,
      max_tokens: 700,
      response_format: { type: 'json_object' },
    });

    const raw = completion.choices[0]?.message?.content || '{}';
    let parsed;
    try { parsed = JSON.parse(raw); }
    catch { return res.status(500).json({ error: 'Vision model returned non-JSON', raw }); }

    // Sanitize
    const platform = ['meta', 'google', 'youtube', 'tiktok', 'other'].includes(parsed.platform) ? parsed.platform : 'other';
    const amount = Number(parsed.amount) || 0;
    const currency = (parsed.currency || 'INR').toString().toUpperCase().slice(0, 4);
    const confidence = Math.max(0, Math.min(1, Number(parsed.confidence) || 0));
    const notes = (parsed.notes || '').toString().slice(0, 300);

    // Filter productSplits: must be in the supplied product list, must be > 0.
    const productSplits = {};
    if (parsed.productSplits && typeof parsed.productSplits === 'object' && products.length > 0) {
      const allowed = new Set(products);
      Object.entries(parsed.productSplits).forEach(([title, val]) => {
        const n = Number(val);
        if (allowed.has(title) && n > 0) productSplits[title] = n;
      });
    }

    console.log(`[AdOCR] storeId=${storeId} date=${dateStr} → platform=${platform} amount=${amount} ${currency} conf=${confidence} productMatches=${Object.keys(productSplits).length}`);
    res.json({ platform, amount, currency, confidence, notes, productSplits });
  } catch (err) {
    console.error('[AdOCR Error]', err.message);
    res.status(500).json({ error: 'OCR failed: ' + err.message });
  }
});

// ============================================================================
// SHIPROCKET INTEGRATION (Phase 1)
// Connects a store's Shiprocket account to fetch carrier-verified shipment
// status. Shiprocket is treated as the source of truth for delivery status.
// ============================================================================

/**
 * POST /api/shiprocket/connect/:storeId
 * Body: { email, password }  — the store owner's Shiprocket API-user credentials.
 * Validates them with a live login before storing (encrypted).
 */
app.post('/api/shiprocket/connect/:storeId', async (req, res) => {
  const { storeId } = req.params;
  const { email, password, syncFromDate } = req.body || {};
  if (!storeId) return res.status(400).json({ error: 'storeId is required' });
  if (!email || !password) return res.status(400).json({ error: 'Shiprocket email and password are required' });

  // Validate syncFromDate format (YYYY-MM-DD) if provided
  const cleanFromDate = syncFromDate && /^\d{4}-\d{2}-\d{2}$/.test(syncFromDate.trim())
    ? syncFromDate.trim() : null;

  try {
    await connectShiprocket(storeId, email, password, cleanFromDate);
    console.log(`[Shiprocket API] ✅ Connected store ${storeId} (from: ${cleanFromDate || 'all time'})`);

    // Kick off an initial shipment pull in the background using the chosen from-date
    syncShiprocketShipments(storeId, { fromDateOverride: cleanFromDate }).catch(err =>
      console.warn(`[Shiprocket API] Initial sync failed for ${storeId}:`, err.message)
    );

    res.json({ status: 'connected', storeId });
  } catch (err) {
    console.error(`[Shiprocket API] ❌ Connect failed for ${storeId}:`, err.message);
    res.status(401).json({ error: err.message });
  }
});

/**
 * GET /api/sync-progress/:storeId
 * Returns live sync progress for the given store (polled by the UI every 2s).
 */
app.get('/api/sync-progress/:storeId', (req, res) => {
  const job = syncJobs.get(req.params.storeId);
  if (!job) return res.json({ running: false });
  res.json(job);
});

/**
 * POST /api/sync-cancel/:storeId
 * Stops any in-progress sync immediately via AbortController.
 */
app.post('/api/sync-cancel/:storeId', (req, res) => {
  const { storeId } = req.params;
  const controller = syncAbortControllers.get(storeId);
  if (controller) {
    controller.abort();
    syncAbortControllers.delete(storeId);
  }
  const job = syncJobs.get(storeId);
  if (job && job.running) {
    job.running   = false;
    job.endedAt   = new Date().toISOString();
    job.cancelled = true;
    job.error     = 'Sync stopped by user';
    job.phases.forEach(p => { if (p.status === 'running') p.status = 'skipped'; });
    jobLog(job, '🛑 Sync stopped by user');
  }
  res.json({ status: 'cancelled', storeId });
});

/**
 * POST /api/shiprocket/sync/:storeId
 * Starts Shiprocket sync in background, returns immediately.
 * Poll GET /api/sync-progress/:storeId for live status.
 */
app.post('/api/shiprocket/sync/:storeId', async (req, res) => {
  const { storeId } = req.params;
  if (!storeId) return res.status(400).json({ error: 'storeId is required' });

  const existing = syncJobs.get(storeId);
  if (existing?.running) {
    return res.json({ status: 'already_running', storeId });
  }

  const forceFullSync = req.body?.forceFullSync === true;
  const { job, signal } = startJob(storeId, 'shiprocket');
  jobLog(job, forceFullSync ? 'Full re-sync started (reset)' : 'Shiprocket sync started');
  res.json({ status: 'sync_started', storeId, forceFullSync });  // respond immediately

  syncShiprocketShipments(storeId, {
    forceFullSync,
    onProgress: (event, data) => applyProgress(job, event, data),
    signal,
  }).then(result => {
    job.running = false;
    job.endedAt = new Date().toISOString();
    job.result  = result;
    jobLog(job, `✅ Done — ${result.totalSynced} shipments synced`);
    syncAbortControllers.delete(storeId);
    console.log(`[Shiprocket API] ✅ Sync complete for ${storeId}:`, result);
  }).catch(err => {
    job.running = false;
    job.endedAt = new Date().toISOString();
    job.phases.forEach(p => { if (p.status === 'running') p.status = err.name === 'AbortError' ? 'skipped' : 'error'; });
    if (err.name === 'AbortError') {
      job.cancelled = true;
      job.error = 'Sync stopped by user';
      jobLog(job, '🛑 Sync stopped by user');
    } else {
      job.error = err.message;
      jobLog(job, `❌ Error: ${err.message}`);
    }
    syncAbortControllers.delete(storeId);
    console.error(`[Shiprocket API] Sync ended for ${storeId}: ${err.message}`);
  });
});

/**
 * POST /api/shiprocket/reset/:storeId
 * Wipes all Shiprocket shipment data for a store and clears shipments_synced_at.
 * The next sync will run as a full backfill from scratch.
 */
app.post('/api/shiprocket/reset/:storeId', async (req, res) => {
  const { storeId } = req.params;
  if (!storeId) return res.status(400).json({ error: 'storeId is required' });

  // Block reset while a sync is running
  const existing = syncJobs.get(storeId);
  if (existing?.running) {
    return res.status(409).json({ error: 'A sync is already running — stop it before resetting' });
  }

  try {
    // Delete all Shiprocket shipments for this store
    const { error: delErr } = await supabase
      .from('shipments')
      .delete()
      .eq('store_id', storeId)
      .eq('source', 'shiprocket');

    if (delErr) throw new Error(`Delete failed: ${delErr.message}`);

    // Clear the last-synced timestamp so the next sync acts as a first sync
    const { error: updErr } = await supabase
      .from('stores')
      .update({ shipments_synced_at: null })
      .eq('id', storeId);

    if (updErr) throw new Error(`Store update failed: ${updErr.message}`);

    console.log(`[Shiprocket] 🗑 Reset complete for store ${storeId}`);
    res.json({ status: 'reset_complete', storeId });
  } catch (err) {
    console.error(`[Shiprocket] Reset error for ${storeId}: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/shiprocket/status/:storeId
 * Returns connection state + a quick rollup of synced shipment statuses.
 */
app.get('/api/shiprocket/status/:storeId', async (req, res) => {
  const { storeId } = req.params;
  if (!storeId) return res.status(400).json({ error: 'storeId is required' });

  try {
    const { data: store } = await supabase
      .from('stores')
      .select('shiprocket_connected, shiprocket_email, shipments_synced_at')
      .eq('id', storeId)
      .single();

    const { count } = await supabase
      .from('shipments')
      .select('id', { count: 'exact', head: true })
      .eq('store_id', storeId);

    res.json({
      connected: !!store?.shiprocket_connected,
      lastSyncedAt: store?.shipments_synced_at || null,
      shipmentCount: count || 0
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/shiprocket/disconnect/:storeId
 * Clears stored Shiprocket credentials. Synced `shipments` rows are kept.
 */
app.delete('/api/shiprocket/disconnect/:storeId', async (req, res) => {
  const { storeId } = req.params;
  if (!storeId) return res.status(400).json({ error: 'storeId is required' });

  try {
    const { error } = await supabase.from('stores').update({
      shiprocket_email: null,
      shiprocket_password: null,
      shiprocket_token: null,
      shiprocket_token_expires_at: null,
      shiprocket_connected: false
    }).eq('id', storeId);

    if (error) throw new Error(error.message);
    res.json({ status: 'disconnected', storeId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

// ============================================================================
// SUPER ADMIN API — Protected endpoints for internal operations
// ============================================================================

const verifyAdminToken = async (req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return res.status(401).json({ error: 'No auth token' });
  const token = auth.slice(7);
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) return res.status(401).json({ error: 'Invalid or expired token' });
    const adminList = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
    if (adminList.length > 0 && !adminList.includes(user.email?.toLowerCase())) {
      return res.status(403).json({ error: 'Access denied — not an admin' });
    }
    req.adminUser = user;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Auth verification failed' });
  }
};

app.get('/api/admin/overview', verifyAdminToken, async (req, res) => {
  try {
    const { data: stores, error } = await supabase
      .from('stores')
      .select('id, store_name, shopify_domain, created_at, last_synced_at, plan_type, shiprocket_connected, is_active, enabled_ad_platforms');
    if (error) throw new Error(error.message);

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const totalStores = stores?.length || 0;
    const activeStores = stores?.filter(s => s.is_active !== false).length || 0;
    const shopifyConnected = stores?.filter(s => s.shopify_domain).length || 0;
    const shiprocketConnected = stores?.filter(s => s.shiprocket_connected).length || 0;
    const metaConnected = stores?.filter(s => (s.enabled_ad_platforms || []).includes('meta')).length || 0;
    const newToday = stores?.filter(s => s.created_at?.startsWith(todayStr)).length || 0;
    const newThisMonth = stores?.filter(s => s.created_at > monthAgo).length || 0;

    const monthlySignups = {};
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthlySignups[key] = 0;
    }
    stores?.forEach(s => {
      const key = s.created_at?.slice(0, 7);
      if (key && Object.prototype.hasOwnProperty.call(monthlySignups, key)) monthlySignups[key]++;
    });

    const lastSynced24h = stores?.filter(s => s.last_synced_at && new Date(s.last_synced_at) > new Date(now.getTime() - 86400000)).length || 0;

    // Plan breakdown (real)
    const planBreakdown = { free: 0, starter: 0, pro: 0, enterprise: 0 };
    stores?.forEach(s => {
      const p = (s.plan_type || 'free').toLowerCase();
      if (planBreakdown[p] !== undefined) planBreakdown[p]++;
      else planBreakdown.free++;
    });

    // Recent 8 store signups for activity feed
    const recentStores = [...(stores || [])]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 8)
      .map(s => ({
        store_name: s.store_name || 'Unnamed Store',
        created_at: s.created_at,
        plan_type: s.plan_type || 'free',
        has_shopify: !!s.shopify_domain,
      }));

    res.json({ totalStores, activeStores, shopifyConnected, shiprocketConnected, metaConnected, newToday, newThisMonth, monthlySignups, lastSynced24h, planBreakdown, recentStores });
  } catch (err) {
    console.error('[Admin] Overview error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/stores', verifyAdminToken, async (req, res) => {
  try {
    const { data: stores, error } = await supabase
      .from('stores')
      .select('id, owner_id, store_name, shopify_domain, created_at, last_synced_at, plan_type, shiprocket_connected, is_active, products_synced_at, enabled_ad_platforms')
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);

    // Fetch real owner emails from Supabase Auth using service role key
    const emailMap = {};
    try {
      const { data: { users } } = await supabase.auth.admin.listUsers({ perPage: 1000 });
      users?.forEach(u => { emailMap[u.id] = u.email || '—'; });
    } catch (e) {
      console.warn('[Admin] Could not fetch auth users for email map:', e.message);
    }

    const { data: orderRows } = await supabase.from('orders').select('store_id');
    const orderCounts = {};
    orderRows?.forEach(o => { orderCounts[o.store_id] = (orderCounts[o.store_id] || 0) + 1; });

    const { data: shipRows } = await supabase.from('shipments').select('store_id');
    const shipCounts = {};
    shipRows?.forEach(s => { shipCounts[s.store_id] = (shipCounts[s.store_id] || 0) + 1; });

    const enriched = stores?.map(s => ({
      id: s.id,
      store_name: s.store_name,
      shopify_domain: s.shopify_domain,
      plan_type: s.plan_type || 'free',
      is_active: s.is_active !== false,
      shiprocket_connected: !!s.shiprocket_connected,
      has_meta: (s.enabled_ad_platforms || []).includes('meta'),
      created_at: s.created_at,
      last_synced_at: s.last_synced_at,
      products_synced_at: s.products_synced_at,
      order_count: orderCounts[s.id] || 0,
      shipment_count: shipCounts[s.id] || 0,
      // Real owner email from Supabase Auth
      owner_email: emailMap[s.owner_id] || '—',
    }));

    res.json({ stores: enriched, total: enriched?.length || 0 });
  } catch (err) {
    console.error('[Admin] Stores error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── Email helper (Namecheap Private Email — mail.privateemail.com) ───────────
function createMailTransport() {
  const user = process.env.EMAIL_USER;  // e.g. business@pocketdashboard.app
  const pass = process.env.EMAIL_PASSWORD;  // Namecheap email account password
  if (!user || !pass) return null;
  return nodemailer.createTransport({
    host: 'mail.privateemail.com',
    port: 587,
    secure: false,          // STARTTLS on port 587
    auth: { user, pass },
    tls: { rejectUnauthorized: false },
  });
}

async function sendAdminEmail({ subject, html }) {
  const from = process.env.EMAIL_USER;
  const to   = process.env.ADMIN_NOTIFY_EMAIL || from;
  if (!to || !from) return;
  const transport = createMailTransport();
  if (!transport) { console.warn('[Email] EMAIL_USER / EMAIL_PASSWORD not set — skipping email'); return; }
  try {
    await transport.sendMail({ from: `"Pocket Dashboard" <${from}>`, to, subject, html });
    console.log(`[Email] Sent: ${subject}`);
  } catch (e) {
    console.error('[Email] Send failed:', e.message);
  }
}

// ── Supabase Webhook: new store signup ────────────────────────────────────────
// Called by a Supabase Database Webhook on INSERT to public.stores
// Secure with WEBHOOK_SECRET env var (set same value in Supabase webhook header)
app.post('/api/admin/new-store-webhook', express.json(), async (req, res) => {
  const secret = process.env.WEBHOOK_SECRET;
  if (secret && req.headers['x-webhook-secret'] !== secret) {
    return res.status(401).json({ error: 'Invalid webhook secret' });
  }

  const record = req.body?.record || req.body;
  const storeName = record?.store_name || 'Unknown Store';
  const shopifyDomain = record?.shopify_domain || '—';
  const planType = record?.plan_type || 'free';
  const createdAt = record?.created_at ? new Date(record.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : 'now';

  // Get owner email if owner_id is present
  let ownerEmail = '—';
  if (record?.owner_id) {
    try {
      const { data: { user } } = await supabase.auth.admin.getUserById(record.owner_id);
      ownerEmail = user?.email || '—';
    } catch (e) { /* ignore */ }
  }

  console.log(`[Webhook] New store signup: ${storeName} (${ownerEmail})`);

  await sendAdminEmail({
    subject: `🚀 New Store Signup: ${storeName}`,
    html: `
      <div style="font-family:sans-serif;max-width:500px;margin:0 auto;background:#07070e;color:#e2e8f0;border-radius:12px;overflow:hidden;border:1px solid #1e1e3a">
        <div style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:20px 24px">
          <h2 style="margin:0;color:#fff;font-size:18px">🚀 New Store Signup</h2>
          <p style="margin:4px 0 0;color:rgba(255,255,255,0.7);font-size:13px">Pocket Dashboard — Mission Control Alert</p>
        </div>
        <div style="padding:24px">
          <table style="width:100%;border-collapse:collapse">
            ${[
              ['Store Name', storeName],
              ['Owner Email', ownerEmail],
              ['Shopify Domain', shopifyDomain],
              ['Plan', planType.toUpperCase()],
              ['Signed Up', createdAt + ' IST'],
            ].map(([k, v]) => `
              <tr>
                <td style="padding:8px 0;color:rgba(226,232,240,0.5);font-size:13px;width:40%">${k}</td>
                <td style="padding:8px 0;color:#e2e8f0;font-size:13px;font-weight:600">${v}</td>
              </tr>
            `).join('')}
          </table>
          <a href="https://admin.pocketdashboard.app" style="display:inline-block;margin-top:16px;padding:10px 20px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;text-decoration:none;border-radius:8px;font-size:13px;font-weight:600">
            Open Mission Control →
          </a>
        </div>
      </div>
    `,
  });

  res.json({ ok: true });
});

app.get('/api/admin/orders-summary', verifyAdminToken, async (req, res) => {
  try {
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const { data: orders, error } = await supabase
      .from('orders')
      .select('total_price, created_at')
      .gte('created_at', twelveMonthsAgo.toISOString());
    if (error) throw new Error(error.message);

    const now = new Date();
    const byMonth = {};
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      byMonth[key] = { count: 0, revenue: 0 };
    }
    orders?.forEach(o => {
      const key = o.created_at?.slice(0, 7);
      if (key && byMonth[key]) {
        byMonth[key].count++;
        byMonth[key].revenue += parseFloat(o.total_price || 0);
      }
    });

    res.json({ byMonth, totalOrders: orders?.length || 0 });
  } catch (err) {
    console.error('[Admin] Orders summary error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// TEMPORARY: diagnostic probe of Shiprocket /orders param variants. Remove later.
app.get('/api/shiprocket/probe/:storeId', async (req, res) => {
  try {
    const result = await probeShiprocket(req.params.storeId);
    res.json(result);
  } catch (err) {
    console.error('[Shiprocket probe] error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/money-pocket-insights/:storeId
 * Body: { month, plData, prevPlData? }
 * Returns: { insights: string[] }  — 3-4 AI-generated P&L observations.
 */
app.post('/api/money-pocket-insights/:storeId', async (req, res) => {
  const { month, plData, prevPlData } = req.body;
  if (!plData) return res.status(400).json({ error: 'plData required' });

  const fmt = (n) => '₹' + Math.round(n || 0).toLocaleString('en-IN');
  const pct = (n) => `${n >= 0 ? '+' : ''}${Number(n).toFixed(1)}%`;

  const prevBlock = prevPlData ? `
Previous month comparison:
- Previous take-home: ${fmt(prevPlData.takeHome)}
- Previous ad spend: ${fmt(prevPlData.adSpend)}
- Previous RTO count: ${prevPlData.rtoCount}
- MoM take-home change: ${fmt(plData.takeHome - prevPlData.takeHome)} (${pct((plData.takeHome - prevPlData.takeHome) / Math.max(Math.abs(prevPlData.takeHome), 1) * 100)})
` : '';

  const prompt = `Indian D2C e-commerce monthly P&L data for ${month}:

Revenue: ${fmt(plData.grossRevenue)} gross, ${fmt(plData.netRevenue)} net after refunds
Product cost: ${fmt(plData.productCost)}, Shipping: ${fmt(plData.shippingCost)}
Ad spend: ${fmt(plData.adSpend)} (${plData.grossRevenue > 0 ? ((plData.adSpend / plData.grossRevenue) * 100).toFixed(1) : 0}% of revenue)
COD charges: ${fmt(plData.codCharges)} (${plData.codCount} orders)
RTO losses: ${fmt(plData.rtoLoss)} (${plData.rtoCount} orders, ${plData.totalOrders > 0 ? ((plData.rtoCount / plData.totalOrders) * 100).toFixed(1) : 0}% rate)
Gateway fees: ${fmt(plData.gatewayFees)}, Shopify: ${fmt(plData.shopifyFee)}
Manual expenses: ${fmt(plData.manualTotal)}
Money in pocket: ${fmt(plData.takeHome)} (${plData.margin?.toFixed(1)}% margin)
${prevBlock}
Generate 3 sharp, specific, data-backed insights that help the store owner understand where profit is being created or lost. Be concise (1-2 sentences each). Return JSON: {"insights": ["...", "...", "..."]}`;

  try {
    if (!process.env.OPENAI_API_KEY) return res.status(500).json({ error: 'OpenAI not configured' });
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 400,
      temperature: 0.5,
      response_format: { type: 'json_object' },
    });
    const parsed = JSON.parse(completion.choices[0]?.message?.content || '{}');
    const insights = parsed.insights || Object.values(parsed)[0] || [];
    res.json({ insights: Array.isArray(insights) ? insights : [insights] });
  } catch (err) {
    console.error('[MoneyPocket] Insights error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * Auto-sync cron job — runs every 5 minutes.
 * Fetches all active stores and runs an incremental sync for each.
 * Stores are staggered 2 seconds apart to avoid Shopify API bursts.
 * Uses incremental mode (updated_at_min) so each run is fast and cheap.
 */
async function runAutoSync() {
  const { data: stores, error } = await supabase
    .from('stores')
    .select('id, store_name, shopify_domain')
    .eq('is_active', true);

  if (error || !stores || stores.length === 0) {
    console.log('[AutoSync] No active stores found or error:', error?.message);
    return;
  }

  console.log(`[AutoSync] Starting sync for ${stores.length} store(s)...`);

  for (let i = 0; i < stores.length; i++) {
    const store = stores[i];
    // Stagger: 2 second gap between stores to avoid API bursts at 50+ stores
    if (i > 0) await new Promise(r => setTimeout(r, 2000));
    try {
      const result = await syncStoreData(store.id);
      console.log(`[AutoSync] ✅ ${store.store_name} (${store.shopify_domain}): ${result.totalSynced} orders synced (${result.mode})`);
    } catch (err) {
      // One store failing must not stop the others
      console.error(`[AutoSync] ❌ ${store.store_name} (${store.shopify_domain}): ${err.message}`);
    }
  }

  console.log('[AutoSync] ✅ Cycle complete.');
}

// Schedule: every 5 minutes (Shopify)
cron.schedule('*/5 * * * *', () => {
  console.log('[AutoSync] ⏰ Triggered');
  runAutoSync().catch(err => console.error('[AutoSync] Unhandled error:', err.message));
});

/**
 * Auto-sync Shiprocket shipments — runs every 30 minutes.
 * Only runs for stores that have Shiprocket connected.
 * Staggered 5s between stores to avoid Shiprocket rate limits.
 */
async function runShiprocketAutoSync() {
  const { data: stores } = await supabase
    .from('stores')
    .select('id, store_name')
    .eq('is_active', true)
    .eq('shiprocket_connected', true);

  if (!stores || stores.length === 0) return;

  console.log(`[SRAutoSync] Starting Shiprocket sync for ${stores.length} store(s)...`);
  for (let i = 0; i < stores.length; i++) {
    if (i > 0) await new Promise(r => setTimeout(r, 5000));
    try {
      const result = await syncShiprocketShipments(stores[i].id);
      console.log(`[SRAutoSync] ✅ ${stores[i].store_name}: ${result.totalSynced} shipments`);
    } catch (err) {
      console.error(`[SRAutoSync] ❌ ${stores[i].store_name}: ${err.message}`);
    }
  }
}

// Every 30 minutes
cron.schedule('*/30 * * * *', () => {
  console.log('[SRAutoSync] ⏰ Triggered');
  runShiprocketAutoSync().catch(err => console.error('[SRAutoSync] Unhandled:', err.message));
});

// Keep-alive: Render free tier spins down after 15 min of inactivity, killing the cron job.
// Ping our own /api/health every 14 minutes so the process never sleeps.
const SELF_URL = process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`;
setInterval(() => {
  fetch(`${SELF_URL}/api/health`)
    .then(() => console.log('[KeepAlive] Pinged self — server stays awake'))
    .catch(err => console.warn('[KeepAlive] Ping failed:', err.message));
}, 14 * 60 * 1000);

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Pocket Dashboard Sync Server running on http://localhost:${PORT}`);
    console.log('[AutoSync] Scheduled — every 5 minutes');
    console.log('[KeepAlive] Ping scheduled — every 14 minutes');
  });
}

module.exports = app;
