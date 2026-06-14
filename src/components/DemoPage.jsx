/**
 * DemoPage — Full interactive clone of the store owner dashboard.
 * Uses the exact same CSS values as the real PersonalPanel / DailyDashboard.
 * No auth required. All data is realistic hardcoded dummy data.
 */
import React, { useState, useRef, useEffect } from 'react';
import BrandLogo from './BrandLogo';
import {
  LayoutDashboard, BarChart, Calendar, TrendingUp, PieChart, Wallet, List,
  Package, DollarSign, Link2, SlidersHorizontal, Settings, Headphones,
  ChevronRight, Sparkles, Send, X, ShieldCheck,
} from 'lucide-react';

// ─── CSS token replicas (match index.css :root exactly) ──────────────────────
const C = {
  bg:       '#030307',
  surface:  '#0d0d1a',
  surface2: '#121224',
  textMain: '#eeeef8',
  textMuted:'#7878a3',
  textDim:  '#4a4a6e',
  border:   '#1e1e35',
  profit:   '#10b981',
  loss:     '#f43f5e',
  primary:  '#22d3ee',
};

// ─── Realistic dummy data ────────────────────────────────────────────────────
// PNL: ₹2,14,380 cumulative over 7 days (5 profitable, 2 loss)
const DAILY = [
  {
    date:'2026-06-14', label:'Sunday, June 14, 2026',
    orders:47, items:63, cpp:381,
    fulfilled:41, delivered:35, transit:14, otd:6,
    failed:4, canceled:2, rtoRisk:5, rto:1, unreachable:2, notConfirmed:1,
    revenue:148300, adSpend:24000, prepaid:18, cash:29, net:47200,
  },
  {
    date:'2026-06-13', label:'Saturday, June 13, 2026',
    orders:52, items:71, cpp:378,
    fulfilled:46, delivered:40, transit:16, otd:7,
    failed:4, canceled:2, rtoRisk:6, rto:2, unreachable:2, notConfirmed:1,
    revenue:164400, adSpend:26820, prepaid:21, cash:31, net:52400,
  },
  {
    date:'2026-06-12', label:'Friday, June 12, 2026',
    orders:28, items:36, cpp:491,
    fulfilled:24, delivered:20, transit:9, otd:4,
    failed:2, canceled:1, rtoRisk:3, rto:1, unreachable:1, notConfirmed:0,
    revenue:88600, adSpend:17680, prepaid:11, cash:17, net:-8840,
  },
  {
    date:'2026-06-11', label:'Thursday, June 11, 2026',
    orders:64, items:88, cpp:388,
    fulfilled:57, delivered:50, transit:20, otd:9,
    failed:6, canceled:3, rtoRisk:8, rto:2, unreachable:3, notConfirmed:2,
    revenue:202200, adSpend:34140, prepaid:26, cash:38, net:61800,
  },
  {
    date:'2026-06-10', label:'Wednesday, June 10, 2026',
    orders:41, items:55, cpp:385,
    fulfilled:37, delivered:32, transit:13, otd:5,
    failed:3, canceled:2, rtoRisk:5, rto:1, unreachable:2, notConfirmed:1,
    revenue:129800, adSpend:21170, prepaid:16, cash:25, net:38600,
  },
  {
    date:'2026-06-09', label:'Tuesday, June 9, 2026',
    orders:19, items:24, cpp:511,
    fulfilled:16, delivered:13, transit:6, otd:3,
    failed:2, canceled:1, rtoRisk:2, rto:0, unreachable:1, notConfirmed:0,
    revenue:60100, adSpend:12260, prepaid:8, cash:11, net:-23580,
  },
  {
    date:'2026-06-08', label:'Monday, June 8, 2026',
    orders:53, items:72, cpp:383,
    fulfilled:47, delivered:42, transit:17, otd:7,
    failed:5, canceled:3, rtoRisk:7, rto:2, unreachable:2, notConfirmed:1,
    revenue:167700, adSpend:27580, prepaid:21, cash:32, net:46800,
  },
];

const WEEKLY = [
  { week:'May 19–25', orders:187, revenue:299200, adSpend:72400, net:18430, delivered:142, rto:8 },
  { week:'May 26–Jun 1', orders:204, revenue:326400, adSpend:81800, net:23190, delivered:158, rto:9 },
  { week:'Jun 2–8',  orders:176, revenue:281600, adSpend:70600, net:11240, delivered:134, rto:11 },
  { week:'Jun 9–14', orders:138, revenue:224400, adSpend:58800, net:16340, delivered:105, rto:6 },
];

const MONTHLY = [
  { month:'Jan 2026', orders:721,  revenue:1153600, net:68400 },
  { month:'Feb 2026', orders:834,  revenue:1334400, net:94200 },
  { month:'Mar 2026', orders:956,  revenue:1529600, net:128700 },
  { month:'Apr 2026', orders:1087, revenue:1739200, net:155800 },
  { month:'May 2026', orders:1134, revenue:1814400, net:174200 },
  { month:'Jun 2026', orders:304,  revenue:486400,  net:52400  },
];

const PRODUCTS = [
  { name:'Wooden Block Set (Classic)', sku:'WBS-001', cost:380, price:799,  sold:312, revenue:249288 },
  { name:'Magnetic Tiles 32pc',        sku:'MT-032',  cost:620, price:1299, sold:248, revenue:322152 },
  { name:'Educational Flash Cards',    sku:'EFC-100', cost:120, price:349,  sold:487, revenue:169963 },
  { name:'STEM Robot Kit (Age 8+)',     sku:'STEM-R8', cost:890, price:1899, sold:143, revenue:271557 },
  { name:'Soft Plush Elephant 45cm',   sku:'SPE-045', cost:290, price:599,  sold:391, revenue:234209 },
  { name:'Rainbow Stacking Rings',     sku:'RSR-010', cost:180, price:449,  sold:528, revenue:237072 },
];

const AI_QA = {
  products: `📦 **Top Products by Revenue (Last 30 Days)**\n\n1. Magnetic Tiles 32pc — ₹3,22,152 (248 units)\n2. STEM Robot Kit — ₹2,71,557 (143 units)\n3. Wooden Block Set — ₹2,49,288 (312 units)\n\n💡 Magnetic Tiles has the highest AOV at ₹1,299. Consider running a bundle offer with Flash Cards to push AOV higher.`,
  rto: `⚠️ **RTO Risk Analysis**\n\nThis week's RTO risk: 6 orders (4.3% of total)\n\nHigh-risk signals:\n• 3 orders from Tier-3 cities with COD\n• 2 repeat unreachable customers\n• 1 address verification failed\n\n💡 Tip: Enable pre-paid discount (₹50 off) for Tier-3 COD orders to reduce RTO by ~35%.`,
  profit: `💰 **Ways to Increase Net Profit**\n\n1. **Reduce CPP** — Current CPP is ₹385. Consolidating ad spend on top 3 SKUs could bring it to ₹290.\n\n2. **Bundle deals** — Wooden Block Set + Flash Cards bundle at ₹1,099 could increase items-per-order from 1.3 → 2.1.\n\n3. **Prepaid push** — 61% orders are COD. Converting 20% to prepaid saves ₹52/order in RTO costs.\n\n4. **Lower RTO** — Current RTO at 4.1% vs industry avg 6.8%. Maintain this by calling unreachable customers within 2 hours.`,
  today: `📊 **Today's Performance Summary (Jun 14)**\n\nOrders: 47 | Revenue: ₹1,48,300 | Net: +₹47,200\n\n✅ 35 delivered | 🚚 14 in transit | 📦 6 out for delivery\n⚠️ 4 failed delivery | ❌ 2 canceled | 🔄 5 RTO risk\n\nCPP: ₹381 (good — below ₹400 target)\n\n💡 Day is tracking well. Watch the 4 failed delivery orders — follow up before 6 PM for re-delivery attempt.`,
  default: `🤖 **AI Co-Pilot**\n\nI can analyse your store data and give you real insights. In the live version, I have access to all your:\n• Order history & shipping status\n• Product costs & margins\n• Ad spend & ROAS by platform\n• RTO patterns & risk scoring\n\nTry asking me:\n→ "Show my top products"\n→ "What are my RTO risks?"\n→ "How can I increase profit?"\n→ "How is today performing?"`,
};

const fmt = (n) => '₹' + Math.abs(Number(n) || 0).toLocaleString('en-IN');

