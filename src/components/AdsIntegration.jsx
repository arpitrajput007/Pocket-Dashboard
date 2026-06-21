import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { Megaphone, Check, Zap, Lock, ArrowRight, Info, TrendingUp } from 'lucide-react';

const fmt = (n) => '₹' + Math.round(n).toLocaleString('en-IN');

// Platforms a D2C owner typically spends on. Each maps to a key in the
// ad_costs.breakdown JSONB so the P&L (MoneyInMyPocket / DailyDashboard) picks it up.
const PLATFORMS = [
  { key: 'meta',    name: 'Meta Ads',    sub: 'Facebook & Instagram',     icon: '📘', color: '59,130,246',  placeholder: '50000' },
  { key: 'google',  name: 'Google Ads',  sub: 'Search & Shopping',        icon: '🔍', color: '234,67,53',   placeholder: '30000' },
  { key: 'youtube', name: 'YouTube Ads', sub: 'Video & Discovery',        icon: '▶️', color: '255,0,0',     placeholder: '10000' },
  { key: 'other',   name: 'Other Ads',   sub: 'Influencers, affiliates…', icon: '✨', color: '167,139,250', placeholder: '5000'  },
];

function monthBounds(year, month0) {
  const days = new Date(year, month0 + 1, 0).getDate();
  const mm = String(month0 + 1).padStart(2, '0');
  return {
    days,
    start: `${year}-${mm}-01`,
    end:   `${year}-${mm}-${String(days).padStart(2, '0')}`,
    label: new Date(year, month0, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }),
  };
}

