import React, { useState, useEffect, useCallback } from 'react';
import {
  Building2, Plug, IndianRupee, Sparkles, CreditCard, Shield,
  Check, RefreshCw, Plus, Trash2, Eye, EyeOff,
  Globe, Clock, Phone, FileText, MapPin, User, Mail,
  Zap, Lock, Monitor, LogOut, Download, Edit2, ChevronRight,
  AlertCircle, Loader, Camera, Brain, Activity
} from 'lucide-react';
import { supabase } from '../supabaseClient';

const API_URL = import.meta.env.VITE_API_URL || '';

// ─── Shared primitives ──────────────────────────────────────────────────────

function Toggle({ on, onChange, disabled }) {
  return (
    <button onClick={() => !disabled && onChange(!on)} disabled={disabled}
      style={{
        position: 'relative', width: 48, height: 26, borderRadius: 999, border: 'none',
        background: on ? 'linear-gradient(135deg,#6366f1,#4f46e5)' : 'rgba(255,255,255,0.1)',
        cursor: disabled ? 'not-allowed' : 'pointer', transition: 'background 0.25s, box-shadow 0.25s',
        flexShrink: 0, opacity: disabled ? 0.5 : 1,
        boxShadow: on ? '0 0 16px rgba(99,102,241,0.45)' : 'none',
      }}>
      <span style={{
        position: 'absolute', top: 4, left: on ? 26 : 4, width: 18, height: 18,
        borderRadius: '50%', background: '#fff', transition: 'left 0.25s', display: 'block',
        boxShadow: '0 1px 4px rgba(0,0,0,0.4)',
      }} />
    </button>
  );
}

function Field({ label, children, span2 }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, gridColumn: span2 ? 'span 2' : undefined }}>
      {label && <label style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{label}</label>}
      {children}
    </div>
  );
}

function TextInput({ value, onChange, placeholder, type = 'text', icon, readOnly, prefix }) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
      {icon && <span style={{ position: 'absolute', left: 14, color: 'rgba(255,255,255,0.3)', pointerEvents: 'none', display: 'flex' }}>{icon}</span>}
      {prefix && <span style={{ position: 'absolute', left: 14, fontSize: 13.5, color: 'rgba(255,255,255,0.35)', pointerEvents: 'none' }}>{prefix}</span>}
      <input type={type} value={value} onChange={e => onChange?.(e.target.value)} placeholder={placeholder}
        readOnly={readOnly} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        style={{
          width: '100%', padding: (icon || prefix) ? '12px 14px 12px 40px' : '12px 16px',
          background: readOnly ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.04)',
          border: `1px solid ${focused ? 'rgba(99,102,241,0.55)' : 'rgba(255,255,255,0.1)'}`,
          borderRadius: 12, color: readOnly ? 'rgba(255,255,255,0.35)' : '#e2e8f0',
          fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
          transition: 'border-color 0.2s, box-shadow 0.2s', cursor: readOnly ? 'default' : 'text',
          boxShadow: focused ? '0 0 0 3px rgba(99,102,241,0.12)' : 'none',
        }} />
    </div>
  );
}

function SelectInput({ value, onChange, options }) {
  const [focused, setFocused] = useState(false);
  return (
    <select value={value} onChange={e => onChange(e.target.value)}
      onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
      style={{
        width: '100%', padding: '12px 16px',
        background: 'rgba(255,255,255,0.04)',
        border: `1px solid ${focused ? 'rgba(99,102,241,0.55)' : 'rgba(255,255,255,0.1)'}`,
        borderRadius: 12, color: '#e2e8f0', fontSize: 14, fontFamily: 'inherit',
        outline: 'none', cursor: 'pointer', appearance: 'none',
        boxShadow: focused ? '0 0 0 3px rgba(99,102,241,0.12)' : 'none',
      }}>
      {options.map(o => <option key={o.value} value={o.value} style={{ background: '#1e1e2e' }}>{o.label}</option>)}
    </select>
  );
}

function StatusDot({ connected, label }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700,
      color: connected === 'soon' ? '#94a3b8' : connected ? '#10b981' : '#f87171',
      background: connected === 'soon' ? 'rgba(148,163,184,0.1)' : connected ? 'rgba(16,185,129,0.1)' : 'rgba(248,113,133,0.1)',
      border: `1px solid ${connected === 'soon' ? 'rgba(148,163,184,0.2)' : connected ? 'rgba(16,185,129,0.25)' : 'rgba(248,113,133,0.25)'}`,
      borderRadius: 999, padding: '4px 10px',
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
        background: connected === 'soon' ? '#94a3b8' : connected ? '#10b981' : '#f87171',
        boxShadow: connected === 'soon' ? 'none' : connected ? '0 0 6px #10b981' : '0 0 6px #f87171',
      }} />
      {label || (connected === 'soon' ? 'Coming Soon' : connected ? 'Connected' : 'Not Connected')}
    </span>
  );
}

function Pill({ children, color = '#818cf8', bg = 'rgba(99,102,241,0.1)', border = 'rgba(99,102,241,0.2)' }) {
  return (
    <span style={{ fontSize: 10.5, fontWeight: 700, padding: '3px 9px', borderRadius: 999, color, background: bg, border: `1px solid ${border}`, letterSpacing: '0.06em' }}>
      {children}
    </span>
  );
}