// ─── Glow-border map (matches index.css glow variants exactly) ────────────────
const GLOW = {
  green:  { border:'rgba(45,212,160,0.15)',  active:'rgba(45,212,160,0.6)',  hover:'rgba(45,212,160,0.55)',  shadow:'rgba(45,212,160,0.18)'  },
  red:    { border:'rgba(251,113,133,0.15)', active:'rgba(251,113,133,0.6)', hover:'rgba(251,113,133,0.55)', shadow:'rgba(251,113,133,0.18)' },
  blue:   { border:'rgba(96,165,250,0.15)',  active:'rgba(96,165,250,0.6)',  hover:'rgba(96,165,250,0.55)',  shadow:'rgba(96,165,250,0.18)'  },
  purple: { border:'rgba(167,139,250,0.15)', active:'rgba(167,139,250,0.6)', hover:'rgba(167,139,250,0.55)', shadow:'rgba(167,139,250,0.18)' },
  orange: { border:'rgba(249,115,22,0.15)',  active:'rgba(249,115,22,0.6)',  hover:'rgba(249,115,22,0.55)',  shadow:'rgba(249,115,22,0.18)'  },
  yellow: { border:'rgba(245,200,66,0.15)',  active:'rgba(245,200,66,0.6)',  hover:'rgba(245,200,66,0.55)',  shadow:'rgba(245,200,66,0.18)'  },
  indigo: { border:'rgba(129,140,248,0.15)', active:'rgba(129,140,248,0.6)', hover:'rgba(129,140,248,0.55)', shadow:'rgba(129,140,248,0.18)' },
  amber:  { border:'rgba(251,146,60,0.15)',  active:'rgba(251,146,60,0.6)',  hover:'rgba(251,146,60,0.55)',  shadow:'rgba(251,146,60,0.18)'  },
  white:  { border:'rgba(255,255,255,0.1)',  active:'rgba(255,255,255,0.3)', hover:'rgba(255,255,255,0.28)', shadow:'rgba(255,255,255,0.06)' },
};

// ─── MetricCard — pixel-matches the real .metric-card CSS ────────────────────
function MetricCard({ label, value, color, glow = 'white', onClick, active, note, badge }) {
  const [hov, setHov] = useState(false);
  const g = GLOW[glow] || GLOW.white;
  const borderColor = active ? g.active : hov && onClick ? g.hover : g.border;
  const shadow = hov && onClick ? `0 20px 60px ${g.shadow}, 0 0 0 1px ${g.border}, 0 4px 20px rgba(0,0,0,0.5)` : 'none';
  const bgColor = active ? `${g.shadow.replace('0.18','0.05').replace('0.06','0.02')}` : C.surface;

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      onClick={onClick}
      style={{
        padding:'26px 22px', borderRadius:18,
        background: bgColor,
        border:`1px solid ${borderColor}`,
        boxShadow: shadow,
        display:'flex', flexDirection:'column', gap:4,
        cursor: onClick ? 'pointer' : 'default',
        transition:'box-shadow 0.35s, border-color 0.35s, transform 0.35s cubic-bezier(0.23,1,0.32,1)',
        transform: hov && onClick ? 'translateY(-4px)' : 'none',
        position:'relative', overflow:'hidden',
      }}
    >
      {badge && <div style={{ position:'absolute', top:8, right:8, width:6, height:6, borderRadius:'50%', background:'#fbbf24', boxShadow:'0 0 8px #fbbf24', animation:'pulseY 2s infinite' }} />}
      {/* top shine line */}
      <div style={{ position:'absolute', top:0, left:'10%', right:'10%', height:1, background:'linear-gradient(90deg,transparent,rgba(255,255,255,0.12),transparent)', pointerEvents:'none' }} />
      <div style={{ fontSize:11, color:C.textMuted, textTransform:'uppercase', fontWeight:700, letterSpacing:'1px', fontFamily:'Inter,sans-serif' }}>{label}</div>
      <div style={{ fontSize:34, fontWeight:800, letterSpacing:'-2px', marginTop:6, lineHeight:1, color: color || C.textMain, fontFamily:'Outfit,sans-serif' }}>{value}</div>
      {note && <div style={{ fontSize:11, color:C.textDim, marginTop:8 }}>{note}</div>}
    </div>
  );
}

// ─── NavItem — matches PersonalPanel NavItem exactly ─────────────────────────
function NavItem({ icon: Icon, label, active, onClick, badge }) {
  const [hov, setHov] = useState(false);
  return (
    <button onClick={onClick} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        display:'flex', alignItems:'center', gap:12,
        width:'100%', padding:'11px 14px', borderRadius:12,
        background: active ? 'linear-gradient(135deg,rgba(34,211,238,0.10) 0%,rgba(99,102,241,0.07) 100%)' : hov ? 'rgba(255,255,255,0.05)' : 'transparent',
        border: active ? '1px solid rgba(34,211,238,0.25)' : '1px solid transparent',
        color: active ? '#fff' : hov ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.5)',
        cursor:'pointer', textAlign:'left', transition:'all 0.2s',
        fontFamily:'Outfit,sans-serif', fontSize:13.5, fontWeight: active ? 600 : 500,
        position:'relative', transform: hov && !active ? 'translateX(2px)' : 'none',
      }}>
      {active && <div style={{ position:'absolute', left:0, top:'18%', bottom:'18%', width:3, borderRadius:'0 3px 3px 0', background:'linear-gradient(180deg,#22d3ee,#6366f1)', boxShadow:'0 0 12px rgba(34,211,238,0.6)' }} />}
      <Icon size={17} strokeWidth={active ? 2.2 : 1.8} style={{ flexShrink:0, opacity: active ? 1 : 0.7 }} />
      <span style={{ flex:1 }}>{label}</span>
      {badge && <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:999, background:'rgba(34,211,238,0.12)', color:C.primary, border:'1px solid rgba(34,211,238,0.25)' }}>{badge}</span>}
      {active && <ChevronRight size={13} style={{ opacity:0.35, flexShrink:0 }} />}
    </button>
  );
}

