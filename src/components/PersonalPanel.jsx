import React, { useState, useEffect, lazy, Suspense } from 'react';
import { supabase } from '../supabaseClient';
import BrandLogo from './BrandLogo';
import {
  LayoutDashboard, Link2, Settings, Headphones,
  LogOut, ChevronRight, Unplug, ShieldCheck, Sparkles, SlidersHorizontal, Package, DollarSign,
  BarChart, Calendar, TrendingUp, PieChart, List, RefreshCw
} from 'lucide-react';

// Lazy load dashboard sub-views for performance
const Onboarding = lazy(() => import('./Onboarding'));
const AdvancedSettings = lazy(() => import('./AdvancedSettings'));
const ProductsView = lazy(() => import('./ProductsView'));
const PricingView = lazy(() => import('./PricingView'));
const DailyDashboard = lazy(() => import('./DailyDashboard'));
const WeeklyView = lazy(() => import('./WeeklyView'));
const MonthlyView = lazy(() => import('./MonthlyView'));
const AllTimeView = lazy(() => import('./AllTimeView'));
const BusinessAnalytics = lazy(() => import('./BusinessAnalytics'));
const SheetView = lazy(() => import('./SheetView'));
const CopilotChat = lazy(() => import('./CopilotChat'));

const ViewLoading = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '400px', color: 'rgba(255,255,255,0.2)', fontSize: '14px' }}>
    <div className="spinner" style={{ marginRight: '12px' }} /> Loading view...
  </div>
);


/* ─────────────────────────────────────────────
   EMPTY STATE — No store connected
───────────────────────────────────────────── */
function NoStoreState({ onConnectClick }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', height: '100%', minHeight: '70vh',
      textAlign: 'center', gap: '28px', padding: '40px',
    }}>
      <div style={{
        width: '110px', height: '110px', borderRadius: '30px',
        background: 'var(--primary-dim)',
        border: '1px solid var(--primary-glow)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: 'var(--shadow-glow-aurora), 0 0 0 1px var(--primary-glow)',
        animation: 'panel-float 4s ease-in-out infinite',
      }}>
        <Unplug size={48} color="var(--primary)" strokeWidth={1.5} />
      </div>

      <div>
        <h2 style={{
          fontFamily: 'Outfit, sans-serif', fontSize: '28px', fontWeight: 800,
          color: '#fff', margin: '0 0 12px 0', letterSpacing: '-0.5px',
        }}>
          No store connected yet
        </h2>
        <p style={{
          color: 'rgba(255,255,255,0.45)', fontSize: '15px',
          maxWidth: '400px', lineHeight: 1.75, margin: 0,
        }}>
          Connect your Shopify store to unlock real-time profit tracking,
          risk alerts, and your full business analytics dashboard.
        </p>
      </div>

      <button
        onClick={onConnectClick}
        style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          padding: '15px 30px', borderRadius: '14px', border: 'none',
          background: 'var(--primary-gradient)',
          color: '#000', fontWeight: 700, fontSize: '15px',
          cursor: 'pointer', fontFamily: 'Outfit, sans-serif',
          boxShadow: 'var(--shadow-brand)',
          transition: 'transform 0.2s, box-shadow 0.2s',
        }}
        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--shadow-brand-lg)'; }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'var(--shadow-brand)'; }}
      >
        <Link2 size={18} />
        Connect your Store
      </button>
    </div>
  );
}

/* ─────────────────────────────────────────────
   PRO PLAN REQUIRED STATE
───────────────────────────────────────────── */
function ProRequiredState({ onUpgradeClick }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', height: '100%', minHeight: '60vh',
      textAlign: 'center', gap: '22px', padding: '40px',
    }}>
      <div style={{
        width: '84px', height: '84px', borderRadius: '24px',
        background: 'linear-gradient(135deg, rgba(245,200,66,0.1), rgba(234,88,12,0.1))',
        border: '1px solid rgba(245,200,66,0.2)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 0 48px -12px rgba(245,200,66,0.3)',
      }}>
        <Sparkles size={38} color="rgba(245,200,66,0.85)" strokeWidth={1.5} />
      </div>
      <div>
        <div style={{
          display: 'inline-block', padding: '4px 14px', borderRadius: '999px',
          background: 'var(--primary-dim)', border: '1px solid var(--primary-glow)',
          color: 'var(--primary)', fontSize: '11px', fontWeight: 700,
          textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '14px',
        }}>
          Pro Feature
        </div>
        <h2 style={{
          fontFamily: 'Outfit, sans-serif', fontSize: '24px', fontWeight: 800,
          color: '#fff', margin: '0 0 10px 0', letterSpacing: '-0.3px',
        }}>
          Unlock Complete Analytics
        </h2>
        <p style={{
          color: 'rgba(255,255,255,0.45)', fontSize: '14px',
          maxWidth: '360px', lineHeight: 1.6, margin: 0,
        }}>
          You're currently on the Starter plan. Upgrade to Pro to unlock SKU-level insights, loss identification, and AI-powered recommendations.
        </p>
      </div>

      <button
        onClick={onUpgradeClick}
        style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          padding: '12px 24px', borderRadius: '12px',
          background: 'var(--primary-dim)', color: 'var(--primary)',
          border: '1px solid var(--primary-glow)',
          fontWeight: 700, fontSize: '14px', cursor: 'pointer', fontFamily: 'Outfit, sans-serif',
          transition: 'all 0.2s',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'var(--primary-glow)'; e.currentTarget.style.borderColor = 'var(--primary)'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'var(--primary-dim)'; e.currentTarget.style.borderColor = 'var(--primary-glow)'; }}
      >
        Upgrade to Pro
      </button>
    </div>
  );
}

