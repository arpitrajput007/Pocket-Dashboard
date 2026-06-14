import React from 'react';
import { Link } from 'react-router-dom';
import { Mail, MessageSquare, ArrowRight, Shield, ExternalLink } from 'lucide-react';
import BrandLogo from './BrandLogo';

export default function ContactPage() {
  return (
    <div style={{
      minHeight: '100vh',
      background: '#060610',
      color: '#f8fafc',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Top Nav */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 50,
        backdropFilter: 'blur(20px)',
        background: 'rgba(6,6,16,0.85)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '76px' }}>
          <Link to="/" style={{ textDecoration: 'none', paddingTop: '14px' }}>
            <BrandLogo variant="full" iconSize={40} />
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#64748b' }}>
            <MessageSquare size={13} style={{ color: '#6366f1' }} />
            Contact Us
          </div>
        </div>
      </nav>

      {/* Main */}
      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 24px' }}>
        <div style={{ width: '100%', maxWidth: '900px' }}>

          {/* Hero */}
          <div style={{ textAlign: 'center', marginBottom: '64px' }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              padding: '4px 14px', borderRadius: '999px',
              background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)',
              marginBottom: '24px',
            }}>
              <MessageSquare size={12} style={{ color: '#818cf8' }} />
              <span style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#818cf8' }}>Contact Us</span>
            </div>

            <h1 style={{ fontSize: '48px', fontWeight: 700, letterSpacing: '-0.025em', lineHeight: 1.1, marginBottom: '20px', color: '#f8fafc' }}>
              Have questions?<br />
              <span style={{ background: 'linear-gradient(135deg, #6366f1 0%, #22d3ee 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                We'd love to hear from you.
              </span>
            </h1>

            <p style={{ fontSize: '17px', color: '#94a3b8', lineHeight: 1.75, maxWidth: '500px', margin: '0 auto' }}>
              For any query, write to us on our business email only.
            </p>
          </div>

          {/* Business Email Card — centered */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '40px' }}>
            <div style={{
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: '20px', padding: '40px 48px',
              transition: 'border-color 0.2s ease',
              maxWidth: '420px', width: '100%', textAlign: 'center',
            }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(34,211,238,0.3)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'}
            >
              <div style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: '56px', height: '56px', borderRadius: '16px', marginBottom: '24px',
                background: 'rgba(34,211,238,0.08)', border: '1px solid rgba(34,211,238,0.2)',
              }}>
                <Mail size={24} style={{ color: '#22d3ee' }} />
              </div>
              <h3 style={{ fontSize: '17px', fontWeight: 600, color: '#f8fafc', marginBottom: '10px' }}>Business Email</h3>
              <p style={{ fontSize: '13px', color: '#64748b', lineHeight: 1.6, marginBottom: '24px' }}>
                For any query — support, partnerships, enterprise plans, or press — reach out on our business email.
              </p>
              <a href="mailto:business@pocketdashboard.app" style={{
                display: 'inline-flex', alignItems: 'center', gap: '8px',
                fontSize: '15px', fontWeight: 700, color: '#22d3ee', textDecoration: 'none',
                letterSpacing: '-0.01em',
              }}
                onMouseEnter={e => e.currentTarget.style.opacity = '0.8'}
                onMouseLeave={e => e.currentTarget.style.opacity = '1'}
              >
                business@pocketdashboard.app
                <ExternalLink size={14} />
              </a>
            </div>
          </div>

          {/* Response time note */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            padding: '14px 24px', borderRadius: '12px', marginBottom: '64px',
            background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)',
          }}>
            <Shield size={14} style={{ color: '#6366f1' }} />
            <span style={{ fontSize: '13px', color: '#94a3b8' }}>
              Average response time: <strong style={{ color: '#f8fafc', fontWeight: 600 }}>under 24 hours.</strong> No spam. Ever.
            </span>
          </div>

          {/* CTA — back to product */}
          <div style={{ textAlign: 'center' }}>
            <Link to="/" style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              padding: '14px 28px', borderRadius: '999px',
              background: 'linear-gradient(135deg, #6366f1, #22d3ee)',
              color: '#fff', fontWeight: 600, fontSize: '14px', textDecoration: 'none',
              transition: 'opacity 0.2s ease',
            }}
              onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}
            >
              Explore Pocket Dashboard
              <ArrowRight size={16} />
            </Link>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer style={{
        borderTop: '1px solid rgba(255,255,255,0.06)',
        padding: '40px 24px',
        textAlign: 'center',
      }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px', paddingTop: '4px' }}>
            <BrandLogo variant="full" iconSize={36} />
          </div>
          <p style={{ fontSize: '13px', color: '#475569', lineHeight: 1.7, marginBottom: '16px' }}>
            Built for modern D2C brands to track profit, operations, and growth from one intelligent dashboard.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '20px', flexWrap: 'wrap' }}>
            <a href="/privacy" target="_blank" rel="noopener noreferrer" style={{ fontSize: '12px', color: '#334155', textDecoration: 'none' }}
              onMouseEnter={e => e.currentTarget.style.color = '#94a3b8'}
              onMouseLeave={e => e.currentTarget.style.color = '#334155'}
            >Privacy Policy</a>
            <span style={{ color: '#1e293b', fontSize: '12px' }}>·</span>
            <a href="/terms" target="_blank" rel="noopener noreferrer" style={{ fontSize: '12px', color: '#334155', textDecoration: 'none' }}
              onMouseEnter={e => e.currentTarget.style.color = '#94a3b8'}
              onMouseLeave={e => e.currentTarget.style.color = '#334155'}
            >Terms &amp; Conditions</a>
            <span style={{ color: '#1e293b', fontSize: '12px' }}>·</span>
            <span style={{ fontSize: '12px', color: '#1e293b' }}>© {new Date().getFullYear()} Pocket Dashboard. All rights reserved.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
