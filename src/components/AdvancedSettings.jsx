import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import {
  LayoutDashboard, Calendar, CalendarDays, BarChart2,
  TrendingUp, Trophy, CheckCircle2, Save, RefreshCw,
  AlertCircle, Sparkles, ChevronRight, Truck, X, Plug
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || '';

/* ─────────────────────────────────────────────
   FEATURE DEFINITIONS
   These map to tabs/sections in the dashboard.
───────────────────────────────────────────── */
const FEATURES = [
  {
    key: 'daily_view',
    icon: LayoutDashboard,
    label: 'Daily View',
    description: 'Live daily order feed with metrics, P&L scoreboard, and AI Risk Detection. Shows every day\'s orders, revenue, and net profit.',
    color: 'rgba(56,189,248,1)',
    glow: 'rgba(56,189,248,0.3)',
  },
  {
    key: 'weekly_view',
    icon: Calendar,
    label: 'Weekly View',
    description: 'Weekly performance summary with trend charts, P&L breakdown, and day-by-day comparison.',
    color: 'rgba(167,139,250,1)',
    glow: 'rgba(167,139,250,0.3)',
  },
  {
    key: 'monthly_view',
    icon: CalendarDays,
    label: 'Monthly View',
    description: 'Monthly aggregation with revenue trends, month-over-month comparison, and P&L statements.',
    color: 'rgba(236,72,153,1)',
    glow: 'rgba(236,72,153,0.3)',
  },
  {
    key: 'all_time_view',
    icon: TrendingUp,
    label: 'All Time View',
    description: 'Lifetime analytics with custom date ranges, performance by month table, and cumulative P&L.',
    color: 'rgba(52,211,153,1)',
    glow: 'rgba(52,211,153,0.3)',
  },
  {
    key: 'scoreboard',
    icon: Trophy,
    label: 'Profit / Loss Scoreboard',
    description: 'Cumulative net profit scoreboard with custom date ranges and tag-level breakdown by product.',
    color: 'rgba(251,191,36,1)',
    glow: 'rgba(251,191,36,0.3)',
  },
  {
    key: 'business_analytics',
    icon: BarChart2,
    label: 'Business Analytics',
    description: 'Deep-dive analytics: delivery rate, RTO rate, cancellation rate, and order status distribution charts.',
    color: 'rgba(249,115,22,1)',
    glow: 'rgba(249,115,22,0.3)',
  },
];

const DEFAULT_FEATURES = FEATURES.reduce((acc, f) => ({ ...acc, [f.key]: true }), {});

/* ─────────────────────────────────────────────
   AD PLATFORMS — owner-toggled whitelist for the
   Ad Spend modal. Stored on stores.enabled_ad_platforms.
───────────────────────────────────────────── */
const AD_PLATFORMS = [
  { key: 'meta',    label: 'Meta',    description: 'Facebook & Instagram Ads via Meta Ads Manager.',          color: 'rgba(24,119,242,1)',  glow: 'rgba(24,119,242,0.3)'  },
  { key: 'google',  label: 'Google',  description: 'Google Search, Display & Shopping Ads.',                  color: 'rgba(251,188,5,1)',   glow: 'rgba(251,188,5,0.3)'   },
  { key: 'youtube', label: 'YouTube', description: 'YouTube video & in-stream ads (managed via Google Ads).', color: 'rgba(255,0,0,1)',     glow: 'rgba(255,0,0,0.3)'     },
  { key: 'tiktok',  label: 'TikTok',  description: 'TikTok Ads Manager spend.',                               color: 'rgba(105,201,208,1)', glow: 'rgba(105,201,208,0.3)' },
  { key: 'other',   label: 'Other',   description: 'Catch-all for influencer payouts, affiliate spends, etc.', color: 'rgba(156,163,175,1)', glow: 'rgba(156,163,175,0.3)' },
];
const DEFAULT_AD_PLATFORMS = ['meta'];

/* ─────────────────────────────────────────────
   TOGGLE SWITCH
───────────────────────────────────────────── */
function Toggle({ enabled, onChange, color }) {
  return (
    <button
      onClick={onChange}
      style={{
        width: '48px', height: '26px', borderRadius: '999px',
        background: enabled ? color : 'rgba(255,255,255,0.1)',
        border: 'none', cursor: 'pointer', padding: '3px',
        transition: 'background 0.25s ease',
        display: 'flex', alignItems: 'center',
        justifyContent: enabled ? 'flex-end' : 'flex-start',
        flexShrink: 0,
        boxShadow: enabled ? `0 0 12px ${color}` : 'none',
      }}
    >
      <div style={{
        width: '20px', height: '20px', borderRadius: '50%',
        background: '#fff',
        boxShadow: '0 1px 4px rgba(0,0,0,0.4)',
        transition: 'transform 0.2s ease',
      }} />
    </button>
  );
}

/* ─────────────────────────────────────────────
   FEATURE CARD
───────────────────────────────────────────── */
function FeatureCard({ feature, enabled, onToggle }) {
  const Icon = feature.icon;

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '18px',
      padding: '18px 20px', borderRadius: '16px',
      background: enabled
        ? `linear-gradient(135deg, ${feature.glow.replace('0.3', '0.08')}, transparent)`
        : 'rgba(255,255,255,0.03)',
      border: enabled
        ? `1px solid ${feature.color.replace('1)', '0.3)')}`
        : '1px solid rgba(255,255,255,0.07)',
      transition: 'all 0.3s ease',
      cursor: 'pointer',
    }}
      onClick={onToggle}
    >
      {/* Icon */}
      <div style={{
        width: '44px', height: '44px', borderRadius: '12px', flexShrink: 0,
        background: enabled
          ? `linear-gradient(135deg, ${feature.color.replace('1)', '0.15)')}, ${feature.color.replace('1)', '0.05)')})`
          : 'rgba(255,255,255,0.05)',
        border: `1px solid ${enabled ? feature.color.replace('1)', '0.3)') : 'rgba(255,255,255,0.08)'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all 0.3s ease',
        boxShadow: enabled ? `0 0 16px ${feature.glow}` : 'none',
      }}>
        <Icon size={20} color={enabled ? feature.color : 'rgba(255,255,255,0.3)'} strokeWidth={1.8} />
      </div>

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: '14px', fontWeight: 700,
          color: enabled ? '#fff' : 'rgba(255,255,255,0.5)',
          marginBottom: '3px', fontFamily: 'Outfit, sans-serif',
          transition: 'color 0.2s',
        }}>
          {feature.label}
        </div>
        <div style={{
          fontSize: '12px', color: 'rgba(255,255,255,0.35)',
          lineHeight: 1.5,
        }}>
          {feature.description}
        </div>
      </div>

      {/* Status + Toggle */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
        <div style={{
          fontSize: '11px', fontWeight: 700, letterSpacing: '0.5px',
          color: enabled ? feature.color : 'rgba(255,255,255,0.25)',
          transition: 'color 0.2s',
        }}>
          {enabled ? 'ON' : 'OFF'}
        </div>
        <Toggle
          enabled={enabled}
          onChange={(e) => { e.stopPropagation(); onToggle(); }}
          color={feature.color}
        />
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────── */
export default function AdvancedSettings({ store }) {
  const [features, setFeatures] = useState(DEFAULT_FEATURES);
  const [adPlatforms, setAdPlatforms] = useState(DEFAULT_AD_PLATFORMS);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  // ── Shiprocket integration state ──────────────────────────────
  const [srStatus, setSrStatus] = useState({ connected: false, lastSyncedAt: null, shipmentCount: 0 });
  const [srModalOpen, setSrModalOpen] = useState(false);
  const [srEmail, setSrEmail] = useState('');
  const [srPassword, setSrPassword] = useState('');
  const [srFromDate, setSrFromDate] = useState('');   // YYYY-MM-DD
  const [srFromPreset, setSrFromPreset] = useState('store_start'); // preset key
  const [srBusy, setSrBusy] = useState(false);      // connecting
  const [srSyncing, setSrSyncing] = useState(false);
  const [srError, setSrError] = useState(null);

  const loadShiprocketStatus = async () => {
    if (!store?.id) return;
    try {
      const res = await fetch(`${API_URL}/api/shiprocket/status/${store.id}`);
      if (res.ok) setSrStatus(await res.json());
    } catch { /* non-fatal — card just shows "not connected" */ }
  };

  useEffect(() => { loadShiprocketStatus(); }, [store?.id]);

  const handleShiprocketConnect = async () => {
    if (!srEmail.trim() || !srPassword.trim()) {
      setSrError('Enter your Shiprocket API email and password.');
      return;
    }
    if (srFromPreset === 'custom' && !srFromDate) {
      setSrError('Pick a start date or choose a preset.');
      return;
    }
    setSrBusy(true);
    setSrError(null);
    // Resolve the final syncFromDate from the chosen preset
    const today = new Date();
    const daysAgoStr = (n) => {
      const d = new Date(today); d.setDate(d.getDate() - n);
      return d.toISOString().substring(0, 10);
    };
    const storeStartDate = store?.dashboard_features?.sync_from_date || null;
    const syncFromDate =
      srFromPreset === 'custom'       ? srFromDate :
      srFromPreset === 'store_start'  ? storeStartDate :
      srFromPreset === '30d'          ? daysAgoStr(30) :
      srFromPreset === '90d'          ? daysAgoStr(90) :
      srFromPreset === '180d'         ? daysAgoStr(180) :
      null; // 'all' = no filter

    try {
      const res = await fetch(`${API_URL}/api/shiprocket/connect/${store.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: srEmail.trim(), password: srPassword.trim(), syncFromDate })
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || `Connection failed (status ${res.status})`);
      setSrModalOpen(false);
      setSrEmail(''); setSrPassword(''); setSrFromDate(''); setSrFromPreset('store_start');
      // Give the background initial sync a moment, then refresh status
      setTimeout(loadShiprocketStatus, 2500);
      setSrStatus(s => ({ ...s, connected: true }));
    } catch (err) {
      setSrError(err.message);
    } finally {
      setSrBusy(false);
    }
  };

  const handleShiprocketSync = async () => {
    setSrSyncing(true);
    setSrError(null);
    try {
      const res = await fetch(`${API_URL}/api/shiprocket/sync/${store.id}`, { method: 'POST' });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || `Sync failed (status ${res.status})`);
      // Sync now runs in background — progress shown in the drawer.
      // Poll for updated count after a short delay.
      setTimeout(() => loadShiprocketStatus(), 5000);
    } catch (err) {
      setSrError(err.message);
    } finally {
      setSrSyncing(false);
    }
  };

  const handleShiprocketDisconnect = async () => {
    if (!window.confirm('Disconnect Shiprocket? Synced shipment history is kept, but status updates will stop.')) return;
    setSrBusy(true);
    try {
      await fetch(`${API_URL}/api/shiprocket/disconnect/${store.id}`, { method: 'DELETE' });
      setSrStatus({ connected: false, lastSyncedAt: null, shipmentCount: srStatus.shipmentCount });
    } catch (err) {
      setSrError(err.message);
    } finally {
      setSrBusy(false);
    }
  };

  // Load existing settings from Supabase on mount
  useEffect(() => {
    if (!store?.id) { setLoading(false); return; }
    const saved = store?.dashboard_features;
    if (saved && typeof saved === 'object') {
      setFeatures({ ...DEFAULT_FEATURES, ...saved });
    }
    const platforms = store?.enabled_ad_platforms;
    if (Array.isArray(platforms) && platforms.length > 0) {
      setAdPlatforms(platforms);
    }
    setLoading(false);
  }, [store]);

  const toggleFeature = (key) => {
    setFeatures(prev => ({ ...prev, [key]: !prev[key] }));
    setSaved(false);
  };

  const toggleAdPlatform = (key) => {
    setAdPlatforms(prev => {
      const next = prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key];
      // Force at least one platform on — owners shouldn't be able to disable every channel
      // and then wonder why Ad Spend modal looks empty.
      return next.length === 0 ? [key] : next;
    });
    setSaved(false);
  };

  const enabledCount = Object.values(features).filter(Boolean).length;

  const handleSave = async () => {
    if (!store?.id) return;
    setSaving(true);
    setError(null);

    const { error: err } = await supabase
      .from('stores')
      .update({ dashboard_features: features, enabled_ad_platforms: adPlatforms })
      .eq('id', store.id);

    setSaving(false);
    if (err) {
      setError('Failed to save: ' + err.message);
    } else {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
  };

  const handleEnableAll = () => {
    setFeatures(DEFAULT_FEATURES);
    setSaved(false);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '60px', color: 'rgba(255,255,255,0.4)' }}>
        Loading settings...
      </div>
    );
  }

  return (
    <div style={{ animation: 'fadeInUp 0.35s ease forwards' }}>

      {/* ── Store Connection Status (top of page) ──────────────────── */}
      {store?.shopify_domain && (
        <div style={{
          marginBottom: '16px', padding: '20px', borderRadius: '16px',
          background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
        }}>
          <div style={{
            fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.3)',
            textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '14px',
          }}>
            Store Connection Status
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '10px', height: '10px', borderRadius: '50%',
              background: 'rgba(52,211,153,1)',
              boxShadow: '0 0 10px rgba(52,211,153,0.6)',
              animation: 'pulse-live 1.5s ease infinite',
            }} />
            <div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#fff' }}>
                {store.store_name}
              </div>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)', marginTop: '2px' }}>
                {store.shopify_domain}.myshopify.com · Connected
              </div>
            </div>
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{
                fontSize: '11px', fontWeight: 700, padding: '4px 10px',
                borderRadius: '999px',
                background: store.plan_type === 'pro' ? 'rgba(167,139,250,0.15)' : 'rgba(255,255,255,0.06)',
                color: store.plan_type === 'pro' ? 'rgba(167,139,250,1)' : 'rgba(255,255,255,0.4)',
                border: `1px solid ${store.plan_type === 'pro' ? 'rgba(167,139,250,0.3)' : 'rgba(255,255,255,0.1)'}`,
              }}>
                {store.plan_type === 'pro' ? '✦ PRO' : 'Free Plan'}
              </span>
              <ChevronRight size={16} color="rgba(255,255,255,0.2)" />
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        marginBottom: '28px', gap: '16px', flexWrap: 'wrap',
      }}>
        <div>
          <h2 style={{
            fontFamily: 'Outfit, sans-serif', fontSize: '22px', fontWeight: 800,
            color: '#fff', margin: '0 0 6px 0', letterSpacing: '-0.3px',
          }}>
            Dashboard Feature Controls
          </h2>
          <p style={{ margin: 0, fontSize: '14px', color: 'rgba(255,255,255,0.45)', lineHeight: 1.6 }}>
            Toggle which analytics views are visible in your dashboard.{' '}
            <span style={{ color: 'rgba(167,139,250,0.8)' }}>
              {enabledCount} of {FEATURES.length} features enabled.
            </span>
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            onClick={handleEnableAll}
            style={{
              display: 'flex', alignItems: 'center', gap: '7px',
              padding: '10px 18px', borderRadius: '12px',
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
              color: 'rgba(255,255,255,0.7)', fontWeight: 600, fontSize: '13px',
              cursor: 'pointer', fontFamily: 'Outfit, sans-serif',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
          >
            <CheckCircle2 size={15} /> Enable All
          </button>

          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '10px 22px', borderRadius: '12px', border: 'none',
              background: saved
                ? 'linear-gradient(135deg, rgba(52,211,153,0.9), rgba(16,185,129,0.9))'
                : 'linear-gradient(135deg, rgba(167,139,250,1), rgba(56,189,248,1))',
              color: '#000', fontWeight: 700, fontSize: '14px',
              cursor: saving ? 'not-allowed' : 'pointer',
              fontFamily: 'Outfit, sans-serif',
              opacity: saving ? 0.7 : 1,
              boxShadow: saved
                ? '0 0 24px rgba(52,211,153,0.4)'
                : '0 0 24px rgba(167,139,250,0.4)',
              transition: 'all 0.3s ease',
            }}
          >
            {saving
              ? <><RefreshCw size={15} style={{ animation: 'spin 1s linear infinite' }} /> Saving...</>
              : saved
              ? <><CheckCircle2 size={15} /> Saved!</>
              : <><Save size={15} /> Save Settings</>
            }
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          padding: '14px 18px', borderRadius: '12px', marginBottom: '20px',
          background: 'rgba(251,113,133,0.08)', border: '1px solid rgba(251,113,133,0.2)',
          color: '#fb7185', fontSize: '13px',
        }}>
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {/* No store warning */}
      {!store?.id && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '12px',
          padding: '16px 20px', borderRadius: '14px', marginBottom: '24px',
          background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)',
        }}>
          <AlertCircle size={18} color="rgba(251,191,36,0.8)" />
          <div>
            <div style={{ fontWeight: 700, color: 'rgba(251,191,36,0.9)', fontSize: '13px', marginBottom: '2px' }}>
              No store connected
            </div>
            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>
              Connect your Shopify store first. These settings will be saved to your store profile once connected.
            </div>
          </div>
        </div>
      )}

      {/* Info card about syncing */}
      <div style={{
        display: 'flex', alignItems: 'flex-start', gap: '14px',
        padding: '16px 20px', borderRadius: '14px', marginBottom: '28px',
        background: 'linear-gradient(135deg, rgba(56,189,248,0.06), rgba(167,139,250,0.06))',
        border: '1px solid rgba(56,189,248,0.15)',
      }}>
        <Sparkles size={18} color="rgba(56,189,248,0.8)" style={{ flexShrink: 0, marginTop: '1px' }} />
        <div>
          <div style={{ fontWeight: 700, color: 'rgba(56,189,248,0.9)', fontSize: '13px', marginBottom: '4px' }}>
            How feature toggles work
          </div>
          <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', lineHeight: 1.7 }}>
            Each toggle controls whether that analytics view appears in your left sidebar navigation.
            All views pull data directly from your Shopify store via Supabase. Toggling simply hides/shows them.
            Your data is always synced in the background regardless of toggle state.
          </div>
        </div>
      </div>

      {/* Feature Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {FEATURES.map((feature) => (
          <FeatureCard
            key={feature.key}
            feature={feature}
            enabled={features[feature.key]}
            onToggle={() => toggleFeature(feature.key)}
          />
        ))}
      </div>

      {/* Ad Platforms section */}
      <div style={{ marginTop: '36px', marginBottom: '14px' }}>
        <h3 style={{
          fontFamily: 'Outfit, sans-serif', fontSize: '18px', fontWeight: 800,
          color: '#fff', margin: '0 0 6px 0', letterSpacing: '-0.2px',
        }}>
          Ad Platforms
        </h3>
        <p style={{ margin: 0, fontSize: '13px', color: 'rgba(255,255,255,0.45)', lineHeight: 1.6 }}>
          Choose which ad channels appear in the daily Ad Spend modal.{' '}
          <span style={{ color: 'rgba(167,139,250,0.8)' }}>
            {adPlatforms.length} of {AD_PLATFORMS.length} enabled.
          </span>
          {' '}Each enabled platform is clickable — drill in to record per-product spend.
        </p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {AD_PLATFORMS.map((p) => {
          const enabled = adPlatforms.includes(p.key);
          return (
            <div
              key={p.key}
              onClick={() => toggleAdPlatform(p.key)}
              style={{
                display: 'flex', alignItems: 'center', gap: '16px', cursor: 'pointer',
                padding: '16px 18px', borderRadius: '14px',
                background: enabled
                  ? `linear-gradient(135deg, ${p.glow.replace('0.3', '0.08')}, transparent)`
                  : 'rgba(255,255,255,0.02)',
                border: `1px solid ${enabled ? p.glow : 'rgba(255,255,255,0.06)'}`,
                transition: 'all 0.25s ease',
              }}
            >
              <div style={{
                width: '10px', height: '10px', borderRadius: '50%',
                background: enabled ? p.color : 'rgba(255,255,255,0.15)',
                boxShadow: enabled ? `0 0 12px ${p.glow}` : 'none',
                transition: 'all 0.2s', flexShrink: 0,
              }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: '14px', fontWeight: 700,
                  color: enabled ? '#fff' : 'rgba(255,255,255,0.5)',
                  marginBottom: '3px', fontFamily: 'Outfit, sans-serif',
                }}>
                  {p.label}
                </div>
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)', lineHeight: 1.5 }}>
                  {p.description}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
                <div style={{
                  fontSize: '11px', fontWeight: 700, letterSpacing: '0.5px',
                  color: enabled ? p.color : 'rgba(255,255,255,0.25)',
                }}>
                  {enabled ? 'ON' : 'OFF'}
                </div>
                <Toggle
                  enabled={enabled}
                  onChange={(e) => { e.stopPropagation(); toggleAdPlatform(p.key); }}
                  color={p.color}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Shipping Integration (Shiprocket) — bottom of page ─────── */}
      {store?.shopify_domain && (
        <div style={{
          marginTop: '28px', padding: '20px', borderRadius: '16px',
          background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
        }}>
          <div style={{
            fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.3)',
            textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '14px',
          }}>
            Shipping Integration
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
            <div style={{
              width: '44px', height: '44px', borderRadius: '12px', flexShrink: 0,
              background: srStatus.connected ? 'rgba(124,58,237,0.15)' : 'rgba(255,255,255,0.05)',
              border: `1px solid ${srStatus.connected ? 'rgba(124,58,237,0.4)' : 'rgba(255,255,255,0.1)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Truck size={22} color={srStatus.connected ? 'rgba(167,139,250,1)' : 'rgba(255,255,255,0.4)'} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                Shiprocket
                {srStatus.connected && (
                  <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '999px', background: 'rgba(52,211,153,0.15)', color: 'rgba(52,211,153,1)', border: '1px solid rgba(52,211,153,0.3)' }}>● CONNECTED</span>
                )}
              </div>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>
                {srStatus.connected
                  ? `${srStatus.shipmentCount} shipments synced${srStatus.lastSyncedAt ? ' · ' + new Date(srStatus.lastSyncedAt).toLocaleString() : ''}`
                  : 'Connect to fetch carrier-verified delivery status (source of truth).'}
              </div>
            </div>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {srStatus.connected ? (
                <>
                  <button onClick={handleShiprocketSync} disabled={srSyncing} style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '9px 16px', borderRadius: '10px', background: 'rgba(167,139,250,0.12)', border: '1px solid rgba(167,139,250,0.3)', color: 'rgba(167,139,250,1)', fontWeight: 600, fontSize: '13px', cursor: srSyncing ? 'default' : 'pointer', fontFamily: 'Outfit, sans-serif', opacity: srSyncing ? 0.6 : 1 }}>
                    <RefreshCw size={14} style={srSyncing ? { animation: 'spin 0.8s linear infinite' } : undefined} />
                    {srSyncing ? 'Syncing…' : 'Sync Now'}
                  </button>
                  <button onClick={handleShiprocketDisconnect} disabled={srBusy} style={{ padding: '9px 16px', borderRadius: '10px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.55)', fontWeight: 600, fontSize: '13px', cursor: 'pointer', fontFamily: 'Outfit, sans-serif' }}>Disconnect</button>
                </>
              ) : (
                <button onClick={() => { setSrError(null); setSrFromPreset(store?.dashboard_features?.sync_from_date ? 'store_start' : '90d'); setSrModalOpen(true); }} style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '9px 18px', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg, rgba(124,58,237,1), rgba(167,139,250,1))', color: '#fff', fontWeight: 600, fontSize: '13px', cursor: 'pointer', fontFamily: 'Outfit, sans-serif' }}>
                  <Plug size={14} /> Connect
                </button>
              )}
            </div>
          </div>
          {srError && !srModalOpen && (
            <div style={{ marginTop: '12px', fontSize: '12px', color: 'rgba(248,113,113,1)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <AlertCircle size={14} /> {srError}
            </div>
          )}
        </div>
      )}

      {/* ── Shiprocket Connect Modal ──────────────────────────────── */}
      {srModalOpen && (
        <div
          onClick={e => e.target === e.currentTarget && setSrModalOpen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
          }}
        >
          <div style={{
            width: '100%', maxWidth: '440px', borderRadius: '18px', padding: '26px',
            background: '#15151f', border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '40px', height: '40px', borderRadius: '11px',
                  background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.4)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Truck size={20} color="rgba(167,139,250,1)" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: '#fff' }}>Connect Shiprocket</h3>
                  <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>Carrier-verified delivery status</div>
                </div>
              </div>
              <button onClick={() => setSrModalOpen(false)} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)', borderRadius: '8px', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={16} />
              </button>
            </div>

            {/* How-to hint */}
            <div style={{
              fontSize: '12px', color: 'rgba(255,255,255,0.55)', lineHeight: 1.6, marginBottom: '18px',
              padding: '12px 14px', borderRadius: '10px',
              background: 'rgba(167,139,250,0.06)', border: '1px solid rgba(167,139,250,0.15)',
            }}>
              In Shiprocket go to <strong style={{ color: 'rgba(255,255,255,0.8)' }}>Settings → API → Configure</strong> and create a dedicated <strong style={{ color: 'rgba(255,255,255,0.8)' }}>API User</strong>. Paste those credentials below — not your main login. They're encrypted and only used to read shipment status.
            </div>

            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.6)', marginBottom: '6px' }}>API User Email</label>
            <input
              type="email" value={srEmail} onChange={e => setSrEmail(e.target.value)}
              placeholder="api-user@yourstore.com" autoComplete="off"
              style={{ width: '100%', padding: '11px 14px', borderRadius: '10px', marginBottom: '14px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', fontSize: '14px', boxSizing: 'border-box' }}
            />

            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.6)', marginBottom: '6px' }}>API User Password</label>
            <input
              type="password" value={srPassword} onChange={e => setSrPassword(e.target.value)}
              placeholder="••••••••" autoComplete="off"
              style={{ width: '100%', padding: '11px 14px', borderRadius: '10px', marginBottom: '20px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', fontSize: '14px', boxSizing: 'border-box' }}
            />

            {/* ── Historical data range ──────────────────────────────── */}
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: '18px', marginBottom: '4px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.6)', marginBottom: '10px' }}>
                How far back should we fetch shipment history?
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
                {[
                  { key: 'store_start', label: '📅 Store start date', sub: store?.dashboard_features?.sync_from_date || 'match Shopify', show: !!store?.dashboard_features?.sync_from_date },
                  { key: '30d',  label: 'Last 30 days',   sub: 'lighter import' },
                  { key: '90d',  label: 'Last 3 months',  sub: 'recommended' },
                  { key: '180d', label: 'Last 6 months',  sub: '' },
                  { key: 'all',  label: 'All time',       sub: 'full history' },
                  { key: 'custom', label: 'Custom date',  sub: 'pick exact date' },
                ].filter(p => p.show !== false).map(p => (
                  <button
                    key={p.key}
                    onClick={() => setSrFromPreset(p.key)}
                    style={{
                      padding: '10px 12px', borderRadius: '10px', cursor: 'pointer', textAlign: 'left',
                      background: srFromPreset === p.key ? 'rgba(124,58,237,0.2)' : 'rgba(255,255,255,0.04)',
                      border: `1px solid ${srFromPreset === p.key ? 'rgba(124,58,237,0.6)' : 'rgba(255,255,255,0.08)'}`,
                      transition: 'all 0.15s',
                    }}
                  >
                    <div style={{ fontSize: '13px', fontWeight: 600, color: srFromPreset === p.key ? '#c4b5fd' : '#fff' }}>{p.label}</div>
                    {p.sub && <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>{p.sub}</div>}
                  </button>
                ))}
              </div>

              {srFromPreset === 'custom' && (
                <input
                  type="date" value={srFromDate} onChange={e => setSrFromDate(e.target.value)}
                  max={new Date().toISOString().substring(0,10)}
                  style={{ width: '100%', padding: '11px 14px', borderRadius: '10px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(124,58,237,0.4)', color: '#fff', fontSize: '14px', boxSizing: 'border-box', colorScheme: 'dark' }}
                />
              )}

              {/* Summary line */}
              <div style={{ marginTop: '10px', fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>
                {srFromPreset === 'all'         && '⚠️ Fetching all history may take a few minutes for large stores.'}
                {srFromPreset === 'store_start' && `✅ Will fetch from ${store?.dashboard_features?.sync_from_date} — matches your Shopify data window.`}
                {srFromPreset === '30d'         && '✅ Fast import, covers the last 30 days.'}
                {srFromPreset === '90d'         && '✅ Good balance of speed and coverage.'}
                {srFromPreset === '180d'        && '✅ 6 months of shipment history.'}
                {srFromPreset === 'custom' && srFromDate && `✅ Fetching from ${srFromDate} onwards.`}
              </div>
            </div>

            {srError && (
              <div style={{ marginTop: '12px', fontSize: '12px', color: 'rgba(248,113,113,1)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <AlertCircle size={14} /> {srError}
              </div>
            )}

            <button
              onClick={handleShiprocketConnect}
              disabled={srBusy}
              style={{
                width: '100%', marginTop: '18px', padding: '13px', borderRadius: '11px', border: 'none',
                background: srBusy ? 'rgba(124,58,237,0.5)' : 'linear-gradient(135deg, rgba(124,58,237,1), rgba(167,139,250,1))',
                color: '#fff', fontWeight: 700, fontSize: '14px', cursor: srBusy ? 'default' : 'pointer',
                fontFamily: 'Outfit, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              }}
            >
              {srBusy ? <><RefreshCw size={15} style={{ animation: 'spin 0.8s linear infinite' }} /> Verifying & syncing…</> : <><Plug size={15} /> Connect & Sync</>}
            </button>
          </div>
        </div>
      )}

      {/* Spin keyframe for save button */}
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes pulse-live {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.15); }
        }
      `}</style>
    </div>
  );
}
