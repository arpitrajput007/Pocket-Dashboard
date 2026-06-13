import React, { useState } from 'react';
import { Timer, AlertTriangle, CheckCircle, XCircle, Send, Clock, Zap, ShoppingBag } from 'lucide-react';

const TRIAL_USERS = [
  { store: 'Bamboo Living Co', email: 'ritesh@bambooliving.in', started: '2025-05-28', daysLeft: 6, shopify: true, usedDashboard: true, onboardingPct: 75, lastLogin: '1 hr ago', segment: 'active' },
  { store: 'Velvet Dreams Saree', email: 'meera@velvetdreams.in', started: '2025-06-01', daysLeft: 10, shopify: true, usedDashboard: true, onboardingPct: 60, lastLogin: '3 hr ago', segment: 'active' },
  { store: 'EcoWrap India', email: 'sid@ecowrap.in', started: '2025-06-05', daysLeft: 14, shopify: true, usedDashboard: false, onboardingPct: 40, lastLogin: '1 day ago', segment: 'at_risk' },
  { store: 'ZenCraft Wellness', email: 'pooja@zencraft.in', started: '2025-05-22', daysLeft: 2, shopify: false, usedDashboard: false, onboardingPct: 20, lastLogin: '4 days ago', segment: 'cold' },
  { store: 'PureLeaf Organics', email: 'ananya@pureleaf.in', started: '2025-06-11', daysLeft: 20, shopify: false, usedDashboard: false, onboardingPct: 10, lastLogin: 'just now', segment: 'new' },
  { store: 'Sacred Seeds Co', email: 'rahul@sacredseeds.in', started: '2025-05-29', daysLeft: 3, shopify: true, usedDashboard: true, onboardingPct: 80, lastLogin: '2 hr ago', segment: 'hot' },
  { store: 'Artisan Spice Lab', email: 'kavya@artisanspice.in', started: '2025-06-03', daysLeft: 12, shopify: false, usedDashboard: false, onboardingPct: 15, lastLogin: '3 days ago', segment: 'cold' },
];

const SEGMENT_CONFIG = {
  hot:      { label: '🔥 Hot Lead',     bg: 'rgba(239,68,68,0.1)',    border: 'rgba(239,68,68,0.2)',    text: '#f87171' },
  active:   { label: '✅ Active',        bg: 'rgba(16,185,129,0.1)',   border: 'rgba(16,185,129,0.2)',   text: '#34d399' },
  at_risk:  { label: '⚠️ At Risk',       bg: 'rgba(245,158,11,0.1)',   border: 'rgba(245,158,11,0.2)',   text: '#fbbf24' },
  cold:     { label: '🧊 Cold',          bg: 'rgba(99,102,241,0.08)',  border: 'rgba(99,102,241,0.18)',  text: '#a5b4fc' },
  new:      { label: '✨ New',           bg: 'rgba(59,130,246,0.1)',   border: 'rgba(59,130,246,0.2)',   text: '#93c5fd' },
};

const PIPELINE_STAGES = [
  { id: 'never_connected', label: 'Never Connected Shopify', count: 3, color: '#ef4444', desc: 'Registered but Shopify not linked' },
  { id: 'connected_no_use', label: 'Connected, Never Used', count: 1, color: '#f59e0b', desc: 'Shopify connected but no dashboard activity' },
  { id: 'expiring_3d', label: 'Expiring in 3 Days', count: 2, color: '#8b5cf6', desc: 'Needs immediate attention' },
  { id: 'active', label: 'Actively Using', count: 3, color: '#10b981', desc: 'High engagement — prime conversion targets' },
];

