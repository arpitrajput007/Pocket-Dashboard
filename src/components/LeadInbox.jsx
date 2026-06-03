import React, { useState, useMemo } from 'react';
import {
  Star, Eye, Check, X, Clock, MessageSquare, ExternalLink,
  Search, ChevronDown, ChevronUp, RefreshCw, Plus, Filter,
  LayoutGrid, List, AtSign,
} from 'lucide-react';

// ── Data ─────────────────────────────────────────────────────────────────────

const LEADS = [
  // ── Agentic Payments ──────────────────────────────────────────────────────
  {
    id: 1, company: 'NEAR Protocol', website: 'near.org', websiteUrl: 'https://near.org',
    industry: 'Blockchain',
    painPoint: 'Security and efficiency in cross-chain transactions for autonomous agents',
    product: 'Universal Payment Rails',
    score: 85, status: 'New', category: 'Agentic Payments', subCategory: 'Agent Infrastructure', isKimaTarget: true,
  },
  {
    id: 2, company: 'Fireblocks', website: 'www.fireblocks.com', websiteUrl: 'https://www.fireblocks.com',
    industry: 'Digital Asset Custody',
    painPoint: 'Bridge and cross-chain messaging risks for institutional clients',
    product: 'Universal Payment Rails',
    score: 85, status: 'New', category: 'Agentic Payments', subCategory: 'Institutional Custody', isKimaTarget: true,
  },
  {
    id: 3, company: 'Skyfire', website: 'skyfire.xyz', websiteUrl: 'https://skyfire.xyz',
    industry: 'Agent Payments',
    painPoint: 'Limited policy enforcement beyond identity verification',
    product: 'Aeredium Governance Layer',
    score: 83, status: 'New', category: 'Agentic Payments', subCategory: 'Agent Identity & Payments', isKimaTarget: false,
  },

  // ── LayerZero ─────────────────────────────────────────────────────────────
  {
    id: 4, company: 'LayerZero', website: 'layerzero.network', websiteUrl: 'https://layerzero.network',
    industry: 'Blockchain Interoperability',
    painPoint: 'Vulnerability to bridge and cross-chain messaging exploits',
    product: 'Universal Payment Rails',
    score: 85, status: 'New', category: 'LayerZero', subCategory: null, isKimaTarget: true,
  },
  {
    id: 5, company: 'Stargate Finance', website: 'stargate.finance', websiteUrl: 'https://stargate.finance',
    industry: 'Cross-Chain DEX',
    painPoint: 'Liquidity fragmentation across chains limiting unified payment flows',
    product: 'Universal Payment Rails',
    score: 84, status: 'New', category: 'LayerZero', subCategory: null, isKimaTarget: true,
  },
  {
    id: 6, company: 'Uniswap', website: 'uniswap.org', websiteUrl: 'https://uniswap.org',
    industry: 'Decentralized Exchange',
    painPoint: 'Cross-chain swap settlement without native interoperability layer',
    product: 'Universal Payment Rails',
    score: 86, status: 'New', category: 'LayerZero', subCategory: null, isKimaTarget: true,
  },
  {
    id: 7, company: 'SushiSwap', website: 'sushi.com', websiteUrl: 'https://sushi.com',
    industry: 'Decentralized Exchange',
    painPoint: 'Multi-chain liquidity management and cross-chain execution risk',
    product: 'Universal Payment Rails',
    score: 80, status: 'New', category: 'LayerZero', subCategory: null, isKimaTarget: false,
  },
  {
    id: 8, company: 'PancakeSwap', website: 'pancakeswap.finance', websiteUrl: 'https://pancakeswap.finance',
    industry: 'Decentralized Exchange',
    painPoint: 'Native cross-chain payment settlement for multi-chain user base',
    product: 'Universal Payment Rails',
    score: 79, status: 'New', category: 'LayerZero', subCategory: null, isKimaTarget: false,
  },
  {
    id: 9, company: 'Curve Finance', website: 'curve.fi', websiteUrl: 'https://curve.fi',
    industry: 'Stablecoin DEX',
    painPoint: 'Stablecoin cross-chain transfer friction and settlement delays',
    product: 'Universal Payment Rails',
    score: 82, status: 'Contacted', category: 'LayerZero', subCategory: null, isKimaTarget: true,
  },
  {
    id: 10, company: 'Wormhole', website: 'wormhole.com', websiteUrl: 'https://wormhole.com',
    industry: 'Cross-Chain Infrastructure',
    painPoint: 'Competing bridge security model needing payment rail differentiation',
    product: 'Universal Payment Rails',
    score: 81, status: 'New', category: 'LayerZero', subCategory: null, isKimaTarget: true,
  },

  // ── Hacked Protocol ───────────────────────────────────────────────────────
  {
    id: 11, company: 'Ronin Network', website: 'roninchain.com', websiteUrl: 'https://roninchain.com',
    industry: 'Gaming Blockchain',
    painPoint: 'Rebuilding trust post-$600M bridge exploit — needs proven secure rails',
    product: 'Universal Payment Rails',
    score: 88, status: 'New', category: 'Hacked Protocol', subCategory: null, isKimaTarget: true,
  },
  {
    id: 12, company: 'Nomad Bridge', website: 'nomad.xyz', websiteUrl: 'https://nomad.xyz',
    industry: 'Cross-Chain Bridge',
    painPoint: 'Rebuilding after $190M hack — requires cryptographic security guarantees',
    product: 'Universal Payment Rails',
    score: 87, status: 'New', category: 'Hacked Protocol', subCategory: null, isKimaTarget: true,
  },
  {
    id: 13, company: 'Harmony', website: 'harmony.one', websiteUrl: 'https://harmony.one',
    industry: 'Layer 1 Blockchain',
    painPoint: 'Post-$100M bridge hack recovery — needs non-custodial bridge alternative',
    product: 'Universal Payment Rails',
    score: 85, status: 'New', category: 'Hacked Protocol', subCategory: null, isKimaTarget: true,
  },
  {
    id: 14, company: 'Mango Markets', website: 'mango.markets', websiteUrl: 'https://mango.markets',
    industry: 'DeFi Lending',
    painPoint: 'Oracle manipulation exposure — needs secure cross-chain settlement',
    product: 'Universal Payment Rails',
    score: 80, status: 'Contacted', category: 'Hacked Protocol', subCategory: null, isKimaTarget: false,
  },
  {
    id: 15, company: 'Beanstalk', website: 'bean.money', websiteUrl: 'https://bean.money',
    industry: 'DeFi Stablecoin',
    painPoint: 'Governance attack aftermath — needs trustless multi-chain payment rails',
    product: 'Universal Payment Rails',
    score: 78, status: 'New', category: 'Hacked Protocol', subCategory: null, isKimaTarget: false,
  },
  {
    id: 16, company: 'Euler Finance', website: 'euler.finance', websiteUrl: 'https://euler.finance',
    industry: 'DeFi Lending',
    painPoint: 'Flash loan vulnerability recovery — needs audited cross-chain rails',
    product: 'Universal Payment Rails',
    score: 82, status: 'New', category: 'Hacked Protocol', subCategory: null, isKimaTarget: true,
  },

  // ── Needs On/Off Ramp ─────────────────────────────────────────────────────
  {
    id: 17, company: 'dYdX', website: 'dydx.exchange', websiteUrl: 'https://dydx.exchange',
    industry: 'Derivatives DEX',
    painPoint: 'Fiat on/off ramp friction limiting institutional and retail adoption',
    product: 'Fiat Gateway Integration',
    score: 84, status: 'New', category: 'Needs On/Off Ramp', subCategory: null, isKimaTarget: true,
  },

  // ── Fireblocks ────────────────────────────────────────────────────────────
  {
    id: 18, company: 'Anchorage Digital', website: 'anchorage.com', websiteUrl: 'https://anchorage.com',
    industry: 'Institutional Custody',
    painPoint: 'Regulatory-compliant cross-chain settlement for institutional flows',
    product: 'Universal Payment Rails',
    score: 86, status: 'New', category: 'Fireblocks', subCategory: null, isKimaTarget: true,
  },
  {
    id: 19, company: 'BitGo', website: 'bitgo.com', websiteUrl: 'https://bitgo.com',
    industry: 'Digital Asset Custody',
    painPoint: 'Multi-chain settlement without custodial bridge exposure',
    product: 'Universal Payment Rails',
    score: 83, status: 'New', category: 'Fireblocks', subCategory: null, isKimaTarget: true,
  },

  // ── Other ─────────────────────────────────────────────────────────────────
  {
    id: 20, company: 'Phantom Wallet', website: 'phantom.com', websiteUrl: 'https://phantom.com',
    industry: 'Crypto Wallet',
    painPoint: 'Native cross-chain swap with no bridge risk for wallet users',
    product: 'Universal Payment Rails',
    score: 79, status: 'New', category: 'Other', subCategory: null, isKimaTarget: false,
  },
];

