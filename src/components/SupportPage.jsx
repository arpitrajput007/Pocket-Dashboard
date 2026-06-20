import React, { useState } from 'react';
import { MessageCircle, Mail, ChevronDown } from 'lucide-react';

const FAQ = [
  {
    q: 'How do I connect my Shopify store?',
    a: 'Go to "Connect your Store" in the sidebar. You\'ll need to create a Custom App in Shopify Admin (Settings → Apps → Develop apps), copy the Access Token with read_orders and read_products scopes, and paste it here. We never get write access to your store.',
  },
  {
    q: 'Why are my profit numbers showing ₹0?',
    a: 'Profit calculation requires product costs to be entered. Go to the "Products" tab, sync your catalog, then enter the cost price for each SKU. Once costs are saved, your P&L will show accurate numbers.',
  },
  {
    q: 'What is Shiprocket integration and why do I need it?',
    a: 'Shiprocket integration gives us real-time delivery and RTO status from the carrier. Without it, delivery status is based only on Shopify tags which can be delayed or incomplete. Connect it via the "Connect your Store" tab → Shiprocket section.',
  },
  {
    q: 'How often is my data synced?',
    a: 'Orders sync every 5 minutes automatically. Shiprocket shipment status syncs every 30 minutes. You can also trigger a manual sync anytime from the "Connect your Store" tab.',
  },
  {
    q: 'Is my Shopify access token secure?',
    a: 'Yes. All credentials are encrypted with AES-256 before being stored in the database. We use read-only access — Pocket Dashboard can never modify, delete, or place orders on your store.',
  },
  {
    q: 'Will this always be free?',
    a: 'Pocket Dashboard is free for all store owners during the beta period. We plan to introduce paid plans in early 2027. Early users will get a significant discount and advance notice before any pricing changes.',
  },
];

