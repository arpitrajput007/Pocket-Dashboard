import React, { useState, useEffect } from 'react';
import { User, Bell, CreditCard } from 'lucide-react';
import { supabase } from '../supabaseClient';

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

function Row({ label, children, last }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '14px 20px', borderBottom: last ? 'none' : '1px solid rgba(255,255,255,0.06)' }}>
      <span style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.45)', flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: 13.5, fontWeight: 600, color: '#e2e8f0', textAlign: 'right' }}>{children}</span>
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
    const featureKey = key === 'daily_digest' ? 'daily_digest_enabled'
      : key === 'rto_alert' ? 'rto_alert_enabled'
      : 'weekly_email_enabled';
    await supabase
      .from('stores')
      .update({ dashboard_features: { ...features, [featureKey]: updated[key] } })
      .eq('id', store.id);
  };

  // Plan info
  const plan = store?.plan_type || store?.subscription_plan || 'free';
  const isPro = plan === 'pro';
  const isStarter = plan === 'starter';
  const planLabel = isPro ? 'Pro Plan' : isStarter ? 'Starter Plan' : 'Free Trial';
  const planColor = isPro ? '#a78bfa' : isStarter ? '#38bdf8' : '#fbbf24';
  const planBg = isPro ? 'rgba(167,139,250,0.1)' : isStarter ? 'rgba(56,189,248,0.1)' : 'rgba(251,191,36,0.1)';
  const planBorder = isPro ? 'rgba(167,139,250,0.3)' : isStarter ? 'rgba(56,189,248,0.3)' : 'rgba(251,191,36,0.3)';

  // Trial days remaining
  const storeCreatedAt = store?.created_at ? new Date(store.created_at) : null;
  const trialDaysTotal = 210; // free until Jan 2027 (~7 months from June 2026 launch)
  const daysElapsed = storeCreatedAt ? Math.floor((Date.now() - storeCreatedAt.getTime()) / 86400000) : 0;
  const daysLeft = Math.max(0, trialDaysTotal - daysElapsed);

  const email = session?.user?.email || '—';
  const domain = store?.shopify_domain ? `${store.shopify_domain}.myshopify.com` : 'Not connected';
  const connectedSince = storeCreatedAt
    ? storeCreatedAt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : '—';

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', animation: 'fadeInUp 0.35s ease forwards' }}>
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontFamily: 'Outfit, sans-serif', fontSize: 26, fontWeight: 800, color: '#f1f5f9', margin: '0 0 8px', letterSpacing: '-0.4px' }}>
          Settings
        </h2>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', margin: 0 }}>
          Manage your account and notification preferences.
        </p>
      </div>

      {/* Account */}
      <Section title="Account" icon={<User size={15} color="#818cf8" />}>
        <Row label="Email">{email}</Row>
        <Row label="Store domain">
          <span style={{ color: store?.shopify_domain ? '#e2e8f0' : 'rgba(255,255,255,0.3)', fontStyle: store?.shopify_domain ? 'normal' : 'italic' }}>
            {domain}
          </span>
        </Row>
        <Row label="Connected since">{connectedSince}</Row>
        <Row label="Plan" last>
          <span style={{ color: planColor, background: planBg, border: `1px solid ${planBorder}`, borderRadius: 999, padding: '3px 12px', fontSize: 12, fontWeight: 700, letterSpacing: '0.04em' }}>
            {planLabel}
          </span>
        </Row>
      </Section>

      {/* Plan & Billing */}
      <Section title="Plan & Billing" icon={<CreditCard size={15} color="#818cf8" />}>
        {!isPro && !isStarter && (
          <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: '#fbbf24', marginBottom: 3 }}>🎁 Free Beta Access</div>
                <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.4)', lineHeight: 1.5 }}>
                  All features are free until January 2027. Early users will receive a discount when paid plans launch.
                </div>
              </div>
              {daysLeft > 0 && (
                <div style={{ textAlign: 'center', flexShrink: 0 }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: '#fbbf24', lineHeight: 1 }}>{daysLeft}</div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>days left</div>
                </div>
              )}
            </div>
          </div>
        )}
        <Row label="Current plan">
          <span style={{ color: planColor, fontWeight: 700 }}>{planLabel}</span>
        </Row>
        <Row label="Billing cycle">
          <span style={{ color: 'rgba(255,255,255,0.35)', fontStyle: 'italic' }}>Free — no card required</span>
        </Row>
        <div style={{ padding: '14px 20px' }}>
          <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.3)', lineHeight: 1.6 }}>
            Paid plans with advanced features (AI recommendations, unlimited team members, API integrations) will be available in early 2027.
            Early users will be notified first and receive a discount.
          </div>
        </div>
      </Section>

      {/* Notification Preferences */}
      <Section title="Notification Preferences" icon={<Bell size={15} color="#818cf8" />}>
        <NotifRow
          label="Daily email digest"
          sub="Yesterday's key metrics delivered every morning at 9 AM IST"
          on={notifs.daily_digest}
          onChange={() => toggleNotif('daily_digest')}
        />
        <NotifRow
          label="RTO spike alerts"
          sub="Get notified when your return-to-origin rate rises above normal"
          on={notifs.rto_alert}
          onChange={() => toggleNotif('rto_alert')}
        />
        <NotifRow
          label="Weekly summary email"
          sub="Every Monday — week-over-week revenue and profit snapshot"
          on={notifs.weekly_email}
          onChange={() => toggleNotif('weekly_email')}
          last
        />
      </Section>
    </div>
  );
}
