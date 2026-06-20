import { useState } from "react";

const inp = {
  width: '100%', boxSizing: 'border-box', padding: '15px 18px',
  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 14, color: '#e2e8f0', fontSize: 15, fontFamily: 'inherit', outline: 'none',
  transition: 'border-color 0.2s, box-shadow 0.2s',
};
const inpFocus = e => { e.target.style.borderColor = 'rgba(99,102,241,0.6)'; e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.15)'; };
const inpBlur  = e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; e.target.style.boxShadow = 'none'; };
const labelSt  = { display: 'block', fontSize: 11.5, fontWeight: 700, color: '#64748b', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 };
const code = txt => <code style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 4, padding: '1px 7px', fontSize: 12, color: '#a5b4fc', fontFamily: 'monospace' }}>{txt}</code>;

const UNLOCK = [
  { e: '📦', l: 'Live Order Feed',   d: 'Real-time order tracking'   },
  { e: '💰', l: 'True Profit View',  d: 'Revenue minus all costs'    },
  { e: '🔄', l: 'RTO Visibility',    d: 'Return-to-origin rates'     },
  { e: '📊', l: 'SKU Analytics',     d: 'Per-product breakdown'      },
  { e: '🧠', l: 'AI Co-Pilot',       d: 'Smart business insights'    },
  { e: '📈', l: 'Growth Trends',     d: 'Weekly & monthly views'     },
];

const FAQ = [
  { q: 'How do I create a Custom App in Shopify?', a: 'Go to Shopify Admin → Settings → Apps and sales channels → Develop apps → Create an app. Under API credentials, install the app and generate an access token with read_orders and read_products scopes.' },
  { q: 'What permissions does the token need?', a: 'Only read_orders and read_products. We never request write access — your store data is completely safe.' },
  { q: 'Can I revoke access later?', a: 'Yes, anytime. Go to Shopify Admin → Settings → Apps and remove the custom app. This immediately cuts access.' },
];

const GUIDE_STEPS = [
  { icon: '🌐', title: 'Log in to Shopify Admin', desc: 'Go to admin.shopify.com and sign in to your Shopify account.' },
  { icon: '⚙️', title: 'Click "Settings"', desc: 'Find the Settings option at the bottom-left corner of your Shopify Admin sidebar.' },
  { icon: '🔗', title: 'Click "Domains"', desc: 'In the Settings left menu, scroll down and click on "Domains".' },
  { icon: '🔍', title: 'Find the .myshopify.com domain', desc: 'On the Domains page, you\'ll see a list of domains. Look for the one ending in .myshopify.com — it\'s always listed there.' },
  { icon: '📋', title: 'Copy only the prefix', desc: 'Enter only the part BEFORE ".myshopify.com" — e.g. if it shows bnb-toys.myshopify.com, enter bnb-toys.' },
];



function DomainGuideButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <style>{`
        @keyframes domainGuideIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
        @keyframes domainPulse { from { box-shadow: 0 0 0 0 rgba(16,185,129,0.3); } to { box-shadow: 0 0 0 6px rgba(16,185,129,0); } }
        @keyframes domainModalIn { from { opacity: 0; transform: scale(0.97) translateY(10px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        .domain-guide-btn:hover { background: rgba(99,102,241,0.12) !important; color: #a5b4fc !important; border-color: rgba(99,102,241,0.35) !important; }
        .domain-guide-close:hover { background: rgba(255,255,255,0.1) !important; }
      `}</style>

      {/* Trigger button */}
      <button
        type="button"
        className="domain-guide-btn"
        onClick={() => setOpen(true)}
        style={{
          marginTop: 10, display: 'flex', alignItems: 'center', gap: 7,
          background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)',
          borderRadius: 8, padding: '7px 13px', cursor: 'pointer',
          color: '#818cf8', fontSize: 12.5, fontWeight: 500, fontFamily: 'inherit',
          transition: 'all 0.2s',
        }}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.2"/>
          <path d="M7 9.5V7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
          <circle cx="7" cy="5" r="0.7" fill="currentColor"/>
        </svg>
        How to find your Shopify domain?
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ marginLeft: 2 }}>
          <path d="M4 2l4 4-4 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {/* Modal overlay */}
      {open && (
        <div
          onClick={e => { if (e.target === e.currentTarget) setOpen(false); }}
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '20px',
          }}
        >
          <div style={{
            width: '100%', maxWidth: 640, maxHeight: '90vh', overflowY: 'auto',
            background: 'linear-gradient(160deg,#0c0c1e,#080818)',
            border: '1px solid rgba(255,255,255,0.1)', borderRadius: 24,
            padding: '36px 36px 32px',
            boxShadow: '0 32px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(99,102,241,0.1)',
            animation: 'domainModalIn 0.3s cubic-bezier(0.34,1.56,0.64,1)',
            scrollbarWidth: 'none',
          }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🔍</div>
                  <h3 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#f1f5f9', letterSpacing: '-0.3px' }}>
                    Finding Your Shopify Domain
                  </h3>
                </div>
                <p style={{ margin: 0, fontSize: 13.5, color: '#64748b', lineHeight: 1.6 }}>
                  Follow these steps to find your store's .myshopify.com domain via Settings → Domains.
                </p>
              </div>
              <button
                type="button"
                className="domain-guide-close"
                onClick={() => setOpen(false)}
                style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'background 0.2s', fontSize: 16, marginLeft: 16 }}
              >✕</button>
            </div>

            {/* Step by step guide */}
            <div style={{ marginBottom: 24 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#475569', letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 16px' }}>
                Step-by-Step Instructions
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {GUIDE_STEPS.map((step, i) => (
                  <div key={i} style={{ display: 'flex', gap: 14, alignItems: 'flex-start', padding: '14px 16px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 17 }}>
                      {step.icon}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ width: 18, height: 18, borderRadius: '50%', background: 'rgba(99,102,241,0.2)', border: '1px solid rgba(99,102,241,0.3)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#a5b4fc', fontWeight: 700, flexShrink: 0 }}>{i + 1}</span>
                        <span style={{ fontSize: 13.5, fontWeight: 700, color: '#e2e8f0' }}>{step.title}</span>
                      </div>
                      <p style={{ margin: 0, fontSize: 12.5, color: '#64748b', lineHeight: 1.65 }}>{step.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Example callout */}
            <div style={{ padding: '16px 18px', background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 14, display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 20 }}>
              <span style={{ fontSize: 18 }}>💡</span>
              <div>
                <p style={{ margin: '0 0 6px', fontSize: 13, fontWeight: 700, color: '#e2e8f0' }}>Quick Example</p>
                <p style={{ margin: 0, fontSize: 12.5, color: '#64748b', lineHeight: 1.65 }}>
                  If your Shopify store URL is{' '}
                  <code style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 4, padding: '1px 7px', fontSize: 12, color: '#a5b4fc', fontFamily: 'monospace' }}>
                    acme-apparel.myshopify.com
                  </code>
                  {' '}— enter only{' '}
                  <code style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 4, padding: '1px 7px', fontSize: 12, color: '#10b981', fontFamily: 'monospace' }}>
                    acme-apparel
                  </code>
                  {' '}in the field above.
                </p>
              </div>
            </div>

            {/* CTA */}
            <button
              type="button"
              onClick={() => setOpen(false)}
              style={{ width: '100%', padding: '14px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,#6366f1,#4f46e5)', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s', boxShadow: '0 4px 20px rgba(99,102,241,0.35)' }}
            >
              Got it, let me enter my domain →
            </button>
          </div>
        </div>
      )}
    </>
  );
}

const TOKEN_STEPS = [
  { icon: '⚙️', title: 'Go to Shopify Admin → Settings', desc: 'Log in at admin.shopify.com and click the "Settings" gear icon at the bottom-left of the sidebar.' },
  { icon: '🧩', title: 'Click "Apps and sales channels"', desc: 'In Settings, find and click "Apps and sales channels" from the left menu.' },
  { icon: '🛠️', title: 'Open "Develop apps"', desc: 'Click "Develop apps" at the top right. If prompted, click "Allow custom app development".' },
  { icon: '➕', title: 'Create a new app', desc: 'Click "Create an app", give it any name (e.g. "Pocket Dashboard"), then click Create.' },
  { icon: '🔑', title: 'Configure API scopes', desc: 'Click "Configure Admin API scopes". Search and enable read_orders and read_products. Then click Save.' },
  { icon: '📦', title: 'Install the app', desc: 'Go to the "API credentials" tab and click "Install app". Confirm the installation.' },
  { icon: '📋', title: 'Copy the access token', desc: 'After installing, click "Reveal token once" under Admin API access token. Copy it immediately — it will not be shown again.' },
];

