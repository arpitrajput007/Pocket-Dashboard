const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
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

// ── Shopify OAuth ─────────────────────────────────────────────────────────────
const SHOPIFY_OAUTH_CLIENT_ID     = process.env.SHOPIFY_OAUTH_CLIENT_ID     || '';
const SHOPIFY_OAUTH_CLIENT_SECRET = process.env.SHOPIFY_OAUTH_CLIENT_SECRET || '';
const SHOPIFY_OAUTH_SCOPES        = 'read_orders,read_products,read_customers,read_fulfillments';
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://pocketdashboard.app';

// CSRF guard: state_token → { userId, shop, expiresAt }
const shopifyOAuthStates = new Map();
setInterval(() => {
  const now = Date.now();
  shopifyOAuthStates.forEach((v, k) => { if (v.expiresAt < now) shopifyOAuthStates.delete(k); });
}, 30 * 60 * 1000);

/**
 * GET /api/auth/shopify/start?shop=mystore.myshopify.com&userId=UUID
 * Redirects the store owner to Shopify's OAuth consent screen.
 */
app.get('/api/auth/shopify/start', (req, res) => {
  const { shop, userId } = req.query;
  if (!shop || !userId) return res.status(400).json({ error: 'shop and userId are required' });
  if (!SHOPIFY_OAUTH_CLIENT_ID) return res.status(500).json({ error: 'Shopify OAuth not configured on this server' });

  const shopDomain = shop.replace(/https?:\/\//, '').replace(/\/$/, '').replace(/\.myshopify\.com$/, '') + '.myshopify.com';
  const state = crypto.randomBytes(16).toString('hex');
  shopifyOAuthStates.set(state, { userId, shop: shopDomain, expiresAt: Date.now() + 10 * 60 * 1000 });

  // Callback goes through the Vercel proxy (pocketdashboard.app/api → Render)
  const redirectUri = `${FRONTEND_URL}/api/auth/shopify/callback`;
  const installUrl = `https://${shopDomain}/admin/oauth/authorize?client_id=${SHOPIFY_OAUTH_CLIENT_ID}&scope=${encodeURIComponent(SHOPIFY_OAUTH_SCOPES)}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;

  console.log(`[ShopifyOAuth] Starting install for ${shopDomain}`);
  res.redirect(installUrl);
});

/**
 * GET /api/auth/shopify/callback
 * Shopify redirects here after the store owner approves the install.
 */
app.get('/api/auth/shopify/callback', async (req, res) => {
  const { code, hmac, shop, state } = req.query;
  const fail = (reason) => {
    console.error('[ShopifyOAuth] Failed:', reason);
    res.redirect(`${FRONTEND_URL}/dashboard?oauth_error=${encodeURIComponent(reason)}`);
  };

  // 1 — Validate CSRF state
  const stateData = shopifyOAuthStates.get(state);
  if (!stateData || stateData.expiresAt < Date.now()) return fail('session_expired');
  shopifyOAuthStates.delete(state);

  // 2 — Validate Shopify HMAC signature
  const paramStr = Object.entries(req.query)
    .filter(([k]) => k !== 'hmac')
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('&');
  const expectedHmac = crypto.createHmac('sha256', SHOPIFY_OAUTH_CLIENT_SECRET).update(paramStr).digest('hex');
  if (expectedHmac !== hmac) return fail('invalid_hmac');

  // 3 — Exchange auth code for permanent access token
  let access_token;
  try {
    const tokenRes = await fetch(`https://${shop}/admin/oauth/access_token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: SHOPIFY_OAUTH_CLIENT_ID, client_secret: SHOPIFY_OAUTH_CLIENT_SECRET, code }),
    });
    const body = await tokenRes.json();
    access_token = body.access_token;
    if (!access_token) throw new Error(body.error_description || 'No token in response');
  } catch (e) {
    return fail('token_exchange_failed: ' + e.message);
  }

  // 4 — Fetch shop name from Shopify
  let storeName = shop.replace('.myshopify.com', '');
  try {
    const infoRes = await fetch(`https://${shop}/admin/api/2024-01/shop.json`, {
      headers: { 'X-Shopify-Access-Token': access_token }
    });
    const infoBody = await infoRes.json();
    if (infoBody.shop?.name) storeName = infoBody.shop.name;
  } catch (_) { /* non-critical — store name falls back to domain */ }

  // 5 — Save to Supabase (update existing store or create new)
  const shopDomain = shop.replace('.myshopify.com', '');
  const encryptedToken = encrypt(access_token);

  const { data: existing } = await supabase
    .from('stores').select('id').eq('owner_id', stateData.userId).maybeSingle();

  let storeId;
  if (existing) {
    await supabase.from('stores').update({
      shopify_domain: shopDomain,
      store_name: storeName,
      shopify_access_token: encryptedToken,
      shopify_client_id: null,
    }).eq('id', existing.id);
    storeId = existing.id;
    console.log(`[ShopifyOAuth] Updated store ${storeId} → ${shopDomain}`);
  } else {
    const { data: created, error: insertErr } = await supabase.from('stores').insert([{
      owner_id: stateData.userId,
      store_name: storeName,
      shopify_domain: shopDomain,
      shopify_access_token: encryptedToken,
      primary_color: '#6366f1',
      dashboard_style: 'dark-modern',
      dashboard_features: { daily_view: true, scoreboard: true, weekly_view: false, monthly_view: false, all_time_view: false, business_analytics: true },
    }]).select().single();
    if (insertErr || !created) return fail('db_insert: ' + insertErr?.message);
    storeId = created.id;
    console.log(`[ShopifyOAuth] Created store ${storeId} → ${shopDomain}`);
  }

  // 6 — Register webhooks + kick off initial sync (both non-blocking)
  registerShopifyWebhooks(shopDomain, access_token).catch(e =>
    console.warn('[ShopifyOAuth] Webhook reg failed (non-critical):', e.message)
  );
  fetch(`http://localhost:${PORT}/api/sync/${storeId}`, { method: 'POST' }).catch(() => {});

  res.redirect(`${FRONTEND_URL}/dashboard?shopify_connected=1`);
});

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

    // Fetch orders, products and ad costs in parallel
    const [ordersRes, productsRes, adCostsRes, storeRes] = await Promise.all([
      supabase.from('orders').select('id, total_price, created_at, tags, line_items').eq('store_id', storeId).gte('created_at', thirtyDaysAgo.toISOString()),
      supabase.from('products').select('title, sku, cost_price, selling_price, shipping_cost').eq('store_id', storeId).limit(100),
      supabase.from('ad_costs').select('amount, date, platform').eq('store_id', storeId).gte('date', thirtyDaysAgo.toISOString().split('T')[0]),
      supabase.from('stores').select('store_name, dashboard_features').eq('id', storeId).single(),
    ]);

    const orders   = ordersRes.data  || [];
    const products = productsRes.data || [];
    const adCosts  = adCostsRes.data  || [];
    const store    = storeRes.data    || {};

    // Build product cost map
    const costMap = {};
    products.forEach(p => {
      const key = (p.title || '').toLowerCase().trim();
      if (key) costMap[key] = { cost: parseFloat(p.cost_price || 0), shipping: parseFloat(p.shipping_cost || 0) };
    });

    // Per-order and aggregate stats
    let totalRevenue = 0, totalOrders = orders.length;
    let rtoCount = 0, deliveredCount = 0, codCount = 0, canceledCount = 0;
    const productMap = {}; // title -> { orders, rto, revenue, qty }

    orders.forEach(o => {
      const rev  = parseFloat(o.total_price || 0);
      const tags = (o.tags || '').toLowerCase();
      const isRTO       = tags.includes('rto') || tags.includes('returned') || tags.includes('undelivered') || tags.includes('ndr');
      const isDelivered = tags.includes('delivered') && !isRTO;
      const isCOD       = tags.includes('cod');
      const isCanceled  = tags.includes('cancel');

      totalRevenue += rev;
      if (isRTO)       rtoCount++;
      if (isDelivered) deliveredCount++;
      if (isCOD)       codCount++;
      if (isCanceled)  canceledCount++;

      // Product-level aggregation from line_items
      const items = Array.isArray(o.line_items) ? o.line_items : [];
      items.forEach(item => {
        const title = (item.title || item.name || 'Unknown').trim();
        if (!productMap[title]) productMap[title] = { orders: 0, rto: 0, revenue: 0, qty: 0 };
        productMap[title].orders++;
        productMap[title].qty    += (item.quantity || 1);
        productMap[title].revenue += parseFloat(item.price || 0) * (item.quantity || 1);
        if (isRTO) productMap[title].rto++;
      });
    });

    const adSpend    = adCosts.reduce((s, a) => s + parseFloat(a.amount || 0), 0);
    const rtoRate    = totalOrders > 0 ? ((rtoCount / totalOrders) * 100).toFixed(1) : 0;
    const delRate    = totalOrders > 0 ? ((deliveredCount / totalOrders) * 100).toFixed(1) : 0;
    const codRate    = totalOrders > 0 ? ((codCount / totalOrders) * 100).toFixed(1) : 0;
    const df         = store.dashboard_features || {};
    const cogsRate   = (df.biz_cogs_pct ?? 43) / 100;
    const shipPer    = df.biz_shipping_per ?? 150;
    const rtoCostPer = df.biz_rto_cost ?? 600;
    const cogs       = totalRevenue * cogsRate;
    const shipping   = totalOrders * shipPer;
    const rtoLoss    = rtoCount * rtoCostPer;
    const payFees    = totalRevenue * ((totalOrders - codCount) / Math.max(totalOrders, 1)) * 0.018;
    const netProfit  = totalRevenue - cogs - adSpend - shipping - rtoLoss - payFees;
    const mer        = adSpend > 0 ? (totalRevenue / adSpend).toFixed(2) : 'N/A';
    const aov        = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;

    // Top products by orders (max 10)
    const topProducts = Object.entries(productMap)
      .sort((a, b) => b[1].orders - a[1].orders)
      .slice(0, 10)
      .map(([title, d]) => ({
        title,
        orders: d.orders,
        rto: d.rto,
        rtoRate: d.orders > 0 ? ((d.rto / d.orders) * 100).toFixed(1) : '0',
        revenue: Math.round(d.revenue),
      }));

    // Products sorted by RTO rate (min 3 orders)
    const rtoProducts = Object.entries(productMap)
      .filter(([, d]) => d.orders >= 3)
      .sort((a, b) => (b[1].rto / b[1].orders) - (a[1].rto / a[1].orders))
      .slice(0, 5)
      .map(([title, d]) => ({
        title,
        orders: d.orders,
        rto: d.rto,
        rtoRate: ((d.rto / d.orders) * 100).toFixed(1),
      }));

    const inr = n => '₹' + Math.round(n).toLocaleString('en-IN');

    const systemPrompt = `You are the AI Co-Pilot for Pocket Dashboard — an analytics tool built for Indian D2C e-commerce founders.
You have REAL access to the following store data for the last 30 days. Use ONLY this data to answer questions. Never say you don't have access to data — if it's below, you have it.

STORE: ${store.store_name || 'Unknown Store'}

BUSINESS OVERVIEW (Last 30 Days):
- Total Orders: ${totalOrders}
- Total Revenue: ${inr(totalRevenue)}
- Ad Spend: ${inr(adSpend)}${adSpend === 0 ? ' (no ad costs logged yet)' : ''}
- Net Profit (estimated): ${inr(netProfit)} (after COGS, shipping, RTO losses, payment fees, ad spend)
- RTO Orders: ${rtoCount} (${rtoRate}% RTO rate)
- Delivered Orders: ${deliveredCount} (${delRate}% delivery rate)
- COD Orders: ${codCount} (${codRate}% of total)
- Canceled Orders: ${canceledCount}
- Average Order Value: ${inr(aov)}
- Marketing Efficiency Ratio (MER): ${mer}x${adSpend === 0 ? ' (N/A — no ad spend logged)' : ''}

COST BREAKDOWN:
- Revenue: ${inr(totalRevenue)}
- COGS (~${Math.round(cogsRate * 100)}%): ${inr(cogs)}
- Shipping: ${inr(shipping)}
- Ad Spend: ${inr(adSpend)}
- RTO Losses: ${inr(rtoLoss)} (${rtoCount} returns × ${inr(rtoCostPer)} per return)
- Payment Fees: ${inr(payFees)}
- Net Profit: ${inr(netProfit)}

TOP PRODUCTS BY ORDERS:
${topProducts.length > 0 ? topProducts.map(p => `- ${p.title}: ${p.orders} orders, ${p.rto} RTO (${p.rtoRate}% RTO rate), ${inr(p.revenue)} revenue`).join('\n') : '- No product-level data available (line_items may not be synced)'}

PRODUCTS WITH HIGHEST RTO RATE (min 3 orders):
${rtoProducts.length > 0 ? rtoProducts.map((p, i) => `${i + 1}. ${p.title}: ${p.rto}/${p.orders} orders returned (${p.rtoRate}% RTO rate)`).join('\n') : '- No product RTO data available or all products have fewer than 3 orders'}

${products.length > 0 ? `CATALOG SIZE: ${products.length} products synced` : 'CATALOG: No products synced yet'}

INSTRUCTIONS:
- Answer using the real data above. Be specific with numbers.
- If a metric is "N/A" or 0 because data wasn't logged, say so and explain how to log it.
- Keep answers concise, specific, and actionable.
- Use bullet points for lists. Use bold for key numbers.
- Focus on Indian D2C context: COD/prepaid split, RTO management, logistics costs.`;

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const chatResponse = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages.map(m => ({ role: m.role, content: m.content }))
      ],
      temperature: 0.4,
      max_tokens: 600,
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
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASSWORD;
  if (!user || !pass) return null;
  return nodemailer.createTransport({
    host: 'mail.privateemail.com',
    port: 587,
    secure: false,
    auth: { user, pass },
    tls: { rejectUnauthorized: false },
  });
}

