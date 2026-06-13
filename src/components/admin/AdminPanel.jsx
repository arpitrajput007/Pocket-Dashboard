import React, { useState, useEffect, lazy, Suspense } from 'react';
import {
  LayoutDashboard, Users, CreditCard, Timer, TrendingUp, Bot,
  Plug, Headphones, Inbox, BarChart2, Bell, Settings, Shield,
  LogOut, ChevronRight, Zap, Activity, Menu, X,
} from 'lucide-react';

const AdminDashboard     = lazy(() => import('./AdminDashboard'));
const AdminUsers         = lazy(() => import('./AdminUsers'));
const AdminSubscriptions = lazy(() => import('./AdminSubscriptions'));
const AdminTrials        = lazy(() => import('./AdminTrials'));
const AdminRevenue       = lazy(() => import('./AdminRevenue'));
const AdminAI            = lazy(() => import('./AdminAI'));
const AdminIntegrations  = lazy(() => import('./AdminIntegrations'));
const AdminSupport       = lazy(() => import('./AdminSupport'));
const AdminRequests      = lazy(() => import('./AdminRequests'));
const AdminMarketing     = lazy(() => import('./AdminMarketing'));
const AdminNotifications = lazy(() => import('./AdminNotifications'));
const AdminSettings      = lazy(() => import('./AdminSettings'));

const NAV_SECTIONS = [
  { id: 'dashboard',     label: 'Overview',        icon: LayoutDashboard, badge: null,  group: 'main' },
  { id: 'users',         label: 'Users',            icon: Users,           badge: null,  group: 'main' },
  { id: 'subscriptions', label: 'Subscriptions',    icon: CreditCard,      badge: null,  group: 'main' },
  { id: 'trials',        label: 'Trials',           icon: Timer,           badge: null,  group: 'main' },
  { id: 'revenue',       label: 'Revenue',          icon: TrendingUp,      badge: null,  group: 'finance' },
  { id: 'ai',            label: 'AI Copilot',       icon: Bot,             badge: null,  group: 'ops' },
  { id: 'integrations',  label: 'Integrations',     icon: Plug,            badge: null,  group: 'ops' },
  { id: 'support',       label: 'Support',          icon: Headphones,      badge: null,  group: 'ops' },
  { id: 'requests',      label: 'Custom Requests',  icon: Inbox,           badge: null,  group: 'ops' },
  { id: 'marketing',     label: 'Marketing',        icon: BarChart2,       badge: null,  group: 'growth' },
  { id: 'notifications', label: 'Notifications',    icon: Bell,            badge: null,  group: 'growth' },
  { id: 'settings',      label: 'Settings',         icon: Settings,        badge: null,  group: 'system' },
];

const NAV_GROUPS = [
  { id: 'main',    label: 'Platform' },
  { id: 'finance', label: 'Finance' },
  { id: 'ops',     label: 'Operations' },
  { id: 'growth',  label: 'Growth' },
  { id: 'system',  label: 'System' },
];

const SECTION_MAP = {
  dashboard:     AdminDashboard,
  users:         AdminUsers,
  subscriptions: AdminSubscriptions,
  trials:        AdminTrials,
  revenue:       AdminRevenue,
  ai:            AdminAI,
  integrations:  AdminIntegrations,
  support:       AdminSupport,
  requests:      AdminRequests,
  marketing:     AdminMarketing,
  notifications: AdminNotifications,
  settings:      AdminSettings,
};

function SectionFallback() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 400 }}>
      <div style={{ display: 'flex', gap: 6 }}>
        {[0,1,2].map(i => (
          <div key={i} style={{
            width: 6, height: 6, borderRadius: '50%',
            background: 'rgba(99,102,241,0.6)',
            animation: `dotBounce 1.2s ease-in-out ${i*0.2}s infinite`,
          }} />
        ))}
      </div>
    </div>
  );
}

