import React, { useEffect, useState, useCallback } from 'react';
import { RefreshCw, Search, ChevronDown, Check, StickyNote, ExternalLink } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const SERVICE_LABELS = {
  domestic_pg:     'Domestic PG',
  international_pg:'International PG',
  meta_usdt:       'Meta Ads / USDT',
};

const STATUS_OPTIONS = [
  'new', 'contacted', 'in_review', 'docs_pending', 'approved', 'completed', 'closed',
];

const STATUS_STYLE = {
  new:          { color: '#a5b4fc', bg: 'rgba(99,102,241,0.12)',  border: 'rgba(99,102,241,0.25)' },
  contacted:    { color: '#7dd3fc', bg: 'rgba(14,165,233,0.12)', border: 'rgba(14,165,233,0.25)' },
  in_review:    { color: '#f59e0b', bg: 'rgba(245,158,11,0.10)', border: 'rgba(245,158,11,0.25)' },
  docs_pending: { color: '#fb923c', bg: 'rgba(251,146,60,0.10)', border: 'rgba(251,146,60,0.25)' },
  approved:     { color: '#34d399', bg: 'rgba(52,211,153,0.10)', border: 'rgba(52,211,153,0.25)' },
  completed:    { color: '#10b981', bg: 'rgba(16,185,129,0.10)', border: 'rgba(16,185,129,0.25)' },
  closed:       { color: '#94a3b8', bg: 'rgba(148,163,184,0.08)', border: 'rgba(148,163,184,0.2)' },
};

const SERVICE_STYLE = {
  domestic_pg:     { color: '#a5b4fc', bg: 'rgba(99,102,241,0.1)' },
  international_pg:{ color: '#7dd3fc', bg: 'rgba(14,165,233,0.1)' },
  meta_usdt:       { color: '#c4b5fd', bg: 'rgba(139,92,246,0.1)' },
};

function StatusBadge({ status }) {
  const s = STATUS_STYLE[status] || STATUS_STYLE.new;
  return (
    <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 20,
      color: s.color, background: s.bg, border: `1px solid ${s.border}`, whiteSpace: 'nowrap' }}>
      {status.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}
    </span>
  );
}

function ServiceBadge({ type }) {
  const s = SERVICE_STYLE[type] || {};
  return (
    <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 6,
      color: s.color, background: s.bg, whiteSpace: 'nowrap' }}>
      {SERVICE_LABELS[type] || type}
    </span>
  );
}

