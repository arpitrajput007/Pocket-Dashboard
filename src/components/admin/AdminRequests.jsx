import React from 'react';
import { Inbox } from 'lucide-react';

export default function AdminRequests() {
  return (
    <div>
      <div style={{ marginBottom: 22 }}>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#e2e8f0', letterSpacing: '-0.02em' }}>Custom Requests</h1>
        <p style={{ margin: '3px 0 0', fontSize: 13, color: 'rgba(226,232,240,0.4)' }}>Enterprise & custom dashboard requests</p>
      </div>

      <div style={{ padding: '40px', borderRadius: 16, background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.1)', textAlign: 'center', marginBottom: 20 }}>
        <Inbox size={32} color="rgba(139,92,246,0.35)" style={{ marginBottom: 12 }} />
        <div style={{ fontSize: 15, fontWeight: 700, color: 'rgba(226,232,240,0.4)', marginBottom: 8 }}>No Custom Requests Yet</div>
        <div style={{ fontSize: 13, color: 'rgba(226,232,240,0.3)', lineHeight: 1.8, maxWidth: 440, margin: '0 auto' }}>
          Enterprise leads and custom dashboard requests will appear here once you create a <code style={{ background: 'rgba(255,255,255,0.07)', padding: '1px 5px', borderRadius: 4, color: '#a5b4fc' }}>custom_requests</code> table or connect a CRM.
        </div>
      </div>

      <div style={{ padding: '20px 24px', borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0', marginBottom: 14 }}>To enable Custom Requests:</div>
        {[
          'Create a custom_requests table: (id, company, contact_name, email, phone, requirements, stage, created_at)',
          'Add a "Request Enterprise Demo" form on your landing page that INSERTs into this table',
          'Leads will appear here in a Kanban pipeline (New → Contacted → Proposal → Won/Lost)',
        ].map((step, i) => (
          <div key={i} style={{ display: 'flex', gap: 12, marginBottom: i < 2 ? 12 : 0 }}>
            <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: '#c4b5fd', flexShrink: 0, marginTop: 1 }}>{i + 1}</div>
            <div style={{ fontSize: 12, color: 'rgba(226,232,240,0.5)', lineHeight: 1.6 }}>{step}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
