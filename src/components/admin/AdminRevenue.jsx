import React from 'react';
import { DollarSign, TrendingUp, CreditCard, BarChart3 } from 'lucide-react';

export default function AdminRevenue() {
  const metrics = [
    { label: 'MRR', desc: 'Monthly Recurring Revenue' },
    { label: 'ARR', desc: 'Annual Recurring Revenue' },
    { label: 'NRR', desc: 'Net Revenue Retention' },
    { label: 'LTV', desc: 'Customer Lifetime Value' },
    { label: 'Churn', desc: 'Monthly Churn Rate' },
    { label: 'ARPU', desc: 'Avg Revenue Per User' },
  ];

  return (
    <div>
      <div style={{ marginBottom: 22 }}>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#e2e8f0', letterSpacing: '-0.02em' }}>Revenue</h1>
        <p style={{ margin: '3px 0 0', fontSize: 13, color: 'rgba(226,232,240,0.4)' }}>SaaS revenue metrics — requires billing setup</p>
      </div>

      {/* Main callout */}
      <div style={{ padding: '32px', borderRadius: 16, background: 'rgba(99,102,241,0.06)', border: '1px dashed rgba(99,102,241,0.25)', marginBottom: 20, textAlign: 'center' }}>
        <DollarSign size={32} color="rgba(99,102,241,0.35)" style={{ marginBottom: 12 }} />
        <div style={{ fontSize: 40, fontWeight: 800, color: 'rgba(226,232,240,0.15)', letterSpacing: '-0.03em', marginBottom: 8 }}>₹0</div>
        <div style={{ fontSize: 15, fontWeight: 700, color: 'rgba(226,232,240,0.45)', marginBottom: 10 }}>Monthly Recurring Revenue</div>
        <div style={{ fontSize: 13, color: 'rgba(226,232,240,0.35)', lineHeight: 1.8, maxWidth: 480, margin: '0 auto' }}>
          Revenue tracking requires a <strong style={{ color: 'rgba(226,232,240,0.55)' }}>subscriptions</strong> or <strong style={{ color: 'rgba(226,232,240,0.55)' }}>payments</strong> table in Supabase, connected to a payment provider like <strong style={{ color: 'rgba(226,232,240,0.55)' }}>Razorpay</strong> or <strong style={{ color: 'rgba(226,232,240,0.55)' }}>Stripe</strong>. Once set up, MRR, ARR, churn, LTV and waterfall charts will appear here automatically.
        </div>
      </div>

      {/* Placeholder metric grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
        {metrics.map((m, i) => (
          <div key={i} style={{ padding: '20px', borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', textAlign: 'center' }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: 'rgba(226,232,240,0.18)', letterSpacing: '-0.02em', marginBottom: 6 }}>—</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(226,232,240,0.4)', marginBottom: 3 }}>{m.label}</div>
            <div style={{ fontSize: 11, color: 'rgba(226,232,240,0.25)' }}>{m.desc}</div>
          </div>
        ))}
      </div>

      {/* Steps to enable */}
      <div style={{ padding: '20px 24px', borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0', marginBottom: 14 }}>To enable Revenue tracking:</div>
        {[
          'Add a subscriptions table in Supabase (store_id, plan, amount, status, created_at)',
          'Connect Razorpay or Stripe and write payments to that table on each charge',
          'The backend /api/admin/revenue endpoint will automatically compute MRR, ARR, churn & LTV',
        ].map((step, i) => (
          <div key={i} style={{ display: 'flex', gap: 12, marginBottom: i < 2 ? 12 : 0 }}>
            <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: '#a5b4fc', flexShrink: 0, marginTop: 1 }}>{i + 1}</div>
            <div style={{ fontSize: 12, color: 'rgba(226,232,240,0.5)', lineHeight: 1.6 }}>{step}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