// ── Expanded row detail ────────────────────────────────────────────────────────
function RequestDetail({ req, token, onUpdated }) {
  const [status, setStatus]   = useState(req.status);
  const [notes, setNotes]     = useState(req.internal_notes || '');
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/scale-requests/${req.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status, internal_notes: notes }),
      });
      if (!res.ok) throw new Error();
      setSaved(true); setTimeout(() => setSaved(false), 2000);
      onUpdated({ ...req, status, internal_notes: notes });
    } finally { setSaving(false); }
  };

  const fieldStyle = { fontSize: 12, color: 'rgba(226,232,240,0.4)', marginBottom: 2 };
  const valStyle   = { fontSize: 13, color: '#e2e8f0', fontWeight: 500, marginBottom: 12 };
  const inputStyle = {
    width: '100%', padding: '8px 12px', borderRadius: 9, fontSize: 13,
    background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)',
    color: '#e2e8f0', outline: 'none', boxSizing: 'border-box',
  };

  const fields = [
    ['Business', req.business_name],
    ['Contact', req.contact_person],
    ['Email', req.email],
    ['Phone', req.phone],
    ['Website', req.website_url],
    ['Monthly Orders', req.monthly_order_volume],
    ['Current Gateway', req.current_gateway],
    ['GST / MSME', req.has_gst_msme],
    ['Countries', req.countries_sold_to],
    ['Intl Orders / mo', req.monthly_intl_orders],
    ['Payment Method', req.payment_receive_method],
    ['Meta Spend / mo', req.monthly_meta_spend],
    ['Settlement', req.settlement_currency],
    ['Additional Notes', req.additional_notes],
  ].filter(([, v]) => v);

  return (
    <div style={{ padding: '16px 20px', background: 'rgba(99,102,241,0.04)',
      borderTop: '1px solid rgba(255,255,255,0.06)', display: 'grid',
      gridTemplateColumns: '1fr 1fr', gap: 20 }}>

      {/* Left — request fields */}
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(226,232,240,0.3)',
          letterSpacing: '0.8px', marginBottom: 12 }}>REQUEST DETAILS</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px 16px' }}>
          {fields.map(([label, val]) => (
            <div key={label}>
              <div style={fieldStyle}>{label}</div>
              <div style={valStyle}>
                {label === 'Email'
                  ? <a href={`mailto:${val}`} style={{ color: '#22d3ee', textDecoration: 'none' }}>{val}</a>
                  : val}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right — admin controls */}
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(226,232,240,0.3)',
          letterSpacing: '0.8px', marginBottom: 12 }}>ADMIN CONTROLS</div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: 'rgba(226,232,240,0.4)', display: 'block', marginBottom: 6 }}>Status</label>
          <div style={{ position: 'relative' }}>
            <select value={status} onChange={e => setStatus(e.target.value)}
              style={{ ...inputStyle, appearance: 'none', cursor: 'pointer', paddingRight: 32 }}>
              {STATUS_OPTIONS.map(s => (
                <option key={s} value={s}>{s.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>
              ))}
            </select>
            <ChevronDown size={13} style={{ position: 'absolute', right: 10, top: '50%',
              transform: 'translateY(-50%)', pointerEvents: 'none', color: 'rgba(226,232,240,0.4)' }} />
          </div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: 'rgba(226,232,240,0.4)', display: 'block', marginBottom: 6 }}>
            <StickyNote size={11} style={{ display: 'inline', marginRight: 5 }} />Internal Notes
          </label>
          <textarea rows={4} value={notes} onChange={e => setNotes(e.target.value)}
            placeholder="Add internal notes for the team…"
            style={{ ...inputStyle, resize: 'vertical', minHeight: 90 }} />
        </div>

        <button onClick={save} disabled={saving}
          style={{ padding: '9px 20px', borderRadius: 9, border: 'none',
            background: saved ? 'rgba(16,185,129,0.2)' : 'linear-gradient(135deg,#6366f1,#4f46e5)',
            color: saved ? '#34d399' : '#fff', fontSize: 13, fontWeight: 700,
            cursor: saving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 7 }}>
          {saving ? 'Saving…' : saved ? <><Check size={14} /> Saved</> : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function AdminServiceRequests({ session }) {
  const token = session?.access_token;
  const [requests, setRequests] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [search, setSearch]     = useState('');
  const [filterService, setFilterService] = useState('');
  const [filterStatus, setFilterStatus]   = useState('');
  const [expanded, setExpanded] = useState(null);

  const fetch_ = useCallback(async () => {
    setLoading(true); setError('');
    const params = new URLSearchParams();
    if (filterService) params.set('service_type', filterService);
    if (filterStatus)  params.set('status',       filterStatus);
    if (search)        params.set('search',        search);
    try {
      const res = await fetch(`${API_URL}/api/admin/scale-requests?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(await res.text());
      const d = await res.json();
      setRequests(d.data || []);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [token, filterService, filterStatus, search]);

  useEffect(() => { fetch_(); }, [fetch_]);

  const handleUpdated = updated => {
    setRequests(p => p.map(r => r.id === updated.id ? updated : r));
  };

  const selectStyle = {
    padding: '7px 28px 7px 10px', borderRadius: 8, fontSize: 12,
    background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)',
    color: '#e2e8f0', cursor: 'pointer', appearance: 'none',
  };

  const counts = {
    total: requests.length,
    new: requests.filter(r => r.status === 'new').length,
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        marginBottom: 22, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#e2e8f0', letterSpacing: '-0.02em' }}>
            Business Service Requests
          </h1>
          <p style={{ margin: '3px 0 0', fontSize: 13, color: 'rgba(226,232,240,0.4)' }}>
            {loading ? 'Loading…' : `${counts.total} total${counts.new ? ` · ${counts.new} new` : ''}`}
          </p>
        </div>
        <button onClick={fetch_}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8,
            background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)',
            color: '#a5b4fc', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 20 }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={14} style={{ position: 'absolute', left: 11, top: '50%',
            transform: 'translateY(-50%)', color: 'rgba(226,232,240,0.3)', pointerEvents: 'none' }} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, email, contact…"
            style={{ width: '100%', padding: '8px 12px 8px 34px', borderRadius: 9, fontSize: 13,
              background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.09)',
              color: '#e2e8f0', outline: 'none', boxSizing: 'border-box' }} />
        </div>
        <div style={{ position: 'relative' }}>
          <select value={filterService} onChange={e => setFilterService(e.target.value)} style={selectStyle}>
            <option value="">All Services</option>
            <option value="domestic_pg">Domestic PG</option>
            <option value="international_pg">International PG</option>
            <option value="meta_usdt">Meta Ads / USDT</option>
          </select>
          <ChevronDown size={12} style={{ position: 'absolute', right: 9, top: '50%',
            transform: 'translateY(-50%)', pointerEvents: 'none', color: 'rgba(226,232,240,0.4)' }} />
        </div>
        <div style={{ position: 'relative' }}>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={selectStyle}>
            <option value="">All Statuses</option>
            {STATUS_OPTIONS.map(s => (
              <option key={s} value={s}>{s.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>
            ))}
          </select>
          <ChevronDown size={12} style={{ position: 'absolute', right: 9, top: '50%',
            transform: 'translateY(-50%)', pointerEvents: 'none', color: 'rgba(226,232,240,0.4)' }} />
        </div>
      </div>

      {error && (
        <div style={{ padding: '12px 16px', borderRadius: 10, marginBottom: 16,
          background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
          color: '#f87171', fontSize: 13 }}>{error}</div>
      )}

      {/* Table */}
      {!loading && requests.length === 0 ? (
        <div style={{ padding: '48px 24px', textAlign: 'center', borderRadius: 16,
          background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.08)' }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'rgba(226,232,240,0.35)', marginBottom: 6 }}>No requests yet</div>
          <div style={{ fontSize: 13, color: 'rgba(226,232,240,0.25)' }}>
            Requests submitted via Scale Your Business will appear here.
          </div>
        </div>
      ) : (
        <div style={{ borderRadius: 14, border: '1px solid rgba(255,255,255,0.07)', overflow: 'hidden' }}>
          {/* Table header */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px 150px 130px 120px 40px',
            padding: '10px 16px', background: 'rgba(255,255,255,0.02)',
            borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
            {['Business / Contact', 'Service', 'Email', 'Status', 'Submitted', ''].map(h => (
              <div key={h} style={{ fontSize: 11, fontWeight: 700,
                color: 'rgba(226,232,240,0.35)', letterSpacing: '0.6px' }}>{h}</div>
            ))}
          </div>

          {requests.map((req, idx) => (
            <div key={req.id}>
              <div className="admin-row"
                style={{ display: 'grid', gridTemplateColumns: '1fr 120px 150px 130px 120px 40px',
                  padding: '13px 16px', borderBottom: idx < requests.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                  cursor: 'pointer', alignItems: 'center' }}
                onClick={() => setExpanded(expanded === req.id ? null : req.id)}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0', marginBottom: 2 }}>
                    {req.business_name}
                  </div>
                  <div style={{ fontSize: 11, color: 'rgba(226,232,240,0.4)' }}>{req.contact_person} · {req.phone}</div>
                </div>
                <div><ServiceBadge type={req.service_type} /></div>
                <div>
                  <a href={`mailto:${req.email}`} style={{ fontSize: 12, color: '#22d3ee',
                    textDecoration: 'none' }} onClick={e => e.stopPropagation()}>{req.email}</a>
                </div>
                <div><StatusBadge status={req.status} /></div>
                <div style={{ fontSize: 11, color: 'rgba(226,232,240,0.4)' }}>
                  {new Date(req.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })}
                </div>
                <div style={{ color: 'rgba(226,232,240,0.3)', display: 'flex', justifyContent: 'center' }}>
                  <ChevronDown size={15} style={{ transform: expanded === req.id ? 'rotate(180deg)' : 'none', transition: '0.2s' }} />
                </div>
              </div>
              {expanded === req.id && (
                <RequestDetail req={req} token={token} onUpdated={handleUpdated} />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
