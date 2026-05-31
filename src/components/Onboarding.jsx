import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ConnectShopifyStep from './ConnectShopifyStep';
import BrandLogo from './BrandLogo';
import ConnectingOverlay from './ConnectingOverlay';


const STEPS = [
  { label: 'Store Info',      desc: 'Your business name'   },
  { label: 'Connect Shopify', desc: 'Secure read-only sync' },
  { label: 'Personalize',     desc: 'Brand your dashboard'  },
];

const METRICS = [
  { value: '₹12.4L', label: 'Revenue tracked',    change: '+18%', color: '#10b981' },
  { value: '847',    label: 'Orders synced',       change: '+5%',  color: '#6366f1' },
  { value: '94.2%',  label: 'Fulfillment rate',    change: '+2%',  color: '#22d3ee' },
  { value: '< 2s',   label: 'Live sync speed',     change: 'LIVE', color: '#f59e0b' },
];

const inp = {
  width: '100%', boxSizing: 'border-box', padding: '16px 20px',
  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 14, color: '#e2e8f0', fontSize: 15, fontFamily: 'inherit', outline: 'none',
  transition: 'all 0.25s',
};
const labelSt = {
  display: 'block', fontSize: 11, fontWeight: 700, color: '#475569',
  letterSpacing: '0.09em', textTransform: 'uppercase', marginBottom: 10,
};

