import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Clock, Lock, Database, Eye, Server, Users, FileText, Globe, Mail, ChevronRight, ArrowLeft } from 'lucide-react';
import BrandLogo from './BrandLogo';

const sections = [
  { id: "information", number: "01", title: "Information We Collect" },
  { id: "usage", number: "02", title: "How We Use Information" },
  { id: "ai", number: "03", title: "AI Systems & Business Intelligence" },
  { id: "readonly", number: "04", title: "Read-Only Platform Access" },
  { id: "security", number: "05", title: "Data Security" },
  { id: "retention", number: "06", title: "Data Retention" },
  { id: "integrations", number: "07", title: "Third-Party Integrations" },
  { id: "cookies", number: "08", title: "Cookies & Analytics" },
  { id: "responsibilities", number: "09", title: "User Responsibilities" },
  { id: "confidentiality", number: "10", title: "Confidentiality & Business Data" },
  { id: "liability", number: "11", title: "Limitation of Liability" },
  { id: "international", number: "12", title: "International Users" },
  { id: "changes", number: "13", title: "Policy Changes" },
  { id: "contact", number: "14", title: "Contact Information" },
  { id: "consent", number: "15", title: "Consent" },
];

function SectionHeading({ id, number, title, icon: Icon }) {
  return (
    <div id={id} className="flex items-start gap-4 mb-6 pt-12 first:pt-0">
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '40px',
        height: '40px',
        minWidth: '40px',
        borderRadius: '10px',
        background: 'rgba(99,102,241,0.1)',
        border: '1px solid rgba(99,102,241,0.2)',
      }}>
        {Icon ? <Icon size={18} style={{ color: '#818cf8' }} /> : (
          <span style={{ fontSize: '11px', fontWeight: 700, color: '#818cf8', fontFamily: 'monospace' }}>{number}</span>
        )}
      </div>
      <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#f8fafc', margin: 0, paddingTop: '8px', lineHeight: 1.3 }}>
        {number}. {title}
      </h2>
    </div>
  );
}

function ListItem({ children }) {
  return (
    <li style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '8px' }}>
      <ChevronRight size={14} style={{ color: '#6366f1', marginTop: '4px', flexShrink: 0 }} />
      <span style={{ color: '#94a3b8', fontSize: '14px', lineHeight: 1.7 }}>{children}</span>
    </li>
  );
}

function Callout({ children, type = 'info' }) {
  const colors = {
    info: { bg: 'rgba(99,102,241,0.08)', border: 'rgba(99,102,241,0.25)', icon: '#818cf8' },
    warning: { bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.25)', icon: '#f59e0b' },
    success: { bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.25)', icon: '#10b981' },
  };
  const c = colors[type];
  return (
    <div style={{
      background: c.bg,
      border: `1px solid ${c.border}`,
      borderRadius: '12px',
      padding: '16px 20px',
      marginBottom: '24px',
      display: 'flex',
      gap: '12px',
      alignItems: 'flex-start',
    }}>
      <Shield size={16} style={{ color: c.icon, marginTop: '2px', flexShrink: 0 }} />
      <span style={{ color: '#cbd5e1', fontSize: '13px', lineHeight: 1.7 }}>{children}</span>
    </div>
  );
}

function Divider() {
  return <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', margin: '8px 0 0 0' }} />;
}

