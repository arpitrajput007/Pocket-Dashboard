import React from 'react';
import { Headphones } from 'lucide-react';

export default function AdminSupport() {
  return (
    <div>
      <div style={{ marginBottom: 22 }}>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#e2e8f0', letterSpacing: '-0.02em' }}>Support Tickets</h1>
        <p style={{ margin: '3px 0 0', fontSize: 13, color: 'rgba(226,232,240,0.4)' }}>Customer support — requires a ticketing table</p>
      </div>

      <div style={{ padding: '40px', borderRadius: 16, background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.1)', textAlign: 'center', marginBottom: 20 }}>
        <Headphones size={32} color="rgba(99,102,241,0.35)" style={{ marginBottom: 12 }} />
        <div style={{ fontSize: 15, fontWeight: 700, color: 'rgba(226,232,240,0.4)', marginBottom: 8 }}>No Support Tickets Yet</div>
        <div style={{ fontSize: 13, color: 'rgba(226,232,240,0.3)', lineHeight: 1.8, maxWidth: 440, margin: '0 auto' }}>
          Create a <code style={{ background: 'rgba(255,255,255,0.07)', padding: '1px 5px', borderRadius: 4, color: '#a5b4fc' }}>support_tickets</code> table in Supabase or connect an external helpdesk (Freshdesk, Intercom, etc.) to show real tickets here.
        </div>
      </div>

      <div style={{ padding: '20px 24px', borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0', marginBottom: 14 }}>To enable Support Tickets:</div>
        {[
          'Create a support_tickets table: (id, store_id, subject, body, priority, status, created_at)',
          'Add a "Contact Support" button in the user dashboard that INSERTs a ticket row',
          'Tickets will appear here grouped by priority (high/medium/low) with reply functionality',
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