// ── Constants ─────────────────────────────────────────────────────────────────

const CATEGORY_ORDER = ['Agentic Payments', 'LayerZero', 'Hacked Protocol', 'Needs On/Off Ramp', 'Fireblocks', 'Other'];

const CATEGORY_COLORS = {
  'Agentic Payments':  { dot: '#a78bfa', bg: 'rgba(167,139,250,0.12)', border: 'rgba(167,139,250,0.3)', text: '#a78bfa' },
  'LayerZero':         { dot: '#22d3ee', bg: 'rgba(34,211,238,0.12)',  border: 'rgba(34,211,238,0.3)',  text: '#22d3ee' },
  'Hacked Protocol':   { dot: '#f87171', bg: 'rgba(248,113,113,0.12)', border: 'rgba(248,113,113,0.3)', text: '#f87171' },
  'Needs On/Off Ramp': { dot: '#34d399', bg: 'rgba(52,211,153,0.12)',  border: 'rgba(52,211,153,0.3)',  text: '#34d399' },
  'Fireblocks':        { dot: '#fb923c', bg: 'rgba(251,146,60,0.12)',  border: 'rgba(251,146,60,0.3)',  text: '#fb923c' },
  'Other':             { dot: '#7878a3', bg: 'rgba(120,120,163,0.12)', border: 'rgba(120,120,163,0.3)', text: '#7878a3' },
};

