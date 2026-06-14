import React, { useState, useEffect, lazy, Suspense } from 'react';
import { supabase } from './supabaseClient';
import { Routes, Route, Navigate } from 'react-router-dom';
import BrandLogo from './components/BrandLogo';

// ── Error Boundary ────────────────────────────────────────────────────────────
// Catches any JS crash inside the app and shows a helpful message instead of
// a pure black screen with no feedback.
class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error, info) { console.error('[ErrorBoundary]', error, info); }
  render() {
    if (this.state.error) {
      return (
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:'100vh', background:'#07071a', color:'#f1f5f9', fontFamily:'Outfit,sans-serif', gap:24, padding:40, textAlign:'center' }}>
          <div style={{ fontSize:40 }}>⚠️</div>
          <h2 style={{ margin:0, fontSize:22, fontWeight:700 }}>Something went wrong</h2>
          <p style={{ margin:0, color:'rgba(255,255,255,0.5)', fontSize:14, maxWidth:480, lineHeight:1.7 }}>
            The dashboard hit an unexpected error. Please <strong style={{color:'#a5b4fc'}}>hard-refresh</strong> (Cmd+Shift+R / Ctrl+Shift+R) — this usually clears it.
          </p>
          <details style={{ maxWidth:600, width:'100%', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:12, padding:'12px 16px', textAlign:'left' }}>
            <summary style={{ cursor:'pointer', fontSize:13, color:'rgba(255,255,255,0.5)', marginBottom:8 }}>Technical details</summary>
            <pre style={{ fontSize:12, color:'#f87171', whiteSpace:'pre-wrap', wordBreak:'break-word', margin:0 }}>{this.state.error?.toString()}</pre>
          </details>
          <button onClick={() => window.location.reload()} style={{ padding:'12px 28px', borderRadius:10, border:'none', background:'linear-gradient(135deg,#6366f1,#4f46e5)', color:'#fff', fontWeight:700, fontSize:14, cursor:'pointer' }}>
            Reload Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// Lazy load pages for better performance
const Landing = lazy(() => import('./components/Landing'));
const Login = lazy(() => import('./components/Login'));
const Signup = lazy(() => import('./components/Signup'));
const PersonalPanel = lazy(() => import('./components/PersonalPanel'));
const PrivacyPolicy = lazy(() => import('./components/PrivacyPolicy'));
const TermsAndConditions = lazy(() => import('./components/TermsAndConditions'));
const ContactPage = lazy(() => import('./components/ContactPage'));
const AdminPanel = lazy(() => import('./components/admin/AdminPanel'));

const isAdminEmail = (email) => {
  const list = (import.meta.env.VITE_ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
  // If no list configured, allow any authenticated user (dev mode)
  if (list.length === 0) return !!email;
  return list.includes(email?.toLowerCase());
};

// Detect admin subdomain — admin.pocketdashboard.app renders admin panel at all paths
const IS_ADMIN_SUBDOMAIN = typeof window !== 'undefined' &&
  (window.location.hostname === 'admin.pocketdashboard.app' ||
   window.location.hostname === 'admin.pocketdasboard.app' || // typo variant just in case
   window.location.hostname.startsWith('admin.localhost'));

const LoadingFallback = () => (
  <div style={{
    height: '100vh',
    display: 'flex', flexDirection: 'column',
    justifyContent: 'center', alignItems: 'center',
    gap: '28px',
    background: 'var(--bg-primary)',
    position: 'relative',
    overflow: 'hidden',
  }}>
    {/* Ambient glow */}
    <div style={{
      position: 'absolute',
      width: '400px', height: '400px',
      borderRadius: '50%',
      background: 'radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)',
      top: '50%', left: '50%',
      transform: 'translate(-50%, -50%)',
      pointerEvents: 'none',
    }} />

    {/* Logo container */}
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0px',
      animation: 'logoFadeIn 0.6s ease forwards',
      position: 'relative', zIndex: 1,
    }}>
      {/* Glass backing card */}
      <div style={{
        padding: '20px 32px',
        borderRadius: '20px',
        background: 'rgba(255,255,255,0.04)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255,255,255,0.07)',
        boxShadow: '0 8px 40px rgba(99,102,241,0.12), 0 0 0 1px rgba(99,102,241,0.08)',
        animation: 'pulse 2.4s ease-in-out infinite',
      }}>
        <BrandLogo variant="full" iconSize={56} />
      </div>
    </div>

    {/* Loading dots */}
    <div style={{ display: 'flex', gap: '6px', alignItems: 'center', position: 'relative', zIndex: 1 }}>
      {[0,1,2].map(i => (
        <div key={i} style={{
          width: '6px', height: '6px',
          borderRadius: '50%',
          background: 'rgba(99,102,241,0.6)',
          animation: `dotBounce 1.2s ease-in-out ${i * 0.2}s infinite`,
        }} />
      ))}
    </div>

    <style>{`
      @keyframes pulse {
        0%, 100% { transform: scale(1); box-shadow: 0 8px 40px rgba(99,102,241,0.12); }
        50% { transform: scale(1.015); box-shadow: 0 8px 56px rgba(99,102,241,0.22); }
      }
      @keyframes logoFadeIn {
        from { opacity: 0; transform: translateY(12px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @keyframes dotBounce {
        0%, 80%, 100% { transform: scale(0.6); opacity: 0.3; }
        40% { transform: scale(1); opacity: 1; }
      }
    `}</style>
  </div>
);