/* ─────────────────────────────────────────────
   TRIAL EXPIRED STATE
───────────────────────────────────────────── */
function TrialExpiredState({ onUpgradeClick }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', height: '100%', minHeight: '70vh',
      textAlign: 'center', gap: '28px', padding: '40px',
    }}>
      <div style={{
        width: '110px', height: '110px', borderRadius: '30px',
        background: 'linear-gradient(135deg, rgba(239,68,68,0.12), rgba(249,115,22,0.12))',
        border: '1px solid rgba(239,68,68,0.25)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 0 80px -10px rgba(239,68,68,0.35), 0 0 0 1px rgba(239,68,68,0.1)',
        animation: 'panel-float 4s ease-in-out infinite',
      }}>
        <div style={{ fontSize: '48px' }}>⏳</div>
      </div>

      <div>
        <h2 style={{
          fontFamily: 'Outfit, sans-serif', fontSize: '28px', fontWeight: 800,
          color: '#fff', margin: '0 0 12px 0', letterSpacing: '-0.5px',
        }}>
          Your 14-Day Free Trial has expired
        </h2>
        <p style={{
          color: 'rgba(255,255,255,0.45)', fontSize: '15px',
          maxWidth: '440px', lineHeight: 1.75, margin: 0,
        }}>
          Upgrade to a paid plan to continue tracking your real profit,
          optimizing your metrics, and reducing your RTO losses.
        </p>
      </div>

      <button
        onClick={onUpgradeClick}
        style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          padding: '15px 30px', borderRadius: '14px', border: 'none',
          background: 'var(--primary-gradient)',
          color: '#000', fontWeight: 700, fontSize: '15px',
          cursor: 'pointer', fontFamily: 'Outfit, sans-serif',
          boxShadow: 'var(--shadow-brand)',
          transition: 'transform 0.2s, box-shadow 0.2s',
        }}
        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--shadow-brand-lg)'; }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'var(--shadow-brand)'; }}
      >
        <DollarSign size={18} />
        View Pricing & Upgrade
      </button>
    </div>
  );
}

/* ─────────────────────────────────────────────
   COMING SOON PLACEHOLDER
───────────────────────────────────────────── */
function ComingSoon({ icon: Icon, title, description }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', height: '100%', minHeight: '60vh',
      textAlign: 'center', gap: '22px', padding: '40px',
    }}>
      <div style={{
        width: '84px', height: '84px', borderRadius: '24px',
        background: 'linear-gradient(135deg, rgba(56,189,248,0.1), rgba(167,139,250,0.1))',
        border: '1px solid rgba(56,189,248,0.2)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 0 48px -12px rgba(56,189,248,0.3)',
      }}>
        <Icon size={38} color="rgba(56,189,248,0.85)" strokeWidth={1.5} />
      </div>
      <div>
        <div style={{
          display: 'inline-block', padding: '4px 14px', borderRadius: '999px',
          background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.18)',
          color: 'rgba(167,139,250,0.9)', fontSize: '11px', fontWeight: 700,
          letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '16px',
        }}>Coming Soon</div>
        <h2 style={{
          fontFamily: 'Outfit, sans-serif', fontSize: '26px', fontWeight: 800,
          color: '#fff', margin: '0 0 10px 0', letterSpacing: '-0.3px',
        }}>{title}</h2>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '15px', maxWidth: '380px', lineHeight: 1.75, margin: 0 }}>
          {description}
        </p>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   SIDEBAR NAV ITEM — Premium active state
───────────────────────────────────────────── */
function NavItem({ icon: Icon, label, active, onClick, badge }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: '12px',
        width: '100%', padding: '11px 14px', borderRadius: '12px',
        background: active
          ? 'linear-gradient(135deg, var(--primary-dim) 0%, rgba(34,211,238,0.05) 100%)'
          : hovered ? 'rgba(255,255,255,0.05)' : 'transparent',
        border: active ? '1px solid var(--primary-glow)' : '1px solid transparent',
        color: active ? '#fff' : hovered ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.5)',
        cursor: 'pointer', textAlign: 'left',
        transition: 'all 0.2s ease',
        fontFamily: 'Outfit, sans-serif', fontSize: '13.5px', fontWeight: active ? 600 : 500,
        boxShadow: active ? 'var(--shadow-brand), inset 0 0 20px rgba(34,211,238,0.03)' : 'none',
        position: 'relative',
        transform: hovered && !active ? 'translateX(2px)' : 'translateX(0)',
      }}
    >
      {/* Golden left border for active */}
      {active && (
        <div style={{
          position: 'absolute', left: 0, top: '18%', bottom: '18%',
          width: '3px', borderRadius: '0 3px 3px 0',
          background: 'var(--primary-gradient)',
          boxShadow: '0 0 12px var(--primary-glow)',
        }} />
      )}
      <Icon size={17} strokeWidth={active ? 2.2 : 1.8} style={{ flexShrink: 0, opacity: active ? 1 : 0.7 }} />
      <span style={{ flex: 1 }}>{label}</span>
      {badge && (
        <span style={{
          fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '999px',
          background: 'var(--primary-dim)', color: 'var(--primary)',
          border: '1px solid var(--primary-glow)', letterSpacing: '0.5px',
        }}>{badge}</span>
      )}
      {active && <ChevronRight size={13} style={{ opacity: 0.35, flexShrink: 0 }} />}
    </button>
  );
}

import ConnectShopifyStep from './ConnectShopifyStep';

