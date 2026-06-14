import React from 'react';
import { Bot, Zap } from 'lucide-react';

export default function AdminAI() {
  return (
    <div>
      <div style={{ marginBottom: 22 }}>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#e2e8f0', letterSpacing: '-0.02em' }}>AI Copilot Analytics</h1>
        <p style={{ margin: '3px 0 0', fontSize: 13, color: 'rgba(226,232,240,0.4)' }}>OpenAI usage & costs — requires query logging</p>
      </div>

      <div style={{ padding: '32px', borderRadius: 16, background: 'rgba(99,102,241,0.06)', border: '1px dashed rgba(99,102,241,0.25)', marginBottom: 20, textAlign: 'center' }}>
        <Bot size={32} color="rgba(99,102,241,0.35)" style={{ marginBottom: 12 }} />
        <div style={{ fontSize: 28, fontWeight: 800, color: 'rgba(226,232,240,0.18)', marginBottom: 8 }}>0 queries</div>
        <div style={{ fontSize: 15, fontWeight: 700, color: 'rgba(226,232,240,0.45)', marginBottom: 10 }}>AI Queries Logged</div>
        <div style={{ fontSize: 13, color: 'rgba(226,232,240,0.35)', lineHeight: 1.8, maxWidth: 480, margin: '0 auto' }}>
          AI usage tracking requires an <strong style={{ color: 'rgba(226,232,240,0.55)' }}>ai_queries</strong> table in Supabase. Each time a user asks the AI Copilot a question, log the query, tokens used, cost, and store_id. Charts and cost breakdown will appear here automatically.
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 20 }}>
        {['Total Queries', 'Queries Today', 'Avg / User', 'OpenAI Cost', 'Avg Response Time'].map((label, i) => (
          <div key={i} style={{ padding: '16px', borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', textAlign: 'center' }}>
            <Zap size={13} color="rgba(99,102,241,0.35)" style={{ marginBottom: 8 }} />
            <div style={{ fontSize: 20, fontWeight: 800, color: 'rgba(226,232,240,0.18)', marginBottom: 4 }}>—</div>
            <div style={{ fontSize: 11, color: 'rgba(226,232,240,0.28)' }}>{label}</div>
          </div>
        ))}
      </div>

      <div style={{ padding: '20px 24px', borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0', marginBottom: 14 }}>To enable AI Analytics:</div>
        {[
          'Create an ai_queries table: (id, store_id, question, tokens_used, cost_usd, response_ms, created_at)',
          'In your AI endpoint on the backend, INSERT a row after each OpenAI call',
          'The admin panel will automatically show query volume, costs, top questions, and per-store usage',
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