export default function App() {
  const [session, setSession] = useState(null);
  const [store,   setStore]   = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) checkOnboarding(session.user.id);
      else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) checkOnboarding(session.user.id);
      else { setStore(null); setLoading(false); }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkOnboarding = async (userId) => {
    try {
      // Use maybeSingle() — safe when 0 rows exist (single() throws an error)
      // Add order+limit to handle edge case of multiple rows for same user
      const { data, error } = await supabase
        .from('stores')
        .select('*')
        .eq('owner_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('[checkOnboarding] Supabase error fetching store:', error.message, error.code);
      }

      if (data) {
        console.log('[checkOnboarding] Store found:', data.store_name, data.shopify_domain);
        setStore(data);
        if (data.primary_color) {
          document.documentElement.style.setProperty('--primary', data.primary_color);
          document.documentElement.style.setProperty('--primary-hover', data.primary_color);
          document.documentElement.style.setProperty('--primary-gradient', `linear-gradient(135deg, ${data.primary_color} 0%, #111 100%)`);
        }
      } else {
        console.log('[checkOnboarding] No store found for userId:', userId);
        setStore(null);
      }
    } catch (err) {
      console.error('[checkOnboarding] Unexpected error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Allow child components to trigger a store re-fetch
  // setStore(null) first = instant UI update, then background re-sync confirms
  const refreshStore = async () => {
    setStore(null); // Instantly clears UI (shows connect form / no store state)
    if (session?.user?.id) {
      checkOnboarding(session.user.id); // Re-sync in background, don't await
    }
  };

  if (loading) return <LoadingFallback />;

  // ── Admin subdomain: admin.pocketdashboard.app ────────────────────────────
  // Renders the admin panel at every path on this subdomain.
  // Not logged in → show login. Logged in but not admin → redirect to main app.
  if (IS_ADMIN_SUBDOMAIN) {
    if (!session) return (
      <ErrorBoundary>
        <Suspense fallback={<LoadingFallback />}>
          <Login adminMode />
        </Suspense>
      </ErrorBoundary>
    );
    if (!isAdminEmail(session.user.email)) {
      return (
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:'100vh', background:'#07070e', color:'#e2e8f0', fontFamily:'Outfit,sans-serif', gap:16, padding:24, textAlign:'center' }}>
          <div style={{ fontSize:40 }}>🔒</div>
          <div style={{ fontSize:20, fontWeight:700 }}>Access Denied</div>
          <div style={{ fontSize:13, color:'rgba(226,232,240,0.45)', maxWidth:340 }}>
            This account is not on the admin list.<br />
            Logged in as: <strong style={{ color:'rgba(226,232,240,0.75)' }}>{session.user.email}</strong>
          </div>
          <div style={{ fontSize:12, color:'rgba(226,232,240,0.3)', maxWidth:380, lineHeight:1.6 }}>
            Make sure this email is added to <code style={{ background:'rgba(255,255,255,0.06)', padding:'1px 5px', borderRadius:4, color:'#a5b4fc' }}>VITE_ADMIN_EMAILS</code> in Vercel and that Vercel has redeployed after the change.
          </div>
          <button
            onClick={() => supabase.auth.signOut()}
            style={{ marginTop:8, padding:'10px 24px', borderRadius:10, border:'1px solid rgba(255,255,255,0.1)', background:'rgba(255,255,255,0.05)', color:'#e2e8f0', fontSize:13, fontWeight:600, cursor:'pointer' }}
          >
            Sign out &amp; try another account
          </button>
        </div>
      );
    }
    return (
      <ErrorBoundary>
        <Suspense fallback={<LoadingFallback />}>
          <AdminPanel session={session} />
        </Suspense>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route
            path="/login"
            element={session ? <Navigate to="/dashboard" /> : <Login />}
          />
          <Route
            path="/signup"
            element={session ? <Navigate to="/dashboard" /> : <Signup />}
          />
          <Route
            path="/dashboard"
            element={session ? <PersonalPanel session={session} store={store} onStoreConnected={refreshStore} /> : <Navigate to="/login" />}
          />

          {/* Super Admin Panel */}
          <Route
            path="/admin"
            element={
              session
                ? isAdminEmail(session.user.email)
                  ? <AdminPanel session={session} />
                  : <Navigate to="/dashboard" />
                : <Navigate to="/login" />
            }
          />

          {/* Compatibility routes */}
          <Route path="/onboard" element={<Navigate to="/dashboard" />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<TermsAndConditions />} />
          <Route path="/contact-us" element={<ContactPage />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}

