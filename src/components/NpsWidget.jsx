import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

const STORAGE_KEY = 'pocket_nps_state';
const FIRST_VISIT_KEY = 'pocket_first_visit';
const SHOW_AFTER_DAYS = 14;

function shouldShowNps() {
  try {
    const state = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    if (state.dismissed) return false;

    const firstVisit = localStorage.getItem(FIRST_VISIT_KEY);
    if (!firstVisit) return false;

    const daysSince = (Date.now() - parseInt(firstVisit, 10)) / (1000 * 60 * 60 * 24);
    return daysSince >= SHOW_AFTER_DAYS;
  } catch {
    return false;
  }
}

export default function NpsWidget({ session, store }) {
  const [visible, setVisible] = useState(false);
  const [score, setScore] = useState(null);
  const [comment, setComment] = useState('');
  const [step, setStep] = useState('score'); // 'score' | 'comment' | 'done'
  const [submitting, setSubmitting] = useState(false);

  // Record first visit timestamp
  useEffect(() => {
    if (!localStorage.getItem(FIRST_VISIT_KEY)) {
      localStorage.setItem(FIRST_VISIT_KEY, Date.now().toString());
    }
  }, []);

  // Check whether to show after a short delay (don't interrupt initial load)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (shouldShowNps()) setVisible(true);
    }, 8000);
    return () => clearTimeout(timer);
  }, []);

  const dismiss = () => {
    setVisible(false);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ dismissed: true, dismissedAt: Date.now() }));
  };

  const handleScoreSelect = (s) => {
    setScore(s);
    setStep('comment');
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          owner_email: session?.user?.email,
          store_id: store?.id,
          nps_score: score,
          comment: comment.trim() || null,
          type: 'nps',
        }),
      });
    } catch { /* non-critical */ }
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ dismissed: true, submittedAt: Date.now(), score }));
    setStep('done');
    setSubmitting(false);
    setTimeout(() => setVisible(false), 3000);
  };

  if (!visible) return null;

  const scoreLabel = score >= 9 ? 'Promoter' : score >= 7 ? 'Passive' : score != null ? 'Detractor' : '';
  const scoreColor = score >= 9 ? '#10b981' : score >= 7 ? '#fbbf24' : score != null ? '#f87171' : '';

  return (
    <>
      <style>{`
        @keyframes nps-slide-up { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:none; } }
      `}</style>
      <div style={{
        position: 'fixed', bottom: 24, right: 24, zIndex: 3000,
        width: 360, background: '#0f0f1e',
        border: '1px solid rgba(99,102,241,0.3)',
        borderRadius: 20, padding: '22px 24px',
        boxShadow: '0 24px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(99,102,241,0.12)',
        animation: 'nps-slide-up 0.4s cubic-bezier(0.34,1.56,0.64,1)',
        fontFamily: "'Outfit','Inter',sans-serif",
      }}>
        {/* Close button */}
        <button
          onClick={dismiss}
          style={{ position: 'absolute', top: 14, right: 14, width: 28, height: 28, borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.4)', transition: 'all 0.2s' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
        >
          <X size={13} />
        </button>

        {step === 'score' && (
          <>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#818cf8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Quick feedback</div>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#f1f5f9', margin: '0 0 18px', lineHeight: 1.4, paddingRight: 24 }}>
              How likely are you to recommend Pocket Dashboard to another store owner?
            </p>
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 10 }}>
              {[0,1,2,3,4,5,6,7,8,9,10].map(n => (
                <button
                  key={n}
                  onClick={() => handleScoreSelect(n)}
                  style={{ width: 36, height: 36, borderRadius: 9, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: '#94a3b8', fontSize: 13.5, fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'inherit' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.2)'; e.currentTarget.style.borderColor = 'rgba(99,102,241,0.5)'; e.currentTarget.style.color = '#a5b4fc'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#94a3b8'; }}
                >
                  {n}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'rgba(255,255,255,0.25)', marginTop: 4 }}>
              <span>Not likely</span>
              <span>Very likely</span>
            </div>
          </>
        )}

        {step === 'comment' && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <div style={{ fontSize: 26, fontWeight: 900, color: scoreColor }}>{score}</div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: scoreColor }}>{scoreLabel}</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>out of 10</div>
              </div>
            </div>
            <p style={{ fontSize: 14, fontWeight: 600, color: '#f1f5f9', margin: '0 0 12px', paddingRight: 24 }}>
              {score >= 9 ? "What do you love most about Pocket Dashboard?" : score >= 7 ? "What could we do better?" : "What's the biggest thing we're missing?"}
            </p>
            <textarea
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder="Your honest feedback helps us improve..."
              rows={3}
              style={{ width: '100%', boxSizing: 'border-box', padding: '11px 14px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: '#e2e8f0', fontSize: 13.5, fontFamily: 'inherit', outline: 'none', resize: 'none', lineHeight: 1.6, marginBottom: 12 }}
              onFocus={e => { e.target.style.borderColor = 'rgba(99,102,241,0.5)'; }}
              onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; }}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => { setStep('score'); setScore(null); }}
                style={{ flex: 1, padding: '10px', borderRadius: 9, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)', color: '#64748b', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s' }}
              >Back</button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                style={{ flex: 2, padding: '10px', borderRadius: 9, border: 'none', background: 'linear-gradient(135deg,#6366f1,#4f46e5)', color: '#fff', fontSize: 13.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 4px 16px rgba(99,102,241,0.35)', transition: 'all 0.2s' }}
              >
                {submitting ? 'Sending...' : 'Submit Feedback'}
              </button>
            </div>
          </>
        )}

        {step === 'done' && (
          <div style={{ textAlign: 'center', padding: '8px 0' }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>🙏</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#f1f5f9', marginBottom: 6 }}>Thank you!</div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', lineHeight: 1.6 }}>Your feedback helps us build a better product for store owners.</div>
          </div>
        )}
      </div>
    </>
  );
}