const STATUS_COLORS = {
  'New':       { bg: 'rgba(34,211,238,0.1)',  border: 'rgba(34,211,238,0.3)',  text: '#22d3ee' },
  'Contacted': { bg: 'rgba(251,191,36,0.1)',  border: 'rgba(251,191,36,0.3)',  text: '#fbbf24' },
  'Qualified': { bg: 'rgba(52,211,153,0.1)',  border: 'rgba(52,211,153,0.3)',  text: '#34d399' },
  'Closed':    { bg: 'rgba(120,120,163,0.1)', border: 'rgba(120,120,163,0.3)', text: '#7878a3' },
};

// ── Sub-component helpers ─────────────────────────────────────────────────────

function ScoreBadge({ score }) {
  const color = score >= 85 ? '#f87171' : score >= 82 ? '#fb923c' : '#22d3ee';
  const bg    = score >= 85 ? 'rgba(248,113,113,0.12)' : score >= 82 ? 'rgba(251,146,60,0.12)' : 'rgba(34,211,238,0.1)';
  const br    = score >= 85 ? 'rgba(248,113,113,0.3)'  : score >= 82 ? 'rgba(251,146,60,0.3)'  : 'rgba(34,211,238,0.25)';
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      minWidth: 40, padding: '4px 10px', borderRadius: 20,
      fontSize: 13, fontWeight: 700, color,
      background: bg, border: `1px solid ${br}`,
    }}>{score}</span>
  );
}

function StatusBadge({ status }) {
  const s = STATUS_COLORS[status] ?? STATUS_COLORS['New'];
  return (
    <span style={{
      display: 'inline-block', padding: '3px 10px', borderRadius: 20,
      fontSize: 12, fontWeight: 600, color: s.text,
      background: s.bg, border: `1px solid ${s.border}`,
    }}>{status}</span>
  );
}

function ActionBar({ lead }) {
  const btnStyle = (color = '#7878a3') => ({
    width: 28, height: 28, borderRadius: 8, border: `1px solid rgba(255,255,255,0.07)`,
    background: 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', color, transition: 'all 0.15s', flexShrink: 0,
  });
  return (
    <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
      <button title="View" style={btnStyle()} onMouseEnter={e => e.currentTarget.style.background='rgba(34,211,238,0.1)'} onMouseLeave={e => e.currentTarget.style.background='rgba(255,255,255,0.03)'}><Eye size={13} /></button>
      <button title="Qualify" style={btnStyle()} onMouseEnter={e => e.currentTarget.style.background='rgba(52,211,153,0.1)'} onMouseLeave={e => e.currentTarget.style.background='rgba(255,255,255,0.03)'}><Check size={13} /></button>
      <button title="Disqualify" style={btnStyle()} onMouseEnter={e => e.currentTarget.style.background='rgba(248,113,113,0.1)'} onMouseLeave={e => e.currentTarget.style.background='rgba(255,255,255,0.03)'}><X size={13} /></button>
      <button title="Snooze" style={btnStyle()} onMouseEnter={e => e.currentTarget.style.background='rgba(251,191,36,0.1)'} onMouseLeave={e => e.currentTarget.style.background='rgba(255,255,255,0.03)'}><Clock size={13} /></button>
      <button title="Note" style={btnStyle()} onMouseEnter={e => e.currentTarget.style.background='rgba(167,139,250,0.1)'} onMouseLeave={e => e.currentTarget.style.background='rgba(255,255,255,0.03)'}><MessageSquare size={13} /></button>
    </div>
  );
}

