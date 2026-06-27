import React, { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Inbox, Mail, Phone, Building2, ShoppingBag, Tag, RefreshCw } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
);

const TOPIC_LABELS = {
  demo: 'Dashboard Demo', starter: 'Starter Plan', pro: 'Pro Plan',
  custom: 'Custom Dashboard', ai: 'AI Co-Pilot', integration: 'Integration',
  enterprise: 'Enterprise', other: 'Other',
};

const PLATFORM_LABELS = {
  shopify: 'Shopify', woocommerce: 'WooCommerce', custom: 'Custom Build',
  amazon: 'Amazon / Marketplaces', multiple: 'Multiple Platforms',
};

export default function AdminRequests({ session }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchRequests = async () => {
    setLoading(true);
    setError('');
    try {
      const token = session?.access_token;
      const res = await fetch(`${API_URL}/api/admin/contact-requests`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(await res.text());
      const { data } = await res.json();
      setRequests(data || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRequests(); }, []);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#e2e8f0', letterSpacing: '-0.02em' }}>Contact Requests</h1>
          <p style={{ margin: '3px 0 0', fontSize: 13, color: 'rgba(226,232,240,0.4)' }}>
            {loading ? 'Loading…' : `${requests.length} request${requests.length !== 1 ? 's' : ''} received`}
          </p>
        </div>
        <button
          onClick={fetchRequests}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)', color: '#a5b4fc', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
        >
          <RefreshCw size={14} style={{ opacity: loading ? 0.5 : 1 }} />
          Refresh
        </button>
      </div>

      {error && (
        <div style={{ padding: '12px 16px', borderRadius: 10, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171', fontSize: 13, marginBottom: 16 }}>
          {error}
        </div>
      )}

      {!loading && requests.length === 0 && !error && (
        <div style={{ padding: '40px', borderRadius: 16, background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.1)', textAlign: 'center', marginBottom: 20 }}>
          <Inbox size={32} color="rgba(139,92,246,0.35)" style={{ marginBottom: 12 }} />
          <div style={{ fontSize: 15, fontWeight: 700, color: 'rgba(226,232,240,0.4)', marginBottom: 8 }}>No Requests Yet</div>
          <div style={{ fontSize: 13, color: 'rgba(226,232,240,0.3)' }}>
            Submissions from the contact form will appear here.
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {requests.map((r) => (
          <div key={r.id} style={{ padding: '20px 22px', borderRadius: 14, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', transition: 'border-color 0.2s' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#e2e8f0', marginBottom: 4 }}>{r.full_name}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, marginBottom: 10 }}>
                  {r.email && (
                    <a href={`mailto:${r.email}`} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: '#22d3ee', textDecoration: 'none' }}>
                      <Mail size={12} /> {r.email}
                    </a>
                  )}
                  {r.phone && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: 'rgba(226,232,240,0.5)' }}>
                      <Phone size={12} /> {r.phone}
                    </span>
                  )}
                  {r.brand_name && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: 'rgba(226,232,240,0.5)' }}>
                      <Building2 size={12} /> {r.brand_name}
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {r.topic && (
                    <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 6, background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)', color: '#a5b4fc' }}>
                      {TOPIC_LABELS[r.topic] || r.topic}
                    </span>
                  )}
                  {r.platform && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 6, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(226,232,240,0.6)' }}>
                      <ShoppingBag size={10} /> {PLATFORM_LABELS[r.platform] || r.platform}
                    </span>
                  )}
                  {r.order_volume && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 6, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(226,232,240,0.6)' }}>
                      <Tag size={10} /> {r.order_volume} orders/mo
                    </span>
                  )}
                </div>
              </div>
              <div style={{ fontSize: 11, color: 'rgba(226,232,240,0.3)', whiteSpace: 'nowrap', flexShrink: 0 }}>
                {new Date(r.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
            {r.message && (
              <div style={{ marginTop: 14, padding: '12px 14px', borderRadius: 8, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', fontSize: 13, color: 'rgba(226,232,240,0.55)', lineHeight: 1.6 }}>
                {r.message}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