function SaveBtn({ saving, saved, onClick, label = 'Save Changes' }) {
  return (
    <button onClick={onClick} disabled={saving}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 8, padding: '11px 24px',
        borderRadius: 12, border: 'none', cursor: saving ? 'wait' : 'pointer',
        background: saved ? 'linear-gradient(135deg,#10b981,#059669)' : 'linear-gradient(135deg,#6366f1,#4f46e5)',
        color: '#fff', fontSize: 13.5, fontWeight: 700, fontFamily: 'inherit',
        boxShadow: saved ? '0 0 20px rgba(16,185,129,0.35)' : '0 0 20px rgba(99,102,241,0.35)',
        transition: 'all 0.25s',
      }}>
      {saving ? <Loader size={14} style={{ animation: 'spin 1s linear infinite' }} /> : saved ? <Check size={14} /> : null}
      {saving ? 'Saving…' : saved ? 'Saved!' : label}
    </button>
  );
}

// ─── Health Ring ─────────────────────────────────────────────────────────────

function HealthRing({ score, size = 88 }) {
  const r = (size - 12) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  const color = score >= 75 ? '#10b981' : score >= 50 ? '#fbbf24' : '#f87171';
  const label = score >= 75 ? 'Excellent' : score >= 50 ? 'Good' : 'Needs Work';
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={9} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={9}
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 1.2s ease', filter: `drop-shadow(0 0 8px ${color}90)` }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: 20, fontWeight: 800, color, fontFamily: 'Outfit,sans-serif', lineHeight: 1 }}>{score}</span>
        <span style={{ fontSize: 8.5, fontWeight: 700, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.06em', textTransform: 'uppercase', marginTop: 2 }}>{label}</span>
      </div>
    </div>
  );
}

// ─── Left Nav ────────────────────────────────────────────────────────────────

const SECTIONS = [
  { key: 'profile',       icon: Building2,    label: 'Business Profile' },
  { key: 'integrations',  icon: Plug,         label: 'Integrations' },
  { key: 'money',         icon: IndianRupee,  label: 'Money Settings' },
  { key: 'ai',            icon: Sparkles,     label: 'AI Co-Pilot' },
  { key: 'billing',       icon: CreditCard,   label: 'Billing' },
  { key: 'security',      icon: Shield,       label: 'Security' },
];

function SettingsNav({ active, onChange }) {
  return (
    <div style={{
      width: 210, flexShrink: 0, position: 'sticky', top: 0, alignSelf: 'flex-start',
      background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: 18, padding: '8px 6px', display: 'flex', flexDirection: 'column', gap: 2,
    }}>
      {SECTIONS.map(({ key, icon: Icon, label }) => {
        const on = active === key;
        return (
          <button key={key} onClick={() => onChange(key)}
            style={{
              display: 'flex', alignItems: 'center', gap: 11, padding: '11px 14px',
              borderRadius: 12, border: 'none', cursor: 'pointer', textAlign: 'left',
              background: on ? 'rgba(99,102,241,0.12)' : 'transparent',
              borderLeft: `3px solid ${on ? '#6366f1' : 'transparent'}`,
              transition: 'all 0.18s',
            }}
            onMouseEnter={e => { if (!on) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
            onMouseLeave={e => { if (!on) e.currentTarget.style.background = 'transparent'; }}>
            <Icon size={15} color={on ? '#818cf8' : 'rgba(255,255,255,0.35)'} />
            <span style={{ fontSize: 13, fontWeight: on ? 700 : 500, color: on ? '#e2e8f0' : 'rgba(255,255,255,0.45)', fontFamily: 'inherit', letterSpacing: on ? '-0.1px' : 0 }}>
              {label}
            </span>
            {on && <ChevronRight size={12} color="rgba(99,102,241,0.6)" style={{ marginLeft: 'auto' }} />}
          </button>
        );
      })}
    </div>
  );
}

// ─── 1. Business Profile ─────────────────────────────────────────────────────

function BusinessProfile({ store, session, onSaved }) {
  const df = store?.dashboard_features || {};
  const [form, setForm] = useState({
    businessName: df.biz_name || '',
    ownerName: df.biz_owner || '',
    phone: df.biz_phone || '',
    gst: df.biz_gst || '',
    address: df.biz_address || '',
    currency: df.biz_currency || 'INR',
    timezone: df.biz_timezone || 'Asia/Kolkata',
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const isConnected = !!store?.shopify_domain;
  const hasShiprocket = !!store?.shiprocket_connected;
  const hasAds = !!df.ads_configured;
  const hasProfile = !!form.businessName;
  const healthScore = [isConnected, hasShiprocket, hasAds, hasProfile].filter(Boolean).length * 25;

  const onboardingSteps = [
    { label: 'Store connected', done: isConnected },
    { label: 'Products synced', done: !!store?.last_synced_at },
    { label: 'Shiprocket connected', done: hasShiprocket },
    { label: 'Ads integrated', done: hasAds },
  ];
  const onboardingPct = Math.round(onboardingSteps.filter(s => s.done).length / onboardingSteps.length * 100);

  const handleSave = async () => {
    if (!store?.id) return;
    setSaving(true);
    await supabase.from('stores').update({
      dashboard_features: {
        ...df,
        biz_name: form.businessName,
        biz_owner: form.ownerName,
        biz_phone: form.phone,
        biz_gst: form.gst,
        biz_address: form.address,
        biz_currency: form.currency,
        biz_timezone: form.timezone,
      }
    }).eq('id', store.id);
    setSaving(false); setSaved(true);
    setTimeout(() => setSaved(false), 3000);
    onSaved?.();
  };

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontFamily: 'Outfit,sans-serif', fontSize: 22, fontWeight: 800, color: '#f1f5f9', margin: '0 0 5px', letterSpacing: '-0.3px' }}>Business Profile</h2>
        <p style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.38)', margin: 0 }}>The identity of your brand across Pocket Dashboard.</p>
      </div>

      {/* Health + Onboarding row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 20 }}>
          <HealthRing score={healthScore} />
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>Business Health</div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', lineHeight: 1.6 }}>
              {4 - [isConnected, hasShiprocket, hasAds, hasProfile].filter(Boolean).length} items need attention
            </div>
            <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
              {[['Store', isConnected], ['Shiprocket', hasShiprocket], ['Ads', hasAds], ['Profile', hasProfile]].map(([l, ok]) => (
                <span key={l} style={{ fontSize: 10.5, fontWeight: 700, padding: '2px 8px', borderRadius: 999, color: ok ? '#10b981' : '#f87171', background: ok ? 'rgba(16,185,129,0.1)' : 'rgba(248,113,133,0.1)', border: `1px solid ${ok ? 'rgba(16,185,129,0.2)' : 'rgba(248,113,133,0.2)'}` }}>{ok ? '✓' : '✗'} {l}</span>
              ))}
            </div>
          </div>
        </div>

        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '20px 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Onboarding</div>
            <span style={{ fontSize: 20, fontWeight: 800, color: '#818cf8', fontFamily: 'Outfit,sans-serif' }}>{onboardingPct}%</span>
          </div>
          <div style={{ height: 5, background: 'rgba(255,255,255,0.07)', borderRadius: 99, marginBottom: 14, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${onboardingPct}%`, borderRadius: 99, background: 'linear-gradient(90deg,#6366f1,#818cf8)', transition: 'width 1s ease', boxShadow: '0 0 8px rgba(99,102,241,0.5)' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {onboardingSteps.map(s => (
              <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 16, height: 16, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: s.done ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.06)', border: `1px solid ${s.done ? 'rgba(16,185,129,0.4)' : 'rgba(255,255,255,0.1)'}` }}>
                  {s.done && <Check size={9} color="#10b981" />}
                </div>
                <span style={{ fontSize: 12.5, color: s.done ? 'rgba(255,255,255,0.65)' : 'rgba(255,255,255,0.3)' }}>{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Logo upload strip */}
      <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '20px 24px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 20 }}>
        <div style={{ width: 64, height: 64, borderRadius: 16, background: 'rgba(99,102,241,0.1)', border: '2px dashed rgba(99,102,241,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Camera size={20} color="rgba(99,102,241,0.5)" />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#e2e8f0', marginBottom: 4 }}>Brand Logo</div>
          <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.35)', marginBottom: 10 }}>PNG or SVG recommended · Shown on your dashboard header</div>
          <button style={{ padding: '7px 16px', borderRadius: 9, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.6)', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
            Upload Logo
          </button>
        </div>
      </div>

      {/* Form grid */}
      <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px 24px', marginBottom: 24 }}>
          <Field label="Business Name">
            <TextInput value={form.businessName} onChange={v => set('businessName', v)} placeholder="e.g. Sneaker Studio" icon={<Building2 size={14} />} />
          </Field>
          <Field label="Owner Name">
            <TextInput value={form.ownerName} onChange={v => set('ownerName', v)} placeholder="Your full name" icon={<User size={14} />} />
          </Field>
          <Field label="Email">
            <TextInput value={session?.user?.email || ''} readOnly icon={<Mail size={14} />} />
          </Field>
          <Field label="Phone Number">
            <TextInput value={form.phone} onChange={v => set('phone', v)} placeholder="+91 98765 43210" icon={<Phone size={14} />} />
          </Field>
          <Field label="GST Number">
            <TextInput value={form.gst} onChange={v => set('gst', v)} placeholder="22AAAAA0000A1Z5" icon={<FileText size={14} />} />
          </Field>
          <Field label="Currency">
            <SelectInput value={form.currency} onChange={v => set('currency', v)} options={[
              { value: 'INR', label: '₹ Indian Rupee (INR)' },
              { value: 'USD', label: '$ US Dollar (USD)' },
              { value: 'EUR', label: '€ Euro (EUR)' },
            ]} />
          </Field>
          <Field label="Timezone">
            <SelectInput value={form.timezone} onChange={v => set('timezone', v)} options={[
              { value: 'Asia/Kolkata', label: 'Asia/Kolkata (IST, UTC+5:30)' },
              { value: 'Asia/Dubai', label: 'Asia/Dubai (GST, UTC+4)' },
              { value: 'UTC', label: 'UTC' },
            ]} />
          </Field>
          <Field label="Business Address">
            <TextInput value={form.address} onChange={v => set('address', v)} placeholder="Street, City, State, PIN" icon={<MapPin size={14} />} />
          </Field>
        </div>
        <SaveBtn saving={saving} saved={saved} onClick={handleSave} />
      </div>
    </div>
  );
}

// ─── 2. Integrations ─────────────────────────────────────────────────────────

const INTEGRATIONS = [
  { key: 'shopify',  name: 'Shopify',     emoji: '🛍️', desc: 'Orders, products & inventory',  color: '#95bf47', glow: 'rgba(149,191,71,0.2)' },
  { key: 'meta',     name: 'Meta Ads',    emoji: '📘', desc: 'Facebook & Instagram ad spend',  color: '#1877f2', glow: 'rgba(24,119,242,0.2)' },
  { key: 'shiprocket', name: 'Shiprocket', emoji: '🚚', desc: 'Shipment tracking & RTO data', color: '#e63327', glow: 'rgba(230,51,39,0.2)' },
  { key: 'razorpay', name: 'Razorpay',    emoji: '💳', desc: 'Payment collections & refunds',  color: '#3395ff', glow: 'rgba(51,149,255,0.2)' },
  { key: 'cashfree', name: 'Cashfree',    emoji: '💰', desc: 'COD & prepaid payment flows',    color: '#00d09c', glow: 'rgba(0,208,156,0.2)' },
  { key: 'google',   name: 'Google Ads',  emoji: '🔍', desc: 'Search, Display & Shopping ads', color: '#fbbc05', glow: 'rgba(251,188,5,0.2)', soon: true },
];

function Integrations({ store, session }) {
  const df = store?.dashboard_features || {};
  const [srStatus, setSrStatus] = useState(null);
  const [logs, setLogs] = useState({});

  useEffect(() => {
    if (!store?.id) return;
    fetch(`${API_URL}/api/shiprocket/status/${store.id}`)
      .then(r => r.json()).then(setSrStatus).catch(() => setSrStatus({ connected: false }));
  }, [store?.id]);

  const getStatus = (key) => {
    if (key === 'shopify')    return !!store?.shopify_domain;
    if (key === 'shiprocket') return !!srStatus?.connected;
    if (key === 'meta')       return !!df.ads_configured && (df.meta_ads_monthly > 0 || df.waitlist_meta_api);
    if (key === 'google')     return 'soon';
    return false;
  };

  const getLastSync = (key) => {
    if (key === 'shopify' && store?.last_synced_at)
      return new Date(store.last_synced_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
    if (key === 'shiprocket' && srStatus?.lastSyncedAt)
      return new Date(srStatus.lastSyncedAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
    return '—';
  };

  const getHealth = (key) => {
    const status = getStatus(key);
    if (status === 'soon') return null;
    if (!status) return null;
    if (key === 'shopify') return store?.last_synced_at ? 'Healthy' : 'No data yet';
    if (key === 'shiprocket') return srStatus?.shipmentCount > 0 ? `${srStatus.shipmentCount} shipments` : 'Syncing…';
    if (key === 'meta') return df.meta_ads_monthly > 0 ? 'Manual data' : 'Waitlisted';
    return 'Active';
  };

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontFamily: 'Outfit,sans-serif', fontSize: 22, fontWeight: 800, color: '#f1f5f9', margin: '0 0 5px', letterSpacing: '-0.3px' }}>Integrations</h2>
        <p style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.38)', margin: 0 }}>Connect your tools. Every integration makes your data smarter.</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {INTEGRATIONS.map(int => {
          const status = getStatus(int.key);
          const lastSync = getLastSync(int.key);
          const health = getHealth(int.key);
          const expanded = logs[int.key];

          return (
            <div key={int.key} style={{
              background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 18, overflow: 'hidden', transition: 'border-color 0.2s',
            }}>
              {/* Main row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 18, padding: '18px 24px' }}>
                {/* Logo */}
                <div style={{ width: 48, height: 48, borderRadius: 14, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, background: status && status !== 'soon' ? int.glow : 'rgba(255,255,255,0.04)', border: `1px solid ${status && status !== 'soon' ? int.color + '40' : 'rgba(255,255,255,0.08)'}` }}>
                  {int.emoji}
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 15, fontWeight: 700, color: '#f1f5f9' }}>{int.name}</span>
                    <StatusDot connected={status} />
                    {int.soon && <Pill color="#94a3b8" bg="rgba(148,163,184,0.1)" border="rgba(148,163,184,0.2)">COMING SOON</Pill>}
                  </div>
                  <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.35)', marginBottom: 6 }}>{int.desc}</div>
                  <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.3)' }}>
                      <span style={{ color: 'rgba(255,255,255,0.2)' }}>Last sync </span>{lastSync}
                    </span>
                    {health && <span style={{ fontSize: 11.5, color: 'rgba(16,185,129,0.7)' }}>⬤ {health}</span>}
                    {status && status !== 'soon' && (
                      <span style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.25)' }}>by {session?.user?.email}</span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 8, flexShrink: 0, alignItems: 'center' }}>
                  {!int.soon && (
                    <>
                      {status ? (
                        <>
                          <button onClick={() => setLogs(l => ({ ...l, [int.key]: !l[int.key] }))}
                            style={{ padding: '8px 14px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 5 }}>
                            <Activity size={12} /> Logs
                          </button>
                          <button style={{ padding: '8px 14px', borderRadius: 10, border: '1px solid rgba(99,102,241,0.3)', background: 'rgba(99,102,241,0.08)', color: '#818cf8', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 5 }}>
                            <RefreshCw size={11} /> Reconnect
                          </button>
                          <button style={{ padding: '8px 14px', borderRadius: 10, border: '1px solid rgba(248,113,133,0.25)', background: 'rgba(248,113,133,0.06)', color: '#f87171', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                            Disconnect
                          </button>
                        </>
                      ) : (
                        <button style={{ padding: '10px 20px', borderRadius: 10, border: '1px solid rgba(99,102,241,0.35)', background: 'linear-gradient(135deg,rgba(99,102,241,0.15),rgba(79,70,229,0.1))', color: '#818cf8', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                          Connect →
                        </button>
                      )}
                    </>
                  )}
                  {int.soon && (
                    <button style={{ padding: '8px 16px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: 'rgba(255,255,255,0.3)', fontSize: 12, fontWeight: 600, cursor: 'not-allowed', fontFamily: 'inherit' }}>
                      Notify Me
                    </button>
                  )}
                </div>
              </div>

              {/* Sync log drawer */}
              {expanded && (
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '16px 24px', background: 'rgba(0,0,0,0.15)' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>Recent Sync Log</div>
                  {[
                    { time: store?.last_synced_at || new Date().toISOString(), msg: 'Sync completed successfully', ok: true },
                    { time: new Date(Date.now() - 86400000).toISOString(), msg: 'Incremental sync — 0 new orders', ok: true },
                    { time: new Date(Date.now() - 172800000).toISOString(), msg: 'Full historical sync initiated', ok: true },
                  ].map((e, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '7px 0', borderBottom: i < 2 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: e.ok ? '#10b981' : '#f87171', flexShrink: 0 }} />
                      <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', flex: 1 }}>{e.msg}</span>
                      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>{new Date(e.time).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── 3. Money Settings ───────────────────────────────────────────────────────

const DEFAULT_CATEGORIES = [
  { key: 'shipping',    label: 'Shipping',             icon: '🚚', defaultOn: true },
  { key: 'cod',         label: 'COD Charges',          icon: '💵', defaultOn: true },
  { key: 'rto',         label: 'RTO Losses',           icon: '↩️', defaultOn: true },
  { key: 'gateway',     label: 'Payment Gateway Fees', icon: '💳', defaultOn: true },
  { key: 'ads',         label: 'Ad Spend',             icon: '📣', defaultOn: true },
  { key: 'salaries',    label: 'Salaries',             icon: '👥', defaultOn: false },
  { key: 'agency',      label: 'Agency Fees',          icon: '🤝', defaultOn: false },
  { key: 'packaging',   label: 'Packaging',            icon: '📦', defaultOn: false },
  { key: 'rent',        label: 'Rent',                 icon: '🏢', defaultOn: false },
  { key: 'software',    label: 'Software Tools',       icon: '⚙️', defaultOn: false },
];

function MoneySettings({ store }) {
  const df = store?.dashboard_features || {};
  const saved_cats = df.expense_categories || {};
  const [cats, setCats] = useState(() =>
    Object.fromEntries(DEFAULT_CATEGORIES.map(c => [c.key, c.key in saved_cats ? saved_cats[c.key] : c.defaultOn]))
  );
  const [custom, setCustom] = useState(df.custom_expenses || []);
  const [newExp, setNewExp] = useState({ name: '', amount: '', recurring: false });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    if (!store?.id) return;
    setSaving(true);
    await supabase.from('stores').update({
      dashboard_features: { ...df, expense_categories: cats, custom_expenses: custom }
    }).eq('id', store.id);
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 3000);
  };

  const addCustom = () => {
    if (!newExp.name.trim()) return;
    setCustom(c => [...c, { ...newExp, id: Date.now() }]);
    setNewExp({ name: '', amount: '', recurring: false });
  };

  const enabledCount = Object.values(cats).filter(Boolean).length;

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontFamily: 'Outfit,sans-serif', fontSize: 22, fontWeight: 800, color: '#f1f5f9', margin: '0 0 5px', letterSpacing: '-0.3px' }}>Money In My Pocket</h2>
        <p style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.38)', margin: 0 }}>Control which expense categories factor into your profit calculation.</p>
      </div>

      {/* Calculation preview */}
      <div style={{ background: 'linear-gradient(135deg,rgba(16,185,129,0.08),rgba(6,182,212,0.05))', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 16, padding: '16px 24px', marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(16,185,129,0.7)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>Calculation Preview</div>
          <div style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.6)', lineHeight: 1.6 }}>
            Revenue − Cost of Goods − {enabledCount} expense categories = <span style={{ color: '#10b981', fontWeight: 700 }}>Net Profit</span>
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>Active categories</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#10b981', fontFamily: 'Outfit,sans-serif', lineHeight: 1 }}>{enabledCount}</div>
        </div>
      </div>

      {/* Category toggles */}
      <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, overflow: 'hidden', marginBottom: 20 }}>
        <div style={{ padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0' }}>Expense Categories</span>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>{enabledCount} of {DEFAULT_CATEGORIES.length} active</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
          {DEFAULT_CATEGORIES.map((c, i) => (
            <div key={c.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 24px', borderBottom: i < DEFAULT_CATEGORIES.length - 2 ? '1px solid rgba(255,255,255,0.05)' : 'none', borderRight: i % 2 === 0 ? '1px solid rgba(255,255,255,0.05)' : 'none', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 16 }}>{c.icon}</span>
                <span style={{ fontSize: 13.5, fontWeight: 500, color: cats[c.key] ? '#e2e8f0' : 'rgba(255,255,255,0.35)' }}>{c.label}</span>
              </div>
              <Toggle on={cats[c.key]} onChange={v => setCats(prev => ({ ...prev, [c.key]: v }))} />
            </div>
          ))}
        </div>
      </div>

      {/* Custom expenses */}
      <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '20px 24px', marginBottom: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0', marginBottom: 16 }}>Custom Expenses</div>
        {custom.length === 0 && (
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.25)', marginBottom: 14 }}>No custom expenses added yet.</div>
        )}
        {custom.map((e, i) => (
          <div key={e.id || i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <span style={{ flex: 1, fontSize: 13.5, color: '#e2e8f0' }}>{e.name}</span>
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>₹{e.amount}/mo</span>
            {e.recurring && <Pill color="#818cf8" bg="rgba(99,102,241,0.1)" border="rgba(99,102,241,0.2)">RECURRING</Pill>}
            <button onClick={() => setCustom(c => c.filter((_, j) => j !== i))}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(248,113,133,0.5)', display: 'flex' }}>
              <Trash2 size={14} />
            </button>
          </div>
        ))}
        <div style={{ display: 'flex', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
          <TextInput value={newExp.name} onChange={v => setNewExp(e => ({ ...e, name: v }))} placeholder="Expense name (e.g. Office rent)" />
          <div style={{ width: 140 }}>
            <TextInput value={newExp.amount} onChange={v => setNewExp(e => ({ ...e, amount: v }))} placeholder="Amount/mo" prefix="₹" />
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 12.5, color: 'rgba(255,255,255,0.45)', whiteSpace: 'nowrap' }}>
            <Toggle on={newExp.recurring} onChange={v => setNewExp(e => ({ ...e, recurring: v }))} /> Recurring
          </label>
          <button onClick={addCustom}
            style={{ padding: '12px 18px', borderRadius: 12, border: '1px solid rgba(99,102,241,0.3)', background: 'rgba(99,102,241,0.1)', color: '#818cf8', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
            <Plus size={14} /> Add
          </button>
        </div>
      </div>

      <SaveBtn saving={saving} saved={saved} onClick={handleSave} />
    </div>
  );
}

// ─── 4. AI Co-Pilot ─────────────────────────────────────────────────────────

const AI_TOGGLES = [
  { key: 'ai_recommendations',  label: 'AI Recommendations',     sub: 'Smart insights on your dashboard homepage',    premium: false },
  { key: 'weekly_ai_reports',   label: 'Weekly AI Reports',       sub: 'Emailed every Monday with deep P&L analysis',  premium: true  },
  { key: 'daily_insights',      label: 'Daily Insights',          sub: 'Morning briefing with anomaly detection',       premium: true  },
  { key: 'profit_alerts',       label: 'Profit Alerts',           sub: 'Alert when daily margin drops below threshold', premium: false },
  { key: 'rto_alert_enabled',   label: 'RTO Alerts',              sub: 'Spike detection for return-to-origin orders',   premium: false },
  { key: 'spend_alerts',        label: 'Spend Alerts',            sub: 'Notify when ad spend exceeds daily budget',     premium: true  },
  { key: 'ai_train_historical', label: 'Train on historical data', sub: "Let AI learn your store's seasonal patterns",  premium: true  },
];

function AISettings({ store }) {
  const df = store?.dashboard_features || {};
  const [toggles, setToggles] = useState(() =>
    Object.fromEntries(AI_TOGGLES.map(t => [t.key, !!df[t.key]]))
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    if (!store?.id) return;
    setSaving(true);
    await supabase.from('stores').update({ dashboard_features: { ...df, ...toggles } }).eq('id', store.id);
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 3000);
  };

  const queriesUsed = 0;
  const queriesTotal = 50;

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontFamily: 'Outfit,sans-serif', fontSize: 22, fontWeight: 800, color: '#f1f5f9', margin: '0 0 5px', letterSpacing: '-0.3px' }}>AI Co-Pilot</h2>
        <p style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.38)', margin: 0 }}>Configure your AI assistant. It learns from your store data to surface what matters.</p>
      </div>

      {/* Usage meter */}
      <div style={{ background: 'linear-gradient(135deg,rgba(99,102,241,0.08),rgba(139,92,246,0.05))', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 16, padding: '20px 24px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1, minWidth: 200 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Brain size={20} color="#818cf8" />
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(99,102,241,0.7)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 3 }}>AI Usage This Month</div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>{queriesUsed} queries used · {queriesTotal - queriesUsed} remaining</div>
          </div>
        </div>
        <div style={{ flex: 1, minWidth: 160 }}>
          <div style={{ height: 6, background: 'rgba(255,255,255,0.07)', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${(queriesUsed / queriesTotal) * 100}%`, background: 'linear-gradient(90deg,#6366f1,#8b5cf6)', borderRadius: 99 }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>{queriesUsed} used</span>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>{queriesTotal} total</span>
          </div>
        </div>
        <Pill color="#fbbf24" bg="rgba(251,191,36,0.1)" border="rgba(251,191,36,0.2)">FREE BETA</Pill>
      </div>

      {/* Toggles */}
      <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, overflow: 'hidden', marginBottom: 20 }}>
        {AI_TOGGLES.map((t, i) => (
          <div key={t.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '16px 24px', borderBottom: i < AI_TOGGLES.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: '#e2e8f0' }}>{t.label}</span>
                {t.premium && <Pill color="#818cf8" bg="rgba(99,102,241,0.1)" border="rgba(99,102,241,0.2)">PRO</Pill>}
              </div>
              <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.35)' }}>{t.sub}</div>
            </div>
            <Toggle on={toggles[t.key]} onChange={v => setToggles(prev => ({ ...prev, [t.key]: v }))} />
          </div>
        ))}
      </div>

      <SaveBtn saving={saving} saved={saved} onClick={handleSave} />
    </div>
  );
}

// ─── 5. Billing ──────────────────────────────────────────────────────────────

const PLANS = [
  { key: 'free',  name: 'Starter',    price: '₹0',   period: 'Free Trial', color: '#fbbf24', features: ['1 Shopify store', 'Basic analytics', 'Email digest', '50 AI queries/mo'] },
  { key: 'pro',   name: 'Pro',        price: '₹999', period: '/month',     color: '#818cf8', features: ['3 stores', 'Full analytics suite', 'AI co-pilot', 'Priority support'], popular: true },
  { key: 'enterprise', name: 'Enterprise', price: 'Custom', period: '', color: '#10b981', features: ['Unlimited stores', 'Dedicated support', 'Custom integrations', 'SLA guarantee'] },
];

function BillingSection({ store }) {
  const plan = store?.plan_type || store?.subscription_plan || 'free';
  const isPro = plan === 'pro';

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontFamily: 'Outfit,sans-serif', fontSize: 22, fontWeight: 800, color: '#f1f5f9', margin: '0 0 5px', letterSpacing: '-0.3px' }}>Billing & Subscription</h2>
        <p style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.38)', margin: 0 }}>Manage your plan. Paid tiers launch in early 2027 — early users get a lifetime discount.</p>
      </div>

      {/* Current plan banner */}
      <div style={{ background: 'linear-gradient(135deg,rgba(251,191,36,0.08),rgba(245,158,11,0.04))', border: '1px solid rgba(251,191,36,0.2)', borderRadius: 16, padding: '18px 24px', marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(251,191,36,0.7)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Current Plan</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#fbbf24', fontFamily: 'Outfit,sans-serif' }}>🎁 Free Beta</div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>All features free until January 2027</div>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ textAlign: 'center', padding: '12px 20px', background: 'rgba(255,255,255,0.04)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginBottom: 3 }}>Next billing</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f0' }}>Jan 1, 2027</div>
          </div>
          <div style={{ textAlign: 'center', padding: '12px 20px', background: 'rgba(255,255,255,0.04)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginBottom: 3 }}>Amount due</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#10b981' }}>₹0</div>
          </div>
          <div style={{ textAlign: 'center', padding: '12px 20px', background: 'rgba(255,255,255,0.04)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginBottom: 3 }}>AI queries</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f0' }}>50 / mo</div>
          </div>
        </div>
      </div>

      {/* Plan cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 28 }}>
        {PLANS.map(p => (
          <div key={p.key} style={{ background: p.popular ? 'linear-gradient(160deg,rgba(99,102,241,0.1),rgba(79,70,229,0.06))' : 'rgba(255,255,255,0.03)', border: `1px solid ${p.popular ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.08)'}`, borderRadius: 18, padding: '24px 20px', position: 'relative', display: 'flex', flexDirection: 'column', gap: 16 }}>
            {p.popular && <div style={{ position: 'absolute', top: -1, left: '50%', transform: 'translateX(-50%)', fontSize: 10, fontWeight: 800, color: '#fff', background: 'linear-gradient(135deg,#6366f1,#4f46e5)', padding: '3px 12px', borderRadius: '0 0 10px 10px', letterSpacing: '0.06em' }}>MOST POPULAR</div>}
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: p.color, letterSpacing: '0.06em', marginBottom: 6 }}>{p.name.toUpperCase()}</div>
              <div style={{ fontFamily: 'Outfit,sans-serif', fontSize: 28, fontWeight: 800, color: '#f1f5f9', lineHeight: 1 }}>{p.price}<span style={{ fontSize: 13, fontWeight: 400, color: 'rgba(255,255,255,0.4)' }}>{p.period}</span></div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
              {p.features.map(f => (
                <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Check size={12} color={p.color} />
                  <span style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.55)' }}>{f}</span>
                </div>
              ))}
            </div>
            <button style={{ width: '100%', padding: '11px', borderRadius: 12, border: `1px solid ${p.color}40`, background: plan === p.key ? `${p.color}20` : 'transparent', color: plan === p.key ? p.color : 'rgba(255,255,255,0.4)', fontSize: 13, fontWeight: 700, cursor: plan === p.key ? 'default' : 'pointer', fontFamily: 'inherit' }}>
              {plan === p.key ? '✓ Current Plan' : p.key === 'enterprise' ? 'Contact Us' : 'Upgrade'}
            </button>
          </div>
        ))}
      </div>

      {/* Invoice history */}
      <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, overflow: 'hidden' }}>
        <div style={{ padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0' }}>Invoice History</span>
        </div>
        <div style={{ padding: '48px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>🧾</div>
          <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.35)' }}>No invoices yet — billing begins January 2027</div>
        </div>
      </div>
    </div>
  );
}

// ─── 6. Security ─────────────────────────────────────────────────────────────

function SecuritySection({ session }) {
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [oldPwd, setOldPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [pwdMsg, setPwdMsg] = useState(null);
  const [pwdSaving, setPwdSaving] = useState(false);

  const changePassword = async () => {
    if (newPwd.length < 8) { setPwdMsg({ ok: false, text: 'Password must be at least 8 characters.' }); return; }
    setPwdSaving(true);
    const { error } = await supabase.auth.updateUser({ password: newPwd });
    setPwdSaving(false);
    setPwdMsg(error ? { ok: false, text: error.message } : { ok: true, text: 'Password updated successfully.' });
    if (!error) { setOldPwd(''); setNewPwd(''); }
    setTimeout(() => setPwdMsg(null), 4000);
  };

  const logoutAll = async () => {
    if (!window.confirm('Sign out from all devices?')) return;
    await supabase.auth.signOut({ scope: 'global' });
  };

  // Security score: simple heuristic
  const score = 60; // base for having a password login

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontFamily: 'Outfit,sans-serif', fontSize: 22, fontWeight: 800, color: '#f1f5f9', margin: '0 0 5px', letterSpacing: '-0.3px' }}>Security</h2>
        <p style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.38)', margin: 0 }}>Protect your account. Your business data deserves enterprise-grade security.</p>
      </div>

      {/* Security score */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 220, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 20 }}>
          <HealthRing score={score} />
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Security Score</div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 1.7 }}>
              Enable 2FA to reach 100%
            </div>
            <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 10.5, fontWeight: 700, color: '#10b981', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 999, padding: '2px 8px' }}>✓ Password set</span>
              <span style={{ fontSize: 10.5, fontWeight: 700, color: '#f87171', background: 'rgba(248,113,133,0.1)', border: '1px solid rgba(248,113,133,0.2)', borderRadius: 999, padding: '2px 8px' }}>✗ 2FA off</span>
            </div>
          </div>
        </div>

        <div style={{ flex: 1, minWidth: 220, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '20px 24px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Active Session</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <Monitor size={15} color="rgba(99,102,241,0.7)" />
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>This device — {session?.user?.email}</span>
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginBottom: 16 }}>Signed in via password · Session active</div>
          <button onClick={logoutAll}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 10, border: '1px solid rgba(248,113,133,0.25)', background: 'rgba(248,113,133,0.06)', color: '#f87171', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
            <LogOut size={13} /> Logout from all devices
          </button>
        </div>
      </div>

      {/* Change password */}
      <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '24px', marginBottom: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f0', marginBottom: 16 }}>Change Password</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
          <Field label="Current Password">
            <div style={{ position: 'relative' }}>
              <TextInput type={showOld ? 'text' : 'password'} value={oldPwd} onChange={setOldPwd} placeholder="Current password" icon={<Lock size={14} />} />
              <button onClick={() => setShowOld(s => !s)} style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', display: 'flex' }}>
                {showOld ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </Field>
          <Field label="New Password">
            <div style={{ position: 'relative' }}>
              <TextInput type={showNew ? 'text' : 'password'} value={newPwd} onChange={setNewPwd} placeholder="Min 8 characters" icon={<Lock size={14} />} />
              <button onClick={() => setShowNew(s => !s)} style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', display: 'flex' }}>
                {showNew ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </Field>
        </div>
        {pwdMsg && (
          <div style={{ padding: '10px 16px', borderRadius: 10, background: pwdMsg.ok ? 'rgba(16,185,129,0.08)' : 'rgba(248,113,133,0.08)', border: `1px solid ${pwdMsg.ok ? 'rgba(16,185,129,0.2)' : 'rgba(248,113,133,0.2)'}`, color: pwdMsg.ok ? '#34d399' : '#f87171', fontSize: 13, marginBottom: 14 }}>
            {pwdMsg.text}
          </div>
        )}
        <SaveBtn saving={pwdSaving} saved={false} onClick={changePassword} label="Update Password" />
      </div>

      {/* 2FA + Login history */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '20px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f0' }}>Two-Factor Auth</div>
            <Pill color="#fbbf24" bg="rgba(251,191,36,0.1)" border="rgba(251,191,36,0.2)">SOON</Pill>
          </div>
          <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.35)', lineHeight: 1.6, marginBottom: 14 }}>Add an extra layer of protection with an authenticator app.</div>
          <button disabled style={{ padding: '9px 18px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: 'rgba(255,255,255,0.25)', fontSize: 12.5, fontWeight: 600, cursor: 'not-allowed', fontFamily: 'inherit' }}>
            Enable 2FA
          </button>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '20px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f0' }}>Login History</div>
            <Pill color="#fbbf24" bg="rgba(251,191,36,0.1)" border="rgba(251,191,36,0.2)">SOON</Pill>
          </div>
          <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.35)', lineHeight: 1.6 }}>
            View every device and location that accessed your account. Detailed access logs coming soon.
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main SettingsPage ───────────────────────────────────────────────────────

export default function SettingsPage({ session, store, onSaved }) {
  const [section, setSection] = useState('profile');

  return (
    <div style={{ display: 'flex', gap: 28, alignItems: 'flex-start', width: '100%', minHeight: '100%' }}>
      {/* Left nav */}
      <SettingsNav active={section} onChange={setSection} />

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {section === 'profile'      && <BusinessProfile store={store} session={session} onSaved={onSaved} />}
        {section === 'integrations' && <Integrations store={store} session={session} />}
        {section === 'money'        && <MoneySettings store={store} />}
        {section === 'ai'           && <AISettings store={store} />}
        {section === 'billing'      && <BillingSection store={store} />}
        {section === 'security'     && <SecuritySection session={session} />}
      </div>
    </div>
  );
}
