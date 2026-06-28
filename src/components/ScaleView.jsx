import React, { useState } from 'react';
import {
  Zap, Globe, TrendingUp, ArrowRight, CheckCircle2, X, Loader2,
  Building2, User, Mail, Phone, Link, ShoppingCart, CreditCard,
  FileText, DollarSign, Shield, Sparkles, ChevronDown,
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const SERVICES = [
  {
    id: 'domestic_pg',
    icon: CreditCard,
    gradient: 'linear-gradient(135deg,#6366f1,#4f46e5)',
    glow: 'rgba(99,102,241,0.15)',
    accentColor: '#a5b4fc',
    tag: 'Most Popular',
    tagColor: '#6366f1',
    title: 'Domestic Payment Gateway',
    subtitle: 'Start accepting prepaid orders across India',
    description: 'We help you find and onboard with the right payment gateway partner so your customers can pay online — UPI, cards, netbanking and more.',
    benefits: [
      'Curated gateway recommendations for your business type',
      'Faster onboarding with our partner network',
      'GST / MSME compliance guidance included',
      'End-to-end support until you go live',
    ],
  },
  {
    id: 'international_pg',
    icon: Globe,
    gradient: 'linear-gradient(135deg,#0ea5e9,#06b6d4)',
    glow: 'rgba(14,165,233,0.15)',
    accentColor: '#7dd3fc',
    tag: 'Unique USP',
    tagColor: '#0ea5e9',
    title: 'International Payment Gateway',
    subtitle: 'Accept global payments — settled in minutes',
    description: "Sell internationally and get your money faster than anyone else. Unlike T+1/T+3 settlements, we support instant settlement — including USDT payments. Your customers pay via bank or local rails, you receive instantly.",
    benefits: [
      'Settlements in minutes — not T+1/2/3 days',
      'USDT crypto settlement supported',
      'Customers pay via bank transfer or local rails',
      'Generate payment links directly for your buyers',
    ],
  },
  {
    id: 'meta_usdt',
    icon: TrendingUp,
    gradient: 'linear-gradient(135deg,#8b5cf6,#6366f1)',
    glow: 'rgba(139,92,246,0.15)',
    accentColor: '#c4b5fd',
    tag: 'For Advertisers',
    tagColor: '#8b5cf6',
    title: 'Meta Ads USDT / INR Settlement',
    subtitle: 'Flexible settlement for your ad spend',
    description: 'Running Meta ads at scale? We provide settlement assistance so you can manage your Meta advertising payments efficiently — in USDT or INR, based on your preference.',
    benefits: [
      'USDT or INR settlement — your choice',
      'Designed for high-volume Meta advertisers',
      'Streamlined documentation support',
      'Dedicated account manager',
    ],
  },
];

// ── Form field configs per service ──────────────────────────────────────────────
const DOMESTIC_FIELDS = [
  { key: 'business_name',        label: 'Business Name',               type: 'text',   placeholder: 'Acme D2C', required: true },
  { key: 'contact_person',       label: 'Contact Person',              type: 'text',   placeholder: 'Jane Doe', required: true },
  { key: 'email',                label: 'Email Address',               type: 'email',  placeholder: 'jane@acme.com', required: true },
  { key: 'phone',                label: 'Phone Number',                type: 'tel',    placeholder: '+91 98765 43210', required: true },
  { key: 'website_url',          label: 'Website / Shopify Store URL', type: 'text',   placeholder: 'https://yourstore.com' },
  { key: 'monthly_order_volume', label: 'Current Monthly Order Volume',type: 'select', options: ['< 500', '500 – 2,000', '2,000 – 5,000', '5,000 – 10,000', '10,000+'] },
  { key: 'current_gateway',      label: 'Current Payment Gateway (if any)', type: 'text', placeholder: 'Razorpay, PayU, None…' },
  { key: 'has_gst_msme',         label: 'Do you have GST or MSME registration?', type: 'select', options: ['Yes — GST', 'Yes — MSME', 'Yes — Both', 'No', 'In Progress'] },
  { key: 'additional_notes',     label: 'Additional Requirements',     type: 'textarea', placeholder: 'Any specific requirements or questions…' },
];

const INTL_FIELDS = [
  { key: 'business_name',        label: 'Business Name',               type: 'text',   placeholder: 'Acme D2C', required: true },
  { key: 'contact_person',       label: 'Contact Person',              type: 'text',   placeholder: 'Jane Doe', required: true },
  { key: 'email',                label: 'Email Address',               type: 'email',  placeholder: 'jane@acme.com', required: true },
  { key: 'phone',                label: 'Phone Number',                type: 'tel',    placeholder: '+91 98765 43210', required: true },
  { key: 'website_url',          label: 'Website / Store URL',         type: 'text',   placeholder: 'https://yourstore.com' },
  { key: 'countries_sold_to',    label: 'Countries You Sell To',       type: 'text',   placeholder: 'USA, UK, UAE, Singapore…', required: true },
  { key: 'monthly_intl_orders',  label: 'Monthly International Orders (Optional)', type: 'text', placeholder: 'e.g. 200 orders/month' },
  { key: 'payment_receive_method', label: 'How should your customers pay?', type: 'select',
    options: ['Bank Transfer / Local Rails', 'USDT (Crypto)', 'Both options'], required: true },
  { key: 'additional_notes',     label: 'Additional Requirements',     type: 'textarea', placeholder: 'Any specific requirements or questions…' },
];

const META_FIELDS = [
  { key: 'business_name',        label: 'Business Name',               type: 'text',   placeholder: 'Acme D2C', required: true },
  { key: 'contact_person',       label: 'Contact Person',              type: 'text',   placeholder: 'Jane Doe', required: true },
  { key: 'email',                label: 'Email Address',               type: 'email',  placeholder: 'jane@acme.com', required: true },
  { key: 'phone',                label: 'Phone Number',                type: 'tel',    placeholder: '+91 98765 43210', required: true },
  { key: 'monthly_meta_spend',   label: 'Monthly Meta Ads Spend',      type: 'select', options: ['< ₹1L', '₹1L – ₹5L', '₹5L – ₹20L', '₹20L – ₹50L', '₹50L+'], required: true },
  { key: 'settlement_currency',  label: 'Preferred Settlement Currency', type: 'select', options: ['USDT', 'INR', 'Both (Flexible)'], required: true },
  { key: 'additional_notes',     label: 'Additional Notes',            type: 'textarea', placeholder: 'Any specific requirements…' },
];

const FORM_FIELDS = { domestic_pg: DOMESTIC_FIELDS, international_pg: INTL_FIELDS, meta_usdt: META_FIELDS };

// ── Request Modal ──────────────────────────────────────────────────────────────
function RequestModal({ service, storeId, onClose }) {
  const fields = FORM_FIELDS[service.id] || [];
  const init = Object.fromEntries(fields.map(f => [f.key, '']));
  const [form, setForm]     = useState(init);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess]       = useState(false);
  const [error, setError]           = useState('');

  const set = key => e => setForm(p => ({ ...p, [key]: e.target.value }));

  const handleSubmit = async e => {
    e.preventDefault();
    setSubmitting(true); setError('');
    try {
      const res = await fetch(`${API_URL}/api/scale/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, service_type: service.id, store_id: storeId || null }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Request failed');
      setSuccess(true);
    } catch (err) {
      setError(err.message);
    } finally { setSubmitting(false); }
  };

  const inputCls = {
    width: '100%', padding: '10px 13px', borderRadius: 10, fontSize: 13,
    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
    color: '#e2e8f0', outline: 'none', boxSizing: 'border-box',
    transition: 'border-color 0.2s',
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex',
      alignItems: 'flex-end', justifyContent: 'center', zIndex: 1000, padding: '0' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ width: '100%', maxWidth: 600, maxHeight: '90vh', display: 'flex', flexDirection: 'column',
        borderRadius: '24px 24px 0 0', background: '#0d0d18',
        border: '1px solid rgba(255,255,255,0.1)', borderBottom: 'none', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ padding: '22px 24px 18px', borderBottom: '1px solid rgba(255,255,255,0.07)',
          background: 'rgba(255,255,255,0.02)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 38, height: 38, borderRadius: 11, background: service.gradient,
                display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <service.icon size={18} color="#fff" />
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 800, color: '#e2e8f0' }}>Request Assistance</div>
                <div style={{ fontSize: 12, color: 'rgba(226,232,240,0.4)', marginTop: 1 }}>{service.title}</div>
              </div>
            </div>
            <button onClick={onClose}
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 8, padding: '6px', cursor: 'pointer', color: 'rgba(226,232,240,0.5)', display: 'flex' }}>
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          {success ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', padding: '48px 24px', textAlign: 'center', gap: 16 }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(16,185,129,0.1)',
                border: '1px solid rgba(16,185,129,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CheckCircle2 size={32} color="#10b981" />
              </div>
              <div>
                <div style={{ fontSize: 20, fontWeight: 800, color: '#e2e8f0', marginBottom: 8 }}>Request Submitted!</div>
                <div style={{ fontSize: 14, color: 'rgba(226,232,240,0.5)', lineHeight: 1.7, maxWidth: 320 }}>
                  Our team will reach out to you within 24 hours to discuss next steps.
                </div>
              </div>
              <button onClick={onClose}
                style={{ marginTop: 8, padding: '10px 28px', borderRadius: 10, background: service.gradient,
                  border: 'none', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                Done
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                {fields.map(f => (
                  <div key={f.key}
                    style={{ gridColumn: f.type === 'textarea' || f.type === 'select' && f.key === 'payment_receive_method' ? 'span 2' : undefined }}>
                    <label style={{ fontSize: 11, fontWeight: 700, color: 'rgba(226,232,240,0.45)',
                      display: 'block', marginBottom: 5, letterSpacing: '0.3px' }}>
                      {f.label}{f.required && <span style={{ color: '#f87171', marginLeft: 3 }}>*</span>}
                    </label>
                    {f.type === 'select' ? (
                      <div style={{ position: 'relative' }}>
                        <select required={f.required} value={form[f.key]} onChange={set(f.key)}
                          style={{ ...inputCls, appearance: 'none', cursor: 'pointer', paddingRight: 32 }}>
                          <option value="">Select…</option>
                          {f.options.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                        <ChevronDown size={14} style={{ position: 'absolute', right: 11, top: '50%',
                          transform: 'translateY(-50%)', pointerEvents: 'none', color: 'rgba(226,232,240,0.4)' }} />
                      </div>
                    ) : f.type === 'textarea' ? (
                      <textarea required={f.required} rows={3} placeholder={f.placeholder}
                        value={form[f.key]} onChange={set(f.key)}
                        style={{ ...inputCls, resize: 'vertical', minHeight: 80 }} />
                    ) : (
                      <input required={f.required} type={f.type} placeholder={f.placeholder}
                        value={form[f.key]} onChange={set(f.key)} style={inputCls} />
                    )}
                  </div>
                ))}
              </div>

              {/* International PG USP callout */}
              {service.id === 'international_pg' && (
                <div style={{ marginTop: 16, padding: '14px 16px', borderRadius: 12,
                  background: 'rgba(14,165,233,0.06)', border: '1px solid rgba(14,165,233,0.2)' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#7dd3fc', marginBottom: 4 }}>
                    ⚡ Instant Settlement — Our USP
                  </div>
                  <div style={{ fontSize: 12, color: 'rgba(226,232,240,0.5)', lineHeight: 1.6 }}>
                    Unlike T+1/2/3 day settlements from other gateways, we settle your international payments in <strong style={{ color: '#7dd3fc' }}>minutes</strong>. USDT payments also supported.
                  </div>
                </div>
              )}

              {error && (
                <div style={{ marginTop: 14, padding: '10px 14px', borderRadius: 10,
                  background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
                  color: '#f87171', fontSize: 13 }}>{error}</div>
              )}

              <button type="submit" disabled={submitting}
                style={{ width: '100%', marginTop: 20, padding: '12px', borderRadius: 11,
                  background: submitting ? 'rgba(99,102,241,0.4)' : service.gradient,
                  border: 'none', color: '#fff', fontSize: 14, fontWeight: 700,
                  cursor: submitting ? 'not-allowed' : 'pointer', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                {submitting ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Submitting…</> : <>Submit Request <ArrowRight size={16} /></>}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Service Card ───────────────────────────────────────────────────────────────
function ServiceCard({ service, onRequest }) {
  const Icon = service.icon;
  return (
    <div style={{ position: 'relative', borderRadius: 20, padding: 1,
      background: 'linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.04))',
      transition: 'all 0.3s' }}>
      <div style={{ borderRadius: 19, background: 'linear-gradient(160deg, #0d0d1a 0%, #0a0a14 100%)',
        padding: '28px 26px', height: '100%', display: 'flex', flexDirection: 'column' }}>

        {/* Tag */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: service.gradient,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 8px 24px ${service.glow}` }}>
            <Icon size={22} color="#fff" />
          </div>
          <span style={{ fontSize: 10, fontWeight: 800, padding: '4px 10px', borderRadius: 20,
            background: `${service.tagColor}18`, border: `1px solid ${service.tagColor}35`,
            color: service.accentColor, letterSpacing: '0.5px' }}>
            {service.tag}
          </span>
        </div>

        {/* Title */}
        <div style={{ fontSize: 18, fontWeight: 800, color: '#e2e8f0', marginBottom: 6, letterSpacing: '-0.3px' }}>
          {service.title}
        </div>
        <div style={{ fontSize: 13, color: service.accentColor, fontWeight: 600, marginBottom: 14 }}>
          {service.subtitle}
        </div>
        <div style={{ fontSize: 13, color: 'rgba(226,232,240,0.5)', lineHeight: 1.7, marginBottom: 22, flex: 1 }}>
          {service.description}
        </div>

        {/* Benefits */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginBottom: 24 }}>
          {service.benefits.map((b, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <div style={{ width: 18, height: 18, borderRadius: '50%', flexShrink: 0, marginTop: 1,
                background: `${service.tagColor}18`, border: `1px solid ${service.tagColor}35`,
                display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CheckCircle2 size={11} color={service.accentColor} />
              </div>
              <span style={{ fontSize: 12.5, color: 'rgba(226,232,240,0.6)', lineHeight: 1.5 }}>{b}</span>
            </div>
          ))}
        </div>

        {/* CTA */}
        <button onClick={() => onRequest(service)}
          style={{ width: '100%', padding: '12px 20px', borderRadius: 12, border: 'none',
            background: service.gradient, color: '#fff', fontSize: 14, fontWeight: 700,
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 8, boxShadow: `0 4px 20px ${service.glow}`,
            transition: 'opacity 0.2s, transform 0.2s' }}
          onMouseEnter={e => { e.currentTarget.style.opacity = '0.9'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
          onMouseLeave={e => { e.currentTarget.style.opacity = '1';   e.currentTarget.style.transform = 'translateY(0)'; }}>
          Request Assistance <ArrowRight size={15} />
        </button>
      </div>
    </div>
  );
}

// ── Main ScaleView ─────────────────────────────────────────────────────────────
export default function ScaleView({ store }) {
  const [activeModal, setActiveModal] = useState(null);

  return (
    <div style={{ paddingBottom: 60 }}>
      {/* Hero */}
      <div style={{ marginBottom: 40, position: 'relative' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '5px 14px',
          borderRadius: 20, background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)',
          marginBottom: 16 }}>
          <Sparkles size={13} color="#a5b4fc" />
          <span style={{ fontSize: 11, fontWeight: 700, color: '#a5b4fc', letterSpacing: '0.8px',
            textTransform: 'uppercase' }}>Premium Business Services</span>
        </div>

        <h1 style={{ margin: '0 0 14px', fontSize: 32, fontWeight: 900, color: '#fff',
          letterSpacing: '-0.6px', lineHeight: 1.15 }}>
          Scale Your{' '}
          <span style={{ background: 'linear-gradient(90deg,#6366f1,#22d3ee)', WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            Business
          </span>
        </h1>
        <p style={{ margin: 0, fontSize: 15, color: 'rgba(226,232,240,0.5)', lineHeight: 1.7, maxWidth: 560 }}>
          Beyond analytics — Pocket Dashboard connects you with the right partners and solutions
          to grow your D2C brand faster. These are hands-on services, not just software.
        </p>
      </div>

      {/* Cards grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20, marginBottom: 48 }}>
        {SERVICES.map(s => (
          <ServiceCard key={s.id} service={s} onRequest={svc => setActiveModal(svc)} />
        ))}
      </div>

      {/* Bottom trust bar */}
      <div style={{ padding: '20px 24px', borderRadius: 16, background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center',
        flexWrap: 'wrap', gap: 24 }}>
        {[
          { icon: Shield, text: 'Your data is private and secure' },
          { icon: User,   text: 'Dedicated account manager assigned' },
          { icon: Zap,    text: 'Response within 24 hours' },
        ].map(({ icon: Icon, text }) => (
          <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Icon size={14} color="rgba(99,102,241,0.7)" />
            <span style={{ fontSize: 12, color: 'rgba(226,232,240,0.4)', fontWeight: 500 }}>{text}</span>
          </div>
        ))}
      </div>

      {activeModal && (
        <RequestModal service={activeModal} storeId={store?.id} onClose={() => setActiveModal(null)} />
      )}
    </div>
  );
}