// Gmail transport — used for contact form notifications (CONTACT_EMAIL_USER / CONTACT_EMAIL_PASSWORD)
// Falls back to main Namecheap transport if Gmail credentials aren't set.
function createContactTransport() {
  const user = process.env.CONTACT_EMAIL_USER;
  const pass = process.env.CONTACT_EMAIL_PASSWORD;
  if (user && pass) {
    return { transport: nodemailer.createTransport({ service: 'gmail', auth: { user, pass } }), from: user };
  }
  const mainTransport = createMailTransport();
  return mainTransport ? { transport: mainTransport, from: process.env.EMAIL_USER } : null;
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

// ── Owner email helpers ───────────────────────────────────────────────────────
async function getOwnerEmail(ownerId) {
  try {
    const { data: { user } } = await supabase.auth.admin.getUserById(ownerId);
    return user?.email || null;
  } catch (e) { return null; }
}

async function sendOwnerEmail(toEmail, { subject, html }) {
  if (!toEmail) return;
  const from = process.env.EMAIL_USER;
  if (!from) { console.warn('[Email] EMAIL_USER not set — skipping owner email'); return; }
  const transport = createMailTransport();
  if (!transport) return;
  try {
    await transport.sendMail({ from: `"Pocket Dashboard" <${from}>`, to: toEmail, subject, html });
    console.log(`[Email] → ${toEmail}: ${subject}`);
  } catch (e) {
    console.error('[Email] Owner send failed:', e.message);
  }
}

// ── RTO spike alert (12h cooldown per store) ──────────────────────────────────
const rtoAlertSentAt = new Map();

async function checkRtoSpike(storeId, storeName, ownerEmail) {
  const cooldown = rtoAlertSentAt.get(storeId);
  if (cooldown && Date.now() - cooldown < 12 * 60 * 60 * 1000) return;

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: orders } = await supabase
    .from('orders').select('tags').eq('store_id', storeId).gte('created_at', since);

  if (!orders?.length || orders.length < 5) return;

  const rtoCount = orders.filter(o => {
    const t = (o.tags || '').toLowerCase();
    return t.includes('rto') || t.includes('returned') || t.includes('undelivered');
  }).length;

  const rtoRate = Math.round((rtoCount / orders.length) * 100);
  if (rtoRate < 25) return;

  rtoAlertSentAt.set(storeId, Date.now());
  if (!ownerEmail) return;

  await sendOwnerEmail(ownerEmail, {
    subject: `⚠️ High RTO Alert: ${storeName} — ${rtoRate}% in last 24h`,
    html: `
<div style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;max-width:480px;margin:0 auto;background:#07070e;color:#e2e8f0;border-radius:16px;overflow:hidden;border:1px solid rgba(248,113,133,0.3)">
  <div style="background:linear-gradient(135deg,#991b1b,#dc2626);padding:20px 24px">
    <h2 style="margin:0;color:#fff;font-size:18px;font-weight:800">⚠️ High RTO Rate Alert</h2>
    <p style="margin:4px 0 0;color:rgba(255,255,255,0.7);font-size:13px">${storeName}</p>
  </div>
  <div style="padding:24px">
    <div style="text-align:center;background:rgba(248,113,133,0.08);border:1px solid rgba(248,113,133,0.2);border-radius:12px;padding:20px;margin-bottom:20px">
      <div style="font-size:52px;font-weight:900;color:#f87171;line-height:1">${rtoRate}%</div>
      <div style="font-size:13px;color:rgba(255,255,255,0.45);margin-top:6px">RTO Rate (last 24 hours) · ${rtoCount} of ${orders.length} orders</div>
    </div>
    <p style="font-size:13px;color:rgba(255,255,255,0.5);line-height:1.75;margin:0 0 18px">Your RTO rate crossed 25% in the last 24 hours. This may indicate address quality issues, COD fraud, or product delivery problems.</p>
    <a href="https://pocketdashboard.app/dashboard#analytics" style="display:block;text-align:center;padding:13px;background:linear-gradient(135deg,#ef4444,#dc2626);color:#fff;text-decoration:none;border-radius:10px;font-weight:700;font-size:14px">Investigate in Dashboard →</a>
  </div>
  <div style="padding:14px 24px;border-top:1px solid rgba(255,255,255,0.06);text-align:center;font-size:11px;color:rgba(255,255,255,0.2)">Pocket Dashboard · pocketdashboard.app</div>
</div>`,
  });
  console.log(`[RTO Alert] ⚠️ Sent to ${ownerEmail} for ${storeName} (${rtoRate}%)`);
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
    .select('id, store_name, shopify_domain, owner_id')
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
      // Non-blocking RTO spike check after each sync
      if (store.owner_id) {
        getOwnerEmail(store.owner_id).then(email => {
          checkRtoSpike(store.id, store.store_name, email).catch(() => {});
        }).catch(() => {});
      }
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

// ── Contact Form (landing page) ───────────────────────────────────────────────
app.post('/api/contact', async (req, res) => {
  const { full_name, brand_name, email, phone, order_volume, platform, topic, message } = req.body;
  if (!full_name || !email) return res.status(400).json({ error: 'Name and email are required' });

  // Save to Supabase (best-effort — table may not exist yet)
  try {
    await supabase.from('contact_requests').insert([{
      full_name, brand_name, email, phone, order_volume, platform, topic, message,
    }]);
  } catch (e) {
    console.warn('[Contact] Supabase save skipped:', e.message);
  }

  // Send notification email to dashboardpocket@gmail.com
  const ct = createContactTransport();
  if (ct) {
    try {
      await ct.transport.sendMail({
        from: `"Pocket Dashboard" <${ct.from}>`,
        to: 'dashboardpocket@gmail.com',
        subject: `📩 New Contact Request from ${full_name} — ${brand_name || 'Unknown Brand'}`,
        html: `
<div style="font-family:sans-serif;max-width:520px;margin:0 auto;background:#07070e;color:#e2e8f0;border-radius:12px;overflow:hidden;border:1px solid #1e1e3a">
  <div style="background:linear-gradient(135deg,#6366f1,#22d3ee);padding:18px 24px">
    <h2 style="margin:0;color:#fff;font-size:18px">📩 New Contact Request</h2>
  </div>
  <div style="padding:24px">
    <table style="width:100%;border-collapse:collapse;font-size:14px">
      <tr><td style="padding:8px 0;color:#94a3b8;width:140px">Name</td><td style="padding:8px 0;color:#e2e8f0;font-weight:600">${full_name}</td></tr>
      <tr><td style="padding:8px 0;color:#94a3b8">Brand</td><td style="padding:8px 0;color:#e2e8f0">${brand_name || '—'}</td></tr>
      <tr><td style="padding:8px 0;color:#94a3b8">Email</td><td style="padding:8px 0"><a href="mailto:${email}" style="color:#22d3ee">${email}</a></td></tr>
      <tr><td style="padding:8px 0;color:#94a3b8">Phone</td><td style="padding:8px 0;color:#e2e8f0">${phone || '—'}</td></tr>
      <tr><td style="padding:8px 0;color:#94a3b8">Order Volume</td><td style="padding:8px 0;color:#e2e8f0">${order_volume || '—'}</td></tr>
      <tr><td style="padding:8px 0;color:#94a3b8">Platform</td><td style="padding:8px 0;color:#e2e8f0">${platform || '—'}</td></tr>
      <tr><td style="padding:8px 0;color:#94a3b8">Topic</td><td style="padding:8px 0;color:#e2e8f0">${topic || '—'}</td></tr>
    </table>
    ${message ? `<div style="margin-top:16px;padding:14px;background:rgba(255,255,255,0.04);border-radius:8px;border:1px solid rgba(255,255,255,0.08);font-size:14px;line-height:1.6;color:#cbd5e1">${message}</div>` : ''}
    <div style="margin-top:20px;font-size:12px;color:#475569">Submitted via Pocket Dashboard landing page</div>
  </div>
</div>`,
      });
      console.log(`[Contact] Email sent for ${email}`);
    } catch (e) {
      console.error('[Contact] Email failed:', e.message);
    }
  } else {
    console.warn('[Contact] No email transport configured — skipping notification');
  }

  res.json({ success: true });
});

// ── Admin: list contact requests ──────────────────────────────────────────────
app.get('/api/admin/contact-requests', verifyAdminToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('contact_requests')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    res.json({ data: data || [] });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── User Feedback / NPS endpoint ─────────────────────────────────────────────
app.post('/api/feedback', async (req, res) => {
  const { store_id, owner_email, nps_score, comment, type = 'nps' } = req.body;
  if (nps_score == null && !comment) return res.status(400).json({ error: 'Missing feedback' });

  // Best-effort Supabase save (table created via migration)
  try {
    await supabase.from('feedback').insert([{
      store_id: store_id || null,
      owner_email: owner_email || null,
      nps_score: nps_score != null ? Number(nps_score) : null,
      comment: comment || null,
      type,
    }]);
  } catch (e) {
    console.warn('[Feedback] Supabase save skipped (table may not exist yet):', e.message);
  }

  const scoreEmoji = nps_score >= 9 ? '🌟' : nps_score >= 7 ? '👍' : nps_score != null ? '⚠️' : '💬';
  await sendAdminEmail({
    subject: `${scoreEmoji} New Feedback: NPS ${nps_score != null ? nps_score + '/10' : 'N/A'} from ${owner_email || 'unknown'}`,
    html: `
<div style="font-family:sans-serif;max-width:480px;margin:0 auto;background:#07070e;color:#e2e8f0;border-radius:12px;overflow:hidden;border:1px solid #1e1e3a">
  <div style="background:linear-gradient(135deg,#6366f1,#4f46e5);padding:18px 22px">
    <h3 style="margin:0;color:#fff;font-size:16px">${scoreEmoji} New User Feedback</h3>
  </div>
  <div style="padding:20px">
    <table style="width:100%;border-collapse:collapse">
      ${[['From', owner_email||'—'],['NPS Score', nps_score != null ? `${nps_score}/10` : '—'],['Type', type]]
        .map(([k,v]) => `<tr><td style="padding:6px 0;color:rgba(255,255,255,0.4);font-size:13px;width:35%">${k}</td><td style="padding:6px 0;color:#e2e8f0;font-size:13px;font-weight:600">${v}</td></tr>`).join('')}
    </table>
    ${comment ? `<div style="margin-top:14px;padding:14px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:8px;font-size:13px;color:#e2e8f0;line-height:1.7">"${comment}"</div>` : ''}
  </div>
</div>`,
  });

  res.json({ ok: true });
});

// ── Daily digest email — 9:00 AM IST (03:30 UTC) ─────────────────────────────
async function sendDailyDigests() {
  console.log('[DailyDigest] Starting...');
  const { data: stores } = await supabase
    .from('stores').select('id, store_name, owner_id').eq('is_active', true);
  if (!stores?.length) return;

  // Yesterday in IST (UTC+5:30)
  const istNow = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
  const yesterday = new Date(istNow);
  yesterday.setDate(yesterday.getDate() - 1);
  const ymd = yesterday.toISOString().split('T')[0];
  const startISO = new Date(ymd + 'T00:00:00+05:30').toISOString();
  const endISO   = new Date(ymd + 'T23:59:59+05:30').toISOString();
  const displayDate = yesterday.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', weekday: 'short', timeZone: 'Asia/Kolkata' });

  for (const store of stores) {
    try {
      const ownerEmail = await getOwnerEmail(store.owner_id);
      if (!ownerEmail) continue;

      const { data: orders } = await supabase
        .from('orders')
        .select('total_price, tags, cancelled_at')
        .eq('store_id', store.id)
        .gte('created_at', startISO)
        .lte('created_at', endISO);

      if (!orders?.length) continue; // No orders yesterday — skip

      const revenue  = orders.reduce((s, o) => s + parseFloat(o.total_price || 0), 0);
      const rtoCount = orders.filter(o => { const t = (o.tags||'').toLowerCase(); return t.includes('rto') || t.includes('returned') || t.includes('undelivered'); }).length;
      const rtoRate  = Math.round((rtoCount / orders.length) * 100);
      const fmt      = n => '₹' + Math.round(n).toLocaleString('en-IN');

      await sendOwnerEmail(ownerEmail, {
        subject: `📊 ${store.store_name}: ${orders.length} orders, ${fmt(revenue)} — ${displayDate}`,
        html: `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Inter',sans-serif;max-width:500px;margin:0 auto;background:#07070e;color:#e2e8f0;border-radius:16px;overflow:hidden;border:1px solid #1e1e3a">
  <div style="background:linear-gradient(135deg,#6366f1,#4f46e5);padding:24px">
    <div style="font-size:11px;color:rgba(255,255,255,0.55);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:6px">Daily Snapshot</div>
    <h2 style="margin:0 0 2px;color:#fff;font-size:22px;font-weight:800">${store.store_name}</h2>
    <div style="font-size:13px;color:rgba(255,255,255,0.65)">${displayDate}</div>
  </div>
  <div style="padding:24px">
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:20px">
      <div style="background:rgba(16,185,129,0.1);border:1px solid rgba(16,185,129,0.2);border-radius:12px;padding:18px">
        <div style="font-size:11px;color:rgba(255,255,255,0.35);margin-bottom:6px;text-transform:uppercase;letter-spacing:0.08em">Revenue</div>
        <div style="font-size:24px;font-weight:800;color:#10b981">${fmt(revenue)}</div>
      </div>
      <div style="background:rgba(99,102,241,0.1);border:1px solid rgba(99,102,241,0.2);border-radius:12px;padding:18px">
        <div style="font-size:11px;color:rgba(255,255,255,0.35);margin-bottom:6px;text-transform:uppercase;letter-spacing:0.08em">Orders</div>
        <div style="font-size:24px;font-weight:800;color:#818cf8">${orders.length}</div>
      </div>
      <div style="background:${rtoCount>0?'rgba(248,113,133,0.08)':'rgba(255,255,255,0.03)'};border:1px solid ${rtoCount>0?'rgba(248,113,133,0.2)':'rgba(255,255,255,0.07)'};border-radius:12px;padding:18px">
        <div style="font-size:11px;color:rgba(255,255,255,0.35);margin-bottom:6px;text-transform:uppercase;letter-spacing:0.08em">RTOs</div>
        <div style="font-size:24px;font-weight:800;color:${rtoCount>0?'#f87171':'#64748b'}">${rtoCount}</div>
      </div>
      <div style="background:${rtoRate>20?'rgba(248,113,133,0.08)':rtoRate>10?'rgba(251,191,36,0.08)':'rgba(16,185,129,0.08)'};border:1px solid ${rtoRate>20?'rgba(248,113,133,0.2)':rtoRate>10?'rgba(251,191,36,0.2)':'rgba(16,185,129,0.2)'};border-radius:12px;padding:18px">
        <div style="font-size:11px;color:rgba(255,255,255,0.35);margin-bottom:6px;text-transform:uppercase;letter-spacing:0.08em">RTO Rate</div>
        <div style="font-size:24px;font-weight:800;color:${rtoRate>20?'#f87171':rtoRate>10?'#fbbf24':'#10b981'}">${rtoRate}%</div>
      </div>
    </div>
    ${rtoRate>20?`<div style="background:rgba(248,113,133,0.08);border:1px solid rgba(248,113,133,0.2);border-radius:10px;padding:13px;margin-bottom:16px"><span style="color:#f87171;font-weight:700">⚠️ High RTO Rate</span> <span style="color:rgba(255,255,255,0.5);font-size:13px">— Review recent orders for address or product issues.</span></div>`:''}
    <a href="https://pocketdashboard.app/dashboard" style="display:block;text-align:center;padding:14px;background:linear-gradient(135deg,#6366f1,#4f46e5);color:#fff;text-decoration:none;border-radius:10px;font-weight:700;font-size:14px">Open Full Dashboard →</a>
  </div>
  <div style="padding:14px 24px;border-top:1px solid rgba(255,255,255,0.05);text-align:center;font-size:11px;color:rgba(255,255,255,0.2)">
    Pocket Dashboard · Free for all store owners · <a href="https://pocketdashboard.app" style="color:rgba(255,255,255,0.25)">pocketdashboard.app</a>
  </div>
</div>`,
      });
      await new Promise(r => setTimeout(r, 1200));
    } catch (e) {
      console.error(`[DailyDigest] Error for ${store.store_name}:`, e.message);
    }
  }
  console.log('[DailyDigest] ✅ Complete.');
}

cron.schedule('30 3 * * *', () => {
  console.log('[DailyDigest] ⏰ Triggered (9am IST)');
  sendDailyDigests().catch(e => console.error('[DailyDigest] Unhandled:', e.message));
});

// ── Weekly re-engagement (churn nudge) — Sunday 10am IST = 04:30 UTC ─────────
async function detectAndNudgeChurned() {
  console.log('[ChurnDetect] Checking inactive users...');
  const { data: stores } = await supabase
    .from('stores').select('id, store_name, owner_id').eq('is_active', true);
  if (!stores?.length) return;

  for (const store of stores) {
    try {
      const { data: { user } } = await supabase.auth.admin.getUserById(store.owner_id);
      if (!user?.email || !user?.last_sign_in_at) continue;

      const daysSince = Math.floor((Date.now() - new Date(user.last_sign_in_at).getTime()) / 86400000);
      if (daysSince < 7) continue;

      const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data: orders } = await supabase
        .from('orders').select('total_price').eq('store_id', store.id).gte('created_at', since7d);

      const weekRev = (orders||[]).reduce((s, o) => s + parseFloat(o.total_price||0), 0);
      const fmt = n => '₹' + Math.round(n).toLocaleString('en-IN');

      await sendOwnerEmail(user.email, {
        subject: `${store.store_name} had ${(orders||[]).length} orders while you were away`,
        html: `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Inter',sans-serif;max-width:500px;margin:0 auto;background:#07070e;color:#e2e8f0;border-radius:16px;overflow:hidden;border:1px solid #1e1e3a">
  <div style="background:linear-gradient(135deg,#7c3aed,#6366f1);padding:24px">
    <h2 style="margin:0 0 6px;color:#fff;font-size:20px;font-weight:800">We've been tracking for you 👋</h2>
    <p style="margin:0;color:rgba(255,255,255,0.65);font-size:13px">Here's what happened at ${store.store_name} this week</p>
  </div>
  <div style="padding:24px">
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px">
      <div style="background:rgba(99,102,241,0.1);border:1px solid rgba(99,102,241,0.2);border-radius:12px;padding:18px;text-align:center">
        <div style="font-size:30px;font-weight:900;color:#818cf8">${(orders||[]).length}</div>
        <div style="font-size:12px;color:rgba(255,255,255,0.35);margin-top:4px">Orders this week</div>
      </div>
      <div style="background:rgba(16,185,129,0.1);border:1px solid rgba(16,185,129,0.2);border-radius:12px;padding:18px;text-align:center">
        <div style="font-size:30px;font-weight:900;color:#10b981">${fmt(weekRev)}</div>
        <div style="font-size:12px;color:rgba(255,255,255,0.35);margin-top:4px">Revenue this week</div>
      </div>
    </div>
    <p style="font-size:13px;color:rgba(255,255,255,0.45);line-height:1.75;margin:0 0 16px">Open your dashboard to see profit margins, RTO rates, and AI insights for your store.</p>
    <a href="https://pocketdashboard.app/dashboard" style="display:block;text-align:center;padding:13px;background:linear-gradient(135deg,#6366f1,#4f46e5);color:#fff;text-decoration:none;border-radius:10px;font-weight:700;font-size:14px">See Full Dashboard →</a>
  </div>
  <div style="padding:14px 24px;border-top:1px solid rgba(255,255,255,0.05);text-align:center;font-size:11px;color:rgba(255,255,255,0.2)">Pocket Dashboard · Keeping your analytics on autopilot</div>
</div>`,
      });
      console.log(`[ChurnDetect] Nudge sent to ${user.email} (${daysSince} days inactive)`);
      await new Promise(r => setTimeout(r, 1500));
    } catch (e) {
      console.error('[ChurnDetect] Error:', e.message);
    }
  }
  console.log('[ChurnDetect] ✅ Done.');
}

cron.schedule('30 4 * * 0', () => {
  console.log('[ChurnDetect] ⏰ Weekly churn check triggered (Sunday 10am IST)');
  detectAndNudgeChurned().catch(e => console.error('[ChurnDetect] Unhandled:', e.message));
});

// ============================================================================
// INVENTORY MANAGEMENT
// Accepts vendor bills (text / PDF base64 / URL), parses with GPT-4o,
// stores line items, and cross-references Shopify orders for sold quantities.
// ============================================================================

let pdfParse;
try { pdfParse = require('pdf-parse'); } catch (_) {
  console.warn('[Inventory] pdf-parse not installed — PDF uploads will fail. Run: cd server && npm install');
}

let xlsxLib;
try { xlsxLib = require('xlsx'); } catch (_) {
  console.warn('[Inventory] xlsx not installed — Excel/CSV uploads will fail. Run: cd server && npm install');
}

/**
 * POST /api/inventory/parse
 * Body: { storeId, sourceType:'text'|'pdf'|'doc'|'url', text?, fileBase64?, url? }
 */
app.post('/api/inventory/parse', async (req, res) => {
  const { storeId, sourceType, text, fileBase64, url } = req.body || {};
  if (!storeId || !sourceType) return res.status(400).json({ error: 'storeId and sourceType required' });
  if (!process.env.OPENAI_API_KEY) return res.status(500).json({ error: 'OpenAI API key not configured' });

  try {
    let billText = '';

    if (sourceType === 'text') {
      if (!text) return res.status(400).json({ error: 'text is required for text source type' });
      billText = text;
    } else if (sourceType === 'pdf') {
      if (!fileBase64) return res.status(400).json({ error: 'fileBase64 is required for PDF uploads' });
      if (!pdfParse) return res.status(500).json({ error: 'pdf-parse not installed on server. Contact support.' });
      const base64Data = fileBase64.includes(',') ? fileBase64.split(',')[1] : fileBase64;
      const buffer = Buffer.from(base64Data, 'base64');
      const pdfData = await pdfParse(buffer);
      billText = pdfData.text || '';
    } else if (sourceType === 'url') {
      if (!url) return res.status(400).json({ error: 'url is required for URL source type' });
      const resp = await fetch(url, { signal: AbortSignal.timeout(10000) });
      if (!resp.ok) return res.status(400).json({ error: `Failed to fetch URL: HTTP ${resp.status}` });
      billText = await resp.text();
      if (billText.length > 15000) billText = billText.slice(0, 15000) + '\n...[truncated]';
    } else if (sourceType === 'excel' || sourceType === 'csv') {
      if (!fileBase64) return res.status(400).json({ error: 'fileBase64 is required for Excel/CSV uploads' });
      if (!xlsxLib) return res.status(500).json({ error: 'xlsx not installed on server. Contact support.' });
      const base64Data = fileBase64.includes(',') ? fileBase64.split(',')[1] : fileBase64;
      const buffer = Buffer.from(base64Data, 'base64');
      const workbook = xlsxLib.read(buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      billText = xlsxLib.utils.sheet_to_csv(workbook.Sheets[sheetName]);
    } else if (sourceType === 'doc') {
      if (!fileBase64) return res.status(400).json({ error: 'fileBase64 is required for DOC uploads' });
      const base64Data = fileBase64.includes(',') ? fileBase64.split(',')[1] : fileBase64;
      billText = Buffer.from(base64Data, 'base64').toString('utf-8').replace(/\0/g, ' ').slice(0, 15000);
    } else {
      return res.status(400).json({ error: 'Invalid sourceType' });
    }

    if (!billText || billText.trim().length < 10) {
      return res.status(400).json({ error: 'Could not extract text from the document. Try pasting the text manually.' });
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const systemPrompt = `You are an inventory bill parser for e-commerce stores. Extract structured data from vendor/supplier invoices and stock purchase documents.

Return STRICT JSON only (no markdown, no code fences):
{
  "vendor": "<supplier name or null>",
  "bill_date": "<YYYY-MM-DD or null>",
  "bill_number": "<invoice number or null>",
  "total_amount": <total bill value as number, no symbols>,
  "currency": "<INR|USD|EUR|GBP — default INR if ₹ or Rs seen>",
  "items": [
    {
      "name": "<product/item name>",
      "sku": "<SKU/item code or null>",
      "quantity": <integer quantity purchased>,
      "unit_cost": <cost per unit as number>,
      "total_cost": <quantity × unit_cost as number>
    }
  ]
}

Rules:
- Extract ALL line items. Do NOT omit any product.
- If unit_cost is missing, derive it: total_cost / quantity.
- If total_cost is missing, derive it: unit_cost × quantity.
- Strip currency symbols (₹, $, €) from numbers.
- Output JSON only.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Parse this vendor bill:\n\n${billText.slice(0, 12000)}` },
      ],
      temperature: 0,
      max_tokens: 2000,
      response_format: { type: 'json_object' },
    });

    const parsed = JSON.parse(completion.choices[0].message.content);

    if (!Array.isArray(parsed.items) || parsed.items.length === 0) {
      return res.status(422).json({ error: 'No line items found. Make sure the document contains a list of products with quantities and prices.' });
    }

    // Persist bill
    const { data: bill, error: billErr } = await supabase
      .from('inventory_bills')
      .insert({
        store_id:     storeId,
        bill_date:    parsed.bill_date   || null,
        vendor:       (parsed.vendor     || 'Unknown Vendor').slice(0, 200),
        bill_number:  (parsed.bill_number || null),
        source_type:  sourceType,
        source_url:   url || null,
        raw_text:     billText.slice(0, 10000),
        total_amount: Number(parsed.total_amount) || null,
        currency:     (parsed.currency   || 'INR').toUpperCase().slice(0, 4),
        status:       'parsed',
      })
      .select()
      .single();

    if (billErr) throw new Error('DB save failed: ' + billErr.message);

    const lineItems = parsed.items
      .filter(item => item.name && (item.quantity > 0 || item.total_cost > 0))
      .map(item => ({
        bill_id:      bill.id,
        store_id:     storeId,
        product_name: String(item.name).slice(0, 500),
        sku:          item.sku ? String(item.sku).slice(0, 100) : null,
        quantity:     Math.max(0, parseInt(item.quantity) || 0),
        unit_cost:    Math.max(0, parseFloat(item.unit_cost) || 0),
        total_cost:   Math.max(0, parseFloat(item.total_cost) || 0),
      }));

    const { error: itemsErr } = await supabase.from('bill_line_items').insert(lineItems);
    if (itemsErr) console.warn('[Inventory] Line items insert warning:', itemsErr.message);

    console.log(`[Inventory] Parsed bill storeId=${storeId} vendor="${parsed.vendor}" items=${lineItems.length}`);
    res.json({ bill: { ...bill }, items: lineItems });

  } catch (err) {
    console.error('[Inventory/parse]', err.message);
    res.status(500).json({ error: 'Parse failed: ' + err.message });
  }
});

