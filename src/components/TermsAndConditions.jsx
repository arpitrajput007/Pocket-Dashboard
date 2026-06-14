import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Shield, Clock, Lock, FileText, Eye, Server,
  Users, Globe, Mail, ChevronRight, AlertTriangle,
  CreditCard, Zap, Building2, Gavel, ArrowLeft
} from 'lucide-react';
import BrandLogo from './BrandLogo';

const sections = [
  { id: "about",           number: "01", title: "About Pocket Dashboard" },
  { id: "eligibility",    number: "02", title: "Eligibility" },
  { id: "account",        number: "03", title: "Account Responsibilities" },
  { id: "billing",        number: "04", title: "Subscription Plans & Billing" },
  { id: "trial",          number: "05", title: "Trial Periods" },
  { id: "refund",         number: "06", title: "Refund Policy" },
  { id: "integrations",   number: "07", title: "Third-Party Integrations" },
  { id: "ai",             number: "08", title: "AI Insights Disclaimer" },
  { id: "readonly",       number: "09", title: "Read-Only Access & Permissions" },
  { id: "acceptable",     number: "10", title: "Acceptable Use" },
  { id: "ip",             number: "11", title: "Intellectual Property" },
  { id: "data",           number: "12", title: "Data Ownership" },
  { id: "availability",   number: "13", title: "Service Availability" },
  { id: "liability",      number: "14", title: "Limitation of Liability" },
  { id: "termination",    number: "15", title: "Termination" },
  { id: "privacy",        number: "16", title: "Privacy" },
  { id: "modifications",  number: "17", title: "Modifications to Terms" },
  { id: "law",            number: "18", title: "Governing Law" },
  { id: "contact",        number: "19", title: "Contact Information" },
  { id: "acceptance",     number: "20", title: "Acceptance" },
];

function SectionHeading({ id, number, title, icon: Icon }) {
  return (
    <div id={id} style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', marginBottom: '24px', paddingTop: '48px' }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: '40px', height: '40px', minWidth: '40px',
        borderRadius: '10px',
        background: 'rgba(99,102,241,0.1)',
        border: '1px solid rgba(99,102,241,0.2)',
      }}>
        {Icon
          ? <Icon size={18} style={{ color: '#818cf8' }} />
          : <span style={{ fontSize: '11px', fontWeight: 700, color: '#818cf8', fontFamily: 'monospace' }}>{number}</span>
        }
      </div>
      <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#f8fafc', margin: 0, paddingTop: '8px', lineHeight: 1.3 }}>
        {number}. {title}
      </h2>
    </div>
  );
}

function ListItem({ children }) {
  return (
    <li style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '8px', listStyle: 'none' }}>
      <ChevronRight size={14} style={{ color: '#6366f1', marginTop: '4px', flexShrink: 0 }} />
      <span style={{ color: '#94a3b8', fontSize: '14px', lineHeight: 1.7 }}>{children}</span>
    </li>
  );
}

function Callout({ children, type = 'info' }) {
  const colors = {
    info:    { bg: 'rgba(99,102,241,0.08)',  border: 'rgba(99,102,241,0.25)',  icon: '#818cf8'  },
    warning: { bg: 'rgba(245,158,11,0.08)',  border: 'rgba(245,158,11,0.25)',  icon: '#f59e0b'  },
    success: { bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.25)', icon: '#10b981' },
    danger:  { bg: 'rgba(239,68,68,0.08)',   border: 'rgba(239,68,68,0.2)',    icon: '#ef4444'  },
  };
  const c = colors[type];
  const IconComp = type === 'warning' || type === 'danger' ? AlertTriangle : Shield;
  return (
    <div style={{
      background: c.bg, border: `1px solid ${c.border}`,
      borderRadius: '12px', padding: '16px 20px', marginBottom: '24px',
      display: 'flex', gap: '12px', alignItems: 'flex-start',
    }}>
      <IconComp size={16} style={{ color: c.icon, marginTop: '2px', flexShrink: 0 }} />
      <span style={{ color: '#cbd5e1', fontSize: '13px', lineHeight: 1.7 }}>{children}</span>
    </div>
  );
}

function Divider() {
  return <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', margin: '8px 0 0 0' }} />;
}

function BodyText({ children, style = {} }) {
  return (
    <p style={{ fontSize: '14px', color: '#94a3b8', lineHeight: 1.8, marginBottom: '16px', ...style }}>
      {children}
    </p>
  );
}

