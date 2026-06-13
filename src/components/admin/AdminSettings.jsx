import React, { useState } from 'react';
import { Settings, CreditCard, Timer, Bot, Flag, Mail, Bell, Gift, Tag, Shield, ChevronRight, Save, ToggleLeft, ToggleRight } from 'lucide-react';

const SETTINGS_SECTIONS = [
  { id: 'plans', label: 'Pricing Plans', icon: CreditCard },
  { id: 'trial', label: 'Trial Settings', icon: Timer },
  { id: 'ai', label: 'AI Limits', icon: Bot },
  { id: 'features', label: 'Feature Flags', icon: Flag },
  { id: 'emails', label: 'Email Templates', icon: Mail },
  { id: 'notifications', label: 'Notification Rules', icon: Bell },
  { id: 'coupons', label: 'Coupons & Discounts', icon: Tag },
  { id: 'roles', label: 'Admin Roles', icon: Shield },
];

const FEATURE_FLAGS = [
  { key: 'ai_copilot', label: 'AI Copilot', desc: 'Enable AI-powered Q&A for all users', enabled: true },
  { key: 'shiprocket', label: 'Shiprocket Integration', desc: 'Allow stores to connect Shiprocket for delivery tracking', enabled: true },
  { key: 'meta_ocr', label: 'Meta Ad Screenshot OCR', desc: 'Allow GPT-4o vision to extract ad spend from screenshots', enabled: true },
  { key: 'money_pocket', label: 'Money In My Pocket', desc: 'True take-home profit calculator (Pro feature)', enabled: true },
  { key: 'multi_store', label: 'Multi-Store Support', desc: 'Allow a single user to connect multiple Shopify stores (Enterprise)', enabled: false },
  { key: 'custom_branding', label: 'Custom Branding', desc: 'Allow stores to customize dashboard colors and logo (Enterprise)', enabled: false },
  { key: 'api_access', label: 'API Access', desc: 'Expose REST API for enterprise integrations', enabled: false },
  { key: 'referral', label: 'Referral Program', desc: 'Enable referral tracking and rewards', enabled: false },
];

const PLANS_CONFIG = [
  { name: 'Starter', price: 999, trial: 14, aiQueries: 50, description: 'Daily + Weekly views, basic analytics' },
  { name: 'Pro', price: 1499, trial: 14, aiQueries: 300, description: 'Full suite with AI Copilot and Money in Pocket' },
  { name: 'Enterprise', price: 4999, trial: 30, aiQueries: -1, description: 'Custom everything, priority support' },
];

const COUPONS = [
  { code: 'LAUNCH50', discount: '50%', type: 'Percentage', uses: 12, max: 50, expires: '2025-07-31', active: true },
  { code: 'FRIEND999', discount: '₹500 off', type: 'Fixed', uses: 7, max: 100, expires: '2025-12-31', active: true },
  { code: 'DIWALI30', discount: '30%', type: 'Percentage', uses: 31, max: 30, expires: '2025-11-05', active: false },
];

function Toggle({ enabled, onChange }) {
  return (
    <button onClick={() => onChange(!enabled)} style={{
      width: 38, height: 22, borderRadius: 11, border: 'none', cursor: 'pointer', padding: 0, position: 'relative',
      background: enabled ? '#6366f1' : 'rgba(255,255,255,0.1)',
      transition: 'background 0.2s',
    }}>
      <div style={{
        width: 16, height: 16, borderRadius: '50%', background: '#fff', position: 'absolute',
        top: 3, left: enabled ? 19 : 3, transition: 'left 0.2s',
        boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
      }} />
    </button>
  );
}

