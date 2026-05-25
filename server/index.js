const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const { OpenAI } = require('openai');
const { syncStoreData } = require('./syncService');
const { encrypt } = require('./cryptoUtils');

const VITE_SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://missing.supabase.co';
// Use the Service Role Key on the server — this bypasses RLS safely
// NEVER expose this key to the frontend/browser
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'MISSING_KEY';
const supabase = createClient(VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const app = express();
const PORT = process.env.PORT || 3001;

const corsOptions = {
  origin: process.env.NODE_ENV === 'production'
    ? ['https://pocketdashboard.app', 'https://www.pocketdashboard.app']
    : '*',
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  credentials: true,
};
app.use(cors(corsOptions));
app.use(express.json());

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
  const { owner_id, store_name, shopify_domain, shopify_client_id, shopify_access_token, primary_color, dashboard_style, sync_from_date } = req.body;

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
        sync_from_date: sync_from_date || '2000-01-01'
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

  // ?full=true forces a complete historical re-sync (ignores last_synced_at)
  const forceFullSync = req.query.full === 'true';

  console.log(`[Sync API] Triggered for store: ${storeId} full=${forceFullSync}`);
  try {
    const result = await syncStoreData(storeId, { forceFullSync });
    console.log(`[Sync API] ✅ Completed for ${storeId}:`, result);
    res.json({ status: 'sync_complete', storeId, totalSynced: result.totalSynced, mode: result.mode });
  } catch (err) {
    console.error(`[Sync API] ❌ Failed for ${storeId}:`, err.message);
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

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Pocket Dashboard Sync Server running on http://localhost:${PORT}`);
  });
}

module.exports = app;