// ─── DemoDaily ────────────────────────────────────────────────────────────────
function DemoDaily() {
  const [scoreStart, setScoreStart] = useState('2026-06-08');
  const [scoreEnd,   setScoreEnd]   = useState('2026-06-14');
  const [tempStart,  setTempStart]  = useState('2026-06-08');
  const [tempEnd,    setTempEnd]    = useState('2026-06-14');
  const [feedStart,  setFeedStart]  = useState('2026-06-08');
  const [feedEnd,    setFeedEnd]    = useState('2026-06-14');
  const [showTiles,  setShowTiles]  = useState(false);
  const [activeFilter, setActiveFilter] = useState({});

  const scoreDays = DAILY.filter(d => d.date >= scoreStart && d.date <= scoreEnd);
  const totNet  = scoreDays.reduce((s,d) => s + d.net, 0);
  const profDays = scoreDays.filter(d => d.net > 0);
  const lossDays = scoreDays.filter(d => d.net < 0);
  const profAmt  = profDays.reduce((s,d) => s + d.net, 0);
  const lossAmt  = lossDays.reduce((s,d) => s + d.net, 0);

  const feedDays = DAILY
    .filter(d => d.date >= feedStart && d.date <= feedEnd)
    .sort((a,b) => b.date.localeCompare(a.date));

  const toggleFilter = (date, key) =>
    setActiveFilter(f => ({ ...f, [date]: f[date] === key ? null : key }));

  return (
    <div style={{ paddingBottom:60 }}>

      {/* ── Scoreboard header bar ── */}
      <div style={{ display:'flex', alignItems:'center', gap:16, marginBottom:24, padding:'16px 20px', borderRadius:18, background:'rgba(15,15,26,0.6)', backdropFilter:'blur(20px)', border:`1px solid ${C.border}`, flexWrap:'wrap' }}>
        <h2 style={{ margin:0, fontSize:18, fontWeight:700, color:C.textMain, flex:1 }}>Profit / Loss Scoreboard</h2>
        <div style={{ display:'flex', alignItems:'flex-end', gap:12, flexWrap:'wrap' }}>
          <div>
            <label style={{ display:'block', fontSize:12, color:C.textMuted, marginBottom:4 }}>Start Date</label>
            <input type="date" value={tempStart} onChange={e=>setTempStart(e.target.value)} style={{ padding:'6px 10px', borderRadius:4, border:`1px solid ${C.border}`, background:'rgba(0,0,0,0.2)', color:'white', colorScheme:'dark', fontSize:13, outline:'none' }} />
          </div>
          <div>
            <label style={{ display:'block', fontSize:12, color:C.textMuted, marginBottom:4 }}>End Date</label>
            <input type="date" value={tempEnd} onChange={e=>setTempEnd(e.target.value)} style={{ padding:'6px 10px', borderRadius:4, border:`1px solid ${C.border}`, background:'rgba(0,0,0,0.2)', color:'white', colorScheme:'dark', fontSize:13, outline:'none' }} />
          </div>
          <button onClick={() => { setScoreStart(tempStart); setScoreEnd(tempEnd); }}
            style={{ alignSelf:'flex-end', height:34, padding:'0 16px', borderRadius:4, background:'linear-gradient(90deg,#38bdf8,#3b82f6)', color:'white', border:'none', fontWeight:500, cursor:'pointer', fontSize:13 }}>
            Calculate
          </button>
        </div>
      </div>

      {/* ── Scoreboard card ── */}
      <div style={{ marginBottom:32, padding:24, background:'rgba(5,5,5,0.4)', border:`1px solid rgba(255,255,255,0.1)`, borderRadius:18 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:16 }}>
          <div>
            <h3 style={{ margin:0, fontSize:14, color:C.textMuted, textTransform:'uppercase', letterSpacing:1 }}>Cumulative Net Profit</h3>
            <div style={{ fontSize:36, fontWeight:700, marginTop:8, color: totNet >= 0 ? C.profit : C.loss, textShadow: totNet >= 0 ? '0 0 20px rgba(16,185,129,0.4)' : '0 0 20px rgba(244,63,94,0.4)', fontFamily:'Outfit,sans-serif', letterSpacing:'-1px' }}>
              {totNet >= 0 ? '' : '-'}{fmt(Math.abs(totNet))}
            </div>
            <div style={{ fontSize:13, color:C.textMuted, marginTop:4 }}>
              {new Date(scoreStart+'T00:00:00').toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})} – {new Date(scoreEnd+'T00:00:00').toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}
            </div>
            <div style={{ marginTop:16, display:'flex', gap:12, flexWrap:'wrap' }}>
              <div style={{ background:'rgba(16,185,129,0.1)', border:'1px solid rgba(16,185,129,0.3)', padding:'10px 16px', borderRadius:10 }}>
                <div style={{ fontSize:11, color:'rgba(255,255,255,0.7)', textTransform:'uppercase', marginBottom:6, fontWeight:600 }}>Profitable Days ({profDays.length})</div>
                <div style={{ fontSize:18, fontWeight:700, color:C.profit }}>+{fmt(profAmt)}</div>
              </div>
              <div style={{ background:'rgba(244,63,94,0.1)', border:'1px solid rgba(244,63,94,0.3)', padding:'10px 16px', borderRadius:10 }}>
                <div style={{ fontSize:11, color:'rgba(255,255,255,0.7)', textTransform:'uppercase', marginBottom:6, fontWeight:600 }}>Loss Days ({lossDays.length})</div>
                <div style={{ fontSize:18, fontWeight:700, color:C.loss }}>-{fmt(Math.abs(lossAmt))}</div>
              </div>
            </div>
          </div>
          <button onClick={() => setShowTiles(t=>!t)}
            style={{ padding:'8px 16px', borderRadius:8, background: showTiles ? 'rgba(34,211,238,0.15)' : 'rgba(255,255,255,0.05)', border:`1px solid ${showTiles ? 'rgba(34,211,238,0.4)' : 'rgba(255,255,255,0.1)'}`, color: showTiles ? C.primary : 'white', fontWeight:600, cursor:'pointer', display:'flex', alignItems:'center', gap:8, fontSize:13, fontFamily:'Outfit,sans-serif', transition:'all 0.2s' }}>
            <LayoutDashboard size={15} /> {showTiles ? 'Hide Tiles' : 'Tile View'}
          </button>
        </div>

        {showTiles && (
          <div style={{ marginTop:24, borderTop:'1px solid rgba(255,255,255,0.05)', paddingTop:24 }}>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))', gap:12 }}>
              {scoreDays.slice().sort((a,b)=>b.date.localeCompare(a.date)).map(d => (
                <div key={d.date}
                  onMouseEnter={e=>e.currentTarget.style.transform='scale(1.04)'}
                  onMouseLeave={e=>e.currentTarget.style.transform='scale(1)'}
                  style={{ padding:'14px 10px', borderRadius:12, textAlign:'center', cursor:'pointer', transition:'transform 0.15s',
                    background: d.net >= 0 ? 'rgba(16,185,129,0.12)' : 'rgba(244,63,94,0.12)',
                    border:`1px solid ${d.net >= 0 ? 'rgba(16,185,129,0.3)' : 'rgba(244,63,94,0.3)'}`,
                  }}>
                  <div style={{ fontSize:11, color:'rgba(255,255,255,0.7)', fontWeight:600, marginBottom:4 }}>
                    {new Date(d.date+'T00:00:00').toLocaleDateString('en-US',{day:'numeric',month:'short'})}
                  </div>
                  <div style={{ fontSize:16, fontWeight:700, color: d.net >= 0 ? C.profit : C.loss }}>
                    {d.net >= 0 ? '+' : '-'}{fmt(Math.abs(d.net))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Daily Feed header ── */}
      <div style={{ display:'flex', alignItems:'center', gap:16, flexWrap:'wrap', marginBottom:24 }}>
        <h2 style={{ margin:0, fontSize:18, fontWeight:700, color:C.textMain, flex:1 }}>Daily Feed</h2>
        <div style={{ display:'flex', alignItems:'flex-end', gap:12, flexWrap:'wrap' }}>
          <div>
            <label style={{ display:'block', fontSize:12, color:C.textMuted, marginBottom:4 }}>Start Date:</label>
            <input type="date" value={feedStart} onChange={e=>setFeedStart(e.target.value)} style={{ padding:'6px 10px', borderRadius:4, border:`1px solid ${C.border}`, background:'rgba(0,0,0,0.2)', color:'white', colorScheme:'dark', fontSize:13, outline:'none' }} />
          </div>
          <div>
            <label style={{ display:'block', fontSize:12, color:C.textMuted, marginBottom:4 }}>End Date:</label>
            <input type="date" value={feedEnd} onChange={e=>setFeedEnd(e.target.value)} style={{ padding:'6px 10px', borderRadius:4, border:`1px solid ${C.border}`, background:'rgba(0,0,0,0.2)', color:'white', colorScheme:'dark', fontSize:13, outline:'none' }} />
          </div>
        </div>
      </div>

      {/* ── Day cards ── */}
      <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
        {feedDays.map(day => {
          const isP = day.net >= 0;
          const filter = activeFilter[day.date];
          return (
            <div key={day.date}
              style={{ borderRadius:18, padding:26, background:'rgba(15,15,26,0.65)', backdropFilter:'blur(20px)', border:'1px solid rgba(255,255,255,0.07)', boxShadow:'0 8px 32px rgba(0,0,0,0.3)', transition:'border-color 0.3s,box-shadow 0.3s' }}
              onMouseEnter={e=>{e.currentTarget.style.borderColor='rgba(255,255,255,0.12)'; e.currentTarget.style.boxShadow='0 16px 48px rgba(0,0,0,0.4)';}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor='rgba(255,255,255,0.07)'; e.currentTarget.style.boxShadow='0 8px 32px rgba(0,0,0,0.3)';}}>

              {/* Day header */}
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', borderBottom:'1px solid rgba(255,255,255,0.06)', paddingBottom:16, marginBottom:22, flexWrap:'wrap', gap:8 }}>
                <h2 style={{ margin:0, fontSize:21, fontWeight:800, color:C.textMain, fontFamily:'Outfit,sans-serif', letterSpacing:'-0.3px' }}>{day.label}</h2>
                <div style={{ display:'flex', gap:10 }}>
                  <span style={{ fontSize:14, padding:'5px 14px', borderRadius:999, background:'rgba(167,139,250,0.2)', color:'#c4b5fd', border:'1px solid rgba(167,139,250,0.4)', fontWeight:600 }}>CPP: {fmt(day.cpp)}</span>
                  <span style={{ fontSize:14, padding:'5px 14px', borderRadius:999, fontWeight:700,
                    background: isP ? 'rgba(16,185,129,0.2)' : 'rgba(244,63,94,0.2)',
                    color: isP ? C.profit : C.loss,
                    border: `1px solid ${isP ? 'rgba(16,185,129,0.5)' : 'rgba(244,63,94,0.5)'}`,
                  }}>Net: {isP ? '▲' : '▼'}{fmt(Math.abs(day.net))}</span>
                </div>
              </div>

              {/* Metrics grid — matches .metrics-grid CSS */}
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))', gap:18, marginBottom:0 }}>
                <MetricCard label="Orders"              value={day.orders}          glow="white"  onClick={() => toggleFilter(day.date,'orders')}    active={filter==='orders'} />
                <MetricCard label="Number of Items"     value={day.items}            glow="white"  note="Click to see breakdown" />
                <MetricCard label="CPP"                 value={fmt(day.cpp)}         glow="white"  note="Click for breakdown" />
                <MetricCard label="Fulfilled"           value={day.fulfilled}        color={C.profit} glow="green"  onClick={() => toggleFilter(day.date,'fulfilled')} active={filter==='fulfilled'} />
                <MetricCard label="Delivered"           value={day.delivered}        color={C.profit} glow="green"  note="Click to expand orders" onClick={() => toggleFilter(day.date,'delivered')} active={filter==='delivered'} />
                <MetricCard label="In Transit"          value={day.transit}          color="#60a5fa"  glow="blue"   onClick={() => toggleFilter(day.date,'transit')}   active={filter==='transit'} />
                <MetricCard label="Out for Delivery"    value={day.otd}              color="#c4b5fd"  glow="purple" onClick={() => toggleFilter(day.date,'otd')}       active={filter==='otd'} />
                <MetricCard label="Failed Delivery"     value={day.failed}           color="#f97316"  glow="orange" onClick={() => toggleFilter(day.date,'failed')}    active={filter==='failed'} />
                <MetricCard label="Canceled"            value={day.canceled}         color={C.loss}   glow="red"    onClick={() => toggleFilter(day.date,'canceled')}  active={filter==='canceled'} />
                <MetricCard label="Possibility of RTO"  value={day.rtoRisk}          color="#f59e0b"  glow="yellow" onClick={() => toggleFilter(day.date,'rtoRisk')}   active={filter==='rtoRisk'} />
                <MetricCard label="RTO / Undelivered"   value={day.rto}              color={C.loss}   glow="red"    onClick={() => toggleFilter(day.date,'rto')}       active={filter==='rto'} />
                <MetricCard label="Unreachable"         value={day.unreachable}      color="#facc15"  glow="yellow" onClick={() => toggleFilter(day.date,'unreachable')} active={filter==='unreachable'} />
                <MetricCard label="Order Not Confirmed" value={day.notConfirmed}     color={C.loss}   glow="red" />
                <MetricCard label="Revenue"             value={fmt(day.revenue)}     color="#60a5fa"  glow="blue" />
                <MetricCard label="Ad Spend"            value={fmt(day.adSpend)}     glow="white"  note="Click to edit breakdown" />
                <MetricCard label="Prepaid Orders"      value={day.prepaid}          color="#818cf8"  glow="indigo" onClick={() => toggleFilter(day.date,'prepaid')}  active={filter==='prepaid'} />
                <MetricCard label="Cash Orders"         value={day.cash}             color="#fb923c"  glow="amber"  onClick={() => toggleFilter(day.date,'cash')}     active={filter==='cash'} />
                <MetricCard label="Net Profit"          value={(isP?'+':'')+fmt(Math.abs(day.net))} color={isP?C.profit:C.loss} glow={isP?'green':'red'} note="Click for full breakdown" badge />
                <MetricCard label="PNL of Products"     value="📊"                   glow="yellow" note="Click for breakdown" badge />
              </div>

              {/* Filtered orders mini-table */}
              {filter && (
                <div style={{ marginTop:22, padding:'16px', borderRadius:10, background:'rgba(0,0,0,0.25)', border:`1px solid ${C.border}` }}>
                  <div style={{ fontSize:12, color:C.textMuted, marginBottom:12 }}>
                    Showing <strong style={{color:C.primary}}>{filter}</strong> orders for {day.label.split(',')[0]}
                  </div>
                  <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                    <thead>
                      <tr>
                        {['Order #','Customer','Amount','Payment','Tags'].map(h=>(
                          <th key={h} style={{ padding:'6px 8px', textAlign:'left', color:C.textMuted, fontWeight:600, fontSize:11, textTransform:'uppercase', letterSpacing:'0.8px', borderBottom:`1px solid ${C.border}` }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {SAMPLE_ORDERS.slice(0,5).map((o,i)=>(
                        <tr key={i} style={{ borderBottom:`1px solid rgba(255,255,255,0.04)` }}>
                          <td style={{ padding:'9px 8px', color:'#818cf8', fontWeight:600 }}>{o.id}</td>
                          <td style={{ padding:'9px 8px', color:'rgba(238,238,248,0.8)' }}>{o.name}</td>
                          <td style={{ padding:'9px 8px', color:C.textMain }}>{fmt(o.amount)}</td>
                          <td style={{ padding:'9px 8px' }}>
                            <span style={{ fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:4,
                              background: o.prepaid ? 'rgba(129,140,248,0.15)' : 'rgba(251,146,60,0.15)',
                              color: o.prepaid ? '#818cf8' : '#fb923c',
                              border:`1px solid ${o.prepaid?'rgba(129,140,248,0.4)':'rgba(251,146,60,0.4)'}` }}>
                              {o.prepaid ? 'PREPAID' : 'COD'}
                            </span>
                          </td>
                          <td style={{ padding:'9px 8px' }}>
                            <span style={{ fontSize:10, fontWeight:600, padding:'2px 8px', borderRadius:4, background:'rgba(255,255,255,0.07)', color:C.textMuted }}>{o.tag}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div style={{ marginTop:8, fontSize:11, color:C.textDim, fontStyle:'italic' }}>
                    Demo — showing 5 of {day.orders} orders · All interactions work in the live dashboard
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {feedDays.length === 0 && (
          <div style={{ padding:40, textAlign:'center', color:C.textDim }}>No data for selected date range</div>
        )}
      </div>

      <style>{`@keyframes pulseY{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
    </div>
  );
}

const SAMPLE_ORDERS = [
  { id:'#4821', name:'Priya Sharma',    amount:1299, prepaid:true,  tag:'Delivered' },
  { id:'#4822', name:'Rahul Mehta',     amount:799,  prepaid:false, tag:'In Transit' },
  { id:'#4823', name:'Anjali Singh',    amount:449,  prepaid:false, tag:'Out for Delivery' },
  { id:'#4824', name:'Vikram Nair',     amount:1899, prepaid:true,  tag:'Delivered' },
  { id:'#4825', name:'Deepika Reddy',   amount:349,  prepaid:false, tag:'Failed Delivery' },
];

// ─── DemoWeekly ───────────────────────────────────────────────────────────────
function DemoWeekly() {
  const maxRev = Math.max(...WEEKLY.map(w=>w.revenue));
  return (
    <div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:16, marginBottom:32 }}>
        {[
          { label:'Total Orders (4 wk)',    value:'705',    color:'#60a5fa' },
          { label:'Total Revenue (4 wk)',   value:'₹11.3L', color:C.profit },
          { label:'Net Profit (4 wk)',       value:'₹69,200', color:C.profit },
          { label:'Avg RTO Rate',            value:'4.8%',   color:'#f59e0b' },
        ].map((s,i)=>(
          <div key={i} style={{ padding:'24px 22px', borderRadius:18, background:C.surface, border:`1px solid ${C.border}` }}>
            <div style={{ fontSize:11, color:C.textMuted, textTransform:'uppercase', fontWeight:700, letterSpacing:'1px', marginBottom:6, fontFamily:'Inter,sans-serif' }}>{s.label}</div>
            <div style={{ fontSize:34, fontWeight:800, letterSpacing:'-2px', color:s.color, fontFamily:'Outfit,sans-serif' }}>{s.value}</div>
          </div>
        ))}
      </div>
      <div style={{ padding:24, borderRadius:18, background:'rgba(15,15,26,0.65)', border:`1px solid ${C.border}`, marginBottom:24 }}>
        <h3 style={{ margin:'0 0 20px', fontSize:15, fontWeight:700, color:C.textMain }}>Revenue by Week</h3>
        {WEEKLY.map((w,i)=>(
          <div key={i} style={{ display:'flex', alignItems:'center', gap:12, marginBottom:14 }}>
            <div style={{ width:130, fontSize:12, color:C.textMuted, flexShrink:0 }}>{w.week}</div>
            <div style={{ flex:1, height:36, borderRadius:8, background:'rgba(255,255,255,0.04)', overflow:'hidden' }}>
              <div style={{ height:'100%', width:`${(w.revenue/maxRev*100).toFixed(1)}%`, background:'linear-gradient(90deg,#22d3ee,#6366f1)', borderRadius:8, display:'flex', alignItems:'center', paddingLeft:10, transition:'width 0.8s' }}>
                <span style={{ fontSize:12, fontWeight:700, color:'rgba(255,255,255,0.9)', whiteSpace:'nowrap' }}>₹{(w.revenue/100000).toFixed(1)}L</span>
              </div>
            </div>
            <div style={{ width:90, textAlign:'right', fontSize:12, fontWeight:700, color: w.net>=0?C.profit:C.loss }}>+{fmt(w.net)}</div>
          </div>
        ))}
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))', gap:16 }}>
        {WEEKLY.map((w,i)=>(
          <div key={i} style={{ padding:'24px 22px', borderRadius:18, background:C.surface, border:`1px solid ${C.border}` }}>
            <div style={{ fontSize:13, fontWeight:700, color:C.textMain, marginBottom:14, fontFamily:'Outfit,sans-serif' }}>{w.week}</div>
            {[{l:'Orders',v:w.orders},{l:'Revenue',v:fmt(w.revenue)},{l:'Ad Spend',v:fmt(w.adSpend)},{l:'Net Profit',v:(w.net>=0?'+':'')+fmt(w.net),c:w.net>=0?C.profit:C.loss},{l:'Delivered',v:w.delivered,c:C.profit},{l:'RTO',v:w.rto,c:C.loss}].map((r,j)=>(
              <div key={j} style={{ display:'flex', justifyContent:'space-between', padding:'5px 0', borderBottom:`1px solid rgba(255,255,255,0.05)` }}>
                <span style={{ fontSize:12, color:C.textMuted }}>{r.l}</span>
                <span style={{ fontSize:12, fontWeight:600, color:r.c||C.textMain }}>{r.v}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── DemoMonthly ──────────────────────────────────────────────────────────────
function DemoMonthly() {
  const maxOrders = Math.max(...MONTHLY.map(m=>m.orders));
  return (
    <div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:16, marginBottom:32 }}>
        {[
          {label:'Total Orders (6 mo)',value:'5,036',color:'#60a5fa'},
          {label:'Total Revenue (6 mo)',value:'₹80.8L',color:C.profit},
          {label:'Total Net Profit',value:'₹6.73L',color:C.profit},
          {label:'Avg Monthly Growth',value:'+12.4%',color:'#a78bfa'},
        ].map((s,i)=>(
          <div key={i} style={{ padding:'24px 22px', borderRadius:18, background:C.surface, border:`1px solid ${C.border}` }}>
            <div style={{ fontSize:11, color:C.textMuted, textTransform:'uppercase', fontWeight:700, letterSpacing:'1px', marginBottom:6, fontFamily:'Inter,sans-serif' }}>{s.label}</div>
            <div style={{ fontSize:34, fontWeight:800, letterSpacing:'-2px', color:s.color, fontFamily:'Outfit,sans-serif' }}>{s.value}</div>
          </div>
        ))}
      </div>
      <div style={{ padding:24, borderRadius:18, background:'rgba(15,15,26,0.65)', border:`1px solid ${C.border}`, marginBottom:24 }}>
        <h3 style={{ margin:'0 0 20px', fontSize:15, fontWeight:700, color:C.textMain }}>Orders by Month</h3>
        <div style={{ display:'flex', alignItems:'flex-end', gap:10, height:180 }}>
          {MONTHLY.map((m,i)=>{
            const h = Math.round((m.orders/maxOrders)*140);
            return (
              <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:6 }}>
                <div style={{ fontSize:10, fontWeight:700, color:C.profit }}>+₹{(m.net/1000).toFixed(0)}K</div>
                <div style={{ width:'100%', height:h, borderRadius:'8px 8px 0 0', background:'linear-gradient(180deg,#22d3ee,#6366f1)', display:'flex', alignItems:'flex-start', justifyContent:'center', paddingTop:6 }}>
                  <span style={{ fontSize:11, fontWeight:700, color:'rgba(255,255,255,0.9)' }}>{m.orders}</span>
                </div>
                <div style={{ fontSize:9, color:C.textMuted, textAlign:'center', lineHeight:1.3 }}>{m.month.split(' ').slice(0,2).join('\n')}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── DemoAllTime ──────────────────────────────────────────────────────────────
function DemoAllTime() {
  return (
    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))', gap:16 }}>
      {[
        {label:'Total Orders',     value:'5,036',    sub:'Since Jan 2026',  icon:'📦', c:'#60a5fa'},
        {label:'Total Revenue',    value:'₹80.8L',   sub:'Gross sales',     icon:'💰', c:C.profit},
        {label:'Net Profit',       value:'₹6.73L',   sub:'After all costs', icon:'📈', c:C.profit},
        {label:'Avg Order Value',  value:'₹1,604',   sub:'Per order',       icon:'🧾', c:'#a78bfa'},
        {label:'Total Delivered',  value:'3,727',    sub:'74% deliver rate', icon:'✅', c:C.profit},
        {label:'Total RTO',        value:'201',      sub:'4.0% RTO rate',   icon:'🔄', c:C.loss},
        {label:'Avg Daily Orders', value:'27.8',     sub:'Orders per day',  icon:'📅', c:'#60a5fa'},
        {label:'Best Day Revenue', value:'₹2,02,200',sub:'Thu, Jun 11',     icon:'🏆', c:'#fbbf24'},
      ].map((s,i)=>(
        <div key={i} style={{ padding:'26px 22px', borderRadius:18, background:C.surface, border:`1px solid ${C.border}`, position:'relative', overflow:'hidden' }}>
          <div style={{ position:'absolute', top:0, left:0, right:0, height:2, background:`linear-gradient(90deg,${s.c},transparent)`, opacity:0.7 }} />
          <div style={{ fontSize:24, marginBottom:10 }}>{s.icon}</div>
          <div style={{ fontSize:34, fontWeight:800, letterSpacing:'-2px', color:s.c, fontFamily:'Outfit,sans-serif', lineHeight:1 }}>{s.value}</div>
          <div style={{ fontSize:12, color:'rgba(238,238,248,0.65)', fontWeight:600, marginTop:8 }}>{s.label}</div>
          <div style={{ fontSize:11, color:C.textDim, marginTop:3 }}>{s.sub}</div>
        </div>
      ))}
    </div>
  );
}

// ─── DemoBusinessAnalytics ────────────────────────────────────────────────────
function DemoBusinessAnalytics() {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
        <div style={{ padding:24, borderRadius:18, background:C.surface, border:`1px solid ${C.border}` }}>
          <h3 style={{ margin:'0 0 16px', fontSize:13, fontWeight:700, color:C.textMuted, textTransform:'uppercase', letterSpacing:1 }}>Payment Split</h3>
          {[{label:'Prepaid Orders',pct:39,count:1958,c:'#818cf8'},{label:'COD Orders',pct:61,count:3078,c:'#fb923c'}].map((r,i)=>(
            <div key={i} style={{ marginBottom:14 }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                <span style={{ fontSize:13, color:'rgba(238,238,248,0.7)' }}>{r.label}</span>
                <span style={{ fontSize:13, fontWeight:700, color:r.c }}>{r.pct}% · {r.count}</span>
              </div>
              <div style={{ height:8, borderRadius:4, background:`${C.border}` }}>
                <div style={{ height:'100%', width:`${r.pct}%`, borderRadius:4, background:r.c }} />
              </div>
            </div>
          ))}
        </div>
        <div style={{ padding:24, borderRadius:18, background:C.surface, border:`1px solid ${C.border}` }}>
          <h3 style={{ margin:'0 0 16px', fontSize:13, fontWeight:700, color:C.textMuted, textTransform:'uppercase', letterSpacing:1 }}>Delivery Performance</h3>
          {[{l:'Delivered',pct:74,c:C.profit},{l:'In Transit',pct:12,c:'#60a5fa'},{l:'Failed',pct:6,c:'#f97316'},{l:'RTO',pct:4,c:C.loss},{l:'Canceled',pct:4,c:'#475569'}].map((r,i)=>(
            <div key={i} style={{ marginBottom:10 }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                <span style={{ fontSize:12, color:'rgba(238,238,248,0.7)' }}>{r.l}</span>
                <span style={{ fontSize:12, fontWeight:700, color:r.c }}>{r.pct}%</span>
              </div>
              <div style={{ height:6, borderRadius:3, background:C.border }}>
                <div style={{ height:'100%', width:`${r.pct}%`, borderRadius:3, background:r.c }} />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ padding:24, borderRadius:18, background:C.surface, border:`1px solid ${C.border}` }}>
        <h3 style={{ margin:'0 0 16px', fontSize:13, fontWeight:700, color:C.textMuted, textTransform:'uppercase', letterSpacing:1 }}>Top Cities by Orders</h3>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))', gap:10 }}>
          {[{c:'Mumbai',n:784},{c:'Delhi',n:621},{c:'Bengaluru',n:543},{c:'Hyderabad',n:412},{c:'Pune',n:387},{c:'Chennai',n:298},{c:'Kolkata',n:254},{c:'Ahmedabad',n:231}].map((x,i)=>(
            <div key={i} style={{ padding:'12px 14px', borderRadius:10, background:'rgba(255,255,255,0.03)', border:`1px solid ${C.border}`, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <span style={{ fontSize:13, color:'rgba(238,238,248,0.8)' }}>{x.c}</span>
              <span style={{ fontSize:13, fontWeight:700, color:'#60a5fa' }}>{x.n}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── DemoMoney ────────────────────────────────────────────────────────────────
function DemoMoney() {
  const [period, setPeriod] = useState('month');
  const d = period === 'week'
    ? { rev:224400, cod:136000, pre:88400, cogs:96000, ship:34000, ad:28600, rto:8800, net:56400 }
    : { rev:961300, cod:584000, pre:377300, cogs:414000, ship:144000, ad:124200, rto:37700, net:241400 };
  return (
    <div>
      <div style={{ display:'flex', gap:8, marginBottom:24 }}>
        {['week','month'].map(p=>(
          <button key={p} onClick={()=>setPeriod(p)}
            style={{ padding:'8px 20px', borderRadius:8, fontWeight:600, fontSize:13, cursor:'pointer', fontFamily:'Outfit,sans-serif',
              background: period===p ? 'rgba(34,211,238,0.15)' : 'rgba(255,255,255,0.05)',
              border: period===p ? `1px solid rgba(34,211,238,0.4)` : `1px solid ${C.border}`,
              color: period===p ? C.primary : C.textMuted,
            }}>
            {p === 'week' ? 'This Week' : 'This Month'}
          </button>
        ))}
      </div>
      {[
        {label:'Gross Revenue',  val:d.rev,  c:C.profit, sym:'+'},
        {label:'  COD Collections', val:d.cod, c:C.profit, sym:'+', sub:true},
        {label:'  Prepaid Revenue',  val:d.pre, c:C.profit, sym:'+', sub:true},
        {label:'Cost of Goods',  val:d.cogs, c:C.loss,   sym:'-'},
        {label:'Shipping Costs', val:d.ship, c:C.loss,   sym:'-'},
        {label:'Ad Spend',       val:d.ad,   c:C.loss,   sym:'-'},
        {label:'RTO Losses',     val:d.rto,  c:C.loss,   sym:'-'},
      ].map((r,i)=>(
        <div key={i} style={{ padding:'14px 18px', borderRadius:10, background:C.surface, border:`1px solid ${C.border}`, display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8, marginLeft: r.sub ? 20 : 0 }}>
          <span style={{ fontSize:13, color:'rgba(238,238,248,0.7)' }}>{r.label.trim()}</span>
          <span style={{ fontSize:14, fontWeight:700, color:r.c }}>{r.sym}{fmt(r.val)}</span>
        </div>
      ))}
      <div style={{ padding:20, borderRadius:14, background:'rgba(16,185,129,0.08)', border:'2px solid rgba(16,185,129,0.3)', display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:8 }}>
        <span style={{ fontSize:16, fontWeight:700, color:C.textMain, fontFamily:'Outfit,sans-serif' }}>💰 Money in My Pocket</span>
        <span style={{ fontSize:28, fontWeight:800, color:C.profit, letterSpacing:'-1px', fontFamily:'Outfit,sans-serif' }}>+{fmt(d.net)}</span>
      </div>
    </div>
  );
}

// ─── DemoProducts ─────────────────────────────────────────────────────────────
function DemoProducts() {
  const [q, setQ] = useState('');
  const rows = PRODUCTS.filter(p=>p.name.toLowerCase().includes(q.toLowerCase())||p.sku.toLowerCase().includes(q.toLowerCase()));
  return (
    <div>
      <div style={{ display:'flex', gap:12, marginBottom:20, alignItems:'center' }}>
        <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search products or SKU..."
          style={{ flex:1, padding:'10px 14px', borderRadius:10, border:`1px solid ${C.border}`, background:C.surface, color:C.textMain, fontSize:13, outline:'none', fontFamily:'Outfit,sans-serif' }} />
        <span style={{ fontSize:12, color:C.textMuted }}>{rows.length} products</span>
      </div>
      <div style={{ borderRadius:18, overflow:'hidden', border:`1px solid ${C.border}` }}>
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead>
            <tr style={{ background:C.surface2 }}>
              {['Product','SKU','Cost','Selling Price','Units Sold','Revenue','Margin'].map(h=>(
                <th key={h} style={{ padding:'12px 14px', textAlign:'left', fontSize:11, color:C.textMuted, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.8px', borderBottom:`1px solid ${C.border}` }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((p,i)=>{
              const margin = (((p.price-p.cost)/p.price)*100).toFixed(0);
              return (
                <tr key={i} style={{ borderBottom:`1px solid rgba(255,255,255,0.04)` }}
                  onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.03)'}
                  onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                  <td style={{ padding:'13px 14px', fontSize:13, color:C.textMain, fontWeight:500 }}>{p.name}</td>
                  <td style={{ padding:'13px 14px', fontSize:12, color:'#818cf8', fontFamily:'monospace' }}>{p.sku}</td>
                  <td style={{ padding:'13px 14px', fontSize:13, color:C.textMuted }}>₹{p.cost}</td>
                  <td style={{ padding:'13px 14px', fontSize:13, color:'rgba(238,238,248,0.85)', fontWeight:600 }}>₹{p.price}</td>
                  <td style={{ padding:'13px 14px', fontSize:13, color:'rgba(238,238,248,0.8)' }}>{p.sold}</td>
                  <td style={{ padding:'13px 14px', fontSize:13, color:C.profit, fontWeight:600 }}>₹{(p.revenue/1000).toFixed(0)}K</td>
                  <td style={{ padding:'13px 14px' }}>
                    <span style={{ fontSize:12, fontWeight:700, padding:'3px 10px', borderRadius:999,
                      background: parseInt(margin)>40 ? 'rgba(16,185,129,0.15)' : 'rgba(251,191,36,0.15)',
                      color: parseInt(margin)>40 ? C.profit : '#fbbf24',
                      border:`1px solid ${parseInt(margin)>40 ? 'rgba(16,185,129,0.35)' : 'rgba(251,191,36,0.35)'}`,
                    }}>{margin}%</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── CopilotPanel ─────────────────────────────────────────────────────────────
function CopilotPanel({ onClose }) {
  const [input, setInput] = useState('');
  const [msgs, setMsgs] = useState([{ role:'ai', text:AI_QA.default }]);
  const [thinking, setThinking] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:'smooth' }); }, [msgs]);

  const fire = (q) => {
    if (!q.trim() || thinking) return;
    setInput('');
    setMsgs(m => [...m, { role:'user', text:q }]);
    setThinking(true);
    setTimeout(() => {
      const low = q.toLowerCase();
      let ans = AI_QA.default;
      if (low.includes('product')||low.includes('top')||low.includes('revenue')) ans = AI_QA.products;
      else if (low.includes('rto')||low.includes('risk')||low.includes('return'))  ans = AI_QA.rto;
      else if (low.includes('profit')||low.includes('increase')||low.includes('improve')||low.includes('aov')) ans = AI_QA.profit;
      else if (low.includes('today')||low.includes('jun 14')||low.includes('performance')) ans = AI_QA.today;
      setMsgs(m => [...m, { role:'ai', text:ans }]);
      setThinking(false);
    }, 1100);
  };

  const SUGGESTIONS = ['Show my top products','What are my RTO risks?','How can I increase profit?','How is today performing?'];

  return (
    <div style={{ position:'fixed', top:0, right:0, bottom:0, width:420, zIndex:300, background:'rgba(7,7,22,0.97)', backdropFilter:'blur(24px)', borderLeft:'1px solid rgba(255,255,255,0.1)', display:'flex', flexDirection:'column', fontFamily:'Outfit,sans-serif' }}>
      <div style={{ padding:'16px 20px', borderBottom:`1px solid ${C.border}`, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:34, height:34, borderRadius:10, background:'linear-gradient(135deg,#22d3ee,#6366f1)', display:'flex', alignItems:'center', justifyContent:'center' }}><Sparkles size={16} color="#fff" /></div>
          <div>
            <div style={{ fontSize:14, fontWeight:700, color:C.textMain }}>AI Co-Pilot</div>
            <div style={{ fontSize:11, color:C.textMuted }}>Powered by GPT-4o · Demo mode</div>
          </div>
        </div>
        <button onClick={onClose} style={{ width:30, height:30, borderRadius:8, background:'rgba(255,255,255,0.07)', border:`1px solid ${C.border}`, color:C.textMuted, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}><X size={15}/></button>
      </div>

      <div style={{ flex:1, overflowY:'auto', padding:'16px 20px', display:'flex', flexDirection:'column', gap:14 }}>
        {msgs.map((m,i)=>(
          <div key={i} style={{ display:'flex', justifyContent: m.role==='user'?'flex-end':'flex-start' }}>
            <div style={{ maxWidth:'85%', padding:'12px 14px', borderRadius: m.role==='user'?'14px 14px 4px 14px':'14px 14px 14px 4px',
              background: m.role==='user' ? 'linear-gradient(135deg,rgba(34,211,238,0.25),rgba(99,102,241,0.25))' : 'rgba(255,255,255,0.06)',
              border:`1px solid ${m.role==='user'?'rgba(34,211,238,0.3)':'rgba(255,255,255,0.1)'}`,
              fontSize:13, color:'rgba(238,238,248,0.9)', lineHeight:1.6, whiteSpace:'pre-wrap',
            }}>{m.text}</div>
          </div>
        ))}
        {thinking && (
          <div style={{ display:'flex', gap:6, padding:'12px 14px', borderRadius:14, background:'rgba(255,255,255,0.06)', width:'fit-content' }}>
            {[0,1,2].map(i=><div key={i} style={{ width:6,height:6,borderRadius:'50%',background:'rgba(34,211,238,0.6)',animation:`dot 1.2s ease-in-out ${i*0.2}s infinite` }}/>)}
          </div>
        )}
        <div ref={bottomRef}/>
      </div>

      {msgs.length <= 1 && (
        <div style={{ padding:'0 20px 12px' }}>
          <div style={{ fontSize:11, color:C.textDim, marginBottom:8 }}>Try asking:</div>
          {SUGGESTIONS.map((s,i)=>(
            <button key={i} onClick={()=>fire(s)}
              style={{ display:'block', width:'100%', padding:'8px 12px', borderRadius:8, background:'rgba(34,211,238,0.06)', border:'1px solid rgba(34,211,238,0.15)', color:C.primary, fontSize:12, cursor:'pointer', textAlign:'left', marginBottom:6, fontFamily:'Outfit,sans-serif', transition:'background 0.2s' }}
              onMouseEnter={e=>e.currentTarget.style.background='rgba(34,211,238,0.12)'}
              onMouseLeave={e=>e.currentTarget.style.background='rgba(34,211,238,0.06)'}>
              {s}
            </button>
          ))}
        </div>
      )}

      <div style={{ padding:'12px 16px', borderTop:`1px solid ${C.border}`, display:'flex', gap:10 }}>
        <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&fire(input)} placeholder="Ask about your store data..."
          style={{ flex:1, padding:'10px 14px', borderRadius:10, border:`1px solid ${C.border}`, background:C.surface, color:C.textMain, fontSize:13, outline:'none', fontFamily:'Outfit,sans-serif' }}/>
        <button onClick={()=>fire(input)} disabled={!input.trim()||thinking}
          style={{ width:40,height:40,borderRadius:10,background:'linear-gradient(135deg,#22d3ee,#6366f1)',border:'none',cursor:input.trim()&&!thinking?'pointer':'not-allowed',display:'flex',alignItems:'center',justifyContent:'center',opacity:input.trim()&&!thinking?1:0.4 }}>
          <Send size={16} color="#000"/>
        </button>
      </div>
      <style>{`@keyframes dot{0%,80%,100%{transform:scale(0.6);opacity:0.3}40%{transform:scale(1);opacity:1}}`}</style>
    </div>
  );
}

// ─── DemoPage (main) ──────────────────────────────────────────────────────────
const NAV = {
  analytics: [
    {key:'dashboard',icon:LayoutDashboard,label:'Daily Dashboard'},
    {key:'weekly',   icon:BarChart,        label:'Weekly Performance'},
    {key:'monthly',  icon:Calendar,        label:'Monthly Overview'},
    {key:'alltime',  icon:TrendingUp,      label:'All-Time Analytics'},
    {key:'analytics',icon:PieChart,        label:'Business Analytics'},
    {key:'money',    icon:Wallet,          label:'Money In My Pocket'},
    {key:'sheet',    icon:List,            label:'Sheet View'},
  ],
  mgmt: [
    {key:'products',icon:Package,          label:'Products'},
    {key:'pricing', icon:DollarSign,       label:'Pricing'},
    {key:'connect', icon:Link2,            label:'Connect your Store'},
  ],
  account: [
    {key:'advanced',icon:SlidersHorizontal,label:'Advanced Settings'},
    {key:'settings',icon:Settings,         label:'Settings'},
    {key:'support', icon:Headphones,       label:'Talk to Support'},
  ],
};

const TITLES = {dashboard:'Business Dashboard',weekly:'Weekly Performance',monthly:'Monthly Overview',alltime:'All-Time Analytics',analytics:'Business Analytics',money:'Money In My Pocket',sheet:'Sheet View',products:'Products',pricing:'Pricing',connect:'Connect your Store',advanced:'Advanced Settings',settings:'Settings',support:'Talk to Support'};

export default function DemoPage() {
  const [tab, setTab] = useState('dashboard');
  const [copilot, setCopilot] = useState(false);
  const [notice, setNotice] = useState(true);

  const changeTab = (key) => setTab(key);

  const content = () => {
    switch(tab) {
      case 'dashboard': return <DemoDaily />;
      case 'weekly':    return <DemoWeekly />;
      case 'monthly':   return <DemoMonthly />;
      case 'alltime':   return <DemoAllTime />;
      case 'analytics': return <DemoBusinessAnalytics />;
      case 'money':     return <DemoMoney />;
      case 'products':  return <DemoProducts />;
      case 'pricing':   return (
        <div>
          <div style={{ marginBottom:16, padding:'14px 18px', borderRadius:12, background:'rgba(34,211,238,0.06)', border:'1px solid rgba(34,211,238,0.2)', fontSize:13, color:'rgba(238,238,248,0.7)' }}>
            💡 Set cost prices and shipping costs for each product. This data powers your P&L, CPP, and Net Profit calculations.
          </div>
          <div style={{ borderRadius:18, overflow:'hidden', border:`1px solid ${C.border}` }}>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr style={{ background:C.surface2 }}>
                  {['Product','SKU','Cost Price (₹)','Shipping (₹)','Selling Price (₹)','Action'].map(h=>(
                    <th key={h} style={{ padding:'12px 14px', textAlign:'left', fontSize:11, color:C.textMuted, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.8px', borderBottom:`1px solid ${C.border}` }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {PRODUCTS.map((p,i)=>(
                  <tr key={i} style={{ borderBottom:`1px solid rgba(255,255,255,0.04)` }}
                    onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.03)'}
                    onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                    <td style={{ padding:'13px 14px', fontSize:13, color:C.textMain }}>{p.name}</td>
                    <td style={{ padding:'13px 14px', fontSize:12, color:'#818cf8', fontFamily:'monospace' }}>{p.sku}</td>
                    <td style={{ padding:'13px 14px', fontSize:13, color:'rgba(238,238,248,0.8)', fontWeight:600 }}>₹{p.cost}</td>
                    <td style={{ padding:'13px 14px', fontSize:13, color:C.textMuted }}>₹{Math.round(p.cost*0.35)}</td>
                    <td style={{ padding:'13px 14px', fontSize:13, color:C.profit }}>₹{p.price}</td>
                    <td style={{ padding:'13px 14px' }}>
                      <button onClick={()=>alert('Demo: In the live dashboard this opens an inline editor to update cost price, shipping cost and effective date.')}
                        style={{ padding:'5px 12px', borderRadius:6, background:'rgba(34,211,238,0.1)', border:'1px solid rgba(34,211,238,0.25)', color:C.primary, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'Outfit,sans-serif' }}>Edit</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
      case 'connect': return (
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          <div style={{ padding:24, borderRadius:18, background:'rgba(16,185,129,0.06)', border:'1px solid rgba(16,185,129,0.2)', display:'flex', alignItems:'center', gap:16 }}>
            <ShieldCheck size={32} color={C.profit}/>
            <div>
              <div style={{ fontSize:15, fontWeight:700, color:C.profit, marginBottom:4 }}>Shopify Connected</div>
              <div style={{ fontSize:13, color:C.textMuted }}>demo-store.myshopify.com — Pro Plan · Last synced 2 min ago</div>
            </div>
          </div>
          {[{l:'Incremental Sync',d:'Sync orders from last sync date to now',icon:'🔄',a:'Sync Now'},{l:'Full Re-Sync',d:'Re-download all orders from Shopify',icon:'📥',a:'Start Full Sync'},{l:'Custom Range',d:'Choose specific date range to sync',icon:'📅',a:'Configure'}].map((opt,i)=>(
            <div key={i} style={{ padding:18, borderRadius:14, background:C.surface, border:`1px solid ${C.border}`, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                <span style={{ fontSize:20 }}>{opt.icon}</span>
                <div>
                  <div style={{ fontSize:13, fontWeight:600, color:C.textMain }}>{opt.l}</div>
                  <div style={{ fontSize:12, color:C.textMuted }}>{opt.d}</div>
                </div>
              </div>
              <button onClick={()=>alert(`Demo: ${opt.l} — in the live dashboard this triggers a real Shopify order sync.`)}
                style={{ padding:'8px 16px', borderRadius:8, background:'rgba(34,211,238,0.1)', border:'1px solid rgba(34,211,238,0.25)', color:C.primary, fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'Outfit,sans-serif' }}>{opt.a}</button>
            </div>
          ))}
        </div>
      );
      default: return (
        <div style={{ padding:48, textAlign:'center' }}>
          <div style={{ fontSize:36, marginBottom:14 }}>🔧</div>
          <div style={{ fontSize:16, fontWeight:700, color:C.textMain, marginBottom:8 }}>{TITLES[tab]}</div>
          <div style={{ fontSize:13, color:C.textMuted, marginBottom:24, lineHeight:1.7 }}>This section is fully functional in your live account. Sign up to access all features.</div>
          <a href="/signup" style={{ padding:'12px 28px', borderRadius:10, background:'linear-gradient(135deg,#22d3ee,#6366f1)', color:'#000', fontWeight:700, textDecoration:'none', fontSize:14 }}>Start Free for 3 Months →</a>
        </div>
      );
    }
  };

  return (
    <div style={{ height:'100vh', background:C.bg, fontFamily:'Outfit,sans-serif', overflow:'hidden', position:'relative',
      backgroundImage:'radial-gradient(ellipse 65% 45% at 8% 8%, rgba(167,139,250,0.1) 0%, transparent 60%), radial-gradient(ellipse 55% 40% at 92% 15%, rgba(34,211,238,0.07) 0%, transparent 60%)',
    }}>

      {/* ── Demo notice — centered ── */}
      {notice && (
        <div style={{ position:'fixed', top:0, left:0, right:0, zIndex:400, background:'rgba(34,211,238,0.09)', backdropFilter:'blur(10px)', borderBottom:'1px solid rgba(34,211,238,0.2)', padding:'10px 24px', display:'flex', justifyContent:'center', alignItems:'center', gap:12 }}>
          <div style={{ textAlign:'center', fontSize:13, color:'rgba(238,238,248,0.85)' }}>
            🎮 <strong style={{ color:C.primary }}>DEMO MODE</strong> — Explore the full dashboard with sample data. No account needed.&nbsp;
            <a href="/signup" style={{ color:C.primary, fontWeight:700, textDecoration:'underline' }}>Create your free account →</a>
          </div>
          <button onClick={()=>setNotice(false)} style={{ position:'absolute', right:16, background:'none', border:'none', color:'rgba(238,238,248,0.4)', cursor:'pointer', fontSize:18, lineHeight:1 }}>×</button>
        </div>
      )}

      <div style={{ display:'flex', height:'100%', paddingTop: notice ? 41 : 0 }}>

        {/* ── SIDEBAR ── */}
        <aside style={{ width:256, flexShrink:0, background:'rgba(3,3,7,0.85)', backdropFilter:'blur(32px) saturate(160%)', borderRight:'1px solid rgba(255,255,255,0.06)', display:'flex', flexDirection:'column', zIndex:10, position:'relative' }}>
          {/* Brand */}
          <div style={{ padding:'20px 16px 18px', borderBottom:'1px solid rgba(255,255,255,0.06)', position:'relative' }}>
            <div style={{ position:'absolute', inset:0, background:'radial-gradient(ellipse at 50% 0%, rgba(34,211,238,0.12) 0%, transparent 70%)', pointerEvents:'none' }} />
            <div style={{ position:'relative', padding:'12px 16px 10px', borderRadius:14, background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)', display:'inline-block' }}>
              <BrandLogo variant="full" iconSize={44} />
            </div>
          </div>

          <nav style={{ flex:1, padding:'14px 10px', display:'flex', flexDirection:'column', gap:3, overflowY:'auto' }}>
            <div style={{ fontSize:'9.5px', fontWeight:700, color:'rgba(255,255,255,0.2)', letterSpacing:'1.2px', textTransform:'uppercase', padding:'8px 10px 6px' }}>Analytics</div>
            {NAV.analytics.map(n => <NavItem key={n.key} {...n} active={tab===n.key} onClick={()=>changeTab(n.key)} />)}

            <div style={{ height:1, background:'rgba(255,255,255,0.05)', margin:'10px 4px' }} />
            <div style={{ fontSize:'9.5px', fontWeight:700, color:'rgba(255,255,255,0.2)', letterSpacing:'1.2px', textTransform:'uppercase', padding:'8px 10px 6px' }}>Management</div>
            {NAV.mgmt.map(n => <NavItem key={n.key} {...n} active={tab===n.key} onClick={()=>changeTab(n.key)} />)}

            <div style={{ height:1, background:'rgba(255,255,255,0.05)', margin:'10px 4px' }} />
            <div style={{ fontSize:'9.5px', fontWeight:700, color:'rgba(255,255,255,0.2)', letterSpacing:'1.2px', textTransform:'uppercase', padding:'4px 10px 6px' }}>Account</div>
            {NAV.account.map(n => <NavItem key={n.key} {...n} active={tab===n.key} onClick={()=>changeTab(n.key)} />)}
          </nav>

          {/* User footer */}
          <div style={{ padding:'12px 10px', borderTop:'1px solid rgba(255,255,255,0.06)' }}>
            <a href="/signup" style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px', borderRadius:12, background:'rgba(34,211,238,0.06)', border:'1px solid rgba(34,211,238,0.18)', textDecoration:'none', transition:'all 0.2s' }}
              onMouseEnter={e=>{e.currentTarget.style.background='rgba(34,211,238,0.12)';}}
              onMouseLeave={e=>{e.currentTarget.style.background='rgba(34,211,238,0.06)';}}>
              <div style={{ width:32, height:32, borderRadius:9, flexShrink:0, background:'linear-gradient(135deg,#22d3ee,#6366f1)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:800, color:'#000' }}>D</div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:12, fontWeight:600, color:C.textMain, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>demo@yourstore.com</div>
                <div style={{ fontSize:10.5, color:C.primary, marginTop:1, fontWeight:600 }}>Create free account →</div>
              </div>
            </a>
          </div>
        </aside>

        {/* ── MAIN ── */}
        <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
          {/* Topbar */}
          <header style={{ height:66, flexShrink:0, background:'rgba(3,3,7,0.8)', backdropFilter:'blur(24px)', borderBottom:'1px solid rgba(255,255,255,0.06)', display:'flex', alignItems:'center', padding:'0 28px', gap:16, position:'relative' }}>
            {/* gold underline */}
            <div style={{ position:'absolute', bottom:-1, left:0, right:0, height:1, background:'linear-gradient(90deg,transparent,rgba(34,211,238,0.15) 30%,rgba(99,102,241,0.15) 70%,transparent)', pointerEvents:'none' }} />

            <div style={{ flex:1, display:'flex', flexDirection:'column', gap:2 }}>
              <h1 style={{ margin:0, fontSize:17, fontWeight:700, color:C.textMain, letterSpacing:'-0.02em', fontFamily:'Outfit,sans-serif' }}>{TITLES[tab]}</h1>
              <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:11, color:C.textMuted }}>
                <span style={{ width:6, height:6, borderRadius:'50%', background:'#10b981', boxShadow:'0 0 8px rgba(16,185,129,0.8)', display:'inline-block', animation:'livePulse 2s ease-in-out infinite' }} />
                Demo Store — Live &nbsp;·&nbsp; Pro Plan &nbsp;·&nbsp; Synced just now
              </div>
            </div>

            <a href="/" style={{ fontSize:12, color:C.textMuted, textDecoration:'none', padding:'6px 10px', borderRadius:8, border:`1px solid ${C.border}`, background:'rgba(255,255,255,0.03)', transition:'all 0.2s', flexShrink:0 }}
              onMouseEnter={e=>{e.currentTarget.style.color=C.textMain; e.currentTarget.style.background='rgba(255,255,255,0.06)';}}
              onMouseLeave={e=>{e.currentTarget.style.color=C.textMuted; e.currentTarget.style.background='rgba(255,255,255,0.03)';}}>
              ← Back
            </a>

            <a href="/signup" style={{ padding:'8px 16px', borderRadius:10, background:'linear-gradient(135deg,#22d3ee,#6366f1)', color:'#000', fontWeight:700, fontSize:13, textDecoration:'none', flexShrink:0 }}>
              Start Free
            </a>

            <button onClick={()=>setCopilot(o=>!o)}
              style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 16px', borderRadius:10, background: copilot ? 'rgba(34,211,238,0.15)' : 'rgba(255,255,255,0.06)', border:`1px solid ${copilot ? 'rgba(34,211,238,0.4)' : 'rgba(255,255,255,0.1)'}`, color: copilot ? C.primary : 'rgba(238,238,248,0.8)', fontWeight:600, fontSize:13, cursor:'pointer', fontFamily:'Outfit,sans-serif', transition:'all 0.2s', flexShrink:0 }}>
              <Sparkles size={15} /> Co-Pilot
            </button>
          </header>

          {/* Content */}
          <main style={{ flex:1, overflowY:'auto', padding:'28px 32px' }}>
            {content()}
          </main>
        </div>
      </div>

      {copilot && <CopilotPanel onClose={()=>setCopilot(false)} />}

      <style>{`
        @keyframes livePulse { 0%,100%{opacity:1;box-shadow:0 0 6px rgba(16,185,129,0.8)} 50%{opacity:0.5;box-shadow:0 0 2px rgba(16,185,129,0.3)} }
        main::-webkit-scrollbar { width: 4px; }
        main::-webkit-scrollbar-track { background: transparent; }
        main::-webkit-scrollbar-thumb { background: rgba(34,211,238,0.15); border-radius: 99px; }
      `}</style>
    </div>
  );
}
