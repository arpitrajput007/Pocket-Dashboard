import React from 'react';
import { TrendingUp } from 'lucide-react';

export default function AdminMarketing() {
  return (
    <div>
      <div style={{ marginBottom: 22 }}>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#e2e8f0', letterSpacing: '-0.02em' }}>Marketing Analytics</h1>
        <p style={{ margin: '3px 0 0', fontSize: 13, color: 'rgba(226,232,240,0.4)' }}>Acquisition funnel, CAC & channel performance</p>
      </div>

      <div style={{ padding: '40px', borderRadius: 16, background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.1)', textAlign: 'center', marginBottom: 20 }}>
        <TrendingUp size={32} color="rgba(16,185,129,0.35)" style={{ marginBottom: 12 }} />
        <div style={{ fontSize: 15, fontWeight: 700, color: 'rgba(226,232,240,0.4)', marginBottom: 8 }}>No Marketing Data Yet</div>
        <div style={{ fontSize: 13, color: 'rgba(226,232,240,0.3)', lineHeight: 1.8, maxWidth: 480, margin: '0 auto' }}>
          Signup source tracking, UTM parameters, CAC by channel, and funnel conversion rates will appear here once you add UTM tracking to your signup flow and store the source in Supabase.
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={{ padding: '20px 24px', borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0', marginBottom: 14 }}>To enable Acquisition Tracking:</div>
          {[
            'Add signup_source and utm_campaign columns to the stores table',
            'Pass UTM params from landing page → signup URL → store INSERT',
            'Channel breakdown (Organic / Google / Meta / Referral) will auto-populate',
          ].map((step, i) => (
            <div key={i} style={{ display: 'flex', gap: 12, marginBottom: i < 2 ? 12 : 0 }}>
              <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: '#6ee7b7', flexShrink: 0, marginTop: 1 }}>{i + 1}</div>
              <div style={{ fontSize: 12, color: 'rgba(226,232,240,0.5)', lineHeight: 1.6 }}>{step}</div>
            </div>
          ))}
        </div>

        <div style={{ padding: '20px 24px', borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0', marginBottom: 14 }}>To enable CAC Tracking:</div>
          {[
            'Create an ad_spend table: (channel, spend_inr, month, created_at)',
            'Log monthly ad spend per channel (Google, Meta, etc.)',
            'CAC = total spend ÷ new paid customers for that month — auto-computed here',
          ].map((step, i) => (
            <div key={i} style={{ display: 'flex', gap: 12, marginBottom: i < 2 ? 12 : 0 }}>
              <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: '#6ee7b7', flexShrink: 0, marginTop: 1 }}>{i + 1}</div>
              <div style={{ fontSize: 12, color: 'rgba(226,232,240,0.5)', lineHeight: 1.6 }}>{step}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