function TokenGuideButton() {
  const [open, setOpen] = useState(false);
  const cs = { background:'rgba(255,255,255,0.025)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:4, padding:'1px 7px', fontSize:12, color:'#a5b4fc', fontFamily:'monospace' };
  return (
    <>
      <button type="button" className="domain-guide-btn" onClick={() => setOpen(true)}
        style={{ marginTop:10, display:'flex', alignItems:'center', gap:7, background:'rgba(99,102,241,0.06)', border:'1px solid rgba(99,102,241,0.2)', borderRadius:8, padding:'7px 13px', cursor:'pointer', color:'#818cf8', fontSize:12.5, fontWeight:500, fontFamily:'inherit', transition:'all 0.2s' }}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.2"/><path d="M7 9.5V7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/><circle cx="7" cy="5" r="0.7" fill="currentColor"/></svg>
        How to create a Custom App and get the token?
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ marginLeft:2 }}><path d="M4 2l4 4-4 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </button>
      {open && (
        <div onClick={e => { if (e.target === e.currentTarget) setOpen(false); }}
          style={{ position:'fixed', inset:0, zIndex:9999, background:'rgba(0,0,0,0.78)', backdropFilter:'blur(6px)', display:'flex', alignItems:'center', justifyContent:'center', padding:'20px' }}
        >
          <div style={{ width:'100%', maxWidth:620, maxHeight:'90vh', overflowY:'auto', background:'linear-gradient(160deg,#0c0c1e,#080818)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:24, padding:'36px 36px 32px', boxShadow:'0 32px 80px rgba(0,0,0,0.7),0 0 0 1px rgba(99,102,241,0.1)', animation:'domainModalIn 0.3s cubic-bezier(0.34,1.56,0.64,1)', scrollbarWidth:'none' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:28 }}>
              <div>
                <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
                  <div style={{ width:36, height:36, borderRadius:10, background:'rgba(99,102,241,0.15)', border:'1px solid rgba(99,102,241,0.3)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 }}>🔑</div>
                  <h3 style={{ margin:0, fontSize:20, fontWeight:800, color:'#f1f5f9', letterSpacing:'-0.3px' }}>Getting Your Access Token</h3>
                </div>
                <p style={{ margin:0, fontSize:13.5, color:'#64748b', lineHeight:1.6 }}>Create a read-only Custom App in Shopify Admin in 7 simple steps.</p>
              </div>
              <button type="button" className="domain-guide-close" onClick={() => setOpen(false)}
                style={{ width:32, height:32, borderRadius:8, background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', cursor:'pointer', color:'#64748b', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, transition:'background 0.2s', fontSize:16, marginLeft:16 }}
              >✕</button>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:24 }}>
              {TOKEN_STEPS.map((s, i) => (
                <div key={i} style={{ display:'flex', gap:14, alignItems:'flex-start', padding:'14px 16px', background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:14 }}>
                  <div style={{ width:36, height:36, borderRadius:10, background:'rgba(99,102,241,0.1)', border:'1px solid rgba(99,102,241,0.2)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontSize:17 }}>{s.icon}</div>
                  <div style={{ flex:1 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                      <span style={{ width:18, height:18, borderRadius:'50%', background:'rgba(99,102,241,0.2)', border:'1px solid rgba(99,102,241,0.3)', display:'inline-flex', alignItems:'center', justifyContent:'center', fontSize:10, color:'#a5b4fc', fontWeight:700, flexShrink:0 }}>{i + 1}</span>
                      <span style={{ fontSize:13.5, fontWeight:700, color:'#e2e8f0' }}>{s.title}</span>
                    </div>
                    <p style={{ margin:0, fontSize:12.5, color:'#64748b', lineHeight:1.65 }}>{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ padding:'14px 18px', background:'rgba(251,191,36,0.06)', border:'1px solid rgba(251,191,36,0.2)', borderRadius:14, display:'flex', gap:12, alignItems:'flex-start', marginBottom:16 }}>
              <span style={{ fontSize:18 }}>⚠️</span>
              <div>
                <p style={{ margin:'0 0 4px', fontSize:13, fontWeight:700, color:'#fbbf24' }}>Token shown only once</p>
                <p style={{ margin:0, fontSize:12.5, color:'#64748b', lineHeight:1.65 }}>Shopify reveals the token <strong style={{ color:'#e2e8f0' }}>once</strong> after installation. Copy it immediately — if lost, you need to reinstall the app.</p>
              </div>
            </div>
            <div style={{ padding:'14px 18px', background:'rgba(16,185,129,0.06)', border:'1px solid rgba(16,185,129,0.2)', borderRadius:14, display:'flex', gap:12, alignItems:'flex-start', marginBottom:24 }}>
              <span style={{ fontSize:18 }}>✅</span>
              <div>
                <p style={{ margin:'0 0 4px', fontSize:13, fontWeight:700, color:'#e2e8f0' }}>Only 2 scopes needed</p>
                <p style={{ margin:0, fontSize:12.5, color:'#64748b', lineHeight:1.65 }}>Enable only <code style={cs}>read_orders</code> and <code style={cs}>read_products</code>. We never request write access.</p>
              </div>
            </div>
            <button type="button" onClick={() => setOpen(false)}
              style={{ width:'100%', padding:'14px', borderRadius:12, border:'none', background:'linear-gradient(135deg,#6366f1,#4f46e5)', color:'#fff', fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:'inherit', transition:'all 0.2s', boxShadow:'0 4px 20px rgba(99,102,241,0.35)' }}
            >Got it, let me paste my token →</button>
          </div>
        </div>
      )}
    </>
  );
}

export default function ConnectShopifyStep({ storeName = '', setStoreName, shopifyDomain, setShopifyDomain, clientId = '', setClientId, accessToken = '', setAccessToken, showToken, setShowToken, syncFromType, setSyncFromType, syncFromDate, setSyncFromDate, syncToDate = '', setSyncToDate, onBack, onContinue, loading = false, connectStatus = '', session = null }) {
  const [openFaq, setOpenFaq] = useState(null);
  const [connecting, setConnecting] = useState(false);
  const todayStr = new Date().toISOString().split('T')[0];

  const handleOAuthConnect = () => {
    const domain = shopifyDomain.trim().replace('.myshopify.com', '');
    const userId = session?.user?.id;
    if (!domain) { alert('Enter your Shopify store name first (e.g. my-store).'); return; }
    if (!userId)  { alert('You must be logged in to connect.'); return; }
    window.location.href = `/api/auth/shopify/start?shop=${encodeURIComponent(domain)}&userId=${encodeURIComponent(userId)}`;
  };
  // Custom range is valid only when a "from" date is chosen (to date defaults to today)
  const rangeValid = syncFromType === 'all' || (syncFromType === 'custom' && !!syncFromDate && syncFromDate !== '2000-01-01');
  const canContinue = shopifyDomain.trim() && accessToken.trim() && (!setStoreName || storeName.trim()) && rangeValid;

  const handleContinue = () => {
    if (!canContinue) return;
    onContinue();
  };

  const card = (children, extra = {}) => ({
    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 20, padding: '32px 36px', backdropFilter: 'blur(20px)',
    boxShadow: '0 24px 64px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.04)',
    ...extra,
  });

  return (
    <div>
      {/* Page headline */}
      <div style={{ marginBottom: 36 }}>
        <h2 style={{ fontSize: 28, fontWeight: 800, color: '#f1f5f9', margin: '0 0 10px', letterSpacing: '-0.4px' }}>
          Connect your Shopify store
        </h2>
        <p style={{ fontSize: 15, color: '#64748b', margin: 0, lineHeight: 1.7 }}>
          We need <strong style={{ color: '#e2e8f0' }}>read-only</strong> access to pull orders &amp; product data. We cannot make any changes to your store.
        </p>
      </div>

      {/* Trust pill strip */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 28 }}>
        {[
          { label: 'Read-only access', color: '#10b981' },
          { label: '256-bit encrypted', color: '#a5b4fc' },
          { label: 'No write permissions', color: '#f87171' },
        ].map(b => (
          <div key={b.label} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 14px', borderRadius: 999, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: b.color, boxShadow: `0 0 6px ${b.color}` }} />
            <span style={{ fontSize: 12.5, color: '#94a3b8', fontWeight: 500 }}>{b.label}</span>
          </div>
        ))}
      </div>

      {/* Main form card */}
      <div style={card({})}>
        {/* Store name – only shown in embedded/dashboard mode */}
        {setStoreName && (
          <div style={{ marginBottom: 28 }}>
            <label style={labelSt}>Store Display Name</label>
            <p style={{ fontSize: 12.5, color: '#64748b', margin: '0 0 10px', lineHeight: 1.6 }}>
              This name will appear on your dashboard header and analytics reports.
            </p>
            <input
              className="ob-input" style={inp}
              type="text" required
              placeholder="e.g. Acme Apparel Co."
              value={storeName}
              onChange={e => setStoreName(e.target.value)}
              onFocus={inpFocus} onBlur={inpBlur}
            />
          </div>
        )}

        {/* Shopify domain */}
        <div style={{ marginBottom: 28 }}>
          <label style={labelSt}>Shopify Domain</label>
          <div style={{ display: 'flex', borderRadius: 14, border: '1px solid rgba(255,255,255,0.1)', overflow: 'hidden', background: 'rgba(255,255,255,0.04)', position: 'relative' }}>
            <input
              style={{ ...inp, border: 'none', borderRadius: 0, flex: 1, paddingRight: 40 }}
              placeholder="your-store-name"
              value={shopifyDomain}
              onChange={e => setShopifyDomain(e.target.value)}
              onFocus={inpFocus} onBlur={inpBlur}
            />
            {shopifyDomain.trim().length > 2 && (
              <div style={{ position: 'absolute', right: 130, top: '50%', transform: 'translateY(-50%)', color: '#34d399', fontSize: 16, pointerEvents: 'none' }}>✓</div>
            )}
            <div style={{ padding: '15px 18px', fontSize: 14, color: '#475569', background: 'rgba(255,255,255,0.03)', borderLeft: '1px solid rgba(255,255,255,0.07)', fontWeight: 500, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center' }}>
              .myshopify.com
            </div>
          </div>
          {/* Guidance button */}
          <DomainGuideButton />
        </div>

        {/* ── OAuth connect button (fastest path) ── */}
        {session && (
          <div style={{ marginBottom: 32, padding: '22px 24px', background: 'linear-gradient(135deg, rgba(99,102,241,0.08), rgba(56,189,248,0.05))', border: '1px solid rgba(99,102,241,0.25)', borderRadius: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#a5b4fc', marginBottom: 4 }}>Recommended: Connect with one click</div>
            <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.4)', marginBottom: 14, lineHeight: 1.6 }}>
              Fill in your store name above, then click below. You'll be taken to Shopify to approve — no token copying needed.
            </div>
            <button
              type="button"
              onClick={handleOAuthConnect}
              disabled={!shopifyDomain.trim()}
              style={{
                width: '100%', padding: '13px', borderRadius: 12, border: 'none',
                background: shopifyDomain.trim() ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : 'rgba(255,255,255,0.06)',
                color: shopifyDomain.trim() ? '#fff' : '#475569',
                fontSize: 14.5, fontWeight: 700, cursor: shopifyDomain.trim() ? 'pointer' : 'not-allowed',
                fontFamily: 'inherit',
                boxShadow: shopifyDomain.trim() ? '0 4px 20px rgba(99,102,241,0.35)' : 'none',
                transition: 'all 0.2s',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              }}
            >
              <svg width="18" height="18" viewBox="0 0 50 50" fill="currentColor" style={{ opacity: 0.9 }}>
                <path d="M43.8 10.8c0 0-0.4-0.4-1-0.4 0 0-3.6-0.4-3.6-0.4s-2.4-2.4-2.6-2.6c-0.2-0.2-0.6-0.1-0.8-0.1l-1.2 25.4 10.5-2.3L43.8 10.8zM28.9 11.9l-1.3-0.4c0 0-0.8-2.6-2.8-2.6-2.1 0-3.1 1.6-3.4 2.7l-2.8 0.8c0 0 2.4-8.6 10.4-5.5L28.9 11.9zM24.7 12.8L23 13.3c0.5-2 1.9-4.1 4.3-4.1 0.5 0 1 0.1 1.4 0.3L24.7 12.8zM32.6 30.5l-16 4.3 8.6-24.4 7.4 20.1zM15.3 35.2l-1.5 0.4L10 11.1c0 0 3.3-0.5 5.8 2.5L15.3 35.2z"/>
              </svg>
              Connect with Shopify →
            </button>
            <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ height: 1, flex: 1, background: 'rgba(255,255,255,0.07)' }} />
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', fontWeight: 600 }}>or enter token manually below</span>
              <div style={{ height: 1, flex: 1, background: 'rgba(255,255,255,0.07)' }} />
            </div>
          </div>
        )}

        {/* Client ID */}
        <div style={{ marginBottom: 28 }}>
          <label style={labelSt}>Shopify Client ID</label>
          <div style={{ position: 'relative' }}>
            <input
              style={inp} type="text"
              placeholder="e.g. de1c2d832ce0e7df846a7e475e3d0904"
              value={clientId}
              onChange={e => setClientId(e.target.value)}
              onFocus={inpFocus} onBlur={inpBlur}
            />
            {clientId.trim().length === 32 && (
              <div style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', color: '#34d399', fontSize: 16 }}>✓</div>
            )}
          </div>
        </div>

        {/* Access token / Secret Key */}
        <div style={{ marginBottom: 32 }}>
          <label style={labelSt}>API Access Token / Secret Key</label>
          <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 12px', lineHeight: 1.65 }}>
            Depending on your app type, enter your permanent Access Token ({code('shpat_')}, {code('shpca_')}) OR your Client Secret ({code('shpss_')}).
          </p>
          <div style={{ display: 'flex', borderRadius: 14, border: '1px solid rgba(255,255,255,0.1)', overflow: 'hidden', background: 'rgba(255,255,255,0.04)', alignItems: 'center', position: 'relative' }}>
            <input
              style={{ ...inp, border: 'none', borderRadius: 0, flex: 1, paddingRight: 40 }}
              type={showToken ? 'text' : 'password'}
              placeholder="shpat_..., shpca_..., or shpss_..."
              value={accessToken}
              onChange={e => setAccessToken(e.target.value)}
              onFocus={inpFocus} onBlur={inpBlur}
            />
            {(accessToken.startsWith('shpat_') || accessToken.startsWith('shpca_') || accessToken.startsWith('shpss_')) && (
              <div style={{ position: 'absolute', right: 60, top: '50%', transform: 'translateY(-50%)', color: '#34d399', fontSize: 16, pointerEvents: 'none' }}>✓</div>
            )}
            <button type="button" onClick={() => setShowToken(v => !v)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '15px 18px', color: '#475569', display: 'flex', alignItems: 'center', transition: 'color 0.2s', zIndex: 1 }}
              onMouseEnter={e => e.currentTarget.style.color = '#94a3b8'}
              onMouseLeave={e => e.currentTarget.style.color = '#475569'}
            >
              {showToken
                ? <svg width="18" height="18" viewBox="0 0 16 16" fill="none"><path d="M2 8s2.5-4 6-4 6 4 6 4-2.5 4-6 4-6-4-6-4z" stroke="currentColor" strokeWidth="1.2"/><circle cx="8" cy="8" r="1.5" stroke="currentColor" strokeWidth="1.2"/><path d="M2 2l12 12" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
                : <svg width="18" height="18" viewBox="0 0 16 16" fill="none"><path d="M2 8s2.5-4 6-4 6 4 6 4-2.5 4-6 4-6-4-6-4z" stroke="currentColor" strokeWidth="1.2"/><circle cx="8" cy="8" r="1.5" stroke="currentColor" strokeWidth="1.2"/></svg>
              }
            </button>
          </div>
          {/* Token guidance button */}
          <TokenGuideButton />
        </div>

        {/* ── Data Range ─────────────────────────────────────────────── */}
        <div style={{ marginBottom: 32, borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 28 }}>
          <label style={labelSt}>How much history should we fetch?</label>
          <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 18px', lineHeight: 1.65 }}>
            Choose how far back to import your Shopify orders. This is a one-time choice — you can re-sync any range later from Settings.
          </p>

          {/* Two big choices */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            <button
              type="button"
              onClick={() => { setSyncFromType('all'); setSyncFromDate('2000-01-01'); if (setSyncToDate) setSyncToDate(''); }}
              style={{
                padding: '18px 16px', borderRadius: 14, cursor: 'pointer', textAlign: 'left',
                background: syncFromType === 'all' ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.02)',
                border: `1px solid ${syncFromType === 'all' ? 'rgba(99,102,241,0.5)' : 'rgba(255,255,255,0.08)'}`,
                transition: 'all 0.15s',
              }}
            >
              <div style={{ fontSize: 22, marginBottom: 8 }}>🌍</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: syncFromType === 'all' ? '#a5b4fc' : '#e2e8f0' }}>All Time</div>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 3, lineHeight: 1.5 }}>Every order since your store began.</div>
            </button>

            <button
              type="button"
              onClick={() => { setSyncFromType('custom'); if (syncFromDate === '2000-01-01') setSyncFromDate(''); }}
              style={{
                padding: '18px 16px', borderRadius: 14, cursor: 'pointer', textAlign: 'left',
                background: syncFromType === 'custom' ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.02)',
                border: `1px solid ${syncFromType === 'custom' ? 'rgba(99,102,241,0.5)' : 'rgba(255,255,255,0.08)'}`,
                transition: 'all 0.15s',
              }}
            >
              <div style={{ fontSize: 22, marginBottom: 8 }}>📅</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: syncFromType === 'custom' ? '#a5b4fc' : '#e2e8f0' }}>Custom Range</div>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 3, lineHeight: 1.5 }}>Pick an exact from &amp; to date.</div>
            </button>
          </div>

          {/* Custom from/to pickers */}
          {syncFromType === 'custom' && (
            <div style={{ animation: 'domainGuideIn 0.2s ease', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: 18 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label style={{ ...labelSt, marginBottom: 8 }}>From Date</label>
                  <input
                    type="date"
                    value={syncFromDate && syncFromDate !== '2000-01-01' ? syncFromDate : ''}
                    onChange={e => setSyncFromDate(e.target.value)}
                    max={syncToDate || todayStr}
                    style={{ ...inp, colorScheme: 'dark', padding: '12px 14px' }}
                    onFocus={inpFocus} onBlur={inpBlur}
                  />
                </div>
                <div>
                  <label style={{ ...labelSt, marginBottom: 8 }}>To Date <span style={{ color: '#475569', textTransform: 'none', letterSpacing: 0, fontWeight: 400 }}>(optional)</span></label>
                  <input
                    type="date"
                    value={syncToDate || ''}
                    onChange={e => setSyncToDate && setSyncToDate(e.target.value)}
                    min={syncFromDate && syncFromDate !== '2000-01-01' ? syncFromDate : undefined}
                    max={todayStr}
                    style={{ ...inp, colorScheme: 'dark', padding: '12px 14px' }}
                    onFocus={inpFocus} onBlur={inpBlur}
                  />
                </div>
              </div>
              <p style={{ margin: '10px 0 0', fontSize: 11.5, color: '#475569', lineHeight: 1.5 }}>
                Leave <strong style={{ color: '#64748b' }}>To Date</strong> empty to keep syncing up to today automatically.
              </p>
            </div>
          )}

          {/* Confirmation hint */}
          {rangeValid && (
            <div style={{ marginTop: 12, fontSize: 12.5, color: 'rgba(52,211,153,0.9)', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 500 }}>
              <span>✓</span>
              {syncFromType === 'all'
                ? 'Importing your entire order history.'
                : `Importing orders from ${new Date(syncFromDate + 'T12:00:00').toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })} to ${syncToDate ? new Date(syncToDate + 'T12:00:00').toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' }) : 'today'}.`}
            </div>
          )}
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 12, flexDirection: 'column' }}>
          <div style={{ display: 'flex', gap: 12 }}>
            <button type="button" onClick={onBack}
              style={{ flex: 1, padding: '15px', borderRadius: 14, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: '#94a3b8', fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s', opacity: loading ? 0.4 : 1, pointerEvents: loading ? 'none' : 'auto' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = '#e2e8f0'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = '#94a3b8'; }}
            >← Back</button>
            <button type="button" onClick={handleContinue} disabled={!canContinue || loading}
              style={{ flex: 2, padding: '15px', borderRadius: 14, border: 'none', background: canContinue ? 'linear-gradient(135deg,#6366f1,#4f46e5)' : 'rgba(255,255,255,0.05)', color: canContinue ? '#fff' : '#475569', fontSize: 15, fontWeight: 700, cursor: (canContinue && !loading) ? 'pointer' : 'not-allowed', fontFamily: 'inherit', transition: 'all 0.3s', boxShadow: canContinue && !loading ? '0 4px 24px rgba(99,102,241,0.35)' : 'none', position: 'relative', overflow: 'hidden' }}
              onMouseEnter={e => { if (canContinue && !loading) { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(99,102,241,0.45)'; } }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = canContinue && !loading ? '0 4px 24px rgba(99,102,241,0.35)' : 'none'; }}
            >
              {loading ? (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                  <span style={{ width: 16, height: 16, border: '2.5px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'ob-spin 0.7s linear infinite', display: 'inline-block', flexShrink: 0 }} />
                  <span style={{ fontSize: 14 }}>{connectStatus || 'Connecting…'}</span>
                </span>
              ) : 'Connect Store & Continue →'}
              {/* Animated shimmer when loading */}
              {loading && (
                <span style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.08) 50%, transparent 100%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite', pointerEvents: 'none' }} />
              )}
            </button>
          </div>
          {/* Live status text below button */}
          {loading && connectStatus && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center', padding: '10px 0 2px' }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: connectStatus.includes('🎉') ? '#10b981' : '#6366f1', boxShadow: `0 0 8px ${connectStatus.includes('🎉') ? '#10b981' : '#6366f1'}`, animation: 'pulse-dot 1.2s ease-in-out infinite' }} />
              <span style={{ fontSize: 12.5, color: '#94a3b8', fontWeight: 500 }}>{connectStatus}</span>
            </div>
          )}
        </div>
      </div>

      {/* What you unlock */}
      <div style={{ marginTop: 28, ...card({}) }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: '#475569', letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 20px' }}>What you unlock after connecting</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {UNLOCK.map(u => (
            <div key={u.l} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '14px 16px', background: 'rgba(255,255,255,0.02)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)' }}>
              <span style={{ fontSize: 20, flexShrink: 0 }}>{u.e}</span>
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0', margin: '0 0 3px' }}>{u.l}</p>
                <p style={{ fontSize: 11.5, color: '#64748b', margin: 0 }}>{u.d}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* FAQ */}
      <div style={{ marginTop: 20, ...card({}) }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: '#475569', letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 8px' }}>Frequently asked questions</p>
        {FAQ.map((item, i) => (
          <div key={i} style={{ borderTop: i === 0 ? 'none' : '1px solid rgba(255,255,255,0.06)', paddingTop: i === 0 ? 16 : 14, marginTop: i === 0 ? 0 : 4 }}>
            <button type="button" onClick={() => setOpenFaq(openFaq === i ? null : i)}
              style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: openFaq === i ? '#e2e8f0' : '#94a3b8', fontSize: 14, fontWeight: 500, textAlign: 'left', fontFamily: 'inherit', transition: 'color 0.2s' }}
            >
              <span>{item.q}</span>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0, transition: 'transform 0.2s', transform: openFaq === i ? 'rotate(180deg)' : 'none' }}>
                <path d="M3 5l4 4 4-4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            {openFaq === i && <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.75, margin: '12px 0 4px' }}>{item.a}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
