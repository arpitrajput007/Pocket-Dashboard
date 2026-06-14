const fs = require('fs'), path = require('path');
const { createClient } = require('@supabase/supabase-js');

const env = {};
fs.readFileSync(path.join(__dirname, '../.env'), 'utf-8').split('\n').forEach(l => {
  const [k, ...v] = l.split('=');
  if (k && v.length) env[k.trim()] = v.join('=').trim();
});

const supabase = createClient(env['VITE_SUPABASE_URL'], env['SUPABASE_SERVICE_ROLE_KEY']);

(async () => {
  const { data: stores } = await supabase
    .from('stores')
    .select('id, store_name, shiprocket_connected, shiprocket_sync_from_date, shipments_synced_at')
    .eq('shiprocket_connected', true);

  console.log('\n=== SHIPROCKET-CONNECTED STORES ===');
  for (const s of stores || []) {
    console.log(`\nStore: ${s.store_name} (${s.id})`);
    console.log(`  sync_from_date: ${s.shiprocket_sync_from_date || 'NULL (all time)'}`);
    console.log(`  last synced:    ${s.shipments_synced_at}`);

    // Total shipment count (exact)
    const { count } = await supabase
      .from('shipments')
      .select('*', { count: 'exact', head: true })
      .eq('store_id', s.id);
    console.log(`  shipment rows:  ${count}`);

    // Date span of synced shipments via status_updated_at
    const { data: oldest } = await supabase
      .from('shipments').select('status_updated_at, shopify_order_name')
      .eq('store_id', s.id).order('status_updated_at', { ascending: true }).limit(1);
    const { data: newest } = await supabase
      .from('shipments').select('status_updated_at, shopify_order_name')
      .eq('store_id', s.id).order('status_updated_at', { ascending: false }).limit(1);
    console.log(`  oldest status_updated_at: ${oldest?.[0]?.status_updated_at}`);
    console.log(`  newest status_updated_at: ${newest?.[0]?.status_updated_at}`);

    // How many have a shopify_order_name (the join key)?
    const { count: withName } = await supabase
      .from('shipments').select('*', { count: 'exact', head: true })
      .eq('store_id', s.id).not('shopify_order_name', 'is', null);
    console.log(`  rows WITH shopify_order_name: ${withName} / ${count}`);

    // Status distribution
    const { data: all } = await supabase
      .from('shipments').select('status').eq('store_id', s.id).limit(2000);
    const dist = {};
    (all || []).forEach(r => { dist[r.status] = (dist[r.status] || 0) + 1; });
    console.log(`  status distribution:`, dist);

    // Sample order names to see format
    const { data: sample } = await supabase
      .from('shipments').select('shopify_order_name').eq('store_id', s.id).limit(5);
    console.log(`  sample order names:`, (sample || []).map(r => r.shopify_order_name));
  }
  process.exit(0);
})();