export default function TermsAndConditions() {
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
        position: 'sticky', top: 0, zIndex: 50,
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
            <FileText size={13} style={{ color: '#6366f1' }} />
            Terms & Conditions
          </div>
        </div>
      </nav>

      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 24px 80px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: '48px', alignItems: 'start', paddingTop: '60px' }}>

          {/* Sticky Sidebar TOC */}
          <aside style={{ position: 'sticky', top: '88px' }}>
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
                      display: 'flex', alignItems: 'center', gap: '8px',
                      padding: '5px 8px', borderRadius: '8px',
                      textDecoration: 'none', color: '#64748b',
                      fontSize: '11.5px', lineHeight: 1.4, transition: 'all 0.15s ease',
                      marginBottom: '1px',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.color = '#f8fafc'; e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
                    onMouseLeave={e => { e.currentTarget.style.color = '#64748b'; e.currentTarget.style.background = 'transparent'; }}
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
                display: 'inline-flex', alignItems: 'center', gap: '8px',
                padding: '4px 12px', borderRadius: '999px',
                background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', marginBottom: '20px',
              }}>
                <FileText size={12} style={{ color: '#818cf8' }} />
                <span style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#818cf8' }}>Terms &amp; Conditions</span>
              </div>

              <h1 style={{ fontSize: '40px', fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.15, marginBottom: '16px', color: '#f8fafc' }}>
                The rules that govern<br />our platform.
              </h1>

              <p style={{ fontSize: '16px', color: '#94a3b8', lineHeight: 1.75, maxWidth: '560px', marginBottom: '28px' }}>
                These Terms govern your access to and use of Pocket Dashboard's website, platform, AI systems, integrations, and related services. Please read them carefully.
              </p>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                {[
                  { icon: Clock,  label: 'Last updated: May 2026' },
                  { icon: Globe,  label: 'Governed by Indian law' },
                  { icon: Shield, label: 'Read-only integrations' },
                ].map(({ icon: Icon, label }) => (
                  <div key={label} style={{
                    display: 'flex', alignItems: 'center', gap: '7px',
                    padding: '6px 12px', borderRadius: '8px',
                    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
                    fontSize: '12px', color: '#64748b',
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
              <BodyText>
                Welcome to Pocket Dashboard. These Terms &amp; Conditions ("Terms") govern your access to and use of the Pocket Dashboard website, software platform, dashboards, AI systems, integrations, analytics tools, and related services (collectively, the "Services").
              </BodyText>
              <BodyText>
                By accessing or using Pocket Dashboard, you agree to be bound by these Terms. If you do not agree, you may not access or use the Services.
              </BodyText>
            </div>

            <Divider />

            {/* 01 */}
            <SectionHeading id="about" number="01" title="About Pocket Dashboard" icon={Building2} />
            <BodyText>
              Pocket Dashboard is a SaaS-based operational analytics and business intelligence platform designed for D2C brands, e-commerce businesses, and online operators. The platform provides:
            </BodyText>
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 32px 0' }}>
              {['Business analytics', 'Operational dashboards', 'Order tracking', 'Fulfilment insights', 'Profitability analysis', 'AI-assisted operational intelligence', 'Multi-platform integrations'].map(i => <ListItem key={i}>{i}</ListItem>)}
            </ul>
            <Divider />

            {/* 02 */}
            <SectionHeading id="eligibility" number="02" title="Eligibility" icon={Users} />
            <BodyText>By using Pocket Dashboard, you confirm that:</BodyText>
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 32px 0' }}>
              {[
                'You are legally capable of entering into binding agreements',
                'You are authorized to connect the business accounts integrated into the platform',
                'All information provided by you is accurate and lawful',
              ].map(i => <ListItem key={i}>{i}</ListItem>)}
            </ul>
            <Divider />

            {/* 03 */}
            <SectionHeading id="account" number="03" title="Account Responsibilities" icon={Lock} />
            <BodyText>Users are responsible for:</BodyText>
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 16px 0' }}>
              {['Maintaining account confidentiality', 'Securing login credentials', 'Restricting unauthorized access', 'Ensuring lawful use of the Services', 'Managing connected third-party integrations'].map(i => <ListItem key={i}>{i}</ListItem>)}
            </ul>
            <Callout type="warning">
              You are fully responsible for all activities conducted under your account.
            </Callout>
            <Divider />

            {/* 04 */}
            <SectionHeading id="billing" number="04" title="Subscription Plans & Billing" icon={CreditCard} />
            <BodyText>Pocket Dashboard may offer:</BodyText>
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 16px 0' }}>
              {['Free trials', 'Monthly subscriptions', 'Enterprise / custom plans'].map(i => <ListItem key={i}>{i}</ListItem>)}
            </ul>
            <BodyText>
              Subscription pricing, features, usage limits, and access levels may change periodically. By subscribing, you authorize Pocket Dashboard and its payment providers to charge applicable subscription fees.
            </BodyText>
            <Divider />

            {/* 05 */}
            <SectionHeading id="trial" number="05" title="Trial Periods" icon={Clock} />
            <BodyText>Free trials may be offered at our discretion. We reserve the right to:</BodyText>
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 16px 0' }}>
              {['Modify trial duration', 'Restrict repeated trial abuse', 'Suspend or terminate fraudulent trial activity'].map(i => <ListItem key={i}>{i}</ListItem>)}
            </ul>
            <BodyText>
              At the end of the trial period, paid access may be required to continue using certain features.
            </BodyText>
            <Divider />

            {/* 06 */}
            <SectionHeading id="refund" number="06" title="Refund Policy" icon={CreditCard} />
            <BodyText>Unless otherwise stated:</BodyText>
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 16px 0' }}>
              {['Subscription fees are non-refundable', 'Partial usage periods are not eligible for refunds', 'Failure to use the platform does not qualify for reimbursement'].map(i => <ListItem key={i}>{i}</ListItem>)}
            </ul>
            <Callout type="info">
              Refund exceptions, if any, remain solely at the discretion of Pocket Dashboard.
            </Callout>
            <Divider />

            {/* 07 */}
            <SectionHeading id="integrations" number="07" title="Third-Party Integrations" icon={Globe} />
            <BodyText>Pocket Dashboard integrates with external platforms including:</BodyText>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
              {['Shopify', 'WooCommerce', 'Meta', 'Google', 'Shiprocket', 'Razorpay', 'Cashfree'].map(tag => (
                <span key={tag} style={{
                  fontSize: '12px', color: '#94a3b8', padding: '4px 10px',
                  borderRadius: '6px', background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.07)',
                }}>{tag}</span>
              ))}
            </div>
            <BodyText>Users acknowledge:</BodyText>
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 16px 0' }}>
              {[
                'Pocket Dashboard does not control third-party services',
                'External platform outages or API limitations may affect functionality',
                'Connected platforms remain subject to their own policies and terms',
              ].map(i => <ListItem key={i}>{i}</ListItem>)}
            </ul>
            <Callout type="warning">
              We are not liable for issues arising from third-party systems, outages, or API changes outside our control.
            </Callout>
            <Divider />

            {/* 08 */}
            <SectionHeading id="ai" number="08" title="AI-Assisted Insights Disclaimer" icon={Server} />
            <BodyText>
              Pocket Dashboard may provide AI-generated insights, operational summaries, recommendations, or analytics. These outputs:
            </BodyText>
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 16px 0' }}>
              {[
                'Are informational only',
                'Do not constitute financial, legal, accounting, or investment advice',
                'Should not be treated as guaranteed outcomes or predictions',
              ].map(i => <ListItem key={i}>{i}</ListItem>)}
            </ul>
            <BodyText>
              Users remain solely responsible for all operational, advertising, financial, and business decisions. Pocket Dashboard does not guarantee increased revenue, reduced losses, predictive accuracy, or business growth outcomes.
            </BodyText>
            <Callout type="danger">
              All AI-generated insights should be independently reviewed before making financial or operational decisions.
            </Callout>
            <Divider />

            {/* 09 */}
            <SectionHeading id="readonly" number="09" title="Read-Only Access & Permissions" icon={Eye} />
            <BodyText>Pocket Dashboard primarily operates using read-only permissions wherever technically feasible. We:</BodyText>
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 16px 0' }}>
              {[
                'Do not intentionally modify store operations',
                'Do not alter orders without explicit authorization',
                'Do not manage customer funds',
                'Access only the permissions required for platform functionality',
              ].map(i => <ListItem key={i}>{i}</ListItem>)}
            </ul>
            <BodyText>Users remain responsible for permissions granted to connected applications.</BodyText>
            <Divider />

            {/* 10 */}
            <SectionHeading id="acceptable" number="10" title="Acceptable Use" icon={Shield} />
            <BodyText>Users may not:</BodyText>
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 16px 0' }}>
              {[
                'Use the Services unlawfully',
                'Attempt unauthorized system access',
                'Reverse engineer the platform',
                'Abuse APIs or infrastructure',
                'Interfere with system stability',
                'Upload malicious code or harmful content',
                'Use the platform for fraudulent or illegal activities',
              ].map(i => <ListItem key={i}>{i}</ListItem>)}
            </ul>
            <Callout type="danger">
              Pocket Dashboard reserves the right to suspend or terminate accounts violating these Terms without prior notice.
            </Callout>
            <Divider />

            {/* 11 */}
            <SectionHeading id="ip" number="11" title="Intellectual Property" icon={FileText} />
            <BodyText>
              All platform content, software, branding, systems, dashboards, UI designs, analytics structures, AI workflows, and proprietary technology are owned by Pocket Dashboard unless otherwise stated.
            </BodyText>
            <BodyText>Users may not:</BodyText>
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 32px 0' }}>
              {['Reproduce', 'Resell', 'Clone', 'Copy', 'Redistribute', 'Commercially exploit'].map(i => <ListItem key={i}>{i} any part of the Services without written permission.</ListItem>)}
            </ul>
            <Divider />

            {/* 12 */}
            <SectionHeading id="data" number="12" title="Data Ownership" icon={Lock} />
            <BodyText>Users retain ownership of their business data. However, users grant Pocket Dashboard permission to:</BodyText>
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 16px 0' }}>
              {[
                'Process connected operational data',
                'Generate analytics and insights',
                'Store data necessary for platform functionality',
                'Improve platform performance and intelligence systems',
              ].map(i => <ListItem key={i}>{i}</ListItem>)}
            </ul>
            <Callout type="success">
              Pocket Dashboard does not sell customer business data.
            </Callout>
            <Divider />

            {/* 13 */}
            <SectionHeading id="availability" number="13" title="Service Availability" icon={Zap} />
            <BodyText>While we strive for reliable uptime, Pocket Dashboard does not guarantee uninterrupted availability. The Services may experience:</BodyText>
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 16px 0' }}>
              {['Maintenance periods', 'Infrastructure failures', 'API disruptions', 'Technical interruptions', 'Data synchronization delays'].map(i => <ListItem key={i}>{i}</ListItem>)}
            </ul>
            <BodyText>We are not liable for losses caused by temporary downtime or external system failures.</BodyText>
            <Divider />

            {/* 14 */}
            <SectionHeading id="liability" number="14" title="Limitation of Liability" icon={AlertTriangle} />
            <BodyText>To the maximum extent permitted by law, Pocket Dashboard shall not be liable for:</BodyText>
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 16px 0' }}>
              {['Indirect damages', 'Business interruption', 'Revenue loss', 'Data loss', 'Operational losses', 'Advertising losses', 'Missed opportunities', 'Reliance on analytics or AI-generated insights'].map(i => <ListItem key={i}>{i}</ListItem>)}
            </ul>
            <Callout type="warning">
              Use of the Services is entirely at your own risk. Pocket Dashboard provides the platform on an "as is" and "as available" basis.
            </Callout>
            <Divider />

            {/* 15 */}
            <SectionHeading id="termination" number="15" title="Termination" icon={Shield} />
            <BodyText>We reserve the right to suspend, restrict, or terminate accounts for violations of these Terms, abuse, fraud, security concerns, or operational risk. Users may stop using the platform at any time.</BodyText>
            <Divider />

            {/* 16 */}
            <SectionHeading id="privacy" number="16" title="Privacy" icon={Lock} />
            <BodyText>
              Use of the Services is also governed by our{' '}
              <a href="/privacy" target="_blank" rel="noopener noreferrer" style={{ color: '#818cf8', textDecoration: 'none', borderBottom: '1px solid rgba(129,140,248,0.3)' }}>
                Privacy Policy
              </a>.
              By using Pocket Dashboard, you acknowledge and agree to our data handling and privacy practices.
            </BodyText>
            <Divider />

            {/* 17 */}
            <SectionHeading id="modifications" number="17" title="Modifications to Terms" icon={FileText} />
            <BodyText>
              Pocket Dashboard may update these Terms periodically. Updated versions become effective upon publication. Continued use of the Services after updates constitutes acceptance of the revised Terms.
            </BodyText>
            <Divider />

            {/* 18 */}
            <SectionHeading id="law" number="18" title="Governing Law" icon={Gavel} />
            <BodyText>
              These Terms shall be governed and interpreted in accordance with the applicable laws of India, without regard to conflict of law principles. Any disputes shall be subject to the jurisdiction of the appropriate courts in India.
            </BodyText>
            <Divider />

            {/* 19 */}
            <SectionHeading id="contact" number="19" title="Contact Information" icon={Mail} />
            <div style={{
              background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)',
              borderRadius: '16px', padding: '24px', marginBottom: '32px',
            }}>
              <BodyText style={{ marginBottom: '12px' }}>
                For legal, billing, support, or platform-related inquiries:
              </BodyText>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Mail size={16} style={{ color: '#818cf8' }} />
                <a href="mailto:support@pocketdashboard.app" style={{ color: '#818cf8', fontSize: '14px', fontWeight: 600, textDecoration: 'none' }}>
                  support@pocketdashboard.app
                </a>
              </div>
            </div>
            <Divider />

            {/* 20 */}
            <SectionHeading id="acceptance" number="20" title="Acceptance" icon={Shield} />
            <BodyText style={{ marginBottom: '48px' }}>
              By accessing or using Pocket Dashboard, you acknowledge that you have read, understood, and agreed to these Terms &amp; Conditions.
            </BodyText>

            {/* Bottom nav */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '24px 0', borderTop: '1px solid rgba(255,255,255,0.06)',
            }}>
              <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#64748b', textDecoration: 'none', transition: 'color 0.15s' }}
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
