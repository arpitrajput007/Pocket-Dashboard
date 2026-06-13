import React, { useState } from 'react';
import { Inbox, Circle, CheckCircle2, X, Phone, Mail, Package, StickyNote } from 'lucide-react';

const REQUESTS = [
  { id: 'REQ-007', company: 'Fabindia Pvt Ltd', contact: 'Rohan Kapoor', email: 'rohan.kapoor@fabindia.com', phone: '+91 98110 22334', orders: '50,000+/mo', requirements: 'Full P&L dashboard, team access for 5 users, custom branding, advanced RTO analysis, automated reports.', status: 'In Discussion', created: '2025-06-10', notes: 'Large enterprise lead. CEO interested in pilot. Schedule a call.', value: '₹9,999/mo' },
  { id: 'REQ-006', company: 'WoW Momos', contact: 'Sagar Daryani', email: 'sagar@wowmomos.in', phone: '+91 87001 12345', orders: '20,000+/mo', requirements: 'Multi-outlet reporting, delivery partner integration, franchise performance tracking.', status: 'Proposal Sent', created: '2025-06-07', notes: 'Custom proposal sent on Jun 8. Waiting for approval.', value: '₹14,999/mo' },
  { id: 'REQ-005', company: 'The Moms Co', contact: 'Malika Sadani', email: 'malika@themomsco.com', phone: '+91 76543 00987', orders: '30,000+/mo', requirements: 'Product-level attribution, meta + google combined ROAS, subscription tracking.', status: 'Contacted', created: '2025-06-05', notes: 'Had intro call. Very interested. Follow up on Jun 15.', value: '₹12,499/mo' },
  { id: 'REQ-004', company: 'Mamaearth', contact: 'Ghazal Alagh', email: 'ghazal@mamaearth.in', phone: '+91 65432 11223', orders: '1,00,000+/mo', requirements: 'Enterprise dashboard with real-time inventory, returns analytics, influencer tracking.', status: 'New', created: '2025-06-12', notes: '', value: 'TBD' },
  { id: 'REQ-003', company: 'Boat Lifestyle', contact: 'Aman Gupta', email: 'aman@boat-lifestyle.in', phone: '+91 54321 99887', orders: '2,00,000+/mo', requirements: 'Full financial OS — multi-channel revenue tracking, margins, category breakdown.', status: 'Won', created: '2025-05-20', notes: 'Signed contract. Onboarding in progress.', value: '₹49,999/mo' },
  { id: 'REQ-002', company: 'Noise', contact: 'Gaurav Khatri', email: 'gaurav@gonoise.com', phone: '+91 43210 77665', orders: '80,000+/mo', requirements: 'Custom analytics for smart devices — product category performance, return rates by SKU.', status: 'Lost', created: '2025-05-10', notes: 'Went with a competitor. Too expensive for them.', value: '—' },
];

const STAGE_COLORS = {
  'New':           { bg: 'rgba(59,130,246,0.1)',   border: 'rgba(59,130,246,0.2)',   text: '#93c5fd' },
  'Contacted':     { bg: 'rgba(99,102,241,0.1)',   border: 'rgba(99,102,241,0.2)',   text: '#a5b4fc' },
  'In Discussion': { bg: 'rgba(245,158,11,0.1)',   border: 'rgba(245,158,11,0.2)',   text: '#fbbf24' },
  'Proposal Sent': { bg: 'rgba(139,92,246,0.1)',   border: 'rgba(139,92,246,0.22)',  text: '#c4b5fd' },
  'Won':           { bg: 'rgba(16,185,129,0.1)',   border: 'rgba(16,185,129,0.2)',   text: '#34d399' },
  'Lost':          { bg: 'rgba(239,68,68,0.08)',   border: 'rgba(239,68,68,0.18)',   text: '#f87171' },
};

const STAGES = ['New', 'Contacted', 'In Discussion', 'Proposal Sent', 'Won', 'Lost'];