/* ─────────────────────────────────────────────
   CONNECTED STORE PANEL — shown on "Connect your Store" tab when already connected
───────────────────────────────────────────── */
function ConnectedStorePanel({ store, trialDuration, storeCreatedAt, isTrialExpired, onUpgradeClick, onStoreConnected, onDisconnect, onSyncComplete }) {
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState('');
  const [syncModalOpen, setSyncModalOpen] = useState(false);
  const [syncFromDate, setSyncFromDate] = useState('');
  const [syncToDate, setSyncToDate] = useState('');
  const [syncPreset, setSyncPreset] = useState('incremental');
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editDomain, setEditDomain] = useState(store?.shopify_domain || '');
  const [editClientId, setEditClientId] = useState('');
  const [editToken, setEditToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState('');
  // Free period: 3 months (90 days) from the day the store connected to Pocket Dashboard
  const msElapsed   = Date.now() - storeCreatedAt;
  const daysElapsed = Math.floor(msElapsed / (1000 * 60 * 60 * 24));
  const totalDays   = 90;
  const daysLeft    = Math.max(0, totalDays - daysElapsed);
  const trialPct    = Math.min(100, (daysElapsed / totalDays) * 100);

  const plan = store?.plan_type || store?.subscription_plan || 'free';
  const isPro     = plan === 'pro';
  const isStarter = plan === 'starter';
  const isFree    = !isPro && !isStarter;

  const planLabel  = isPro ? '✦ Pro Plan' : isStarter ? 'Starter Plan' : isTrialExpired ? 'Trial Expired' : '🎁 Free Trial';
  const planColor  = isPro ? '#a78bfa' : isStarter ? '#38bdf8' : isTrialExpired ? '#f87171' : '#fbbf24';
  const planBg     = isPro ? 'rgba(167,139,250,0.1)' : isStarter ? 'rgba(56,189,248,0.1)' : isTrialExpired ? 'rgba(248,113,133,0.1)' : 'rgba(251,191,36,0.1)';
  const planBorder = isPro ? 'rgba(167,139,250,0.3)' : isStarter ? 'rgba(56,189,248,0.3)' : isTrialExpired ? 'rgba(248,113,133,0.3)' : 'rgba(251,191,36,0.3)';

  const connectedSince = store?.created_at
    ? new Date(store.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : '—';

  const handleManualSync = async ({ preset = 'incremental', fromDate = '', toDate = '' } = {}) => {
    if (!store?.id || syncing) return;
    setSyncing(true);
    setSyncMsg('');
    setSyncModalOpen(false);
    try {
      const isCustom = preset === 'custom' && fromDate;
      const isFullResync = preset === 'full';
      const body = isCustom ? { fromDate, toDate: toDate || new Date().toISOString().split('T')[0] } : {};
      const url = isFullResync ? `/api/sync/${store.id}?full=true` : `/api/sync/${store.id}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: isCustom ? { 'Content-Type': 'application/json' } : {},
        body: isCustom ? JSON.stringify(body) : undefined
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.status === 'sync_failed') {
        setSyncMsg(`❌ ${data.error || 'Sync failed — check Render logs'}`);
      } else {
        setSyncMsg(`✅ Synced ${data.totalSynced ?? 0} orders (${data.mode})!`);
        if (onSyncComplete) onSyncComplete();
        setTimeout(() => setSyncMsg(''), 6000);
      }
    } catch (err) {
      setSyncMsg(`❌ Network error: ${err.message}`);
    } finally {
      setSyncing(false);
    }
  };


  const handleDisconnect = async () => {
    if (isDeleting) return;
    if (!window.confirm('Disconnect this store? All synced data will be removed.')) return;
    setIsDeleting(true);
    try {
      // Use the backend server (service role key bypasses Supabase RLS)
      // Vercel proxy routes /api/* → Render backend
      const res = await fetch(`/api/store/${store.id}`, { method: 'DELETE' });
      
      let ok = res.ok;
      let errMsg = '';
      if (!res.ok) {
        try {
          const d = await res.json();
          errMsg = d.error || `Server error ${res.status}`;
        } catch {
          errMsg = `Server error ${res.status}`;
        }
      }

      if (!ok) {
        // Fallback: try direct Supabase delete
        console.warn('Server delete failed, trying direct Supabase:', errMsg);
        await supabase.from('orders').delete().eq('store_id', store.id);
        await supabase.from('products').delete().eq('store_id', store.id);
        const { error: sbErr } = await supabase.from('stores').delete().eq('id', store.id);
        if (sbErr) throw new Error(sbErr.message);
        
        // Verify it was actually deleted (RLS can silently block)
        const { data: stillExists } = await supabase.from('stores').select('id').eq('id', store.id).maybeSingle();
        if (stillExists) throw new Error('Delete was blocked by database permissions. Please go to Supabase → stores table → add DELETE policy for authenticated users.');
      }

      // Success — instantly clear UI
      if (onStoreConnected) onStoreConnected();
    } catch (e) {
      alert('Error disconnecting store:\n' + e.message);
      setIsDeleting(false);
    }
  };


  const handleSaveEdit = async () => {
    setEditError('');
    if (!editDomain?.trim()) { setEditError('Shopify domain is required.'); return; }
    if (!editToken?.trim()) { setEditError('Access token is required.'); return; }
    if (!store?.id) { setEditError('Store ID missing. Please refresh the page.'); return; }

    setSavingEdit(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || '';
      const res = await fetch(`${apiUrl}/api/store/${store.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shopify_domain: editDomain.trim(),
          shopify_client_id: editClientId.trim() || '',
          shopify_access_token: editToken.trim()
        })
      });

      let respData = {};
      try { respData = await res.json(); } catch {}

      if (!res.ok) {
        throw new Error(respData.error || `Server error (${res.status})`);
      }

      // Trigger fresh sync with new credentials
      try {
        await fetch(`${apiUrl}/api/sync/${store.id}`, { method: 'POST' });
      } catch (syncErr) {
        console.warn('Sync failed (non-critical):', syncErr);
      }

      setIsEditing(false);
      // Refresh store data in App state
      if (onStoreConnected) await onStoreConnected();
      else window.location.reload();
    } catch (e) {
      setEditError(e.message);
    } finally {
      setSavingEdit(false);
    }
  };

  if (isEditing) {
    return (
      <div style={{ maxWidth: 700, margin: '0 auto', animation: 'fadeInUp 0.35s ease forwards' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <button onClick={() => { setIsEditing(false); setEditError(''); }} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: '#94a3b8', padding: '8px 14px', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' }}>← Back</button>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: '#f1f5f9', margin: 0 }}>Update Store Credentials</h2>
        </div>
        {editError && (
          <div style={{ marginBottom: 20, padding: '14px 18px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 14, color: '#f87171', fontSize: 13.5, lineHeight: 1.6 }}>
            ❌ {editError}
          </div>
        )}
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 24, padding: '28px 32px' }}>
          <ConnectShopifyStep
            shopifyDomain={editDomain} setShopifyDomain={setEditDomain}
            clientId={editClientId} setClientId={setEditClientId}
            accessToken={editToken} setAccessToken={setEditToken}
            showToken={showToken} setShowToken={setShowToken}
            onBack={() => { setIsEditing(false); setEditError(''); }}
            onContinue={handleSaveEdit}
            loading={savingEdit}
          />
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', animation: 'fadeInUp 0.35s ease forwards' }}>

      {/* ── Header ── */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 999, background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)', marginBottom: 14 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#34d399', boxShadow: '0 0 8px #34d399', animation: 'live-pulse 2s ease infinite' }} />
          <span style={{ fontSize: 10.5, fontWeight: 700, color: '#34d399', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Store Connected</span>
        </div>
        <h2 style={{ fontFamily: 'Outfit, sans-serif', fontSize: 26, fontWeight: 800, color: '#f1f5f9', margin: '0 0 8px', letterSpacing: '-0.4px' }}>
          Your Connected Store
        </h2>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', margin: 0, lineHeight: 1.7 }}>
          Pocket Dashboard is actively syncing data from your Shopify store.
        </p>
      </div>

      {/* ── Main Store Card ── */}
      <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 24, padding: '28px 32px', backdropFilter: 'blur(20px)', boxShadow: '0 24px 64px rgba(0,0,0,0.35)', marginBottom: 16 }}>

        {/* Store identity row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 28 }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(34,211,238,0.1))', border: '1px solid rgba(99,102,241,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, flexShrink: 0 }}>
            🛍️
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 19, fontWeight: 800, color: '#f1f5f9', fontFamily: 'Outfit, sans-serif', letterSpacing: '-0.3px', marginBottom: 4 }}>
              {store?.store_name || 'My Store'}
            </div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace' }}>
              {store?.shopify_domain}.myshopify.com
            </div>
          </div>
          {/* Actions */}
          <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => { setIsEditing(true); setEditDomain(store?.shopify_domain || ''); setEditToken(''); setEditClientId(''); setEditError(''); }}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 600, padding: '8px 14px', borderRadius: 10, background: 'rgba(99,102,241,0.08)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.25)', cursor: 'pointer', transition: 'all 0.2s', fontFamily: 'inherit' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.16)'; e.currentTarget.style.borderColor = 'rgba(99,102,241,0.5)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.08)'; e.currentTarget.style.borderColor = 'rgba(99,102,241,0.25)'; }}
              >
                ✏️ Edit Credentials
              </button>
              <button
                onClick={handleDisconnect}
                disabled={isDeleting}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 600, padding: '8px 14px', borderRadius: 10, background: 'rgba(239,68,68,0.07)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)', cursor: isDeleting ? 'wait' : 'pointer', transition: 'all 0.2s', fontFamily: 'inherit', opacity: isDeleting ? 0.6 : 1 }}
                onMouseEnter={e => { if (!isDeleting) { e.currentTarget.style.background = 'rgba(239,68,68,0.14)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.4)'; } }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.07)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.2)'; }}
              >
                {isDeleting ? '⏳ Deleting...' : '🗑️ Disconnect'}
              </button>
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <button
                onClick={() => { if (!syncing) { setSyncPreset('incremental'); setSyncFromDate(''); setSyncToDate(''); setSyncModalOpen(true); } }}
                disabled={syncing}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, padding: '8px 16px', borderRadius: 999, background: 'rgba(255,255,255,0.05)', color: '#f1f5f9', border: '1px solid rgba(255,255,255,0.1)', cursor: syncing ? 'wait' : 'pointer', transition: 'all 0.2s', opacity: syncing ? 0.7 : 1, fontFamily: 'inherit' }}
                onMouseEnter={e => { if (!syncing) e.currentTarget.style.background = 'rgba(255,255,255,0.09)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
              >
                <RefreshCw size={14} style={{ animation: syncing ? 'spin 1s linear infinite' : 'none' }} />
                {syncing ? 'Syncing...' : 'Sync Data'}
              </button>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, padding: '7px 14px', borderRadius: 999, background: planBg, color: planColor, border: `1px solid ${planBorder}`, letterSpacing: '0.04em' }}>
                {planLabel}
              </span>
            </div>
            {syncMsg && (
              <div style={{ fontSize: 12, color: syncMsg.startsWith('✅') ? '#34d399' : '#f87171', marginTop: 2 }}>{syncMsg}</div>
            )}
          </div>
        </div>

        <style>{`
          @keyframes spin {
            100% { transform: rotate(360deg); }
          }
        `}</style>

        {/* Divider */}
        <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', marginBottom: 24 }} />

        {/* Stats grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
          {[
            { label: 'Status', value: '🟢 Active', sub: 'Live sync running' },
            { label: 'Connected Since', value: connectedSince, sub: 'First sync date' },
            { label: 'Store #', value: '1 Store', sub: 'Connected stores' },
          ].map(({ label, value, sub }) => (
            <div key={label} style={{ padding: '16px 18px', background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14 }}>
              <div style={{ fontSize: 10.5, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>{label}</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#f1f5f9', marginBottom: 3 }}>{value}</div>
              <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.3)' }}>{sub}</div>
            </div>
          ))}
        </div>

        {/* 3-month free plan banner — counts from the day the store connected */}
        {isFree && !isTrialExpired && (
          <div style={{ padding: '18px 20px', background: 'rgba(251,191,36,0.05)', border: '1px solid rgba(251,191,36,0.18)', borderRadius: 14, marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#fbbf24' }}>🎁 Free Plan — All Features Included</span>
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
                <strong style={{ color: '#fbbf24' }}>{daysLeft} days</strong> left of 3 months
              </span>
            </div>
            <div style={{ height: 6, borderRadius: 99, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${trialPct}%`, borderRadius: 99, background: trialPct > 85 ? 'linear-gradient(90deg,#f87171,#ef4444)' : 'linear-gradient(90deg,#fbbf24,#f59e0b)', transition: 'width 0.5s ease', boxShadow: trialPct > 85 ? '0 0 8px rgba(248,113,133,0.5)' : '0 0 8px rgba(251,191,36,0.4)' }} />
            </div>
            <p style={{ margin: '10px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.4)', lineHeight: 1.6 }}>
              {daysLeft <= 7
                ? '⚠️ Your free period is ending soon — upgrade to keep all features.'
                : 'Enjoy full access to every feature, free for your first 3 months.'}
            </p>
          </div>
        )}

        {/* Explicitly expired — only when subscription_status === 'expired' */}
        {isTrialExpired && (
          <div style={{ padding: '18px 20px', background: 'rgba(248,113,133,0.06)', border: '1px solid rgba(248,113,133,0.22)', borderRadius: 14, marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#f87171', marginBottom: 4 }}>⏳ Subscription Expired</div>
            <p style={{ margin: 0, fontSize: 12.5, color: 'rgba(255,255,255,0.45)', lineHeight: 1.7 }}>
              Your subscription has ended. Upgrade to continue accessing your analytics.
            </p>
          </div>
        )}

        {/* Access token safety note */}
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '14px 16px', background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.15)', borderRadius: 12 }}>
          <span style={{ fontSize: 16, flexShrink: 0 }}>🔒</span>
          <p style={{ margin: 0, fontSize: 12.5, color: 'rgba(255,255,255,0.4)', lineHeight: 1.7 }}>
            <strong style={{ color: 'rgba(255,255,255,0.7)' }}>Read-only access only.</strong> Pocket Dashboard can never modify, delete, or interact with your store data. Revoke access anytime via Shopify Admin → Settings → Apps.
          </p>
        </div>
      </div>

      {/* ── Upgrade CTA (shown when not Pro) ── */}
      {!isPro && (
        <div style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.08), rgba(34,211,238,0.05))', border: '1px solid rgba(99,102,241,0.18)', borderRadius: 20, padding: '24px 28px', display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#f1f5f9', fontFamily: 'Outfit, sans-serif', marginBottom: 6 }}>
              Unlock the full Pocket Dashboard experience
            </div>
            <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.45)', lineHeight: 1.65 }}>
              Weekly &amp; monthly views, SKU-level analytics, AI Co-Pilot, advanced profit reports, and more.
            </p>
          </div>
          <button
            onClick={onUpgradeClick}
            style={{ padding: '12px 24px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,#6366f1,#4f46e5)', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'Outfit, sans-serif', whiteSpace: 'nowrap', boxShadow: '0 4px 20px rgba(99,102,241,0.4)', transition: 'all 0.2s', flexShrink: 0 }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(99,102,241,0.5)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(99,102,241,0.4)'; }}
          >
            View Plans →
          </button>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   MAIN PERSONAL PANEL
───────────────────────────────────────────── */
export default function PersonalPanel({ session, store, onStoreConnected }) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [copilotOpen, setCopilotOpen] = useState(false);
  
  const [currentTime, setCurrentTime] = useState(new Date());
  const [lastSyncedTime, setLastSyncedTime] = useState(new Date());
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!store?.id) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/sync/${store.id}`, { method: 'POST' });
        if (res.ok) {
          setLastSyncedTime(new Date());
          setRefreshTrigger(prev => prev + 1);
        }
      } catch (err) {
        console.warn('Background sync failed:', err);
      }
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [store?.id]);

  const userEmail = session?.user?.email || '';
  const userInitial = userEmail.charAt(0).toUpperCase();
  const isConnected = !!store;
  
  const trialDuration = 14 * 24 * 60 * 60 * 1000;
  const storeCreatedAt = store?.created_at ? new Date(store.created_at).getTime() : Date.now();
  // Only block the dashboard when the subscription is EXPLICITLY marked expired by the backend.
  // Time-based expiry is disabled until a billing system is wired up — prevents stores from
  // being locked out without a payment flow in place.
  const isTrialExpired = isConnected && store?.subscription_status === 'expired';

  const handleSignOut = () => supabase.auth.signOut();

  const tabTitles = {
    dashboard: 'Business Dashboard',
    weekly: 'Weekly Performance',
    monthly: 'Monthly Overview',
    'all-time': 'All-Time Analytics',
    analytics: 'Business Analytics',
    sheet: 'Sheet View',
    connect: 'Connect your Store',
    products: 'Products',
    pricing: 'Pricing Management',
    advanced: 'Advanced Settings',
    settings: 'Settings',
    support: 'Talk to Support',
  };

  return (
    <>
      <style>{`
        @keyframes panel-float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        @keyframes orb-drift-1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(40px, -30px) scale(1.08); }
          66% { transform: translate(-25px, 20px) scale(0.92); }
        }
        @keyframes orb-drift-2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(-35px, 25px) scale(1.05); }
          66% { transform: translate(30px, -20px) scale(0.95); }
        }
        @keyframes live-pulse {
          0%, 100% { opacity: 1; box-shadow: 0 0 6px rgba(45,212,160,0.8); }
          50% { opacity: 0.5; box-shadow: 0 0 2px rgba(45,212,160,0.3); }
        }
        .panel-shell {
          display: flex; height: 100vh; overflow: hidden;
          background: #07071a;
          font-family: 'Outfit', 'Inter', sans-serif;
          position: relative;
        }
        .panel-shell::before {
          content: '';
          position: fixed; inset: 0; z-index: 0; pointer-events: none;
          background:
            radial-gradient(ellipse 65% 45% at 8% 8%, rgba(167,139,250,0.14) 0%, transparent 60%),
            radial-gradient(ellipse 55% 40% at 92% 15%, rgba(56,189,248,0.10) 0%, transparent 60%),
            radial-gradient(ellipse 50% 45% at 50% 98%, rgba(236,72,153,0.08) 0%, transparent 60%);
        }
        .panel-sidebar {
          width: 256px; flex-shrink: 0;
          background: rgba(7,7,22,0.82);
          backdrop-filter: blur(32px) saturate(160%);
          border-right: 1px solid rgba(255,255,255,0.06);
          display: flex; flex-direction: column;
          z-index: 10; position: relative;
          transition: transform 0.3s ease;
        }
        /* Subtle right-edge catchlight */
        .panel-sidebar::after {
          content: '';
          position: absolute; top: 0; right: -1px;
          width: 1px; height: 100%;
          background: linear-gradient(180deg,
            transparent 0%,
            var(--primary-glow) 20%,
            var(--primary-dim) 50%,
            var(--purple-glow) 80%,
            transparent 100%
          );
          pointer-events: none;
        }
        .panel-main {
          flex: 1; display: flex; flex-direction: column;
          overflow: hidden; z-index: 1; position: relative;
        }
        .panel-topbar {
          height: 66px; flex-shrink: 0;
          background: rgba(7,7,22,0.75);
          backdrop-filter: blur(24px);
          border-bottom: 1px solid rgba(255,255,255,0.06);
          display: flex; align-items: center;
          padding: 0 28px; gap: 16px;
          position: relative;
        }
        /* Gold underline gradient on topbar */
        .panel-topbar::after {
          content: '';
          position: absolute; bottom: -1px; left: 0; right: 0;
          height: 1px;
          background: linear-gradient(90deg, transparent, var(--primary-dim) 30%, var(--purple-glow) 70%, transparent);
          pointer-events: none;
        }
        .panel-content {
          flex: 1; overflow-y: auto; padding: 32px;
        }
        .panel-content::-webkit-scrollbar { width: 4px; }
        .panel-content::-webkit-scrollbar-track { background: transparent; }
        .panel-content::-webkit-scrollbar-thumb {
          background: var(--primary-dim);
          border-radius: 99px;
        }
        .sidebar-overlay {
          display: none;
          position: fixed; inset: 0; background: rgba(0,0,0,0.65);
          backdrop-filter: blur(4px); z-index: 9;
        }
        @keyframes brandGlowPulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
        @media (max-width: 768px) {
          .panel-sidebar { position: fixed; left: 0; top: 0; bottom: 0; transform: translateX(-100%); }
          .panel-sidebar.open { transform: translateX(0); }
          .sidebar-overlay.visible { display: block; }
          .mobile-menu-btn-wrap { display: flex !important; }
        }
      `}</style>

      <div className="panel-shell">
        <div className={`sidebar-overlay ${mobileSidebarOpen ? 'visible' : ''}`} onClick={() => setMobileSidebarOpen(false)} />

        {/* ══════ SIDEBAR ══════ */}
        <aside className={`panel-sidebar ${mobileSidebarOpen ? 'open' : ''}`}>
          {/* Brand */}
          <div style={{
            padding: '20px 16px 18px',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            position: 'relative',
          }}>
            {/* Animated radial glow */}
            <div style={{
              position: 'absolute',
              top: 0, left: 0, right: 0, bottom: 0,
              background: 'radial-gradient(ellipse at 50% 0%, rgba(99,102,241,0.14) 0%, transparent 70%)',
              pointerEvents: 'none',
              animation: 'brandGlowPulse 4s ease-in-out infinite',
            }} />
            {/* Glass card */}
            <div style={{
              position: 'relative',
              padding: '12px 16px 10px',
              borderRadius: '14px',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
              backdropFilter: 'blur(8px)',
              display: 'inline-block',
            }}>
              <BrandLogo variant="full" iconSize={44} />
            </div>
          </div>

          {/* Nav */}
          <nav style={{ flex: 1, padding: '14px 10px', display: 'flex', flexDirection: 'column', gap: '3px', overflowY: 'auto' }}>
            <div style={{ fontSize: '9.5px', fontWeight: 700, color: 'rgba(255,255,255,0.2)', letterSpacing: '1.2px', textTransform: 'uppercase', padding: '8px 10px 6px', marginBottom: '2px' }}>
              Analytics
            </div>
            <NavItem icon={LayoutDashboard} label="Daily Dashboard" active={activeTab === 'dashboard'} onClick={() => { setActiveTab('dashboard'); setMobileSidebarOpen(false); }} />
            <NavItem icon={BarChart} label="Weekly Performance" active={activeTab === 'weekly'} onClick={() => { setActiveTab('weekly'); setMobileSidebarOpen(false); }} />
            <NavItem icon={Calendar} label="Monthly Overview" active={activeTab === 'monthly'} onClick={() => { setActiveTab('monthly'); setMobileSidebarOpen(false); }} />
            <NavItem icon={TrendingUp} label="All-Time Analytics" active={activeTab === 'all-time'} onClick={() => { setActiveTab('all-time'); setMobileSidebarOpen(false); }} />
            <NavItem icon={PieChart} label="Business Analytics" active={activeTab === 'analytics'} onClick={() => { setActiveTab('analytics'); setMobileSidebarOpen(false); }} />
            <NavItem icon={List} label="Sheet View" active={activeTab === 'sheet'} onClick={() => { setActiveTab('sheet'); setMobileSidebarOpen(false); }} />

            <div style={{ height: '1px', background: 'rgba(255,255,255,0.05)', margin: '10px 4px' }} />
            
            <div style={{ fontSize: '9.5px', fontWeight: 700, color: 'rgba(255,255,255,0.2)', letterSpacing: '1.2px', textTransform: 'uppercase', padding: '8px 10px 6px', marginBottom: '2px' }}>
              Management
            </div>
            <NavItem icon={Package} label="Products" active={activeTab === 'products'} onClick={() => { setActiveTab('products'); setMobileSidebarOpen(false); }} />
            <NavItem icon={DollarSign} label="Pricing" active={activeTab === 'pricing'} onClick={() => { setActiveTab('pricing'); setMobileSidebarOpen(false); }} />
            <NavItem icon={Link2} label="Connect your Store" active={activeTab === 'connect'} onClick={() => { setActiveTab('connect'); setMobileSidebarOpen(false); }} badge={isConnected ? null : 'Setup'} />

            <div style={{ height: '1px', background: 'rgba(255,255,255,0.05)', margin: '10px 4px' }} />
            <div style={{ fontSize: '9.5px', fontWeight: 700, color: 'rgba(255,255,255,0.2)', letterSpacing: '1.2px', textTransform: 'uppercase', padding: '4px 10px 6px' }}>
              Account
            </div>
            <NavItem icon={SlidersHorizontal} label="Advanced Settings" active={activeTab === 'advanced'} onClick={() => { setActiveTab('advanced'); setMobileSidebarOpen(false); }} />
            <NavItem icon={Settings} label="Settings" active={activeTab === 'settings'} onClick={() => { setActiveTab('settings'); setMobileSidebarOpen(false); }} />
            <NavItem icon={Headphones} label="Talk to Support" active={activeTab === 'support'} onClick={() => { setActiveTab('support'); setMobileSidebarOpen(false); }} />
          </nav>

          {/* User footer */}
          <div style={{ padding: '12px 10px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <div
              style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '10px 12px', borderRadius: '12px',
                background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
                cursor: 'pointer', transition: 'all 0.2s',
              }}
              onClick={handleSignOut}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(251,113,133,0.06)'; e.currentTarget.style.borderColor = 'rgba(251,113,133,0.15)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'; }}
              title="Sign Out"
            >
              <div style={{
                width: '32px', height: '32px', borderRadius: '9px', flexShrink: 0,
                background: 'var(--primary-gradient)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '14px', fontWeight: 800, color: '#000',
                boxShadow: 'var(--shadow-brand)',
              }}>{userInitial}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '12.5px', fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{userEmail}</div>
                <div style={{ fontSize: '10.5px', color: 'rgba(251,113,133,0.7)', marginTop: '1px', fontWeight: 500 }}>Sign out</div>
              </div>
              <LogOut size={14} color="rgba(251,113,133,0.4)" />
            </div>
          </div>
        </aside>

        {/* ══════ MAIN ══════ */}
        <div className="panel-main">
          {/* Topbar */}
          <header className="panel-topbar">
            {/* Mobile: Logo + hamburger side-by-side */}
            <div style={{ display: 'none', alignItems: 'center', gap: '10px' }} className="mobile-menu-btn-wrap">
              <button
                onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: '#fff',
                  cursor: 'pointer',
                  padding: '7px 8px',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  lineHeight: 1,
                  fontSize: '16px',
                  flexShrink: 0,
                }}
                aria-label="Open menu"
              >
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path d="M2 4.5h14M2 9h14M2 13.5h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
                </svg>
              </button>
              <BrandLogo variant="full" iconSize={28} />
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: 'Outfit', fontSize: '18px', fontWeight: 700, color: '#fff', letterSpacing: '-0.3px' }}>
                {tabTitles[activeTab]}
              </div>
              {!isConnected && activeTab === 'dashboard' && (
                <div style={{ fontSize: '11.5px', color: 'rgba(255,255,255,0.3)', marginTop: '1px' }}>
                  Connect a store to see your data
                </div>
              )}
              {isConnected && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '11.5px', color: 'rgba(45,212,160,0.85)', marginTop: '4px', fontWeight: 500 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--profit-color)', animation: 'live-pulse 2s ease infinite' }} />
                    {store?.store_name} — Live
                  </div>
                  <div style={{ color: 'rgba(255,255,255,0.4)', borderLeft: '1px solid rgba(255,255,255,0.2)', paddingLeft: '12px', display: 'flex', alignItems: 'center', gap: '12px', fontFamily: 'monospace', fontSize: '12px' }}>
                    <span>🕒 {currentTime?.toLocaleTimeString('en-US', { hour12: true, hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                    <span style={{ color: 'rgba(56, 189, 248, 0.8)' }}>🔄 Last Synced: {lastSyncedTime?.toLocaleTimeString('en-US', { hour12: true, hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              )}
            </div>

            {/* AI Co-Pilot CTA */}
            <div 
              onClick={() => {
                if (isConnected && store.subscription_plan === 'starter') {
                  setActiveTab('copilot-upgrade'); // Force show upgrade
                } else {
                  setCopilotOpen(true);
                }
              }}
              style={{
              display: 'flex', alignItems: 'center', gap: '7px',
              padding: '8px 16px', borderRadius: '11px',
              background: 'var(--primary-gradient)',
              color: '#000', fontWeight: 700, fontSize: '13px', cursor: 'pointer',
              boxShadow: 'var(--shadow-brand), 0 0 0 1px var(--primary-glow)',
              fontFamily: 'Outfit, sans-serif',
              transition: 'box-shadow 0.2s, transform 0.2s',
            }}
              onMouseEnter={e => { e.currentTarget.style.boxShadow = 'var(--shadow-brand-lg), 0 0 0 1px var(--primary-glow)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = 'var(--shadow-brand), 0 0 0 1px var(--primary-glow)'; e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              <Sparkles size={14} />
              Co-Pilot
            </div>
          </header>

          {/* Content */}
          <div className="panel-content">
            <Suspense fallback={<ViewLoading />}>
              {isTrialExpired && !['pricing', 'connect', 'support', 'settings'].includes(activeTab) ? (
                <TrialExpiredState onUpgradeClick={() => setActiveTab('pricing')} />
              ) : (
                <>
                  {activeTab === 'dashboard' && (
                    isConnected ? <DailyDashboard store={store} refreshTrigger={refreshTrigger} /> : <NoStoreState onConnectClick={() => setActiveTab('connect')} />
                  )}
                  {activeTab === 'sheet' && isConnected && <SheetView store={store} refreshTrigger={refreshTrigger} />}
                  
                  {['weekly', 'monthly', 'all-time', 'analytics', 'products', 'advanced', 'copilot-upgrade'].includes(activeTab) && isConnected && store?.subscription_plan === 'starter' && (
                    <ProRequiredState onUpgradeClick={() => setActiveTab('pricing')} />
                  )}

                  {activeTab === 'weekly' && isConnected && store?.subscription_plan !== 'starter' && <WeeklyView store={store} refreshTrigger={refreshTrigger} />}
                  {activeTab === 'monthly' && isConnected && store?.subscription_plan !== 'starter' && <MonthlyView store={store} refreshTrigger={refreshTrigger} />}
                  {activeTab === 'all-time' && isConnected && store?.subscription_plan !== 'starter' && <AllTimeView store={store} refreshTrigger={refreshTrigger} />}
                  {activeTab === 'analytics' && isConnected && store?.subscription_plan !== 'starter' && <BusinessAnalytics store={store} refreshTrigger={refreshTrigger} />}
                  {activeTab === 'products' && isConnected && store?.subscription_plan !== 'starter' && <ProductsView store={store} refreshTrigger={refreshTrigger} />}
                  {activeTab === 'advanced' && isConnected && store?.subscription_plan !== 'starter' && <AdvancedSettings store={store} />}

                  {['weekly', 'monthly', 'all-time', 'analytics', 'sheet', 'products', 'advanced'].includes(activeTab) && !isConnected && (
                    <NoStoreState onConnectClick={() => setActiveTab('connect')} />
                  )}
                  {activeTab === 'connect' && (
                    isConnected ? (
                      <ConnectedStorePanel
                        store={store}
                        trialDuration={trialDuration}
                        storeCreatedAt={storeCreatedAt}
                        isTrialExpired={isTrialExpired}
                        onUpgradeClick={() => setActiveTab('pricing')}
                        onStoreConnected={onStoreConnected}
                        onDisconnect={() => setActiveTab('connect')}
                        onSyncComplete={() => {
                          setLastSyncedTime(new Date());
                          setRefreshTrigger(prev => prev + 1);
                        }}
                      />
                    ) : (
                      <div style={{ maxWidth: '640px', margin: '0 auto' }}>
                        <Onboarding session={session} isEmbedded onStoreConnected={onStoreConnected} />
                      </div>
                    )
                  )}
                  {activeTab === 'pricing' && <PricingView store={store} />}
                  {activeTab === 'settings' && (
                    <ComingSoon icon={Settings} title="Settings" description="Manage your account preferences, notifications, and billing options — coming very soon." />
                  )}
                  {activeTab === 'support' && (
                    <ComingSoon icon={Headphones} title="Talk to Support" description="Live chat and priority support for all brand owners. Launching shortly — you'll be notified." />
                  )}
                </>
              )}
            </Suspense>
          </div>
        </div>
      </div>
      
      {/* Global Modals/Overlays */}
      <Suspense fallback={null}>
        <CopilotChat
          store={store}
          isOpen={copilotOpen}
          onClose={() => setCopilotOpen(false)}
        />
      </Suspense>

      {/* ── Sync Data Modal ─────────────────────────────────────────── */}
      {syncModalOpen && (
        <div
          onClick={e => e.target === e.currentTarget && setSyncModalOpen(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
        >
          <div style={{ width: '100%', maxWidth: 420, background: '#13131f', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, padding: 26, boxShadow: '0 24px 60px rgba(0,0,0,0.5)' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#fff' }}>Sync Shopify Data</h3>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 3 }}>Choose what to pull from Shopify</div>
              </div>
              <button onClick={() => setSyncModalOpen(false)} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>×</button>
            </div>

            {/* Preset options */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
              {[
                { key: 'incremental', icon: '⚡', label: 'Quick Sync', sub: 'Only new & updated orders since last sync — fastest' },
                { key: 'full',        icon: '🔄', label: 'Full Re-sync', sub: `All orders from ${store?.dashboard_features?.sync_from_date || 'store start'} to today` },
                { key: 'custom',      icon: '📅', label: 'Custom Date Range', sub: 'Pick exact from & to dates' },
              ].map(p => {
                const active = syncPreset === p.key;
                return (
                  <button
                    key={p.key}
                    onClick={() => setSyncPreset(p.key)}
                    style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '13px 16px', borderRadius: 12, cursor: 'pointer', textAlign: 'left', background: active ? 'rgba(99,102,241,0.12)' : 'rgba(255,255,255,0.03)', border: `1px solid ${active ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.07)'}`, transition: 'all 0.15s' }}
                  >
                    <span style={{ fontSize: 22, flexShrink: 0 }}>{p.icon}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: active ? '#a5b4fc' : '#e2e8f0' }}>{p.label}</div>
                      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>{p.sub}</div>
                    </div>
                    {active && <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#818cf8', flexShrink: 0 }} />}
                  </button>
                );
              })}
            </div>

            {/* Custom date pickers */}
            {syncPreset === 'custom' && (
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: 16, marginBottom: 16 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>From Date</label>
                    <input
                      type="date" value={syncFromDate} onChange={e => setSyncFromDate(e.target.value)}
                      max={syncToDate || new Date().toISOString().split('T')[0]}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: 8, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', fontSize: 13, boxSizing: 'border-box', colorScheme: 'dark' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>To Date</label>
                    <input
                      type="date" value={syncToDate} onChange={e => setSyncToDate(e.target.value)}
                      min={syncFromDate} max={new Date().toISOString().split('T')[0]}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: 8, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', fontSize: 13, boxSizing: 'border-box', colorScheme: 'dark' }}
                    />
                  </div>
                </div>
                {syncFromDate && (
                  <div style={{ marginTop: 10, fontSize: 12, color: 'rgba(52,211,153,0.9)', fontWeight: 500 }}>
                    ✓ Syncing {syncFromDate} → {syncToDate || 'today'}
                  </div>
                )}
              </div>
            )}

            {/* Confirm button */}
            <button
              onClick={() => handleManualSync({ preset: syncPreset, fromDate: syncFromDate, toDate: syncToDate })}
              disabled={syncPreset === 'custom' && !syncFromDate}
              style={{ width: '100%', padding: '13px', borderRadius: 11, border: 'none', background: (syncPreset === 'custom' && !syncFromDate) ? 'rgba(255,255,255,0.06)' : 'linear-gradient(135deg, #6366f1, #4f46e5)', color: '#fff', fontWeight: 700, fontSize: 14, cursor: (syncPreset === 'custom' && !syncFromDate) ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            >
              <RefreshCw size={15} /> Start Sync
            </button>
          </div>
        </div>
      )}

    </>
  );
}