export default function PrivacyPolicy() {
  const navigate = useNavigate();
  return (
    <div style={{
      minHeight: '100vh',
      background: '#060610',
      color: '#f8fafc',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    }}>
      {/* Top Nav */}
      <nav style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        backdropFilter: 'blur(20px)',
        background: 'rgba(6,6,16,0.85)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '76px' }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '8px', padding: '6px 12px',
              fontSize: '12px', color: '#94a3b8', cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = '#f8fafc'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = '#94a3b8'; }}
          >
            <ArrowLeft size={13} />
            Back
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#64748b' }}>
            <Shield size={13} style={{ color: '#6366f1' }} />
            Privacy Policy
          </div>
        </div>
      </nav>

      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 24px 80px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: '48px', alignItems: 'start', paddingTop: '60px' }}>

          {/* Sticky Sidebar TOC */}
          <aside style={{ position: 'sticky', top: '80px' }}>
            <div style={{
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '16px',
              padding: '20px',
            }}>
              <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#475569', marginBottom: '16px' }}>
                Table of Contents
              </p>
              <nav>
                {sections.map((s) => (
                  <a
                    key={s.id}
                    href={`#${s.id}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '6px 8px',
                      borderRadius: '8px',
                      textDecoration: 'none',
                      color: '#64748b',
                      fontSize: '12px',
                      lineHeight: 1.4,
                      transition: 'all 0.15s ease',
                      marginBottom: '2px',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.color = '#f8fafc';
                      e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.color = '#64748b';
                      e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <span style={{ fontSize: '10px', fontFamily: 'monospace', color: '#334155', minWidth: '18px' }}>{s.number}</span>
                    {s.title}
                  </a>
                ))}
              </nav>
            </div>
          </aside>

          {/* Main Content */}
          <main>
            {/* Hero Header */}
            <div style={{ marginBottom: '48px' }}>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '4px 12px',
                borderRadius: '999px',
                background: 'rgba(99,102,241,0.1)',
                border: '1px solid rgba(99,102,241,0.2)',
                marginBottom: '20px',
              }}>
                <Shield size={12} style={{ color: '#818cf8' }} />
                <span style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#818cf8' }}>Privacy Policy</span>
              </div>

              <h1 style={{ fontSize: '40px', fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.15, marginBottom: '16px', color: '#f8fafc' }}>
                How we handle<br />your data.
              </h1>

              <p style={{ fontSize: '16px', color: '#94a3b8', lineHeight: 1.75, maxWidth: '560px', marginBottom: '28px' }}>
                We take your privacy seriously. This document explains exactly what data we collect, why we collect it, and how it is protected.
              </p>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                {[
                  { icon: Clock, label: 'Last updated: May 2026' },
                  { icon: Lock, label: 'Read-only integrations' },
                  { icon: Shield, label: 'Private to your store' },
                ].map(({ icon: Icon, label }) => (
                  <div key={label} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '7px',
                    padding: '6px 12px',
                    borderRadius: '8px',
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.07)',
                    fontSize: '12px',
                    color: '#64748b',
                  }}>
                    <Icon size={12} style={{ color: '#6366f1' }} />
                    {label}
                  </div>
                ))}
              </div>
            </div>

            <Divider />

            {/* Intro */}
            <div style={{ padding: '32px 0' }}>
              <p style={{ fontSize: '15px', color: '#94a3b8', lineHeight: 1.8 }}>
                Welcome to Pocket Dashboard. We are an operational analytics and business intelligence platform designed for modern D2C brands, e-commerce operators, and online businesses. This Privacy Policy explains how we collect, use, process, store, and protect information when you access our website, applications, integrations, dashboards, AI systems, and related services (collectively, the "Services").
              </p>
              <p style={{ fontSize: '15px', color: '#94a3b8', lineHeight: 1.8, marginTop: '16px' }}>
                By accessing or using Pocket Dashboard, you acknowledge and agree to the practices described in this policy.
              </p>
            </div>

            <Divider />

            {/* 1. Information We Collect */}
            <SectionHeading id="information" number="01" title="Information We Collect" icon={Database} />

            <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#cbd5e1', marginBottom: '12px', letterSpacing: '0.02em' }}>1.1 Account Information</h3>
            <p style={{ fontSize: '14px', color: '#94a3b8', lineHeight: 1.7, marginBottom: '12px' }}>When creating or managing an account, we may collect:</p>
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px 0' }}>
              {['Full name', 'Business / store name', 'Email address', 'Phone number', 'Billing information', 'Account credentials', 'Subscription details'].map(i => <ListItem key={i}>{i}</ListItem>)}
            </ul>

            <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#cbd5e1', marginBottom: '12px', letterSpacing: '0.02em' }}>1.2 Connected Platform Data</h3>
            <p style={{ fontSize: '14px', color: '#94a3b8', lineHeight: 1.7, marginBottom: '12px' }}>When you connect third-party services such as Shopify, WooCommerce, Meta Ads, or Shiprocket, we may access:</p>
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 16px 0' }}>
              {['Orders and fulfilment data', 'Product and SKU information', 'Shipping and logistics data', 'Payment and transaction metadata', 'Advertising metrics and campaign performance', 'Revenue and profitability metrics', 'Inventory-related information', 'Operational performance indicators'].map(i => <ListItem key={i}>{i}</ListItem>)}
            </ul>
            <p style={{ fontSize: '14px', color: '#94a3b8', lineHeight: 1.7, marginBottom: '24px' }}>
              We access only the permissions necessary to provide analytics, synchronization, operational intelligence, and AI-assisted insights.
            </p>

            <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#cbd5e1', marginBottom: '12px', letterSpacing: '0.02em' }}>1.3 AI & Operational Intelligence Data</h3>
            <p style={{ fontSize: '14px', color: '#94a3b8', lineHeight: 1.7, marginBottom: '12px' }}>To provide contextual AI insights, our systems may process:</p>
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 16px 0' }}>
              {['Historical operational patterns', 'Business performance trends', 'Aggregated analytical metrics', 'User queries and AI interactions', 'Dashboard usage behavior', 'Performance summaries and generated insights'].map(i => <ListItem key={i}>{i}</ListItem>)}
            </ul>
            <Callout type="success">
              <strong style={{ color: '#f8fafc' }}>Important:</strong> Pocket Dashboard does not use your private business data to train public AI models. Your data is never shared with third parties for training purposes.
            </Callout>

            <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#cbd5e1', marginBottom: '12px', letterSpacing: '0.02em' }}>1.4 Technical & Device Information</h3>
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 32px 0' }}>
              {['IP address', 'Browser type', 'Device information', 'Operating system', 'Session identifiers', 'Usage analytics', 'Error logs', 'Cookie and diagnostic information'].map(i => <ListItem key={i}>{i}</ListItem>)}
            </ul>

            <Divider />

            {/* 2. How We Use Information */}
            <SectionHeading id="usage" number="02" title="How We Use Information" icon={Eye} />
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 16px 0' }}>
              {['Provide and maintain the Services', 'Generate analytics and operational insights', 'Synchronize business data across integrations', 'Improve AI-assisted recommendations', 'Enhance platform reliability and performance', 'Detect anomalies and prevent system abuse', 'Provide customer support', 'Process billing and subscription management', 'Monitor infrastructure health and security', 'Improve user experience and product functionality'].map(i => <ListItem key={i}>{i}</ListItem>)}
            </ul>
            <Callout type="info">
              We do not sell customer data or personal information to third parties. Ever.
            </Callout>
            <Divider />

            {/* 3. AI Systems */}
            <SectionHeading id="ai" number="03" title="AI Systems & Business Intelligence" icon={Server} />
            <p style={{ fontSize: '14px', color: '#94a3b8', lineHeight: 1.7, marginBottom: '16px' }}>
              Pocket Dashboard includes AI-assisted operational intelligence systems designed to help users understand business performance. These systems may:
            </p>
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 16px 0' }}>
              {['Analyze historical trends', 'Surface operational anomalies', 'Generate summaries and recommendations', 'Identify inefficiencies and margin leakage', 'Provide context-aware business insights'].map(i => <ListItem key={i}>{i}</ListItem>)}
            </ul>
            <p style={{ fontSize: '14px', color: '#94a3b8', lineHeight: 1.7, marginBottom: '32px' }}>
              These systems assist decision-making only. They do not guarantee financial outcomes or predictive certainty. All AI-generated insights should be independently reviewed before making operational decisions.
            </p>
            <Divider />

            {/* 4. Read-Only Access */}
            <SectionHeading id="readonly" number="04" title="Read-Only Platform Access" icon={Lock} />
            <p style={{ fontSize: '14px', color: '#94a3b8', lineHeight: 1.7, marginBottom: '16px' }}>
              Pocket Dashboard primarily operates using read-only integrations. We:
            </p>
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 32px 0' }}>
              {['Do not modify your store content', 'Do not create or edit orders without explicit authorization', 'Do not manage customer payments', 'Do not access unnecessary permissions'].map(i => <ListItem key={i}>{i}</ListItem>)}
            </ul>
            <Divider />

            {/* 5. Data Security */}
            <SectionHeading id="security" number="05" title="Data Security" icon={Shield} />
            <p style={{ fontSize: '14px', color: '#94a3b8', lineHeight: 1.7, marginBottom: '16px' }}>We implement commercially reasonable safeguards including:</p>
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 16px 0' }}>
              {['HTTPS/SSL encrypted communication', 'Access control mechanisms', 'Encrypted credential storage', 'Infrastructure monitoring', 'Authentication and authorization controls', 'Internal access restrictions', 'Secure cloud infrastructure practices'].map(i => <ListItem key={i}>{i}</ListItem>)}
            </ul>
            <p style={{ fontSize: '14px', color: '#94a3b8', lineHeight: 1.7, marginBottom: '32px' }}>
              While we strive to protect information, no digital system can guarantee absolute security.
            </p>
            <Divider />

            {/* 6. Data Retention */}
            <SectionHeading id="retention" number="06" title="Data Retention" icon={Clock} />
            <p style={{ fontSize: '14px', color: '#94a3b8', lineHeight: 1.7, marginBottom: '16px' }}>We retain information only as long as necessary to:</p>
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 16px 0' }}>
              {['Provide Services', 'Maintain account functionality', 'Improve platform operations', 'Comply with legal obligations', 'Resolve disputes', 'Enforce agreements'].map(i => <ListItem key={i}>{i}</ListItem>)}
            </ul>
            <p style={{ fontSize: '14px', color: '#94a3b8', lineHeight: 1.7, marginBottom: '32px' }}>
              Users may request deletion of their account and associated data, subject to applicable legal requirements.
            </p>
            <Divider />

            {/* 7. Third-Party Integrations */}
            <SectionHeading id="integrations" number="07" title="Third-Party Integrations" icon={Globe} />
            <p style={{ fontSize: '14px', color: '#94a3b8', lineHeight: 1.7, marginBottom: '16px' }}>
              Pocket Dashboard integrates with third-party platforms. Your use of those services remains subject to their respective privacy policies. Integrated services may include:
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
              {['Shopify', 'WooCommerce', 'Meta Ads', 'Google Ads', 'Shiprocket', 'Razorpay', 'Cashfree', 'OpenAI', 'Cloud Hosting Providers'].map(tag => (
                <span key={tag} style={{
                  fontSize: '12px', color: '#94a3b8', padding: '4px 10px',
                  borderRadius: '6px', background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.07)'
                }}>{tag}</span>
              ))}
            </div>
            <p style={{ fontSize: '14px', color: '#94a3b8', lineHeight: 1.7, marginBottom: '32px' }}>
              Pocket Dashboard is not responsible for the privacy practices of third-party services.
            </p>
            <Divider />

            {/* 8. Cookies */}
            <SectionHeading id="cookies" number="08" title="Cookies & Analytics Technologies" icon={FileText} />
            <p style={{ fontSize: '14px', color: '#94a3b8', lineHeight: 1.7, marginBottom: '16px' }}>We may use cookies and session storage to:</p>
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 16px 0' }}>
              {['Maintain authentication sessions', 'Remember user preferences', 'Analyze platform usage', 'Improve performance and reliability', 'Enhance security'].map(i => <ListItem key={i}>{i}</ListItem>)}
            </ul>
            <p style={{ fontSize: '14px', color: '#94a3b8', lineHeight: 1.7, marginBottom: '32px' }}>
              You may disable cookies through browser settings, though certain features may become unavailable.
            </p>
            <Divider />

            {/* 9. User Responsibilities */}
            <SectionHeading id="responsibilities" number="09" title="User Responsibilities" icon={Users} />
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 32px 0' }}>
              {['Maintaining credential confidentiality', 'Ensuring lawful platform usage', 'Managing permissions granted to integrations', 'Reviewing AI-generated recommendations independently', 'Ensuring compliance with applicable laws and regulations'].map(i => <ListItem key={i}>{i}</ListItem>)}
            </ul>
            <Divider />

            {/* 10. Confidentiality */}
            <SectionHeading id="confidentiality" number="10" title="Confidentiality & Business Data" icon={Lock} />
            <p style={{ fontSize: '14px', color: '#94a3b8', lineHeight: 1.7, marginBottom: '16px' }}>
              We recognize that operational business data is commercially sensitive. Accordingly:
            </p>
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 32px 0' }}>
              {['Customer business data is treated as confidential', 'Internal access is restricted to authorized personnel only', 'We do not publicly expose private store information', 'We do not knowingly share proprietary operational metrics with unrelated third parties'].map(i => <ListItem key={i}>{i}</ListItem>)}
            </ul>
            <Divider />

            {/* 11. Limitation of Liability */}
            <SectionHeading id="liability" number="11" title="Limitation of Liability" icon={Shield} />
            <p style={{ fontSize: '14px', color: '#94a3b8', lineHeight: 1.7, marginBottom: '16px' }}>
              Pocket Dashboard is provided on an "as available" and "as is" basis. We do not guarantee:
            </p>
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 16px 0' }}>
              {['Business profitability', 'Operational outcomes', 'Data accuracy from third-party platforms', 'Continuous uptime', 'Error-free AI outputs', 'Predictive certainty'].map(i => <ListItem key={i}>{i}</ListItem>)}
            </ul>
            <Callout type="warning">
              Pocket Dashboard shall not be liable for indirect, incidental, consequential, or business-related losses arising from platform usage, external platform failures, or reliance on generated insights.
            </Callout>
            <Divider />

            {/* 12. International Users */}
            <SectionHeading id="international" number="12" title="International Users" icon={Globe} />
            <p style={{ fontSize: '14px', color: '#94a3b8', lineHeight: 1.7, marginBottom: '32px' }}>
              By using Pocket Dashboard, you understand that information may be processed or stored in jurisdictions outside your local region, depending on infrastructure providers and operational requirements.
            </p>
            <Divider />

            {/* 13. Changes */}
            <SectionHeading id="changes" number="13" title="Changes to This Privacy Policy" icon={FileText} />
            <p style={{ fontSize: '14px', color: '#94a3b8', lineHeight: 1.7, marginBottom: '32px' }}>
              We may update this Privacy Policy periodically to reflect operational, legal, technical, or product changes. Updated versions will be published on this page with a revised effective date. Continued use of the Services following updates constitutes acceptance of the revised Privacy Policy.
            </p>
            <Divider />

            {/* 14. Contact */}
            <SectionHeading id="contact" number="14" title="Contact Information" icon={Mail} />
            <div style={{
              background: 'rgba(99,102,241,0.06)',
              border: '1px solid rgba(99,102,241,0.2)',
              borderRadius: '16px',
              padding: '24px',
              marginBottom: '32px',
            }}>
              <p style={{ fontSize: '14px', color: '#94a3b8', lineHeight: 1.7, marginBottom: '12px' }}>
                For privacy-related inquiries, support requests, or data concerns:
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Mail size={16} style={{ color: '#818cf8' }} />
                <a href="mailto:support@pocketdashboard.app" style={{ color: '#818cf8', fontSize: '14px', fontWeight: 600, textDecoration: 'none' }}>
                  support@pocketdashboard.app
                </a>
              </div>
            </div>
            <Divider />

            {/* 15. Consent */}
            <SectionHeading id="consent" number="15" title="Consent" icon={Shield} />
            <p style={{ fontSize: '14px', color: '#94a3b8', lineHeight: 1.7, marginBottom: '48px' }}>
              By accessing or using Pocket Dashboard, you acknowledge that you have read, understood, and agreed to this Privacy Policy and our data handling practices.
            </p>

            {/* Footer nav */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '24px 0',
              borderTop: '1px solid rgba(255,255,255,0.06)',
            }}>
              <Link to="/" style={{
                display: 'inline-flex', alignItems: 'center', gap: '8px',
                fontSize: '13px', color: '#64748b', textDecoration: 'none',
                transition: 'color 0.15s',
              }}
                onMouseEnter={e => e.currentTarget.style.color = '#f8fafc'}
                onMouseLeave={e => e.currentTarget.style.color = '#64748b'}
              >
                ← Back to Pocket Dashboard
              </Link>
              <span style={{ fontSize: '12px', color: '#334155' }}>© {new Date().getFullYear()} Pocket Dashboard</span>
            </div>
          </main>

        </div>
      </div>
    </div>
  );
}