export default function AdminPanel({ session }) {
  const [section, setSection] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const ActiveSection = SECTION_MAP[section] || AdminDashboard;
  const activeNav = NAV_SECTIONS.find(n => n.id === section);

  const exitAdmin = () => { window.location.href = '/dashboard'; };

  return (
    <div style={{
      display: 'flex', height: '100vh',
      background: '#07070e',
      fontFamily: '"Outfit", "Inter", -apple-system, sans-serif',
      color: '#e2e8f0',
      overflow: 'hidden',
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');
        @keyframes dotBounce {
          0%,80%,100% { transform:scale(0.6);opacity:0.3; }
          40% { transform:scale(1);opacity:1; }
        }
        @keyframes adminFadeIn {
          from { opacity:0; transform:translateY(8px); }
          to { opacity:1; transform:translateY(0); }
        }
        @keyframes pulse-glow {
          0%,100% { box-shadow:0 0 6px rgba(16,185,129,0.4); }
          50% { box-shadow:0 0 12px rgba(16,185,129,0.7); }
        }
        .admin-nav-btn:hover { background:rgba(255,255,255,0.04) !important; color:#e2e8f0 !important; }
        .admin-row:hover { background:rgba(255,255,255,0.03) !important; }
        .admin-card:hover { border-color:rgba(255,255,255,0.13) !important; background:rgba(255,255,255,0.04) !important; }
        .admin-action-btn:hover { opacity:1 !important; }
        ::-webkit-scrollbar { width:4px; height:4px; }
        ::-webkit-scrollbar-track { background:transparent; }
        ::-webkit-scrollbar-thumb { background:rgba(255,255,255,0.08); border-radius:4px; }
        ::-webkit-scrollbar-thumb:hover { background:rgba(255,255,255,0.15); }
      `}</style>

      {/* ── Sidebar ── */}
      <aside style={{
        width: sidebarOpen ? 232 : 0,
        minWidth: sidebarOpen ? 232 : 0,
        height: '100vh',
        background: '#0a0a16',
        borderRight: '1px solid rgba(255,255,255,0.065)',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
        transition: 'width 0.2s ease, min-width 0.2s ease',
        flexShrink: 0,
      }}>
        {/* Brand */}
        <div style={{ padding: '18px 16px 14px', borderBottom: '1px solid rgba(255,255,255,0.055)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <div style={{
              width: 34, height: 34, borderRadius: 9,
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(99,102,241,0.4)',
              flexShrink: 0,
            }}>
              <Zap size={16} color="#fff" strokeWidth={2.5} />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: '#e2e8f0', letterSpacing: '-0.02em' }}>Pocket</div>
              <div style={{ fontSize: 9.5, color: 'rgba(226,232,240,0.35)', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600 }}>Mission Control</div>
            </div>
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 7,
            padding: '5px 9px', borderRadius: 7,
            background: 'rgba(16,185,129,0.07)',
            border: '1px solid rgba(16,185,129,0.16)',
          }}>
            <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#10b981', animation: 'pulse-glow 2s ease-in-out infinite', flexShrink: 0 }} />
            <span style={{ fontSize: 11, color: '#34d399', fontWeight: 500, whiteSpace: 'nowrap' }}>All systems operational</span>
          </div>
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '10px 10px 0' }}>
          {NAV_GROUPS.map(group => {
            const groupItems = NAV_SECTIONS.filter(n => n.group === group.id);
            return (
              <div key={group.id} style={{ marginBottom: 4 }}>
                <div style={{ padding: '8px 8px 4px', fontSize: 10, fontWeight: 700, color: 'rgba(226,232,240,0.25)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                  {group.label}
                </div>
                {groupItems.map(item => {
                  const Icon = item.icon;
                  const active = section === item.id;
                  return (
                    <button
                      key={item.id}
                      className="admin-nav-btn"
                      onClick={() => setSection(item.id)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 9,
                        width: '100%', padding: '8px 9px', borderRadius: 8,
                        border: 'none', cursor: 'pointer',
                        background: active ? 'rgba(99,102,241,0.14)' : 'transparent',
                        color: active ? '#a5b4fc' : 'rgba(226,232,240,0.5)',
                        fontSize: 13, fontWeight: active ? 600 : 400,
                        textAlign: 'left', transition: 'all 0.12s',
                        marginBottom: 1, position: 'relative',
                      }}
                    >
                      {active && (
                        <div style={{
                          position: 'absolute', left: 0, top: '18%', bottom: '18%',
                          width: 2.5, borderRadius: '0 2px 2px 0',
                          background: 'linear-gradient(180deg, #6366f1, #8b5cf6)',
                        }} />
                      )}
                      <Icon size={14} strokeWidth={active ? 2.2 : 1.8} style={{ flexShrink: 0 }} />
                      <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.label}</span>
                      {item.badge && (
                        <span style={{
                          fontSize: 10, fontWeight: 700, padding: '1px 5px', borderRadius: 5,
                          background: active ? 'rgba(99,102,241,0.25)' : 'rgba(255,255,255,0.07)',
                          color: active ? '#a5b4fc' : 'rgba(226,232,240,0.4)',
                          flexShrink: 0,
                        }}>{item.badge}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </nav>

        {/* User Profile */}
        <div style={{ padding: '12px 14px 14px', borderTop: '1px solid rgba(255,255,255,0.055)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <div style={{
              width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 700, color: '#fff',
            }}>
              {session?.user?.email?.[0]?.toUpperCase() || 'A'}
            </div>
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#e2e8f0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {session?.user?.email || 'Admin'}
              </div>
              <div style={{ fontSize: 10, color: 'rgba(226,232,240,0.3)' }}>Super Admin</div>
            </div>
            <button
              onClick={exitAdmin}
              title="Exit Admin"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(226,232,240,0.25)', padding: 4, borderRadius: 6, transition: 'color 0.15s', flexShrink: 0 }}
              onMouseEnter={e => e.currentTarget.style.color = '#f87171'}
              onMouseLeave={e => e.currentTarget.style.color = 'rgba(226,232,240,0.25)'}
            >
              <LogOut size={13} />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        {/* Top Header */}
        <header style={{
          height: 52, flexShrink: 0,
          padding: '0 24px',
          display: 'flex', alignItems: 'center', gap: 10,
          background: 'rgba(7,7,14,0.9)',
          backdropFilter: 'blur(16px)',
          borderBottom: '1px solid rgba(255,255,255,0.055)',
          zIndex: 50,
        }}>
          <button
            onClick={() => setSidebarOpen(s => !s)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(226,232,240,0.35)', padding: 4, borderRadius: 6, display: 'flex', alignItems: 'center' }}
          >
            {sidebarOpen ? <X size={15} /> : <Menu size={15} />}
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 11, color: 'rgba(226,232,240,0.28)' }}>Mission Control</span>
            <ChevronRight size={12} color="rgba(226,232,240,0.2)" />
            <span style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0' }}>{activeNav?.label || 'Overview'}</span>
          </div>

          <div style={{ flex: 1 }} />

          <LiveClock />

          <div style={{ width: 1, height: 18, background: 'rgba(255,255,255,0.08)' }} />

          <button
            onClick={exitAdmin}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '5px 11px', borderRadius: 7,
              background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.18)',
              color: '#f87171', fontSize: 12, fontWeight: 500, cursor: 'pointer',
            }}
          >
            <LogOut size={12} />
            Exit Admin
          </button>
        </header>

        {/* Scrollable Content */}
        <main style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
          <div style={{ padding: '24px 24px 48px', animation: 'adminFadeIn 0.3s ease forwards' }} key={section}>
            <Suspense fallback={<SectionFallback />}>
              <ActiveSection session={session} />
            </Suspense>
          </div>
        </main>
      </div>
    </div>
  );
}

function LiveClock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <div style={{ fontSize: 11, color: 'rgba(226,232,240,0.3)', fontFamily: '"Roboto Mono", monospace', letterSpacing: '0.04em' }}>
      {time.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
      {' · '}
      {time.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
    </div>
  );
}
