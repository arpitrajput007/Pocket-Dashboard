import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { Shield, Eye, EyeOff, ArrowLeft } from "lucide-react";
import { useNavigate, Link } from 'react-router-dom';
import { AuroraBackground } from './aurora-background';
import BrandLogo from './BrandLogo';

export default function Login({ adminMode = false }) {
  const [loading, setLoading]             = useState(false);
  const [email, setEmail]                 = useState('');
  const [password, setPassword]           = useState('');
  const [showPassword, setShowPassword]   = useState(false);
  const [error, setError]                 = useState(null);
  const navigate = useNavigate();

  const handleSignIn = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) {
      setError(signInError.message);
      setLoading(false);
    } else if (!adminMode) {
      navigate('/dashboard');
    }
    // adminMode: App.jsx re-renders on auth state change — no navigate needed
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px',
      position: 'relative',
      background: '#07070e',
      boxSizing: 'border-box',
    }}>
      <AuroraBackground />

      <div style={{
        position: 'relative',
        background: 'rgba(15,15,30,0.85)',
        backdropFilter: 'blur(20px)',
        borderRadius: '20px',
        padding: '40px',
        maxWidth: '440px',
        width: '100%',
        boxShadow: '0 0 0 1px rgba(99,102,241,0.15), 0 24px 64px rgba(0,0,0,0.6)',
        border: '1px solid rgba(255,255,255,0.08)',
        zIndex: 10
      }}>

        {!adminMode && (
          <Link
            to="/"
            style={{ position: 'absolute', top: '16px', left: '16px', background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', padding: '8px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'none', fontSize: '14px' }}
          >
            <ArrowLeft size={16} /> Back
          </Link>
        )}

        {adminMode && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 28, padding: '7px 12px', borderRadius: 8, background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', width: 'fit-content' }}>
            <Shield size={13} color="#a5b4fc" />
            <span style={{ fontSize: 12, fontWeight: 600, color: '#a5b4fc', letterSpacing: '0.04em' }}>ADMIN ACCESS</span>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '36px', marginTop: adminMode ? '0' : '12px' }}>
          <BrandLogo variant="full" iconSize={52} />
        </div>

        <h1 style={{ fontFamily: 'Outfit', fontSize: '28px', fontWeight: 800, marginBottom: '8px', color: '#fff' }}>
          {adminMode ? 'Mission Control' : 'Welcome back'}
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.6)', marginBottom: '32px', fontSize: '15px' }}>
          {adminMode
            ? 'Sign in to access Pocket Dashboard Mission Control.'
            : 'Sign in to access your real-time risk dashboard.'}
        </p>

        <form onSubmit={handleSignIn}>
          <div style={{ marginBottom: '16px', position: 'relative' }}>
            <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }}>✉️</span>
            <input
              id="auth-email"
              type="email"
              style={{ width: '100%', padding: '14px 14px 14px 44px', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: 'white', outline: 'none' }}
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div style={{ marginBottom: '24px', position: 'relative' }}>
            <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }}>🔒</span>
            <input
              id="auth-password"
              type={showPassword ? "text" : "password"}
              style={{ width: '100%', padding: '14px 44px 14px 44px', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: 'white', outline: 'none' }}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#ffffff', cursor: 'pointer', padding: '0', display: 'flex', alignItems: 'center' }}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', fontSize: '13px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'rgba(255,255,255,0.7)', cursor: 'pointer' }}>
              <input type="checkbox" style={{ accentColor: 'rgba(56, 189, 248, 1)', width: '15px', height: '15px', cursor: 'pointer', borderRadius: '4px' }} />
              Remember me
            </label>
            <a href="#" onClick={(e) => { e.preventDefault(); alert("Password reset link sent to your email!"); }} style={{ color: 'rgba(56, 189, 248, 1)', textDecoration: 'none', fontWeight: 600 }}>
              Forgot password?
            </a>
          </div>

          {error && (
            <div style={{ color: '#fb7185', fontSize: '13px', marginBottom: '16px', padding: '12px', background: 'rgba(251,113,133,0.08)', borderRadius: '8px', border: '1px solid rgba(251,113,133,0.2)' }}>
              ⚠️ {error}
            </div>
          )}

          <button
            id="auth-submit"
            type="submit"
            style={{ width: '100%', padding: '16px', fontSize: '15px', background: 'var(--primary-gradient)', color: '#000', fontWeight: 'bold', borderRadius: 'var(--radius)', cursor: 'pointer', border: 'none', boxShadow: 'var(--shadow-brand)' }}
            disabled={loading}
          >
            {loading ? '⟳ Processing...' : '→ Sign In'}
          </button>
        </form>

        {!adminMode && (
          <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '14px', color: 'rgba(255,255,255,0.6)' }}>
            New brand owner? {' '}
            <Link
              to="/signup"
              style={{ color: 'rgba(56, 189, 248, 1)', cursor: 'pointer', fontWeight: 600, textDecoration: 'none' }}
            >
              Sign up free
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