/** GET /api/inventory/bills/:storeId — all bills + their line items */
app.get('/api/inventory/bills/:storeId', async (req, res) => {
  const { storeId } = req.params;
  try {
    const { data: bills, error } = await supabase
      .from('inventory_bills')
      .select('*, bill_line_items(*)')
      .eq('store_id', storeId)
      .order('created_at', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    res.json({ bills: bills || [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** DELETE /api/inventory/bills/:billId?storeId=... */
app.delete('/api/inventory/bills/:billId', async (req, res) => {
  const { billId } = req.params;
  const { storeId } = req.query;
  if (!storeId) return res.status(400).json({ error: 'storeId required' });
  try {
    const { error } = await supabase
      .from('inventory_bills')
      .delete()
      .eq('id', billId)
      .eq('store_id', storeId);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/inventory/summary/:storeId
 * Aggregates all bill line items and cross-references Shopify orders
 * to compute qty_sold and qty_remaining per product.
 */
app.get('/api/inventory/summary/:storeId', async (req, res) => {
  const { storeId } = req.params;
  try {
    const [{ data: items, error: itemsErr }, { data: orders, error: ordersErr }] = await Promise.all([
      supabase.from('bill_line_items').select('*').eq('store_id', storeId),
      supabase.from('orders').select('line_items').eq('store_id', storeId).not('line_items', 'is', null),
    ]);

    if (itemsErr) return res.status(500).json({ error: itemsErr.message });
    if (ordersErr) return res.status(500).json({ error: ordersErr.message });

    if (!items || items.length === 0) {
      return res.json({ summary: [], totals: { totalSpent: 0, totalQtyPurchased: 0, totalQtySold: 0, totalItems: 0 } });
    }

    // Build sold-qty maps from Shopify order line_items (JSONB array)
    const titleSoldMap = new Map();  // lowercase title → qty sold
    const skuSoldMap   = new Map();  // lowercase sku   → qty sold

    for (const order of orders || []) {
      const lis = Array.isArray(order.line_items) ? order.line_items : [];
      for (const li of lis) {
        const title = (li.title || '').toLowerCase().trim();
        const sku   = (li.sku   || '').toLowerCase().trim();
        const qty   = parseInt(li.quantity) || 0;
        if (title) titleSoldMap.set(title, (titleSoldMap.get(title) || 0) + qty);
        if (sku)   skuSoldMap.set(sku,     (skuSoldMap.get(sku)     || 0) + qty);
      }
    }

    // Aggregate bill items by (sku || product_name)
    const aggMap = new Map();
    for (const item of items) {
      const key = ((item.sku || item.product_name) + '').toLowerCase();
      if (!aggMap.has(key)) {
        aggMap.set(key, { product_name: item.product_name, sku: item.sku || null, qty_purchased: 0, total_spent: 0, unit_cost: item.unit_cost, bill_count: 0 });
      }
      const a = aggMap.get(key);
      a.qty_purchased += item.quantity;
      a.total_spent   += Number(item.total_cost) || 0;
      a.unit_cost      = item.unit_cost;
      a.bill_count    += 1;
    }

    // Compute sold quantities via fuzzy title match + exact SKU match
    const summary = Array.from(aggMap.values()).map(item => {
      const nameLower = item.product_name.toLowerCase().trim();
      const skuLower  = (item.sku || '').toLowerCase().trim();

      let qty_sold = 0;

      // 1. Exact SKU match (highest confidence)
      if (skuLower && skuSoldMap.has(skuLower)) {
        qty_sold = skuSoldMap.get(skuLower);
      } else {
        // 2. Title substring match both directions
        for (const [soldTitle, soldQty] of titleSoldMap) {
          const shorter = soldTitle.length < nameLower.length ? soldTitle : nameLower;
          const longer  = soldTitle.length < nameLower.length ? nameLower : soldTitle;
          if (shorter.length >= 4 && longer.includes(shorter)) {
            qty_sold += soldQty;
          }
        }
      }

      const avg_unit_cost  = item.qty_purchased > 0 ? item.total_spent / item.qty_purchased : item.unit_cost;
      const qty_remaining  = Math.max(0, item.qty_purchased - qty_sold);
      const value_remaining = avg_unit_cost * qty_remaining;
      const pct_remaining  = item.qty_purchased > 0 ? (qty_remaining / item.qty_purchased) * 100 : 100;
      const status         = qty_remaining === 0 ? 'out_of_stock'
                           : pct_remaining <= 20  ? 'low_stock'
                           : 'in_stock';

      return { ...item, avg_unit_cost, qty_sold, qty_remaining, value_remaining, pct_remaining, status };
    });

    const totals = {
      totalSpent:         summary.reduce((s, i) => s + i.total_spent, 0),
      totalQtyPurchased:  summary.reduce((s, i) => s + i.qty_purchased, 0),
      totalQtySold:       summary.reduce((s, i) => s + i.qty_sold, 0),
      totalValueRemaining:summary.reduce((s, i) => s + i.value_remaining, 0),
      totalItems:         summary.length,
    };

    res.json({ summary, totals });
  } catch (err) {
    console.error('[Inventory/summary]', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/inventory/insights/:storeId
 * Generates 3-4 short AI insights about inventory health vs. sales.
 */
app.get('/api/inventory/insights/:storeId', async (req, res) => {
  const { storeId } = req.params;
  if (!process.env.OPENAI_API_KEY) return res.status(500).json({ error: 'OpenAI API key not configured' });

  try {
    const [{ data: items }, { data: orders }] = await Promise.all([
      supabase.from('bill_line_items').select('*').eq('store_id', storeId),
      supabase.from('orders').select('line_items').eq('store_id', storeId).not('line_items', 'is', null),
    ]);

    if (!items || items.length === 0) {
      return res.json({ insights: ['No inventory data yet. Upload a vendor bill to get started.'] });
    }

    // Rebuild sold maps (same logic as summary)
    const titleSoldMap = new Map();
    const skuSoldMap   = new Map();
    for (const order of orders || []) {
      for (const li of (Array.isArray(order.line_items) ? order.line_items : [])) {
        const t = (li.title || '').toLowerCase().trim();
        const s = (li.sku   || '').toLowerCase().trim();
        const q = parseInt(li.quantity) || 0;
        if (t) titleSoldMap.set(t, (titleSoldMap.get(t) || 0) + q);
        if (s) skuSoldMap.set(s,   (skuSoldMap.get(s)   || 0) + q);
      }
    }

    const aggMap = new Map();
    for (const item of items) {
      const key = ((item.sku || item.product_name) + '').toLowerCase();
      if (!aggMap.has(key)) aggMap.set(key, { name: item.product_name, sku: item.sku, qty: 0, spent: 0 });
      const a = aggMap.get(key);
      a.qty += item.quantity; a.spent += Number(item.total_cost) || 0;
    }

    const productLines = Array.from(aggMap.values()).map(item => {
      const nameLower = item.name.toLowerCase();
      const skuLower  = (item.sku || '').toLowerCase();
      let sold = 0;
      if (skuLower && skuSoldMap.has(skuLower)) {
        sold = skuSoldMap.get(skuLower);
      } else {
        for (const [t, q] of titleSoldMap) {
          const shorter = t.length < nameLower.length ? t : nameLower;
          const longer  = t.length < nameLower.length ? nameLower : t;
          if (shorter.length >= 4 && longer.includes(shorter)) sold += q;
        }
      }
      const pct = item.qty > 0 ? Math.round((sold / item.qty) * 100) : 0;
      return `- ${item.name}: ${item.qty} purchased, ${sold} sold (${pct}%), ${item.qty - sold} remaining`;
    }).join('\n');

    const totalSpent = Array.from(aggMap.values()).reduce((s, i) => s + i.spent, 0);
    const totalPurchased = Array.from(aggMap.values()).reduce((s, i) => s + i.qty, 0);

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{
        role: 'system',
        content: `You are a concise inventory analyst for an Indian e-commerce store. Generate exactly 3-4 short, actionable insights about inventory health.
Each insight = one sentence, max 20 words. Be specific — use product names and percentages.
Focus on: fast-selling products, slow-moving stock, potential restock needs, overall health.
Return STRICT JSON: { "insights": ["...", "...", "...", "..."] }`
      }, {
        role: 'user',
        content: `Total spent: ₹${totalSpent.toLocaleString('en-IN')} | Total units: ${totalPurchased}\n\nProducts:\n${productLines}`
      }],
      temperature: 0.3,
      max_tokens: 400,
      response_format: { type: 'json_object' },
    });

    const parsed = JSON.parse(completion.choices[0].message.content);
    res.json({ insights: Array.isArray(parsed.insights) ? parsed.insights.slice(0, 4) : [] });
  } catch (err) {
    console.error('[Inventory/insights]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// WAREHOUSE INVENTORY — live stock tracking + order validation
// ============================================================================

// GET /api/warehouse/:storeId — list all products
app.get('/api/warehouse/:storeId', async (req, res) => {
  const { storeId } = req.params;
  try {
    const { data, error } = await supabase
      .from('warehouse_inventory')
      .select('*')
      .eq('store_id', storeId)
      .order('product_name');
    if (error) throw new Error(error.message);
    res.json({ data: data || [] });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/warehouse/:storeId — add a product
app.post('/api/warehouse/:storeId', async (req, res) => {
  const { storeId } = req.params;
  const { product_name, sku, current_stock, reorder_threshold, unit_cost, notes, sync_source } = req.body;
  if (!product_name) return res.status(400).json({ error: 'product_name is required' });
  try {
    const { data, error } = await supabase.from('warehouse_inventory').insert([{
      store_id: storeId, product_name, sku: sku || null,
      current_stock: Number(current_stock) || 0,
      reserved_stock: 0,
      reorder_threshold: Number(reorder_threshold) || 10,
      unit_cost: unit_cost ? Number(unit_cost) : null,
      notes: notes || null,
      sync_source: sync_source || 'manual',
    }]).select().single();
    if (error) throw new Error(error.message);
    res.json({ data });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PUT /api/warehouse/:storeId/:id — update a product
app.put('/api/warehouse/:storeId/:id', async (req, res) => {
  const { storeId, id } = req.params;
  const { product_name, sku, current_stock, reserved_stock, reorder_threshold, unit_cost, notes } = req.body;
  const updates = {};
  if (product_name    !== undefined) updates.product_name     = product_name;
  if (sku             !== undefined) updates.sku              = sku;
  if (current_stock   !== undefined) updates.current_stock   = Number(current_stock);
  if (reserved_stock  !== undefined) updates.reserved_stock  = Number(reserved_stock);
  if (reorder_threshold !== undefined) updates.reorder_threshold = Number(reorder_threshold);
  if (unit_cost       !== undefined) updates.unit_cost       = unit_cost ? Number(unit_cost) : null;
  if (notes           !== undefined) updates.notes           = notes;
  try {
    const { data, error } = await supabase.from('warehouse_inventory')
      .update(updates).eq('id', id).eq('store_id', storeId).select().single();
    if (error) throw new Error(error.message);
    res.json({ data });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE /api/warehouse/:storeId/:id — delete a product
app.delete('/api/warehouse/:storeId/:id', async (req, res) => {
  const { storeId, id } = req.params;
  try {
    const { error } = await supabase.from('warehouse_inventory')
      .delete().eq('id', id).eq('store_id', storeId);
    if (error) throw new Error(error.message);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/warehouse/:storeId/import — bulk upsert from CSV rows
// Body: { rows: [{ product_name, sku, current_stock, reorder_threshold, unit_cost }] }
app.post('/api/warehouse/:storeId/import', async (req, res) => {
  const { storeId } = req.params;
  const { rows } = req.body;
  if (!Array.isArray(rows) || rows.length === 0)
    return res.status(400).json({ error: 'rows array is required' });

  const records = rows.map(r => ({
    store_id: storeId,
    product_name: r.product_name || r['Product Name'] || r['Name'] || '',
    sku: r.sku || r['SKU'] || null,
    current_stock: Number(r.current_stock || r['Stock'] || r['Quantity'] || r['Current Stock'] || 0),
    reserved_stock: 0,
    reorder_threshold: Number(r.reorder_threshold || r['Reorder Threshold'] || r['Min Stock'] || 10),
    unit_cost: r.unit_cost || r['Unit Cost'] || r['Cost'] ? Number(r.unit_cost || r['Unit Cost'] || r['Cost']) : null,
    sync_source: 'csv',
  })).filter(r => r.product_name);

  if (records.length === 0) return res.status(400).json({ error: 'No valid rows found' });

  try {
    // Upsert by SKU if present, else insert
    const { data, error } = await supabase.from('warehouse_inventory')
      .upsert(records, { onConflict: 'store_id,sku', ignoreDuplicates: false })
      .select();
    if (error) throw new Error(error.message);
    res.json({ imported: records.length, data });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/warehouse/:storeId/validate — compare recent orders vs warehouse stock
app.get('/api/warehouse/:storeId/validate', async (req, res) => {
  const { storeId } = req.params;
  const days = Number(req.query.days) || 7;
  try {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    const [{ data: inventory }, { data: orders }] = await Promise.all([
      supabase.from('warehouse_inventory').select('*').eq('store_id', storeId),
      supabase.from('orders').select('id, name, created_at, line_items')
        .eq('store_id', storeId).gte('created_at', since)
        .is('cancelled_at', null).order('created_at', { ascending: false }),
    ]);

    if (!inventory) return res.json({ conflicts: [], summary: {} });

    // Build SKU → inventory map (also try lowercase product_name)
    const bySkuMap = {};
    const byNameMap = {};
    for (const item of inventory) {
      if (item.sku) bySkuMap[item.sku.toLowerCase()] = item;
      byNameMap[item.product_name.toLowerCase()] = item;
    }

    // Aggregate ordered quantities from orders
    const orderedQty = {}; // productId → { qty, orders[] }
    for (const order of (orders || [])) {
      const lineItems = Array.isArray(order.line_items) ? order.line_items : [];
      for (const li of lineItems) {
        const sku = (li.sku || '').toLowerCase();
        const name = (li.title || '').toLowerCase();
        const inv = bySkuMap[sku] || byNameMap[name] ||
          Object.values(byNameMap).find(i => name.includes(i.product_name.toLowerCase()) || i.product_name.toLowerCase().includes(name));
        if (!inv) continue;
        if (!orderedQty[inv.id]) orderedQty[inv.id] = { inv, qty: 0, orders: [] };
        orderedQty[inv.id].qty += Number(li.quantity) || 0;
        orderedQty[inv.id].orders.push({ order_id: order.id, order_name: order.name, qty: li.quantity, created_at: order.created_at });
      }
    }

    // Find conflicts (ordered > available) and low stock
    const conflicts = [];
    const available = (inv) => Math.max(0, inv.current_stock - inv.reserved_stock);

    for (const { inv, qty, orders: orderList } of Object.values(orderedQty)) {
      const avail = available(inv);
      if (qty > avail) {
        conflicts.push({
          product_name: inv.product_name, sku: inv.sku,
          current_stock: inv.current_stock, reserved_stock: inv.reserved_stock,
          available_stock: avail, ordered_qty: qty, shortfall: qty - avail,
          orders: orderList.slice(0, 5),
        });
      }
    }

    // Low stock alerts (below threshold, not already in conflicts)
    const lowStock = inventory.filter(inv =>
      available(inv) <= inv.reorder_threshold && !orderedQty[inv.id]
    ).map(inv => ({ product_name: inv.product_name, sku: inv.sku, available_stock: available(inv), reorder_threshold: inv.reorder_threshold }));

    res.json({
      conflicts,
      low_stock: lowStock,
      orders_checked: (orders || []).length,
      period_days: days,
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
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