// ── Lead row ─────────────────────────────────────────────────────────────────

function LeadRow({ lead, starred, onStar }) {
  const col = CATEGORY_COLORS[lead.category];
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '220px 160px 1fr 160px 64px 100px 150px',
      gap: 0,
      padding: '12px 20px',
      borderBottom: '1px solid rgba(255,255,255,0.04)',
      alignItems: 'center',
      transition: 'background 0.15s',
    }}
      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.025)'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      {/* Company */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, paddingRight: 12 }}>
        <button
          onClick={() => onStar(lead.id)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: starred ? '#fbbf24' : '#3a3a5e', flexShrink: 0, marginTop: 1 }}
        >
          <Star size={14} fill={starred ? '#fbbf24' : 'none'} />
        </button>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <a
              href={lead.websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              style={{ fontSize: 13, fontWeight: 700, color: '#eeeef8', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}
            >
              {lead.company}
              <ExternalLink size={10} style={{ opacity: 0.4 }} />
            </a>
            {lead.isKimaTarget && (
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#22d3ee', flexShrink: 0 }} title="Kima target category" />
            )}
          </div>
          <div style={{ fontSize: 11, color: '#4a4a6e', marginTop: 2 }}>{lead.website}</div>
          <div style={{ marginTop: 3 }}>
            <button style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#4a4a6e' }}>
              <AtSign size={11} />
            </button>
          </div>
        </div>
      </div>

      {/* Industry */}
      <div style={{ fontSize: 12, color: '#7878a3', paddingRight: 12 }}>{lead.industry}</div>

      {/* Pain Point */}
      <div style={{ fontSize: 12, color: '#7878a3', paddingRight: 16, lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
        {lead.painPoint}
      </div>

      {/* Product */}
      <div style={{ fontSize: 12, color: '#a5b4fc', paddingRight: 12, lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
        {lead.product}
      </div>

      {/* Score */}
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <ScoreBadge score={lead.score} />
      </div>

      {/* Status */}
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <StatusBadge status={lead.status} />
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <ActionBar lead={lead} />
      </div>
    </div>
  );
}

// ── Table header ─────────────────────────────────────────────────────────────

function TableHeader() {
  const colStyle = { fontSize: 11, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#4a4a6e', padding: '10px 8px 10px 0' };
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '220px 160px 1fr 160px 64px 100px 150px',
      gap: 0,
      padding: '0 20px',
      background: 'rgba(255,255,255,0.025)',
      borderBottom: '1px solid rgba(255,255,255,0.06)',
    }}>
      <div style={colStyle}>Company</div>
      <div style={colStyle}>Industry</div>
      <div style={colStyle}>Pain Point</div>
      <div style={colStyle}>Product</div>
      <div style={{ ...colStyle, textAlign: 'center' }}>Score</div>
      <div style={{ ...colStyle, textAlign: 'center' }}>Status</div>
      <div style={{ ...colStyle, textAlign: 'right' }}>Actions</div>
    </div>
  );
}

// ── Category section ─────────────────────────────────────────────────────────

function CategorySection({ category, leads, starredIds, onStar }) {
  const [open, setOpen] = useState(true);
  const col = CATEGORY_COLORS[category] ?? CATEGORY_COLORS['Other'];
  const newCount = leads.filter(l => l.status === 'New').length;

  // For Agentic Payments, group by subCategory
  const isAgenticPayments = category === 'Agentic Payments';
  const subGroups = useMemo(() => {
    if (!isAgenticPayments) return null;
    const map = {};
    leads.forEach(l => {
      const key = l.subCategory || 'General';
      if (!map[key]) map[key] = [];
      map[key].push(l);
    });
    return map;
  }, [leads, isAgenticPayments]);

  return (
    <div style={{ border: `1px solid rgba(255,255,255,0.07)`, borderRadius: 14, overflow: 'hidden', background: 'rgba(255,255,255,0.015)', marginBottom: 16 }}>
      {/* Section header */}
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 20px', cursor: 'pointer',
          background: open ? `linear-gradient(90deg, ${col.bg} 0%, transparent 60%)` : 'transparent',
          borderBottom: open ? '1px solid rgba(255,255,255,0.06)' : 'none',
          transition: 'background 0.2s',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: col.dot, flexShrink: 0 }} />
          <span style={{ fontSize: 15, fontWeight: 700, color: '#eeeef8' }}>{category}</span>
          <span style={{ fontSize: 12, color: '#4a4a6e' }}>{leads.length} {leads.length === 1 ? 'lead' : 'leads'}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {newCount > 0 && (
            <span style={{ fontSize: 12, fontWeight: 700, padding: '2px 10px', borderRadius: 20, background: col.bg, border: `1px solid ${col.border}`, color: col.text }}>
              New {newCount}
            </span>
          )}
          {open ? <ChevronUp size={16} color="#7878a3" /> : <ChevronDown size={16} color="#7878a3" />}
        </div>
      </div>

      {open && (
        <>
          <TableHeader />
          {isAgenticPayments && subGroups ? (
            // Sub-category groups within Agentic Payments
            Object.entries(subGroups).map(([sub, subLeads]) => (
              <div key={sub}>
                <div style={{
                  padding: '8px 20px 6px',
                  background: 'rgba(167,139,250,0.04)',
                  borderBottom: '1px solid rgba(167,139,250,0.08)',
                  display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  <span style={{ width: 3, height: 14, borderRadius: 2, background: '#a78bfa', flexShrink: 0 }} />
                  <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#a78bfa' }}>{sub}</span>
                  <span style={{ fontSize: 11, color: '#4a4a6e' }}>{subLeads.length}</span>
                </div>
                {subLeads.map(lead => (
                  <LeadRow key={lead.id} lead={lead} starred={starredIds.has(lead.id)} onStar={onStar} />
                ))}
              </div>
            ))
          ) : (
            leads.map(lead => (
              <LeadRow key={lead.id} lead={lead} starred={starredIds.has(lead.id)} onStar={onStar} />
            ))
          )}
        </>
      )}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function LeadInbox() {
  const [activeCategory, setActiveCategory] = useState(null); // null = show all
  const [viewMode, setViewMode] = useState('category'); // 'category' | 'list'
  const [search, setSearch] = useState('');
  const [starredIds, setStarredIds] = useState(new Set());

  const toggleStar = (id) => {
    setStarredIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // Category counts (over all leads, ignoring search)
  const categoryCounts = useMemo(() => {
    const m = {};
    LEADS.forEach(l => { m[l.category] = (m[l.category] || 0) + 1; });
    return m;
  }, []);

  // Filtered leads
  const filtered = useMemo(() => {
    let list = LEADS;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(l =>
        l.company.toLowerCase().includes(q) ||
        l.industry.toLowerCase().includes(q) ||
        l.painPoint.toLowerCase().includes(q) ||
        l.product.toLowerCase().includes(q) ||
        l.category.toLowerCase().includes(q)
      );
    }
    return list;
  }, [search]);

  // Categories to display — strictly filtered when a tab is active
  const visibleCategories = useMemo(() => {
    if (activeCategory) return [activeCategory];
    return CATEGORY_ORDER.filter(cat => filtered.some(l => l.category === cat));
  }, [activeCategory, filtered]);

  const leadsForCategory = (cat) => filtered.filter(l => l.category === cat);

  const totalVisible = filtered.length;

  return (
    <div style={{ minHeight: '100vh', background: '#030307', color: '#eeeef8', fontFamily: "'Inter', -apple-system, sans-serif" }}>

      {/* ── Top bar ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '18px 28px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        background: 'rgba(255,255,255,0.01)',
        position: 'sticky', top: 0, zIndex: 10, backdropFilter: 'blur(12px)',
      }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em', color: '#eeeef8' }}>Lead Inbox</div>
          <div style={{ fontSize: 12, color: '#4a4a6e', marginTop: 1 }}>{totalVisible} leads</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* View toggles */}
          <button
            onClick={() => setViewMode('category')}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
              background: viewMode === 'category' ? 'rgba(167,139,250,0.2)' : 'rgba(255,255,255,0.04)',
              color: viewMode === 'category' ? '#a78bfa' : '#7878a3',
              outline: viewMode === 'category' ? '1px solid rgba(167,139,250,0.35)' : '1px solid rgba(255,255,255,0.07)',
            }}
          >
            <LayoutGrid size={13} /> Category
          </button>
          <button
            onClick={() => setViewMode('list')}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
              background: viewMode === 'list' ? 'rgba(167,139,250,0.2)' : 'rgba(255,255,255,0.04)',
              color: viewMode === 'list' ? '#a78bfa' : '#7878a3',
              outline: viewMode === 'list' ? '1px solid rgba(167,139,250,0.35)' : '1px solid rgba(255,255,255,0.07)',
            }}
          >
            <List size={13} /> List
          </button>
          <button
            style={{ width: 34, height: 34, borderRadius: 10, border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#7878a3' }}
            title="Refresh"
          >
            <RefreshCw size={14} />
          </button>
          <button
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: '#7878a3', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
          >
            Clean up
          </button>
          <button
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, #7c3aed, #a78bfa)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
          >
            <Plus size={13} /> Add Lead
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 1440, margin: '0 auto', padding: '24px 28px' }}>

        {/* ── Search + Filter ── */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: '1 1 260px', maxWidth: 420 }}>
            <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#4a4a6e', pointerEvents: 'none' }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search leads..."
              style={{
                width: '100%', boxSizing: 'border-box',
                padding: '9px 12px 9px 36px',
                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)',
                borderRadius: 10, color: '#eeeef8', fontSize: 13, outline: 'none',
              }}
            />
          </div>
          <button style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.09)', background: 'rgba(255,255,255,0.04)', color: '#7878a3', fontSize: 13, cursor: 'pointer' }}>
            <Filter size={13} /> Filters
          </button>
        </div>

        {/* ── Legend ── */}
        <div style={{ display: 'flex', gap: 20, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center', fontSize: 12, color: '#4a4a6e' }}>
          <span style={{ color: '#f87171', fontWeight: 600 }}>Excellent — score 85+, top BD target</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22d3ee', display: 'inline-block' }} /> Kima target category
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#7878a3', display: 'inline-block' }} /> Other category
          </span>
        </div>

        {/* ── Category tabs ── */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
          <button
            onClick={() => setActiveCategory(null)}
            style={{
              padding: '6px 14px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: !activeCategory ? 700 : 500,
              background: !activeCategory ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.04)',
              color: !activeCategory ? '#eeeef8' : '#7878a3',
              outline: !activeCategory ? '1px solid rgba(255,255,255,0.2)' : '1px solid rgba(255,255,255,0.07)',
            }}
          >
            All {LEADS.length}
          </button>
          {CATEGORY_ORDER.map(cat => {
            const col = CATEGORY_COLORS[cat];
            const active = activeCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(active ? null : cat)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '6px 14px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: active ? 700 : 500,
                  background: active ? col.bg : 'rgba(255,255,255,0.04)',
                  color: active ? col.text : '#7878a3',
                  outline: active ? `1px solid ${col.border}` : '1px solid rgba(255,255,255,0.07)',
                  transition: 'all 0.15s',
                }}
              >
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: col.dot }} />
                {cat} {categoryCounts[cat] || 0}
              </button>
            );
          })}
        </div>

        {/* ── Content ── */}
        {viewMode === 'category' ? (
          // Category view — accordion sections, strictly filtered by active tab
          visibleCategories.map(cat => {
            const leads = leadsForCategory(cat);
            if (leads.length === 0) return null;
            return (
              <CategorySection
                key={cat}
                category={cat}
                leads={leads}
                starredIds={starredIds}
                onStar={toggleStar}
              />
            );
          })
        ) : (
          // List view — flat table
          <div style={{ border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, overflow: 'hidden', background: 'rgba(255,255,255,0.015)' }}>
            <TableHeader />
            {filtered
              .filter(l => !activeCategory || l.category === activeCategory)
              .map(lead => (
                <LeadRow key={lead.id} lead={lead} starred={starredIds.has(lead.id)} onStar={toggleStar} />
              ))
            }
            {filtered.filter(l => !activeCategory || l.category === activeCategory).length === 0 && (
              <div style={{ padding: '60px 20px', textAlign: 'center', color: '#4a4a6e', fontSize: 14 }}>
                No leads match your filters.
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