export default function AdminSettings() {
  const [activeSection, setActiveSection] = useState('plans');
  const [flags, setFlags] = useState(FEATURE_FLAGS);
  const [plans, setPlans] = useState(PLANS_CONFIG);
  const [trialDays, setTrialDays] = useState(14);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const toggleFlag = (key) => setFlags(prev => prev.map(f => f.key === key ? { ...f, enabled: !f.enabled } : f));

  return (
    <div>
      <div style={{ marginBottom: 22 }}>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#e2e8f0', letterSpacing: '-0.02em' }}>System Settings</h1>
        <p style={{ margin: '3px 0 0', fontSize: 13, color: 'rgba(226,232,240,0.4)' }}>Platform configuration, feature flags, and plan management</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 16 }}>
        {/* Settings nav */}
        <div style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '8px', height: 'fit-content' }}>
          {SETTINGS_SECTIONS.map(sec => {
            const active = activeSection === sec.id;
            return (
              <button key={sec.id} onClick={() => setActiveSection(sec.id)} className="admin-nav-btn" style={{
                display: 'flex', alignItems: 'center', gap: 9, width: '100%', padding: '9px 10px', borderRadius: 8,
                border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: active ? 600 : 400,
                background: active ? 'rgba(99,102,241,0.14)' : 'transparent',
                color: active ? '#a5b4fc' : 'rgba(226,232,240,0.5)',
                marginBottom: 2, textAlign: 'left', transition: 'all 0.12s',
              }}>
                <sec.icon size={13} />
                <span style={{ flex: 1 }}>{sec.label}</span>
                {active && <ChevronRight size={12} />}
              </button>
            );
          })}
        </div>

        {/* Settings content */}
        <div style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '22px 24px' }}>
          {/* Plans */}
          {activeSection === 'plans' && (
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#e2e8f0', marginBottom: 16 }}>Pricing Plans</div>
              {plans.map((plan, i) => (
                <div key={plan.name} style={{ padding: '16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f0' }}>{plan.name}</span>
                    <span style={{ fontSize: 11, color: 'rgba(226,232,240,0.4)' }}>{plan.description}</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                    {[
                      { label: 'Monthly Price (₹)', key: 'price', value: plan.price },
                      { label: 'Trial Days', key: 'trial', value: plan.trial },
                      { label: 'AI Queries/mo', key: 'aiQueries', value: plan.aiQueries === -1 ? 'Unlimited' : plan.aiQueries },
                    ].map(field => (
                      <div key={field.key}>
                        <div style={{ fontSize: 10.5, color: 'rgba(226,232,240,0.4)', marginBottom: 5, fontWeight: 500 }}>{field.label}</div>
                        <input
                          defaultValue={field.value}
                          style={{ width: '100%', padding: '7px 10px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 7, color: '#e2e8f0', fontSize: 13, fontWeight: 600, outline: 'none', boxSizing: 'border-box' }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Trial */}
          {activeSection === 'trial' && (
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#e2e8f0', marginBottom: 16 }}>Trial Configuration</div>
              {[
                { label: 'Default Trial Duration (days)', value: 14, desc: 'Applied to all new signups unless plan-specific override is set' },
                { label: 'Trial Extension Grace (days)', value: 7, desc: 'Extra days admin can grant without billing consequences' },
                { label: 'Trial Reminder — First Email (days before expiry)', value: 5, desc: 'When to send the first trial expiry warning' },
                { label: 'Trial Reminder — Final Email (days before expiry)', value: 1, desc: 'Urgent final reminder before trial ends' },
                { label: 'Post-Expiry Access Window (hours)', value: 24, desc: 'How long after expiry the user still has read-only access' },
              ].map(setting => (
                <div key={setting.label} style={{ marginBottom: 16, padding: '14px 16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 9 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0' }}>{setting.label}</span>
                    <input defaultValue={setting.value} style={{ width: 70, padding: '5px 10px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 6, color: '#e2e8f0', fontSize: 13, fontWeight: 700, outline: 'none', textAlign: 'center' }} />
                  </div>
                  <div style={{ fontSize: 11, color: 'rgba(226,232,240,0.38)' }}>{setting.desc}</div>
                </div>
              ))}
            </div>
          )}

          {/* AI Limits */}
          {activeSection === 'ai' && (
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#e2e8f0', marginBottom: 16 }}>AI Copilot Limits</div>
              {[
                { label: 'Free Plan — Monthly Queries', value: 10, desc: 'Maximum AI queries for free users' },
                { label: 'Starter Plan — Monthly Queries', value: 50, desc: 'Maximum AI queries for Starter plan' },
                { label: 'Pro Plan — Monthly Queries', value: 300, desc: 'Maximum AI queries for Pro plan' },
                { label: 'Max Tokens Per Response', value: 800, desc: 'GPT-4o max_tokens limit per response' },
                { label: 'Context Window — Days of Orders', value: 30, desc: 'How many days of order history to include in context' },
              ].map(s => (
                <div key={s.label} style={{ marginBottom: 12, padding: '14px 16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 9, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0', marginBottom: 3 }}>{s.label}</div>
                    <div style={{ fontSize: 11, color: 'rgba(226,232,240,0.38)' }}>{s.desc}</div>
                  </div>
                  <input defaultValue={s.value} style={{ width: 80, padding: '6px 10px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 6, color: '#e2e8f0', fontSize: 13, fontWeight: 700, outline: 'none', textAlign: 'center' }} />
                </div>
              ))}
            </div>
          )}

          {/* Feature Flags */}
          {activeSection === 'features' && (
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#e2e8f0', marginBottom: 16 }}>Feature Flags</div>
              {flags.map(flag => (
                <div key={flag.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 9, marginBottom: 8 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0', marginBottom: 2 }}>{flag.label}</div>
                    <div style={{ fontSize: 11, color: 'rgba(226,232,240,0.38)' }}>{flag.desc}</div>
                  </div>
                  <Toggle enabled={flag.enabled} onChange={() => toggleFlag(flag.key)} />
                </div>
              ))}
            </div>
          )}

          {/* Coupons */}
          {activeSection === 'coupons' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: '#e2e8f0' }}>Discount Coupons</span>
                <button style={{ padding: '6px 14px', borderRadius: 7, background: 'rgba(99,102,241,0.18)', border: '1px solid rgba(99,102,241,0.3)', color: '#a5b4fc', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>+ New Coupon</button>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                    {['Code', 'Discount', 'Uses', 'Expires', 'Status'].map(h => (
                      <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 10.5, fontWeight: 700, color: 'rgba(226,232,240,0.3)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {COUPONS.map((c, i) => (
                    <tr key={i} className="admin-row" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background 0.12s' }}>
                      <td style={{ padding: '10px 12px', fontFamily: 'monospace', fontSize: 13, fontWeight: 700, color: '#a5b4fc' }}>{c.code}</td>
                      <td style={{ padding: '10px 12px', fontSize: 13, fontWeight: 600, color: '#10b981' }}>{c.discount}</td>
                      <td style={{ padding: '10px 12px', fontSize: 12, color: 'rgba(226,232,240,0.55)' }}>{c.uses} / {c.max}</td>
                      <td style={{ padding: '10px 12px', fontSize: 12, color: 'rgba(226,232,240,0.55)' }}>{c.expires}</td>
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 5, fontWeight: 700,
                          background: c.active ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                          border: `1px solid ${c.active ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`,
                          color: c.active ? '#10b981' : '#f87171',
                        }}>{c.active ? 'Active' : 'Expired'}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Default for other sections */}
          {!['plans','trial','ai','features','coupons'].includes(activeSection) && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 300, color: 'rgba(226,232,240,0.3)' }}>
              <Settings size={32} style={{ marginBottom: 12 }} />
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>{SETTINGS_SECTIONS.find(s => s.id === activeSection)?.label}</div>
              <div style={{ fontSize: 12 }}>Configuration panel coming soon</div>
            </div>
          )}

          {/* Save button */}
          <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={handleSave} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '9px 20px', borderRadius: 9,
              background: saved ? 'rgba(16,185,129,0.2)' : 'rgba(99,102,241,0.2)',
              border: `1px solid ${saved ? 'rgba(16,185,129,0.35)' : 'rgba(99,102,241,0.35)'}`,
              color: saved ? '#10b981' : '#a5b4fc', fontSize: 13, fontWeight: 700, cursor: 'pointer',
            }}>
              <Save size={14} />
              {saved ? 'Saved!' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