export default function AdsIntegration({ store, onConfigured }) {
  const now = new Date();
  const [selMonth, setSelMonth] = useState(now.getMonth());   // 0-indexed
  const [selYear,  setSelYear]  = useState(now.getFullYear());
  const [spend, setSpend] = useState({ meta: '', google: '', youtube: '', other: '' });
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');
  const [notifyModal, setNotifyModal] = useState(null); // platform key for OAuth "coming soon"
  const [notifySaved, setNotifySaved] = useState({});

  const bounds = useMemo(() => monthBounds(selYear, selMonth), [selYear, selMonth]);

  // Load any previously-saved monthly estimate
  useEffect(() => {
    const df = store?.dashboard_features || {};
    setSpend({
      meta:    df.meta_ads_monthly    != null ? String(df.meta_ads_monthly)    : '',
      google:  df.google_ads_monthly  != null ? String(df.google_ads_monthly)  : '',
      youtube: df.youtube_ads_monthly != null ? String(df.youtube_ads_monthly) : '',
      other:   df.other_ads_monthly   != null ? String(df.other_ads_monthly)   : '',
    });
  }, [store?.id]);

  const totalMonthly = useMemo(
    () => PLATFORMS.reduce((s, p) => s + (parseFloat(spend[p.key]) || 0), 0),
    [spend]
  );

  // Distribute the monthly estimate evenly across the selected month's days.
  // Non-destructive: days that already have an ad_costs row are left untouched,
  // so granular daily entries from the Daily Dashboard always win.
  async function handleSave() {
    if (!store?.id) return;
    setSaving(true);
    setSavedMsg('');

    try {
      const per = {};
      PLATFORMS.forEach(p => { per[p.key] = (parseFloat(spend[p.key]) || 0) / bounds.days; });
      const perDayTotal = Object.values(per).reduce((a, b) => a + b, 0);

      // Find days that already have an entry — preserve them
      const { data: existing } = await supabase
        .from('ad_costs').select('date')
        .eq('store_id', store.id).gte('date', bounds.start).lte('date', bounds.end);
      const filled = new Set((existing || []).map(r => r.date));

      const rows = [];
      for (let d = 1; d <= bounds.days; d++) {
        const dateStr = `${bounds.start.slice(0, 8)}${String(d).padStart(2, '0')}`;
        if (filled.has(dateStr)) continue;
        rows.push({
          date: dateStr,
          store_id: store.id,
          amount: Math.round(perDayTotal * 100) / 100,
          source: 'manual_monthly',
          breakdown: {
            meta:    Math.round(per.meta    * 100) / 100,
            google:  Math.round(per.google  * 100) / 100,
            youtube: Math.round(per.youtube * 100) / 100,
            other:   Math.round(per.other   * 100) / 100,
          },
        });
      }
      if (rows.length) {
        await supabase.from('ad_costs').upsert(rows, { onConflict: 'date,store_id' });
      }

      // Persist the monthly figures + mark onboarding step complete
      const df = {
        ...(store?.dashboard_features || {}),
        meta_ads_monthly:    parseFloat(spend.meta)    || 0,
        google_ads_monthly:  parseFloat(spend.google)  || 0,
        youtube_ads_monthly: parseFloat(spend.youtube) || 0,
        other_ads_monthly:   parseFloat(spend.other)   || 0,
        ads_configured: true,
      };
      await supabase.from('stores').update({ dashboard_features: df }).eq('id', store.id);

      const skipped = bounds.days - rows.length;
      setSavedMsg(
        `✅ Applied ${fmt(totalMonthly)} across ${bounds.label}` +
        (skipped > 0 ? ` · ${skipped} day${skipped !== 1 ? 's' : ''} with existing entries kept` : '')
      );
      if (onConfigured) onConfigured();
      setTimeout(() => setSavedMsg(''), 7000);
    } catch (e) {
      setSavedMsg('❌ Could not save: ' + e.message);
    } finally {
      setSaving(false);
    }
  }

  function joinWaitlist(key) {
    setNotifySaved(prev => ({ ...prev, [key]: true }));
    // Record interest so we know which integrations to prioritise
    const df = { ...(store?.dashboard_features || {}), [`waitlist_${key}_api`]: true };
    supabase.from('stores').update({ dashboard_features: df }).eq('id', store.id);
    setTimeout(() => setNotifyModal(null), 1200);
  }

  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];

  return (
    <div style={{ animation: 'fadeInUp 0.35s ease' }}>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '5px 14px', borderRadius: 999, background: 'rgba(244,114,182,0.08)', border: '1px solid rgba(244,114,182,0.2)', marginBottom: 14 }}>
          <Megaphone size={13} color="#f472b6" />
          <span style={{ fontSize: 10.5, fontWeight: 700, color: '#f472b6', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Ad Spend Integration</span>
        </div>
        <h2 style={{ fontFamily: 'Outfit, sans-serif', fontSize: 26, fontWeight: 800, color: '#f1f5f9', margin: '0 0 6px', letterSpacing: '-0.4px' }}>
          Connect Your Ad Accounts
        </h2>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)', margin: 0, lineHeight: 1.7, maxWidth: 720 }}>
          Ad spend is usually the biggest cost for a D2C brand. Add it here and your <strong style={{ color: 'rgba(255,255,255,0.7)' }}>net profit becomes real</strong> — every dashboard, P&L and product margin will subtract what you actually spend on ads.
        </p>
      </div>

      {/* Direct API connect — the future one-click flow */}
      <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: '24px 28px', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <Zap size={17} color="#a78bfa" />
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#f1f5f9', fontFamily: 'Outfit, sans-serif' }}>One-click direct sync</h3>
          <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 6, background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.25)', color: '#fbbf24' }}>COMING SOON</span>
        </div>
        <p style={{ margin: '0 0 18px', fontSize: 13, color: 'rgba(255,255,255,0.4)', lineHeight: 1.6 }}>
          Link your ad account once and Pocket Dashboard pulls your daily spend automatically — no manual entry. We're rolling this out platform by platform. Join the list and we'll switch it on for you the moment it's live.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
          {PLATFORMS.filter(p => p.key !== 'other').map(p => {
            const joined = notifySaved[p.key];
            return (
              <button
                key={p.key}
                onClick={() => !joined && setNotifyModal(p.key)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderRadius: 14, textAlign: 'left',
                  background: `rgba(${p.color},0.05)`, border: `1px solid rgba(${p.color},0.2)`,
                  cursor: joined ? 'default' : 'pointer', transition: 'all 0.2s',
                }}
                onMouseEnter={e => { if (!joined) e.currentTarget.style.background = `rgba(${p.color},0.1)`; }}
                onMouseLeave={e => { e.currentTarget.style.background = `rgba(${p.color},0.05)`; }}
              >
                <span style={{ fontSize: 24, flexShrink: 0 }}>{p.icon}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9' }}>Connect {p.name}</div>
                  <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.35)' }}>{joined ? "✅ You're on the list" : p.sub}</div>
                </div>
                {!joined && <ArrowRight size={15} color={`rgba(${p.color},0.8)`} />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Manual monthly spend — works right now */}
      <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: '24px 28px', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Check size={17} color="#34d399" />
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#f1f5f9', fontFamily: 'Outfit, sans-serif' }}>Add your monthly spend</h3>
            <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 6, background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.25)', color: '#34d399' }}>WORKS NOW</span>
          </div>
          {/* Month selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', fontWeight: 600 }}>Apply to</span>
            <select value={selMonth} onChange={e => setSelMonth(Number(e.target.value))}
              style={{ padding: '7px 10px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.4)', color: '#fff', fontSize: 13, colorScheme: 'dark', outline: 'none', cursor: 'pointer' }}>
              {months.map((m, i) => <option key={i} value={i}>{m}</option>)}
            </select>
            <select value={selYear} onChange={e => setSelYear(Number(e.target.value))}
              style={{ padding: '7px 10px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.4)', color: '#fff', fontSize: 13, colorScheme: 'dark', outline: 'none', cursor: 'pointer' }}>
              {[selYear - 1, selYear, selYear + 1].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>
        <p style={{ margin: '0 0 18px', fontSize: 13, color: 'rgba(255,255,255,0.4)', lineHeight: 1.6 }}>
          Enter how much you spend per platform in a typical month. We'll spread it evenly across each day of <strong style={{ color: 'rgba(255,255,255,0.65)' }}>{bounds.label}</strong> so your P&L is accurate from day one.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginBottom: 18 }}>
          {PLATFORMS.map(p => (
            <div key={p.key} style={{ padding: 18, background: `rgba(${p.color},0.04)`, border: `1px solid rgba(${p.color},0.15)`, borderRadius: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 14 }}>
                <span style={{ fontSize: 20 }}>{p.icon}</span>
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: '#f1f5f9' }}>{p.name}</div>
                  <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.3)' }}>{p.sub}</div>
                </div>
              </div>
              <label style={{ display: 'block', fontSize: 10.5, fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>Monthly Spend (₹)</label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)', fontSize: 14 }}>₹</span>
                <input
                  type="number" min="0"
                  value={spend[p.key]}
                  onChange={e => setSpend(s => ({ ...s, [p.key]: e.target.value }))}
                  placeholder={p.placeholder}
                  style={{ width: '100%', padding: '10px 12px 10px 26px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.3)', color: '#fff', fontSize: 14, boxSizing: 'border-box', outline: 'none', fontFamily: 'inherit' }}
                />
              </div>
              {parseFloat(spend[p.key]) > 0 && (
                <div style={{ marginTop: 8, fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>
                  ≈ {fmt(parseFloat(spend[p.key]) / bounds.days)}/day
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Total + Save */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14, padding: '16px 20px', borderRadius: 14, background: 'rgba(244,114,182,0.05)', border: '1px solid rgba(244,114,182,0.18)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <TrendingUp size={20} color="#f472b6" />
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Total Monthly Ad Spend</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#f472b6', fontFamily: 'Outfit, sans-serif' }}>{fmt(totalMonthly)}</div>
            </div>
          </div>
          <button
            onClick={handleSave}
            disabled={saving || totalMonthly <= 0}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 26px', borderRadius: 12, border: 'none',
              background: totalMonthly > 0 ? 'linear-gradient(135deg,#ec4899,#db2777)' : 'rgba(255,255,255,0.06)',
              color: totalMonthly > 0 ? '#fff' : 'rgba(255,255,255,0.3)', fontSize: 14, fontWeight: 700, fontFamily: 'Outfit, sans-serif',
              cursor: (saving || totalMonthly <= 0) ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? 'Saving…' : <>Save &amp; Apply to P&amp;L <ArrowRight size={16} /></>}
          </button>
        </div>

        {savedMsg && (
          <div style={{ marginTop: 14, padding: '12px 16px', borderRadius: 12, fontSize: 13, background: savedMsg.startsWith('❌') ? 'rgba(251,113,133,0.08)' : 'rgba(52,211,153,0.08)', border: `1px solid ${savedMsg.startsWith('❌') ? 'rgba(251,113,133,0.2)' : 'rgba(52,211,153,0.2)'}`, color: savedMsg.startsWith('❌') ? '#fb7185' : '#34d399' }}>
            {savedMsg}
          </div>
        )}
      </div>

      {/* Tip about granular daily entry */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '14px 18px', background: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.15)', borderRadius: 14 }}>
        <Info size={17} color="#818cf8" style={{ flexShrink: 0, marginTop: 1 }} />
        <p style={{ margin: 0, fontSize: 12.5, color: 'rgba(255,255,255,0.45)', lineHeight: 1.7 }}>
          <strong style={{ color: 'rgba(255,255,255,0.7)' }}>Want exact daily numbers?</strong> The monthly figure here is an even estimate. Open the <strong style={{ color: '#a5b4fc' }}>Daily Dashboard</strong> to enter the precise spend for any specific day — those always override this estimate.
        </p>
      </div>

      {/* OAuth "coming soon" / notify modal */}
      {notifyModal && (() => {
        const p = PLATFORMS.find(x => x.key === notifyModal);
        const joined = notifySaved[notifyModal];
        return (
          <div
            onClick={e => e.target === e.currentTarget && setNotifyModal(null)}
            style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
          >
            <div style={{ width: '100%', maxWidth: 440, background: '#13131f', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, padding: 28, boxShadow: '0 24px 60px rgba(0,0,0,0.5)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <span style={{ fontSize: 32 }}>{p.icon}</span>
                <div>
                  <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#fff' }}>Connect {p.name}</h3>
                  <div style={{ fontSize: 12, color: '#fbbf24', fontWeight: 600 }}>Direct API sync — coming soon</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '14px 16px', borderRadius: 12, background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)', marginBottom: 18 }}>
                <Lock size={16} color="#818cf8" style={{ flexShrink: 0, marginTop: 1 }} />
                <p style={{ margin: 0, fontSize: 12.5, color: 'rgba(255,255,255,0.5)', lineHeight: 1.7 }}>
                  We're finishing the secure, read-only {p.name} connection. It will pull your daily spend automatically — nothing to type. Join the list and we'll email you the moment it's ready. Until then, use the monthly entry below (it works today).
                </p>
              </div>
              {joined ? (
                <div style={{ padding: '14px', borderRadius: 12, background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.25)', color: '#34d399', fontSize: 14, fontWeight: 600, textAlign: 'center' }}>
                  ✅ You're on the list — we'll be in touch!
                </div>
              ) : (
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={() => setNotifyModal(null)} style={{ flex: 1, padding: '11px', borderRadius: 10, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                    Maybe later
                  </button>
                  <button onClick={() => joinWaitlist(notifyModal)} style={{ flex: 1, padding: '11px', borderRadius: 10, background: 'linear-gradient(135deg,#6366f1,#4f46e5)', border: 'none', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                    🔔 Notify me when ready
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      <style>{`@keyframes fadeInUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}`}</style>
    </div>
  );
}