function Stepper({ step }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {STEPS.map((s, i) => {
        const done = i < step, active = i === step;
        return (
          <div key={i} style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div className={active ? 'ob-step-ring' : ''} style={{
                width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, fontWeight: 700,
                background: done ? 'rgba(16,185,129,0.15)' : active ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.03)',
                border: done ? '1.5px solid rgba(16,185,129,0.5)' : active ? '1.5px solid rgba(99,102,241,0.6)' : '1.5px solid rgba(255,255,255,0.08)',
                color: done ? '#10b981' : active ? '#a5b4fc' : '#334155',
                transition: 'all 0.3s',
              }}>
                {done ? '✓' : i + 1}
              </div>
              {i < STEPS.length - 1 && (
                <div style={{
                  width: 1.5, height: 44, marginTop: 4,
                  background: done ? 'rgba(16,185,129,0.4)' : 'rgba(255,255,255,0.06)',
                  transition: 'background 0.4s',
                }} />
              )}
            </div>
            <div style={{ paddingTop: 9, paddingBottom: i < STEPS.length - 1 ? 44 : 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: active ? 700 : 500, color: active ? '#f1f5f9' : done ? '#64748b' : '#334155', transition: 'color 0.3s' }}>
                {s.label}
              </div>
              <div style={{ fontSize: 11.5, color: active ? '#818cf8' : '#1e293b', marginTop: 2 }}>
                {s.desc}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function Onboarding({ session, isEmbedded = false, onStoreConnected }) {
  const [step, setStep]               = useState(0);
  const [storeName, setStoreName]     = useState('');
  const [shopifyDomain, setShopifyDomain] = useState('');
  const [clientId, setClientId]       = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [themeColor, setThemeColor]   = useState('#6366f1');
  const [showToken, setShowToken]     = useState(false);
  const [syncFromType, setSyncFromType] = useState('all');
  const [syncFromDate, setSyncFromDate] = useState('2000-01-01');
  const [syncToDate, setSyncToDate]     = useState('');
  const [loading, setLoading]         = useState(false);
  const [connectError, setConnectError] = useState('');
  const [connectStatus, setConnectStatus] = useState('');
  const navigate = useNavigate();

  const nextStep = () => setStep(s => Math.min(s + 1, STEPS.length - 1));
  const prevStep = () => setStep(s => Math.max(s - 1, 0));

  const handleOnboard = async e => {
    e.preventDefault();
    setLoading(true);
    setConnectError('');
    setConnectStatus('Verifying Shopify credentials…');
    try {
      const apiUrl = import.meta.env.VITE_API_URL || '';
      const res = await fetch(`${apiUrl}/api/store`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ owner_id: session.user.id, store_name: storeName, shopify_domain: shopifyDomain, shopify_client_id: clientId, shopify_access_token: accessToken, primary_color: themeColor, dashboard_style: 'dark-modern', sync_from_date: syncFromDate, sync_to_date: syncToDate || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to connect store');
      if (data?.id) {
        setConnectStatus('Syncing your orders from Shopify…');
        try { await fetch(`${apiUrl}/api/sync/${data.id}`, { method: 'POST' }); }
        catch (e) { console.warn('sync failed (non-critical)', e); }
      }
      setConnectStatus('🎉 Store connected! Loading dashboard…');
      await new Promise(r => setTimeout(r, 800));
      if (onStoreConnected) { onStoreConnected(); } else { navigate('/dashboard'); }
    } catch (err) {
      setConnectError(err.message);
      setConnectStatus('');
    } finally {
      setLoading(false);
    }
  };

  if (isEmbedded) {
    const handleEmbeddedSubmit = async () => {
      if (!storeName.trim() || !shopifyDomain.trim() || !accessToken.trim()) return;
      setLoading(true);
      setConnectError('');
      setConnectStatus('Verifying Shopify credentials…');
      try {
        const apiUrl = import.meta.env.VITE_API_URL || '';
        const res = await fetch(`${apiUrl}/api/store`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ owner_id: session.user.id, store_name: storeName, shopify_domain: shopifyDomain, shopify_client_id: clientId, shopify_access_token: accessToken, primary_color: themeColor, dashboard_style: 'dark-modern', sync_from_date: syncFromDate, sync_to_date: syncToDate || null }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to connect store');
        if (data?.id) {
          setConnectStatus('Syncing your orders from Shopify…');
          try { await fetch(`${apiUrl}/api/sync/${data.id}`, { method: 'POST' }); }
          catch (e) { console.warn('sync failed (non-critical)', e); }
        }
        setConnectStatus('🎉 Store connected! Loading dashboard…');
        await new Promise(r => setTimeout(r, 800));
        if (onStoreConnected) { onStoreConnected(); } else { navigate('/dashboard'); }
      } catch (err) {
        setConnectError(err.message);
        setConnectStatus('');
      } finally {
        setLoading(false);
      }
    };
    return (
      <div style={{ padding: '24px 0', maxWidth: 640, margin: '0 auto' }}>
        <ConnectingOverlay visible={loading} connectStatus={connectStatus} />
        {connectError && (
          <div style={{ marginBottom: 20, padding: '14px 18px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 14, color: '#f87171', fontSize: 13.5, lineHeight: 1.6 }}>
            ❌ {connectError}
          </div>
        )}
        <ConnectShopifyStep
          storeName={storeName} setStoreName={setStoreName}
          shopifyDomain={shopifyDomain} setShopifyDomain={setShopifyDomain}
          clientId={clientId} setClientId={setClientId}
          accessToken={accessToken} setAccessToken={setAccessToken}
          showToken={showToken} setShowToken={setShowToken}
          syncFromType={syncFromType} setSyncFromType={setSyncFromType}
          syncFromDate={syncFromDate} setSyncFromDate={setSyncFromDate}
          syncToDate={syncToDate} setSyncToDate={setSyncToDate}
          loading={loading} connectStatus={connectStatus}
          onBack={() => {}} onContinue={handleEmbeddedSubmit}
        />
      </div>
    );
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        @keyframes ob-aurora1 { 0%,100%{transform:translate(0,0) scale(1)} 33%{transform:translate(60px,-50px) scale(1.08)} 66%{transform:translate(-40px,40px) scale(0.95)} }
        @keyframes ob-aurora2 { 0%,100%{transform:translate(0,0) scale(1)} 33%{transform:translate(-50px,60px) scale(1.05)} 66%{transform:translate(40px,-30px) scale(1.1)} }
        @keyframes ob-float1  { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
        @keyframes shimmer    { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
        @keyframes pulse-dot  { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.5;transform:scale(1.4)} }
        @keyframes ob-float2  { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-7px)} }
        @keyframes ob-fadein  { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:none} }
        @keyframes ob-spin    { to{transform:rotate(360deg)} }
        @keyframes ob-step-ring { 0%{box-shadow:0 0 0 0 rgba(99,102,241,0.5)} 100%{box-shadow:0 0 0 10px rgba(99,102,241,0)} }
        @keyframes ob-shimmer { 0%{background-position:-200% center} 100%{background-position:200% center} }
        @keyframes ob-pulse-dot { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.5;transform:scale(1.5)} }
        @keyframes ob-border-glow { 0%,100%{opacity:0.5} 50%{opacity:1} }
        .ob-step-ring { animation: ob-step-ring 2s ease-out infinite; }
        .ob-input:focus { border-color:rgba(99,102,241,0.7)!important; box-shadow:0 0 0 4px rgba(99,102,241,0.12),0 0 24px rgba(99,102,241,0.08)!important; }
        .ob-btn-primary {
          width:100%; padding:17px; border-radius:14px; border:none;
          background:linear-gradient(135deg,#6366f1,#4f46e5);
          color:#fff; font-size:15px; font-weight:700; cursor:pointer;
          font-family:inherit; transition:all 0.25s;
          box-shadow:0 4px 28px rgba(99,102,241,0.4),0 0 0 1px rgba(99,102,241,0.3);
        }
        .ob-btn-primary:hover:not(:disabled) { transform:translateY(-2px); box-shadow:0 8px 36px rgba(99,102,241,0.5),0 0 0 1px rgba(99,102,241,0.4); }
        .ob-btn-primary:disabled { opacity:0.35; cursor:not-allowed; transform:none; }
        .ob-btn-ghost {
          width:100%; padding:15px; border-radius:14px;
          border:1px solid rgba(255,255,255,0.1); background:rgba(255,255,255,0.03);
          color:#64748b; font-size:14px; font-weight:500; cursor:pointer;
          font-family:inherit; transition:all 0.2s;
        }
        .ob-btn-ghost:hover { background:rgba(255,255,255,0.07); color:#e2e8f0; border-color:rgba(255,255,255,0.15); }
        .ob-metric-card { transition:all 0.25s; cursor:default; }
        .ob-metric-card:hover { transform:translateY(-4px)!important; border-color:rgba(255,255,255,0.14)!important; }
        @media(max-width:900px){ .ob-left{display:none!important} .ob-right{padding:32px 20px!important} }
      `}</style>

      <div style={{ display:'flex', height:'100vh', overflow:'hidden', background:'#030308', fontFamily:"'Inter',sans-serif", position:'relative' }}>

        {/* ── AMBIENT BACKGROUND ── */}
        <div style={{ position:'absolute', inset:0, overflow:'hidden', pointerEvents:'none', zIndex:0 }}>
          <div style={{ position:'absolute', width:900, height:900, borderRadius:'50%', background:'radial-gradient(circle,rgba(99,102,241,0.14) 0%,transparent 65%)', top:-350, left:-250, animation:'ob-aurora1 24s ease-in-out infinite' }} />
          <div style={{ position:'absolute', width:700, height:700, borderRadius:'50%', background:'radial-gradient(circle,rgba(34,211,238,0.09) 0%,transparent 65%)', bottom:-200, right:-150, animation:'ob-aurora2 30s ease-in-out infinite' }} />
          <div style={{ position:'absolute', width:600, height:600, borderRadius:'50%', background:'radial-gradient(circle,rgba(168,85,247,0.07) 0%,transparent 65%)', top:'40%', left:'38%', animation:'ob-aurora1 20s ease-in-out infinite 10s' }} />
          <div style={{ position:'absolute', inset:0, backgroundImage:'radial-gradient(circle at 1px 1px,rgba(255,255,255,0.025) 1px,transparent 0)', backgroundSize:'32px 32px' }} />
        </div>

        {/* ══ LEFT PANEL ══ */}
        <div className="ob-left" style={{
          width:460, flexShrink:0, position:'relative', zIndex:1, overflow:'hidden',
          background:'linear-gradient(170deg,rgba(7,7,22,0.95) 0%,rgba(9,8,28,0.92) 100%)',
          borderRight:'1px solid rgba(255,255,255,0.05)',
          display:'flex', flexDirection:'column', padding:'44px 40px',
        }}>
          {/* Left aurora accent */}
          <div style={{ position:'absolute', top:-100, right:-60, width:400, height:400, borderRadius:'50%', background:'radial-gradient(circle,rgba(99,102,241,0.18) 0%,transparent 70%)', pointerEvents:'none', animation:'ob-aurora1 18s ease-in-out infinite' }} />
          <div style={{ position:'absolute', bottom:0, left:-80, width:350, height:350, borderRadius:'50%', background:'radial-gradient(circle,rgba(34,211,238,0.09) 0%,transparent 70%)', pointerEvents:'none', animation:'ob-aurora2 22s ease-in-out infinite' }} />

          {/* Brand */}
          <div style={{ position:'relative', marginBottom:44 }}>
            <BrandLogo variant="full" iconSize={36} />
          </div>

          {/* AI badge + Headline */}
          <div style={{ position:'relative', marginBottom:36 }}>
            <div style={{ display:'inline-flex', alignItems:'center', gap:7, padding:'5px 12px', borderRadius:999, background:'rgba(99,102,241,0.08)', border:'1px solid rgba(99,102,241,0.18)', marginBottom:18 }}>
              <div style={{ width:6, height:6, borderRadius:'50%', background:'#6366f1', boxShadow:'0 0 8px #6366f1', animation:'ob-pulse-dot 2s ease-in-out infinite' }} />
              <span style={{ fontSize:10.5, fontWeight:700, color:'#818cf8', letterSpacing:'0.12em', textTransform:'uppercase' }}>AI-Powered Analytics</span>
            </div>
            <h1 style={{ fontSize:28, fontWeight:800, color:'#f1f5f9', margin:'0 0 12px', lineHeight:1.25, letterSpacing:'-0.5px' }}>
              Connect your store<br />
              <span style={{ background:'linear-gradient(135deg,#818cf8 0%,#22d3ee 100%)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>in under 2 minutes.</span>
            </h1>
            <p style={{ fontSize:13.5, color:'#475569', lineHeight:1.75, margin:0 }}>
              Securely sync your Shopify data and unlock real-time profit tracking, AI insights and operational analytics.
            </p>
          </div>

          {/* Live metric cards */}
          <div style={{ position:'relative', display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:36 }}>
            {METRICS.map((m, i) => (
              <div key={i} className="ob-metric-card" style={{
                padding:'14px 15px', borderRadius:14,
                background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)',
                backdropFilter:'blur(8px)', animation:`ob-float${i % 2 + 1} ${4 + i * 0.6}s ease-in-out infinite`,
                animationDelay:`${i * 0.4}s`,
              }}>
                <div style={{ fontSize:17, fontWeight:800, color:m.color, marginBottom:3, letterSpacing:'-0.5px' }}>{m.value}</div>
                <div style={{ fontSize:11, color:'#334155', marginBottom:6, lineHeight:1.3 }}>{m.label}</div>
                <div style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'2px 7px', borderRadius:99, background:`${m.color}18`, border:`1px solid ${m.color}30` }}>
                  <span style={{ fontSize:9.5, fontWeight:700, color:m.color, letterSpacing:'0.04em' }}>{m.change}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Stepper */}
          <div style={{ position:'relative', marginBottom:36 }}>
            <Stepper step={step} />
          </div>

          {/* Trust badges */}
          <div style={{ position:'relative', display:'flex', flexDirection:'column', gap:8, marginBottom:36 }}>
            {[
              { icon:'🔒', text:'Read-only access — your store is never modified' },
              { icon:'🛡️', text:'256-bit AES encryption on all credentials' },
              { icon:'↩️', text:'Revoke access instantly from Shopify Admin' },
            ].map(t => (
              <div key={t.text} style={{ display:'flex', alignItems:'flex-start', gap:10, padding:'10px 14px', borderRadius:12, background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.05)' }}>
                <span style={{ fontSize:13, flexShrink:0 }}>{t.icon}</span>
                <span style={{ fontSize:12, color:'#475569', lineHeight:1.6 }}>{t.text}</span>
              </div>
            ))}
          </div>

          {/* Reassurance footer */}
          <div style={{ position:'relative', marginTop:'auto', paddingTop:20, borderTop:'1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
              {['Setup in under 2 minutes','No coding required','Read-only secure access','Disconnect anytime'].map(r => (
                <div key={r} style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <div style={{ width:16, height:16, borderRadius:'50%', background:'rgba(16,185,129,0.1)', border:'1px solid rgba(16,185,129,0.3)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontSize:9, color:'#10b981' }}>✓</div>
                  <span style={{ fontSize:11.5, color:'#334155' }}>{r}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ══ RIGHT PANEL ══ */}
        <div className="ob-right" style={{
          flex:1, overflowY:'auto', position:'relative', zIndex:1,
          display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
          padding:'60px 56px',
          background:'radial-gradient(ellipse 80% 50% at 50% 0%,rgba(99,102,241,0.07) 0%,transparent 60%)',
        }}>
          <div style={{ width:'100%', maxWidth: step === 1 ? 700 : 540, animation:'ob-fadein 0.4s ease' }}>

            {/* ── Step 0: Store Name ── */}
            {step === 0 && (
              <div>
                <div style={{ marginBottom:36 }}>
                  <div style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'4px 11px', borderRadius:999, background:'rgba(99,102,241,0.08)', border:'1px solid rgba(99,102,241,0.18)', marginBottom:16 }}>
                    <span style={{ fontSize:10, fontWeight:700, color:'#818cf8', letterSpacing:'0.1em', textTransform:'uppercase' }}>Step 1 of 3</span>
                  </div>
                  <h2 style={{ fontSize:30, fontWeight:800, color:'#f8fafc', margin:'0 0 10px', letterSpacing:'-0.5px' }}>What's your store called?</h2>
                  <p style={{ fontSize:14.5, color:'#475569', margin:0, lineHeight:1.75 }}>This appears on your dashboard, analytics reports, and AI-generated insights.</p>
                </div>

                <div style={{ background:'rgba(255,255,255,0.025)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:24, padding:'36px 40px', backdropFilter:'blur(24px)', boxShadow:'0 32px 80px rgba(0,0,0,0.5),0 0 0 1px rgba(255,255,255,0.04),inset 0 1px 0 rgba(255,255,255,0.06)' }}>
                  <div style={{ marginBottom:28 }}>
                    <label style={labelSt}>Store Display Name</label>
                    <input className="ob-input" style={inp} type="text" required value={storeName}
                      onChange={e => setStoreName(e.target.value)} placeholder="e.g. Acme Apparel Co." />
                  </div>

                  <div style={{ padding:'14px 18px', borderRadius:14, background:'rgba(99,102,241,0.05)', border:'1px solid rgba(99,102,241,0.12)', marginBottom:28, display:'flex', gap:12, alignItems:'flex-start' }}>
                    <span style={{ fontSize:16 }}>🛡️</span>
                    <p style={{ margin:0, fontSize:13, color:'#64748b', lineHeight:1.7 }}>
                      <strong style={{ color:'#c7d2fe' }}>Your data stays yours.</strong> Pocket Dashboard is a read-only analytics tool. We never edit, delete, or share your store data.
                    </p>
                  </div>

                  <button type="button" className="ob-btn-primary" onClick={nextStep} disabled={!storeName.trim()}>
                    Continue →
                  </button>
                </div>
              </div>
            )}

            {/* ── Step 1: Connect Shopify ── */}
            {step === 1 && (
              <ConnectShopifyStep
                shopifyDomain={shopifyDomain} setShopifyDomain={setShopifyDomain}
                clientId={clientId}           setClientId={setClientId}
                accessToken={accessToken}     setAccessToken={setAccessToken}
                showToken={showToken}         setShowToken={setShowToken}
                syncFromType={syncFromType}   setSyncFromType={setSyncFromType}
                syncFromDate={syncFromDate}   setSyncFromDate={setSyncFromDate}
                syncToDate={syncToDate}   setSyncToDate={setSyncToDate}
                onBack={prevStep}             onContinue={nextStep}
              />
            )}

            {/* ── Step 2: Brand Color ── */}
            {step === 2 && (
              <form onSubmit={handleOnboard}>
                <div style={{ marginBottom:36 }}>
                  <div style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'4px 11px', borderRadius:999, background:'rgba(16,185,129,0.08)', border:'1px solid rgba(16,185,129,0.2)', marginBottom:16 }}>
                    <span style={{ fontSize:10, fontWeight:700, color:'#34d399', letterSpacing:'0.1em', textTransform:'uppercase' }}>Last Step</span>
                  </div>
                  <h2 style={{ fontSize:30, fontWeight:800, color:'#f8fafc', margin:'0 0 10px', letterSpacing:'-0.5px' }}>Set your brand color</h2>
                  <p style={{ fontSize:14.5, color:'#475569', margin:0, lineHeight:1.75 }}>Personalise your dashboard to match your brand identity.</p>
                </div>

                <div style={{ background:'rgba(255,255,255,0.025)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:24, padding:'36px 40px', backdropFilter:'blur(24px)', boxShadow:'0 32px 80px rgba(0,0,0,0.5),0 0 0 1px rgba(255,255,255,0.04),inset 0 1px 0 rgba(255,255,255,0.06)' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:20, padding:'20px 24px', background:'rgba(0,0,0,0.2)', borderRadius:16, border:'1px solid rgba(255,255,255,0.07)', marginBottom:32 }}>
                    <input type="color" value={themeColor} onChange={e => setThemeColor(e.target.value)}
                      style={{ width:60, height:60, padding:0, background:'none', border:'none', cursor:'pointer', borderRadius:12 }} />
                    <div style={{ flex:1 }}>
                      <div style={{ fontWeight:700, fontSize:19, color:themeColor, marginBottom:4, fontFamily:'monospace' }}>{themeColor.toUpperCase()}</div>
                      <div style={{ fontSize:13, color:'#475569' }}>Click the swatch to choose your brand accent</div>
                    </div>
                    <div style={{ width:80, height:48, borderRadius:12, background:`linear-gradient(135deg,${themeColor},#111)`, boxShadow:`0 0 28px ${themeColor}60` }} />
                  </div>

                  <div style={{ padding:'14px 18px', borderRadius:14, background:'rgba(16,185,129,0.05)', border:'1px solid rgba(16,185,129,0.15)', marginBottom:32, display:'flex', gap:10 }}>
                    <span style={{ fontSize:16 }}>✅</span>
                    <p style={{ margin:0, fontSize:13, color:'#64748b', lineHeight:1.7 }}>
                      Almost done! Your store data will sync automatically after setup. <strong style={{ color:'#e2e8f0' }}>No store data is ever modified.</strong>
                    </p>
                  </div>

                  {connectError && (
                    <div style={{ marginBottom: 20, padding: '14px 18px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 14, color: '#f87171', fontSize: 13.5, lineHeight: 1.6 }}>
                      ❌ {connectError}
                    </div>
                  )}

                  <div style={{ display:'flex', gap:12 }}>
                    <button type="button" className="ob-btn-ghost" onClick={prevStep} style={{ width:'auto', flex:1 }}>← Back</button>
                    <button type="submit" className="ob-btn-primary" style={{ flex:2 }} disabled={loading}>
                      {loading
                        ? <span style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:10 }}>
                            <span style={{ width:16, height:16, border:'2px solid rgba(255,255,255,0.3)', borderTopColor:'#fff', borderRadius:'50%', animation:'ob-spin 0.7s linear infinite', display:'inline-block' }} />
                            Setting up your dashboard…
                          </span>
                        : '🚀 Launch My Dashboard'
                      }
                    </button>
                  </div>
                </div>
              </form>
            )}

          </div>
        </div>
      </div>
      <ConnectingOverlay visible={loading} connectStatus={connectStatus} />
    </>
  );
}
