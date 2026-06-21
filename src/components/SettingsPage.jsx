import React, { useState, useEffect } from 'react';
import { User, Bell, LogOut, Store } from 'lucide-react';
import { supabase } from '../supabaseClient';
import FeatureRequests from './FeatureRequests';

function Toggle({ on, onChange }) {
  return (
    <button
      onClick={() => onChange(!on)}
      style={{
        position: 'relative', width: 44, height: 24, borderRadius: 999,
        background: on ? 'linear-gradient(135deg,#6366f1,#4f46e5)' : 'rgba(255,255,255,0.1)',
        border: 'none', cursor: 'pointer', transition: 'background 0.25s', flexShrink: 0,
        boxShadow: on ? '0 0 12px rgba(99,102,241,0.4)' : 'none',
      }}
      aria-pressed={on}
    >
      <span style={{
        position: 'absolute', top: 3, left: on ? 23 : 3,
        width: 18, height: 18, borderRadius: '50%',
        background: '#fff', transition: 'left 0.25s', display: 'block',
        boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
      }} />
    </button>
  );
}

function Section({ title, icon, children }) {
  return (
    <div style={{ marginBottom: 32 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <div style={{ width: 32, height: 32, borderRadius: 9, background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {icon}
        </div>
        <h2 style={{ fontFamily: 'Outfit, sans-serif', fontSize: 15, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>{title}</h2>
      </div>
      <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, overflow: 'hidden' }}>
        {children}
      </div>
    </div>
  );
}

function InfoRow({ label, value, last }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: last ? 'none' : '1px solid rgba(255,255,255,0.06)' }}>
      <span style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.45)' }}>{label}</span>
      <span style={{ fontSize: 13.5, fontWeight: 600, color: '#e2e8f0' }}>{value}</span>
    </div>
  );
}

function NotifRow({ label, sub, on, onChange, last }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '14px 20px', borderBottom: last ? 'none' : '1px solid rgba(255,255,255,0.06)' }}>
      <div>
        <div style={{ fontSize: 13.5, fontWeight: 600, color: '#e2e8f0' }}>{label}</div>
        {sub && <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>{sub}</div>}
      </div>
      <Toggle on={on} onChange={onChange} />
    </div>
  );
}

export default function SettingsPage({ session, store }) {
  const features = store?.dashboard_features || {};

  const [notifs, setNotifs] = useState({
    daily_digest: !!features.daily_digest_enabled,
    rto_alert: !!features.rto_alert_enabled,
    weekly_email: !!features.weekly_email_enabled,
  });
  const [saving, setSaving] = useState(null);

  // Re-sync if store prop updates
  useEffect(() => {
    const f = store?.dashboard_features || {};
    setNotifs({
      daily_digest: !!f.daily_digest_enabled,
      rto_alert: !!f.rto_alert_enabled,
      weekly_email: !!f.weekly_email_enabled,
    });
  }, [store?.id]);

  const toggleNotif = async (key) => {
    if (!store?.id) return;
    const updated = { ...notifs, [key]: !notifs[key] };
    setNotifs(updated);
    setSaving(key);
    const featureKey = key === 'daily_digest' ? 'daily_digest_enabled'
      : key === 'rto_alert' ? 'rto_alert_enabled'
      : 'weekly_email_enabled';
    await supabase
      .from('stores')
      .update({ dashboard_features: { ...features, [featureKey]: updated[key] } })
      .eq('id', store.id);
    setSaving(null);
  };

  const plan = store?.plan_type || store?.subscription_plan || 'free';
  const isPro = plan === 'pro';
  const isStarter = plan === 'starter';
  const planLabel = isPro ? 'Pro Plan' : isStarter ? 'Starter Plan' : 'Free Trial';
  const planColor = isPro ? '#a78bfa' : isStarter ? '#38bdf8' : '#fbbf24';

  const email = session?.user?.email || '—';
  const domain = store?.shopify_domain ? `${store.shopify_domain}.myshopify.com` : '—';

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', animation: 'fadeInUp 0.35s ease forwards' }}>
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontFamily: 'Outfit, sans-serif', fontSize: 26, fontWeight: 800, color: '#f1f5f9', margin: '0 0 8px', letterSpacing: '-0.4px' }}>
          Settings
        </h2>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', margin: 0 }}>
          Manage your account and preferences.
        </p>
      </div>

      {/* Account */}
      <Section title="Account" icon={<User size={15} color="#818cf8" />}>
        <InfoRow label="Email" value={email} />
        <InfoRow label="Store" value={domain} />
        <InfoRow
          label="Plan"
          value={<span style={{ color: planColor, fontWeight: 700 }}>{planLabel}</span>}
        />
        <div style={{ padding: '14px 20px' }}>
          <button
            onClick={() => supabase.auth.signOut()}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 16px', borderRadius: 10, border: '1px solid rgba(248,113,133,0.3)', background: 'rgba(248,113,133,0.06)', color: '#f87171', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(248,113,133,0.12)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(248,113,133,0.06)'; }}
          >
            <LogOut size={14} />
            Sign out
          </button>
        </div>
      </Section>

      {/* Notification Preferences */}
      <Section title="Notifications" icon={<Bell size={15} color="#818cf8" />}>
        <NotifRow
          label="Daily email digest"
          sub="Receive yesterday's key metrics every morning at 9 AM IST"
          on={notifs.daily_digest}
          onChange={() => toggleNotif('daily_digest')}
        />
        <NotifRow
          label="RTO spike alerts"
          sub="Get notified when your RTO rate rises above normal levels"
          on={notifs.rto_alert}
          onChange={() => toggleNotif('rto_alert')}
        />
        <NotifRow
          label="Weekly summary email"
          sub="Every Monday — your week-over-week revenue and profit snapshot"
          on={notifs.weekly_email}
          onChange={() => toggleNotif('weekly_email')}
          last
        />
      </Section>

      {/* Feature Requests */}
      <div style={{ marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <div style={{ width: 32, height: 32, borderRadius: 9, background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 15 }}>✦</span>
          </div>
          <h2 style={{ fontFamily: 'Outfit, sans-serif', fontSize: 15, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>Feature Requests</h2>
        </div>
        <FeatureRequests session={session} store={store} hideHeader />
      </div>
    </div>
  );
}
