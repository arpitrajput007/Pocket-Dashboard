import React, { useState } from 'react';
import { ArrowLeft, MessageSquare, Zap, BarChart3, Package, Eye, EyeOff } from 'lucide-react';
import BrandLogo from './BrandLogo';

// Mock store data for demo
const DEMO_STORE = {
  id: 'demo_store_123',
  store_name: 'Demo Store — TechFlow Innovations',
  shopify_domain: 'demo-store.myshopify.com',
  primary_color: '#6366f1',
  plan_type: 'pro',
  created_at: '2024-03-15T10:30:00Z',
  last_synced_at: new Date(Date.now() - 300000).toISOString(),
  shopify_connected: true,
  shiprocket_connected: true,
  enabled_ad_platforms: ['meta'],
  is_active: true,
};

const DEMO_METRICS = {
  totalOrders: 2847,
  totalRevenue: 845230,
  conversionRate: 3.24,
  avgOrderValue: 297,
  lastMonthOrders: 342,
  lastMonthRevenue: 101540,
  shiprocketOrdersPending: 45,
  shiprocketOrdersDelivered: 2156,
  newProductsMonth: 28,
};

export default function DemoPage() {
  const [showNotice, setShowNotice] = useState(true);
  const [aiMessage, setAiMessage] = useState('');

  return (
    <div style={{ minHeight: '100vh', background: '#07070e', color: '#e2e8f0', fontFamily: 'Outfit, sans-serif', display: 'flex', flexDirection: 'column' }}>
      {/* Demo Notice Banner */}
      {showNotice && (
        <div style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 13, color: 'rgba(226,232,240,0.7)' }}>
            🎮 <strong style={{ color: '#a5b4fc' }}>DEMO MODE</strong> — Try all features with sample data. Buttons work but no data is saved.
          </div>
          <button onClick={() => setShowNotice(false)} style={{ background: 'none', border: 'none', color: 'rgba(226,232,240,0.4)', cursor: 'pointer', fontSize: 16 }}>×</button>
        </div>
      )}

      {/* Header */}
      <header style={{ padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <a href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none', color: '#e2e8f0' }}>
          <ArrowLeft size={18} />
          <span style={{ fontSize: 14 }}>Back to Home</span>
        </a>
        <BrandLogo variant="compact" iconSize={24} />
        <div style={{ width: 100 }} /> {/* Spacer */}
      </header>

      {/* Main Demo Dashboard */}
      <div style={{ flex: 1, padding: '32px 24px', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
        <div style={{ marginBottom: 40 }}>
          <h1 style={{ margin: 0, fontSize: 32, fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 8 }}>
            {DEMO_STORE.store_name}
          </h1>
          <p style={{ margin: 0, fontSize: 14, color: 'rgba(226,232,240,0.5)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981' }} />
            Pro Plan • Shopify Connected • Last synced 5 min ago
          </p>
        </div>

        {/* KPI Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}>
          {[
            { label: 'Total Orders', value: DEMO_METRICS.totalOrders.toLocaleString(), icon: '📦', trend: '+12.4%' },
            { label: 'Total Revenue', value: `₹${(DEMO_METRICS.totalRevenue / 100000).toFixed(1)}L`, icon: '💰', trend: '+8.7%' },
            { label: 'Conversion Rate', value: `${DEMO_METRICS.conversionRate.toFixed(2)}%`, icon: '📈', trend: '+0.3%' },
            { label: 'Avg Order Value', value: `₹${DEMO_METRICS.avgOrderValue}`, icon: '📊', trend: '+5.2%' },
          ].map((m, i) => (
            <div key={i} style={{ padding: '20px', borderRadius: 14, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer', transition: 'all 0.2s', position: 'relative', overflow: 'hidden' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.07)'} onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: '#6366f1', opacity: 0.6 }} />
              <div style={{ fontSize: 24, marginBottom: 8 }}>{m.icon}</div>
              <div style={{ fontSize: 26, fontWeight: 800, marginBottom: 4, letterSpacing: '-0.02em' }}>{m.value}</div>
              <div style={{ fontSize: 12, color: 'rgba(226,232,240,0.5)', marginBottom: 6 }}>{m.label}</div>
              <div style={{ fontSize: 11, color: '#10b981', fontWeight: 600 }}>{m.trend} vs last month</div>
            </div>
          ))}
        </div>

        {/* Features Demo Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 32 }}>
          {/* AI Copilot Demo */}
          <div style={{ padding: '24px', borderRadius: 14, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <Zap size={18} color="#a5b4fc" />
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Try AI Copilot</h2>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                '📊 "Show me top products by revenue"',
                '🎯 "Customers from which city buy most?"',
                '💡 "What can I do to increase AOV?"',
              ].map((q, i) => (
                <button key={i} onClick={() => setAiMessage(`Response to: "${q}"\n\n✨ [Demo mode — imagine AI response here]`)} style={{ padding: '10px 12px', borderRadius: 8, background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)', color: '#a5b4fc', fontSize: 12, cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(99,102,241,0.18)'} onMouseLeave={e => e.currentTarget.style.background = 'rgba(99,102,241,0.12)'}>
                  {q}
                </button>
              ))}
              {aiMessage && (
                <div style={{ marginTop: 8, padding: '12px', borderRadius: 8, background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', fontSize: 12, color: 'rgba(226,232,240,0.7)', whiteSpace: 'pre-wrap' }}>
                  {aiMessage}
                </div>
              )}
            </div>
          </div>

          {/* More Features Demo */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              { icon: '🚀', label: 'Analytics Dashboard', desc: 'Real-time order & revenue insights' },
              { icon: '📱', label: 'Product Manager', desc: 'Sync & manage your Shopify products' },
              { icon: '🎨', label: 'Ad Performance', desc: 'Meta & Google Ads campaign tracking' },
              { icon: '🚚', label: 'Shiprocket Sync', desc: 'Real-time shipment & tracking updates' },
            ].map((f, i) => (
              <button key={i} onClick={() => alert(`Demo: ${f.label}\n\n${f.desc}`)} style={{ padding: '16px 12px', borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#e2e8f0', textAlign: 'left', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: 12 }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.07)'} onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}>
                <span style={{ fontSize: 20 }}>{f.icon}</span>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{f.label}</div>
                  <div style={{ fontSize: 11, color: 'rgba(226,232,240,0.4)' }}>{f.desc}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div style={{ padding: '24px', borderRadius: 14, background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', textAlign: 'center' }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Ready to get started?</h3>
          <p style={{ margin: '0 0 16px', fontSize: 14, color: 'rgba(226,232,240,0.6)' }}>Create your account and connect your Shopify store in minutes.</p>
          <a href="/signup" style={{ display: 'inline-block', padding: '12px 28px', borderRadius: 10, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: '#000', fontWeight: 700, fontSize: 14, textDecoration: 'none', cursor: 'pointer' }}>
            Start Free for 3 Months →
          </a>
        </div>
      </div>
    </div>
  );
}