export default function AdminTrials() {
  const [filter, setFilter] = useState('all');

  const filtered = filter === 'all' ? TRIAL_USERS : TRIAL_USERS.filter(u => u.segment === filter);

  const expiring = TRIAL_USERS.filter(u => u.daysLeft <= 3).length;
  const noShopify = TRIAL_USERS.filter(u => !u.shopify).length;
  const noDashboard = TRIAL_USERS.filter(u => !u.usedDashboard).length;
  const total = TRIAL_USERS.length;

  return (
    <div>
      <div style={{ marginBottom: 22 }}>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#e2e8f0', letterSpacing: '-0.02em' }}>Trial Management</h1>
        <p style={{ margin: '3px 0 0', fontSize: 13, color: 'rgba(226,232,240,0.4)' }}>Monitor trial users, conversion signals, and engagement health</p>
      </div>

      {/* Alert cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Total Trial Users', value: total, icon: Timer, color: '#6366f1' },
          { label: 'Expiring in 3 Days', value: expiring, icon: AlertTriangle, color: '#ef4444' },
          { label: 'Never Used Dashboard', value: noDashboard, icon: XCircle, color: '#f59e0b' },
          { label: 'Never Connected Shopify', value: noShopify, icon: ShoppingBag, color: '#8b5cf6' },
        ].map(card => (
          <div key={card.label} className="admin-card" style={{
            padding: '14px 16px', borderRadius: 12,
            background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', transition: 'all 0.18s',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div style={{ width: 30, height: 30, borderRadius: 8, background: `${card.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <card.icon size={14} color={card.color} />
              </div>
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: card.color, lineHeight: 1, marginBottom: 4 }}>{card.value}</div>
            <div style={{ fontSize: 11, color: 'rgba(226,232,240,0.4)' }}>{card.label}</div>
          </div>
        ))}
      </div>

      {/* Pipeline stages */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 20 }}>
        {PIPELINE_STAGES.map(stage => (
          <div key={stage.id} style={{ padding: '14px 16px', borderRadius: 12, background: 'rgba(255,255,255,0.02)', border: `1px solid ${stage.color}22`, position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: stage.color, opacity: 0.6 }} />
            <div style={{ fontSize: 24, fontWeight: 800, color: stage.color, marginBottom: 4 }}>{stage.count}</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#e2e8f0', marginBottom: 3 }}>{stage.label}</div>
            <div style={{ fontSize: 11, color: 'rgba(226,232,240,0.35)' }}>{stage.desc}</div>
          </div>
        ))}
      </div>

      {/* Filter row */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        {['all', 'hot', 'active', 'at_risk', 'cold', 'new'].map(seg => {
          const sc = SEGMENT_CONFIG[seg];
          return (
            <button key={seg} onClick={() => setFilter(seg)} style={{
              padding: '6px 12px', borderRadius: 7, fontSize: 12, cursor: 'pointer', fontWeight: 500,
              background: filter === seg ? (seg === 'all' ? 'rgba(99,102,241,0.18)' : sc.bg) : 'rgba(255,255,255,0.04)',
              border: `1px solid ${filter === seg ? (seg === 'all' ? 'rgba(99,102,241,0.3)' : sc.border) : 'rgba(255,255,255,0.08)'}`,
              color: filter === seg ? (seg === 'all' ? '#a5b4fc' : sc.text) : 'rgba(226,232,240,0.45)',
            }}>{seg === 'all' ? 'All Trials' : sc.label}</button>
          );
        })}
      </div>

      {/* Trial users table */}
      <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              {['Store', 'Segment', 'Days Left', 'Shopify', 'Used Dashboard', 'Onboarding', 'Last Login', 'Actions'].map(h => (
                <th key={h} style={{ padding: '11px 14px', textAlign: 'left', fontSize: 10.5, fontWeight: 700, color: 'rgba(226,232,240,0.35)', textTransform: 'uppercase', letterSpacing: '0.07em', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((user, i) => {
              const seg = SEGMENT_CONFIG[user.segment];
              return (
                <tr key={i} className="admin-row" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background 0.12s' }}>
                  <td style={{ padding: '11px 14px' }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0' }}>{user.store}</div>
                    <div style={{ fontSize: 11, color: 'rgba(226,232,240,0.38)' }}>{user.email}</div>
                  </td>
                  <td style={{ padding: '11px 14px' }}>
                    <span style={{ fontSize: 10.5, padding: '2px 7px', borderRadius: 5, fontWeight: 600, background: seg.bg, border: `1px solid ${seg.border}`, color: seg.text }}>{seg.label}</span>
                  </td>
                  <td style={{ padding: '11px 14px' }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: user.daysLeft <= 3 ? '#f87171' : user.daysLeft <= 7 ? '#fbbf24' : '#e2e8f0' }}>
                      {user.daysLeft}d
                    </span>
                  </td>
                  <td style={{ padding: '11px 14px' }}>
                    {user.shopify ? <CheckCircle size={14} color="#10b981" /> : <XCircle size={14} color="#ef4444" />}
                  </td>
                  <td style={{ padding: '11px 14px' }}>
                    {user.usedDashboard ? <CheckCircle size={14} color="#10b981" /> : <XCircle size={14} color="#ef4444" />}
                  </td>
                  <td style={{ padding: '11px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <div style={{ flex: 1, maxWidth: 80, height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${user.onboardingPct}%`, background: user.onboardingPct >= 70 ? '#10b981' : user.onboardingPct >= 40 ? '#f59e0b' : '#ef4444', borderRadius: 4 }} />
                      </div>
                      <span style={{ fontSize: 11, color: 'rgba(226,232,240,0.4)', minWidth: 28 }}>{user.onboardingPct}%</span>
                    </div>
                  </td>
                  <td style={{ padding: '11px 14px', fontSize: 11, color: 'rgba(226,232,240,0.45)' }}>{user.lastLogin}</td>
                  <td style={{ padding: '11px 14px' }}>
                    <div style={{ display: 'flex', gap: 5 }}>
                      {[{ label: 'Remind', icon: Send, color: '#6366f1' }, { label: 'Extend', icon: Clock, color: '#10b981' }, { label: 'Discount', icon: Zap, color: '#f59e0b' }].map(a => (
                        <button key={a.label} title={a.label} className="admin-action-btn" style={{
                          background: `${a.color}12`, border: 'none', borderRadius: 6, padding: '5px 7px',
                          cursor: 'pointer', color: a.color, opacity: 0.7, display: 'flex', alignItems: 'center', gap: 4, fontSize: 11,
                        }}>
                          <a.icon size={11} />
                        </button>
                      ))}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
