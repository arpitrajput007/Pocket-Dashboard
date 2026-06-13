import React, { useState } from 'react';
import { Headphones, Clock, CheckCircle, XCircle, AlertTriangle, MessageSquare, X } from 'lucide-react';

const TICKETS = [
  { id: 'TKT-0041', store: 'BNB Toys', email: 'arpit@bnbtoys.in', subject: 'Shopify sync not working after token refresh', priority: 'high', status: 'open', assignee: 'Arpit', created: '2025-06-12 09:14', category: 'Integration', messages: 3 },
  { id: 'TKT-0040', store: 'Kashmiri Threads', email: 'mohit@kashmirithreads.in', subject: 'RTO orders not showing correct status', priority: 'medium', status: 'pending', assignee: 'Priya', created: '2025-06-12 07:32', category: 'Data', messages: 5 },
  { id: 'TKT-0039', store: 'ZenCraft Wellness', email: 'pooja@zencraft.in', subject: 'Trial expiry — need 7 more days to decide', priority: 'low', status: 'open', assignee: 'Unassigned', created: '2025-06-11 14:20', category: 'Billing', messages: 1 },
  { id: 'TKT-0038', store: 'Velvet Dreams Saree', email: 'meera@velvetdreams.in', subject: 'AI copilot giving wrong net profit figure', priority: 'high', status: 'open', assignee: 'Arpit', created: '2025-06-11 11:45', category: 'AI', messages: 8 },
  { id: 'TKT-0037', store: 'FitFlex Sports', email: 'karan@fitflex.in', subject: 'Want to add second store to same account', priority: 'medium', status: 'pending', assignee: 'Priya', created: '2025-06-10 16:00', category: 'Feature', messages: 4 },
  { id: 'TKT-0036', store: 'Royal Spice Garden', email: 'anjali@royalspice.in', subject: 'Monthly P&L export feature request', priority: 'low', status: 'resolved', assignee: 'Arpit', created: '2025-06-09 10:30', category: 'Feature', messages: 6 },
  { id: 'TKT-0035', store: 'Bamboo Living Co', email: 'ritesh@bambooliving.in', subject: 'How to connect Shiprocket credentials', priority: 'low', status: 'resolved', assignee: 'Bot', created: '2025-06-08 13:15', category: 'Integration', messages: 2 },
];

const STATUS_COLORS = {
  open:     { bg: 'rgba(59,130,246,0.1)',  border: 'rgba(59,130,246,0.2)',  text: '#93c5fd' },
  pending:  { bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.2)', text: '#fbbf24' },
  resolved: { bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.2)', text: '#34d399' },
  closed:   { bg: 'rgba(255,255,255,0.06)',border: 'rgba(255,255,255,0.12)',text: 'rgba(226,232,240,0.4)' },
};

const PRIORITY_COLORS = {
  high:   { bg: 'rgba(239,68,68,0.1)',  border: 'rgba(239,68,68,0.2)',  text: '#f87171' },
  medium: { bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.2)', text: '#fbbf24' },
  low:    { bg: 'rgba(99,102,241,0.08)',border: 'rgba(99,102,241,0.18)',text: '#a5b4fc' },
};