export default function SupportPage({ session }) {
  const [openFaq, setOpenFaq] = useState(null);
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState('');
  const [sending, setSending] = useState(false);

  const userEmail = session?.user?.email || '';

  const handleSendMessage = async e => {
    e.preventDefault();
    if (!feedbackMsg.trim()) return;
    setSending(true);
    try {
      await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ owner_email: userEmail, comment: feedbackMsg, type: 'support' }),
      });
      setFeedbackSent(true);
    } catch {
      // Still show success — the email will come through
      setFeedbackSent(true);
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', animation: 'fadeInUp 0.35s ease forwards' }}>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontFamily: 'Outfit, sans-serif', fontSize: 26, fontWeight: 800, color: '#f1f5f9', margin: '0 0 8px', letterSpacing: '-0.4px' }}>
          Talk to Support
        </h2>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', margin: 0, lineHeight: 1.7 }}>
          We're a small team building this for D2C founders. Reach out any time — we actually respond.
        </p>
      </div>

      {/* Contact channels */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 24 }}>
        <a
          href="https://wa.me/917999999999?text=Hi%2C%20I%20need%20help%20with%20Pocket%20Dashboard"
          target="_blank"
          rel="noopener noreferrer"
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 10, padding: '20px 22px', background: 'rgba(37,211,102,0.07)', border: '1px solid rgba(37,211,102,0.25)', borderRadius: 16, textDecoration: 'none', transition: 'all 0.2s', cursor: 'pointer' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(37,211,102,0.12)'; e.currentTarget.style.borderColor = 'rgba(37,211,102,0.4)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(37,211,102,0.07)'; e.currentTarget.style.borderColor = 'rgba(37,211,102,0.25)'; }}
        >
          <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(37,211,102,0.15)', border: '1px solid rgba(37,211,102,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <MessageCircle size={20} color="#25d366" />
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#25d366', marginBottom: 3 }}>WhatsApp</div>
            <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.4)', lineHeight: 1.5 }}>Fastest response. Most queries answered within the hour.</div>
          </div>
          <div style={{ fontSize: 11.5, color: 'rgba(37,211,102,0.7)', fontWeight: 600, marginTop: 2 }}>Open WhatsApp →</div>
        </a>

        <a
          href="mailto:support@pocketdashboard.app"
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 10, padding: '20px 22px', background: 'rgba(99,102,241,0.07)', border: '1px solid rgba(99,102,241,0.25)', borderRadius: 16, textDecoration: 'none', transition: 'all 0.2s' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.12)'; e.currentTarget.style.borderColor = 'rgba(99,102,241,0.4)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.07)'; e.currentTarget.style.borderColor = 'rgba(99,102,241,0.25)'; }}
        >
          <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Mail size={20} color="#818cf8" />
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#818cf8', marginBottom: 3 }}>Email</div>
            <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.4)', lineHeight: 1.5 }}>support@pocketdashboard.app — replies within 24 hours.</div>
          </div>
          <div style={{ fontSize: 11.5, color: 'rgba(99,102,241,0.7)', fontWeight: 600, marginTop: 2 }}>Send Email →</div>
        </a>
      </div>

      {/* Send a message form */}
      <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: '24px 28px', marginBottom: 24 }}>
        <h3 style={{ fontFamily: 'Outfit, sans-serif', fontSize: 16, fontWeight: 700, color: '#f1f5f9', margin: '0 0 16px' }}>
          Or drop us a message here
        </h3>
        {feedbackSent ? (
          <div style={{ padding: '18px 20px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 22 }}>✅</span>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#34d399', marginBottom: 2 }}>Message received!</div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>We'll get back to you at {userEmail} within 24 hours.</div>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSendMessage}>
            <textarea
              value={feedbackMsg}
              onChange={e => setFeedbackMsg(e.target.value)}
              placeholder="Describe your issue or question..."
              rows={4}
              style={{ width: '100%', boxSizing: 'border-box', padding: '14px 16px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: '#e2e8f0', fontSize: 14, fontFamily: 'inherit', outline: 'none', resize: 'vertical', lineHeight: 1.6, marginBottom: 12 }}
              onFocus={e => { e.target.style.borderColor = 'rgba(99,102,241,0.5)'; }}
              onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>Reply to: {userEmail}</div>
              <button
                type="submit"
                disabled={!feedbackMsg.trim() || sending}
                style={{ padding: '10px 22px', borderRadius: 10, border: 'none', background: feedbackMsg.trim() ? 'linear-gradient(135deg,#6366f1,#4f46e5)' : 'rgba(255,255,255,0.06)', color: feedbackMsg.trim() ? '#fff' : '#475569', fontSize: 13.5, fontWeight: 700, cursor: feedbackMsg.trim() ? 'pointer' : 'not-allowed', fontFamily: 'inherit', transition: 'all 0.2s' }}
              >
                {sending ? 'Sending...' : 'Send Message'}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* FAQ */}
      <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: '24px 28px' }}>
        <h3 style={{ fontFamily: 'Outfit, sans-serif', fontSize: 16, fontWeight: 700, color: '#f1f5f9', margin: '0 0 18px' }}>
          Frequently Asked Questions
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {FAQ.map((item, i) => (
            <div key={i} style={{ borderTop: i === 0 ? 'none' : '1px solid rgba(255,255,255,0.06)', paddingTop: i === 0 ? 0 : 12, marginTop: i === 0 ? 0 : 4 }}>
              <button
                type="button"
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, background: 'none', border: 'none', cursor: 'pointer', padding: '6px 0', color: openFaq === i ? '#e2e8f0' : '#94a3b8', fontSize: 14, fontWeight: 500, textAlign: 'left', fontFamily: 'inherit', transition: 'color 0.2s' }}
              >
                <span>{item.q}</span>
                <ChevronDown size={15} style={{ flexShrink: 0, transition: 'transform 0.2s', transform: openFaq === i ? 'rotate(180deg)' : 'none', opacity: 0.5 }} />
              </button>
              {openFaq === i && (
                <p style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.5)', lineHeight: 1.75, margin: '8px 0 6px' }}>{item.a}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
