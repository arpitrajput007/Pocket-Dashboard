import React, { useState, useEffect } from 'react';
import { ThumbsUp, Lightbulb } from 'lucide-react';
import { supabase } from '../supabaseClient';

const INITIAL_FEATURES = [
  { id: 1, title: 'Meta & Google Ads API integration', desc: 'Automatically pull ad spend from Meta/Google instead of manual entry', votes: 0, voted: false },
  { id: 2, title: 'WhatsApp daily digest', desc: 'Send daily metrics summary via WhatsApp instead of (or in addition to) email', votes: 0, voted: false },
  { id: 3, title: 'Bulk product cost CSV import', desc: 'Upload a CSV to set cost prices for all SKUs at once', votes: 0, voted: false },
  { id: 4, title: 'Multi-user / team access', desc: 'Invite your CA, business partner, or VA to view the dashboard', votes: 0, voted: false },
  { id: 5, title: 'Monthly P&L PDF export', desc: 'Download a CA-ready PDF profit & loss statement each month', votes: 0, voted: false },
  { id: 6, title: 'Mobile app', desc: 'iOS and Android app to check your numbers on the go', votes: 0, voted: false },
];

export default function FeatureRequests({ session, store }) {
  // Supabase votes take priority over localStorage (cross-device sync)
  const remoteVotes = store?.dashboard_features?.feature_votes || {};
  const localVotes  = JSON.parse(localStorage.getItem('pocket_feature_votes') || '{}');
  const merged      = { ...localVotes, ...remoteVotes };

  const [votes, setVotes] = useState(merged);
  const [features, setFeatures] = useState(() =>
    INITIAL_FEATURES.map(f => ({ ...f, votes: merged[f.id] ? 1 : 0, voted: !!merged[f.id] }))
  );
  const [newTitle, setNewTitle] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // If store loads after initial render, sync remote votes in
  useEffect(() => {
    const remote = store?.dashboard_features?.feature_votes || {};
    if (Object.keys(remote).length === 0) return;
    setVotes(prev => {
      const next = { ...prev, ...remote };
      setFeatures(INITIAL_FEATURES.map(f => ({ ...f, votes: next[f.id] ? 1 : 0, voted: !!next[f.id] })));
      return next;
    });
  }, [store?.id]);

  const handleVote = async (id) => {
    const nowVoted = !votes[id];
    const nextVotes = { ...votes, [id]: nowVoted };

    // Optimistic UI update
    setVotes(nextVotes);
    setFeatures(prev => prev.map(f => {
      if (f.id !== id) return f;
      return { ...f, voted: nowVoted, votes: nowVoted ? f.votes + 1 : f.votes - 1 };
    }));

    // Persist to localStorage (fast, offline-safe)
    localStorage.setItem('pocket_feature_votes', JSON.stringify(nextVotes));

    // Persist to Supabase (cross-device sync)
    if (store?.id) {
      await supabase
        .from('stores')
        .update({
          dashboard_features: {
            ...(store.dashboard_features || {}),
            feature_votes: nextVotes,
          }
        })
        .eq('id', store.id);
    }
  };

  const handleSubmit = async e => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setSubmitting(true);
    try {
      await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          owner_email: session?.user?.email,
          comment: `Feature Request: ${newTitle.trim()}`,
          type: 'feature_request',
          store_id: store?.id,
        }),
      });
    } catch { /* non-critical */ }
    setSubmitted(true);
    setSubmitting(false);
    setNewTitle('');
    setTimeout(() => setSubmitted(false), 4000);
  };

  const sorted = [...features].sort((a, b) => b.votes - a.votes);

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', animation: 'fadeInUp 0.35s ease forwards' }}>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontFamily: 'Outfit, sans-serif', fontSize: 26, fontWeight: 800, color: '#f1f5f9', margin: '0 0 8px', letterSpacing: '-0.4px' }}>
          Feature Requests
        </h2>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', margin: 0, lineHeight: 1.7 }}>
          Vote for features you want. The most-requested ones get built first. Your feedback directly shapes the roadmap.
        </p>
      </div>

      {/* Feature list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
        {sorted.map(f => (
          <div
            key={f.id}
            style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px', background: 'rgba(255,255,255,0.03)', border: `1px solid ${f.voted ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.08)'}`, borderRadius: 14, transition: 'border-color 0.2s' }}
          >
            <button
              onClick={() => handleVote(f.id)}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, minWidth: 48, padding: '8px 12px', borderRadius: 10, border: `1px solid ${f.voted ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.1)'}`, background: f.voted ? 'rgba(99,102,241,0.12)' : 'rgba(255,255,255,0.03)', cursor: 'pointer', transition: 'all 0.2s', flexShrink: 0 }}
              onMouseEnter={e => { if (!f.voted) e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; }}
              onMouseLeave={e => { if (!f.voted) e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
            >
              <ThumbsUp size={14} color={f.voted ? '#818cf8' : 'rgba(255,255,255,0.4)'} style={{ transition: 'color 0.2s' }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: f.voted ? '#818cf8' : 'rgba(255,255,255,0.5)' }}>{f.votes}</span>
            </button>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14.5, fontWeight: 600, color: '#e2e8f0', marginBottom: 3 }}>{f.title}</div>
              <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.4)', lineHeight: 1.5 }}>{f.desc}</div>
            </div>
            {f.voted && (
              <span style={{ fontSize: 11, fontWeight: 700, color: '#818cf8', background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)', borderRadius: 999, padding: '3px 9px', flexShrink: 0 }}>Voted</span>
            )}
          </div>
        ))}
      </div>

      {/* Submit new request */}
      <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: '24px 28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <div style={{ width: 32, height: 32, borderRadius: 9, background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Lightbulb size={15} color="#fbbf24" />
          </div>
          <h3 style={{ fontFamily: 'Outfit, sans-serif', fontSize: 15, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>
            Suggest a new feature
          </h3>
        </div>

        {submitted ? (
          <div style={{ padding: '14px 18px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 18 }}>✅</span>
            <span style={{ fontSize: 13.5, color: '#34d399', fontWeight: 600 }}>Feature request sent! We'll consider it for the roadmap.</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 10 }}>
            <input
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              placeholder="e.g. Integrate with Amazon seller dashboard..."
              style={{ flex: 1, padding: '12px 16px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: '#e2e8f0', fontSize: 14, fontFamily: 'inherit', outline: 'none' }}
              onFocus={e => { e.target.style.borderColor = 'rgba(99,102,241,0.5)'; }}
              onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; }}
            />
            <button
              type="submit"
              disabled={!newTitle.trim() || submitting}
              style={{ padding: '12px 20px', borderRadius: 10, border: 'none', background: newTitle.trim() ? 'linear-gradient(135deg,#6366f1,#4f46e5)' : 'rgba(255,255,255,0.06)', color: newTitle.trim() ? '#fff' : '#475569', fontSize: 14, fontWeight: 700, cursor: newTitle.trim() ? 'pointer' : 'not-allowed', fontFamily: 'inherit', whiteSpace: 'nowrap', transition: 'all 0.2s', flexShrink: 0 }}
            >
              {submitting ? 'Sending...' : 'Submit'}
            </button>
          </form>
        )}
        <p style={{ margin: '10px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.25)', lineHeight: 1.5 }}>
          All requests go directly to the founder. Every suggestion is read.
        </p>
      </div>
    </div>
  );
}