function TicketModal({ ticket, onClose }) {
  const [reply, setReply] = useState('');
  if (!ticket) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ width: 560, background: '#0e0e1e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, overflow: 'hidden', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 11, color: 'rgba(226,232,240,0.4)', marginBottom: 2 }}>{ticket.id}</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f0' }}>{ticket.subject}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(226,232,240,0.4)' }}><X size={18} /></button>
        </div>
        <div style={{ padding: '16px 20px', flex: 1, overflowY: 'auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
            {[['Store', ticket.store], ['Email', ticket.email], ['Priority', ticket.priority], ['Category', ticket.category], ['Assigned To', ticket.assignee], ['Opened', ticket.created]].map(([k,v]) => (
              <div key={k} style={{ padding: '8px 10px', background: 'rgba(255,255,255,0.03)', borderRadius: 7 }}>
                <div style={{ fontSize: 10, color: 'rgba(226,232,240,0.35)', marginBottom: 2 }}>{k}</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#e2e8f0' }}>{v}</div>
              </div>
            ))}
          </div>
          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: '12px 14px', marginBottom: 12, fontSize: 12, color: 'rgba(226,232,240,0.6)', lineHeight: 1.6 }}>
            User reports: "{ticket.subject}". {ticket.messages} message{ticket.messages !== 1 ? 's' : ''} in thread.
          </div>
        </div>
        <div style={{ padding: '14px 20px', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
          <textarea value={reply} onChange={e => setReply(e.target.value)} placeholder="Write a reply..." rows={3}
            style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '10px 12px', color: '#e2e8f0', fontSize: 12, resize: 'none', outline: 'none', boxSizing: 'border-box' }} />
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            {['Send Reply', 'Resolve', 'Close'].map((a, i) => (
              <button key={a} onClick={onClose} style={{
                padding: '7px 14px', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                background: i === 0 ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.05)',
                border: `1px solid ${i === 0 ? 'rgba(99,102,241,0.35)' : 'rgba(255,255,255,0.1)'}`,
                color: i === 0 ? '#a5b4fc' : 'rgba(226,232,240,0.5)',
              }}>{a}</button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminSupport() {
  const [statusFilter, setStatusFilter] = useState('all');
  const [selected, setSelected] = useState(null);

  const filtered = statusFilter === 'all' ? TICKETS : TICKETS.filter(t => t.status === statusFilter);
  const counts = { open: TICKETS.filter(t => t.status === 'open').length, pending: TICKETS.filter(t => t.status === 'pending').length, resolved: TICKETS.filter(t => t.status === 'resolved').length };

  return (
    <div>
      {selected && <TicketModal ticket={selected} onClose={() => setSelected(null)} />}

      <div style={{ marginBottom: 22 }}>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#e2e8f0', letterSpacing: '-0.02em' }}>Support Tickets</h1>
        <p style={{ margin: '3px 0 0', fontSize: 13, color: 'rgba(226,232,240,0.4)' }}>Customer support queue and resolution tracking</p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Total Tickets', value: TICKETS.length, color: '#6366f1', icon: Headphones },
          { label: 'Open', value: counts.open, color: '#3b82f6', icon: MessageSquare },
          { label: 'Pending', value: counts.pending, color: '#f59e0b', icon: Clock },
          { label: 'Resolved', value: counts.resolved, color: '#10b981', icon: CheckCircle },
        ].map(s => (
          <div key={s.label} className="admin-card" style={{ padding: '14px 16px', borderRadius: 12, background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', transition: 'all 0.18s' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <div style={{ width: 28, height: 28, borderRadius: 7, background: `${s.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <s.icon size={13} color={s.color} />
              </div>
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: s.color, lineHeight: 1, marginBottom: 3 }}>{s.value}</div>
            <div style={{ fontSize: 11, color: 'rgba(226,232,240,0.4)' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        {['all', 'open', 'pending', 'resolved', 'closed'].map(s => (
          <button key={s} onClick={() => setStatusFilter(s)} style={{
            padding: '6px 13px', borderRadius: 7, fontSize: 12, cursor: 'pointer', fontWeight: 500,
            background: statusFilter === s ? 'rgba(99,102,241,0.18)' : 'rgba(255,255,255,0.04)',
            border: `1px solid ${statusFilter === s ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.08)'}`,
            color: statusFilter === s ? '#a5b4fc' : 'rgba(226,232,240,0.45)',
          }}>{s === 'all' ? 'All Tickets' : s.charAt(0).toUpperCase() + s.slice(1)}</button>
        ))}
      </div>

      {/* Table */}
      <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              {['Ticket', 'Store / Email', 'Category', 'Priority', 'Status', 'Assignee', 'Opened'].map(h => (
                <th key={h} style={{ padding: '11px 14px', textAlign: 'left', fontSize: 10.5, fontWeight: 700, color: 'rgba(226,232,240,0.35)', textTransform: 'uppercase', letterSpacing: '0.07em', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((ticket, i) => {
              const sc = STATUS_COLORS[ticket.status] || STATUS_COLORS.closed;
              const pc = PRIORITY_COLORS[ticket.priority] || PRIORITY_COLORS.low;
              return (
                <tr key={i} className="admin-row" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', cursor: 'pointer', transition: 'background 0.12s' }} onClick={() => setSelected(ticket)}>
                  <td style={{ padding: '11px 14px' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(226,232,240,0.45)', marginBottom: 2 }}>{ticket.id}</div>
                    <div style={{ fontSize: 12, color: '#e2e8f0', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ticket.subject}</div>
                  </td>
                  <td style={{ padding: '11px 14px' }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#e2e8f0' }}>{ticket.store}</div>
                    <div style={{ fontSize: 11, color: 'rgba(226,232,240,0.38)' }}>{ticket.email}</div>
                  </td>
                  <td style={{ padding: '11px 14px', fontSize: 12, color: 'rgba(226,232,240,0.5)' }}>{ticket.category}</td>
                  <td style={{ padding: '11px 14px' }}>
                    <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 5, fontWeight: 700, background: pc.bg, border: `1px solid ${pc.border}`, color: pc.text, textTransform: 'capitalize' }}>{ticket.priority}</span>
                  </td>
                  <td style={{ padding: '11px 14px' }}>
                    <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 5, fontWeight: 600, background: sc.bg, border: `1px solid ${sc.border}`, color: sc.text, textTransform: 'capitalize' }}>{ticket.status}</span>
                  </td>
                  <td style={{ padding: '11px 14px', fontSize: 12, color: 'rgba(226,232,240,0.5)' }}>{ticket.assignee}</td>
                  <td style={{ padding: '11px 14px', fontSize: 11, color: 'rgba(226,232,240,0.38)', whiteSpace: 'nowrap' }}>{ticket.created}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