function RequestModal({ req, onClose }) {
  const [note, setNote] = useState(req.notes || '');
  if (!req) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ width: 580, background: '#0e0e1e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, overflow: 'hidden', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 11, color: 'rgba(226,232,240,0.35)', marginBottom: 2 }}>{req.id}</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#e2e8f0' }}>{req.company}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(226,232,240,0.4)' }}><X size={18} /></button>
        </div>
        <div style={{ padding: '18px 20px', flex: 1, overflowY: 'auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
            {[['Contact', req.contact], ['Email', req.email], ['Phone', req.phone], ['Monthly Orders', req.orders], ['Status', null], ['Target Value', req.value]].map(([k, v]) => (
              <div key={k} style={{ padding: '8px 10px', background: 'rgba(255,255,255,0.03)', borderRadius: 7 }}>
                <div style={{ fontSize: 10, color: 'rgba(226,232,240,0.35)', marginBottom: 2 }}>{k}</div>
                {k === 'Status' ? (() => { const c = STAGE_COLORS[req.status]; return <span style={{ fontSize: 11, fontWeight: 700, padding: '1px 7px', borderRadius: 5, background: c.bg, border: `1px solid ${c.border}`, color: c.text }}>{req.status}</span>; })() : <div style={{ fontSize: 12, fontWeight: 600, color: '#e2e8f0' }}>{v}</div>}
              </div>
            ))}
          </div>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(226,232,240,0.4)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Requirements</div>
            <div style={{ fontSize: 12, color: 'rgba(226,232,240,0.65)', lineHeight: 1.7, padding: '10px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: 8 }}>{req.requirements}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(226,232,240,0.4)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Internal Notes</div>
            <textarea value={note} onChange={e => setNote(e.target.value)} rows={3}
              style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '10px 12px', color: '#e2e8f0', fontSize: 12, resize: 'none', outline: 'none', boxSizing: 'border-box' }} />
          </div>
        </div>
        <div style={{ padding: '12px 20px', borderTop: '1px solid rgba(255,255,255,0.07)', display: 'flex', gap: 8 }}>
          {STAGES.filter(s => s !== req.status).slice(0, 3).map(s => {
            const c = STAGE_COLORS[s];
            return (
              <button key={s} onClick={onClose} style={{ padding: '6px 12px', borderRadius: 7, fontSize: 11, fontWeight: 600, cursor: 'pointer', background: c.bg, border: `1px solid ${c.border}`, color: c.text }}>
                → {s}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function AdminRequests() {
  const [selected, setSelected] = useState(null);
  const [stageFilter, setStageFilter] = useState('all');

  const filtered = stageFilter === 'all' ? REQUESTS : REQUESTS.filter(r => r.status === stageFilter);
  const stageCounts = STAGES.reduce((acc, s) => { acc[s] = REQUESTS.filter(r => r.status === s).length; return acc; }, {});

  return (
    <div>
      {selected && <RequestModal req={selected} onClose={() => setSelected(null)} />}

      <div style={{ marginBottom: 22 }}>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#e2e8f0', letterSpacing: '-0.02em' }}>Custom Dashboard Requests</h1>
        <p style={{ margin: '3px 0 0', fontSize: 13, color: 'rgba(226,232,240,0.4)' }}>Enterprise leads and custom dashboard CRM pipeline</p>
      </div>

      {/* Pipeline stages */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 10, marginBottom: 20 }}>
        {STAGES.map(stage => {
          const c = STAGE_COLORS[stage];
          const count = stageCounts[stage] || 0;
          return (
            <div key={stage} className="admin-card" style={{
              padding: '12px 14px', borderRadius: 10,
              background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', transition: 'all 0.18s',
              cursor: 'pointer', position: 'relative', overflow: 'hidden',
            }} onClick={() => setStageFilter(stageFilter === stage ? 'all' : stage)}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: c.text, opacity: 0.5 }} />
              <div style={{ fontSize: 22, fontWeight: 800, color: c.text, lineHeight: 1, marginBottom: 4 }}>{count}</div>
              <div style={{ fontSize: 11, color: 'rgba(226,232,240,0.45)', lineHeight: 1.3 }}>{stage}</div>
            </div>
          );
        })}
      </div>

      {/* Table */}
      <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0' }}>Requests Pipeline</span>
          {stageFilter !== 'all' && (
            <button onClick={() => setStageFilter('all')} style={{ fontSize: 11, padding: '3px 8px', borderRadius: 5, background: 'rgba(255,255,255,0.06)', border: 'none', color: 'rgba(226,232,240,0.5)', cursor: 'pointer' }}>
              Clear filter ×
            </button>
          )}
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              {['Company / Contact', 'Monthly Orders', 'Status', 'Target Value', 'Notes', 'Actions'].map(h => (
                <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 10.5, fontWeight: 700, color: 'rgba(226,232,240,0.3)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((req, i) => {
              const c = STAGE_COLORS[req.status] || STAGE_COLORS['New'];
              return (
                <tr key={i} className="admin-row" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', cursor: 'pointer', transition: 'background 0.12s' }} onClick={() => setSelected(req)}>
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0' }}>{req.company}</div>
                    <div style={{ fontSize: 11, color: 'rgba(226,232,240,0.45)' }}>{req.contact} · {req.email}</div>
                  </td>
                  <td style={{ padding: '12px 14px', fontSize: 12, fontWeight: 600, color: '#e2e8f0' }}>{req.orders}</td>
                  <td style={{ padding: '12px 14px' }}>
                    <span style={{ fontSize: 10.5, padding: '2px 8px', borderRadius: 5, fontWeight: 700, background: c.bg, border: `1px solid ${c.border}`, color: c.text }}>{req.status}</span>
                  </td>
                  <td style={{ padding: '12px 14px', fontSize: 12, fontWeight: 700, color: req.value === 'TBD' || req.value === '—' ? 'rgba(226,232,240,0.35)' : '#10b981' }}>{req.value}</td>
                  <td style={{ padding: '12px 14px', fontSize: 11, color: 'rgba(226,232,240,0.45)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {req.notes || '—'}
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <button onClick={e => { e.stopPropagation(); setSelected(req); }} style={{ fontSize: 11, padding: '4px 10px', borderRadius: 6, border: '1px solid rgba(99,102,241,0.25)', background: 'rgba(99,102,241,0.1)', color: '#a5b4fc', cursor: 'pointer' }}>View</button>
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
