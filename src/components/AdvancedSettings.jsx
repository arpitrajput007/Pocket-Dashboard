import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import {
  LayoutDashboard, Calendar, CalendarDays, BarChart2,
  TrendingUp, Trophy, CheckCircle2, Save, RefreshCw,
  AlertCircle, Sparkles, ChevronRight
} from 'lucide-react';

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

      {/* Shopify Sync Status Card */}
      {store?.shopify_domain && (
        <div style={{
          marginTop: '28px', padding: '20px', borderRadius: '16px',
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
