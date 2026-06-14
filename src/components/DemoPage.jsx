import React, { useState, useRef, useEffect } from 'react';
import BrandLogo from './BrandLogo';
import {
  LayoutDashboard, BarChart, Calendar, TrendingUp, PieChart, Wallet, List,
  Package, DollarSign, Link2, SlidersHorizontal, Settings, Headphones,
  ChevronRight, LogOut, Sparkles, Send, X, Menu,
  CheckCircle, Truck, XCircle, RotateCcw, PhoneOff, AlertCircle,
  ArrowLeft, RefreshCw, ShieldCheck
} from 'lucide-react';

// ── Demo Store ───────────────────────────────────────────────────────────────
const DEMO = {
  store_name: 'BnB Toys',
  domain: 'bnbtoys.myshopify.com',
  plan: 'Pro',
  email: 'demo@bnbtoys.com',
};

// ── Mock daily data (last 10 days) ──────────────────────────────────────────
const DAILY = [
  { date:'2026-06-14', label:'Today, Jun 14',     orders:24, items:31, cpp:264, fulfilled:20, delivered:18, transit:8,  otd:3, failed:2, canceled:1, rtoRisk:2, rto:0, unreachable:1, notConfirmed:0, revenue:38400, adSpend:8200, net:4180 },
  { date:'2026-06-13', label:'Yesterday, Jun 13', orders:31, items:43, cpp:265, fulfilled:28, delivered:24, transit:12, otd:4, failed:3, canceled:2, rtoRisk:4, rto:1, unreachable:2, notConfirmed:1, revenue:49600, adSpend:11400, net:5830 },
  { date:'2026-06-12', label:'Thu, Jun 12',       orders:18, items:22, cpp:345, fulfilled:16, delivered:14, transit:6,  otd:2, failed:1, canceled:1, rtoRisk:1, rto:0, unreachable:0, notConfirmed:0, revenue:28800, adSpend:7600, net:-820 },
  { date:'2026-06-11', label:'Wed, Jun 11',       orders:42, items:58, cpp:314, fulfilled:37, delivered:32, transit:14, otd:5, failed:4, canceled:2, rtoRisk:5, rto:2, unreachable:3, notConfirmed:1, revenue:67200, adSpend:18200, net:8740 },
  { date:'2026-06-10', label:'Tue, Jun 10',       orders:29, items:38, cpp:284, fulfilled:25, delivered:21, transit:10, otd:3, failed:2, canceled:2, rtoRisk:3, rto:1, unreachable:1, notConfirmed:0, revenue:46400, adSpend:10800, net:3290 },
  { date:'2026-06-09', label:'Mon, Jun 9',        orders:14, items:18, cpp:489, fulfilled:12, delivered:10, transit:4,  otd:2, failed:1, canceled:0, rtoRisk:1, rto:0, unreachable:1, notConfirmed:0, revenue:22400, adSpend:8800, net:-2140 },
  { date:'2026-06-08', label:'Sun, Jun 8',        orders:37, items:52, cpp:281, fulfilled:33, delivered:28, transit:12, otd:4, failed:3, canceled:2, rtoRisk:4, rto:1, unreachable:2, notConfirmed:0, revenue:59200, adSpend:14600, net:7610 },
  { date:'2026-06-07', label:'Sat, Jun 7',        orders:45, items:63, cpp:314, fulfilled:40, delivered:35, transit:16, otd:5, failed:4, canceled:3, rtoRisk:6, rto:2, unreachable:2, notConfirmed:1, revenue:72000, adSpend:19800, net:10290 },
  { date:'2026-06-06', label:'Fri, Jun 6',        orders:22, items:29, cpp:317, fulfilled:19, delivered:16, transit:8,  otd:2, failed:2, canceled:1, rtoRisk:2, rto:0, unreachable:1, notConfirmed:0, revenue:35200, adSpend:9200, net:1840 },
  { date:'2026-06-05', label:'Thu, Jun 5',        orders:33, items:47, cpp:285, fulfilled:29, delivered:25, transit:11, otd:3, failed:3, canceled:2, rtoRisk:4, rto:1, unreachable:1, notConfirmed:1, revenue:52800, adSpend:13400, net:5120 },
];

const WEEKLY = [
  { week:'May 19–25', orders:187, revenue:299200, adSpend:72400, net:18430, delivered:142, rto:8 },
  { week:'May 26–Jun 1', orders:204, revenue:326400, adSpend:81800, net:23190, delivered:158, rto:9 },
  { week:'Jun 2–8',   orders:176, revenue:281600, adSpend:70600, net:11240, delivered:134, rto:11 },
  { week:'Jun 9–14',  orders:138, revenue:224400, adSpend:58800, net:16340, delivered:105, rto:6 },
];

const MONTHLY = [
  { month:'Jan 2026', orders:721,  revenue:1153600, net:68400 },
  { month:'Feb 2026', orders:834,  revenue:1334400, net:94200 },
  { month:'Mar 2026', orders:956,  revenue:1529600, net:128700 },
  { month:'Apr 2026', orders:1087, revenue:1739200, net:155800 },
  { month:'May 2026', orders:1134, revenue:1814400, net:174200 },
  { month:'Jun 2026 (partial)', orders:288, revenue:460800, net:44430 },
];

const PRODUCTS = [
  { name:'Wooden Block Set (Classic)',   sku:'WBS-001', cost:380,  price:799,  sold:312, revenue:249288 },
  { name:'Magnetic Tiles 32pc',          sku:'MT-032',  cost:620,  price:1299, sold:248, revenue:322152 },
  { name:'Educational Flash Cards',      sku:'EFC-100', cost:120,  price:349,  sold:487, revenue:169963 },
  { name:'STEM Robot Kit (Age 8+)',       sku:'STEM-R8', cost:890,  price:1899, sold:143, revenue:271557 },
  { name:'Soft Plush Elephant 45cm',     sku:'SPE-045', cost:290,  price:599,  sold:391, revenue:234209 },
  { name:'Rainbow Stacking Rings',       sku:'RSR-010', cost:180,  price:449,  sold:528, revenue:237072 },
];

const AI_QA = {
  'top products': `📦 **Top Products by Revenue (Last 30 Days)**\n\n1. Magnetic Tiles 32pc — ₹3,22,152 (248 units)\n2. STEM Robot Kit — ₹2,71,557 (143 units)\n3. Wooden Block Set — ₹2,49,288 (312 units)\n\n💡 Magnetic Tiles has the highest AOV at ₹1,299. Consider running a bundle offer with Flash Cards to push AOV higher.`,
  'rto risk': `⚠️ **RTO Risk Analysis**\n\nThis week's RTO risk: 6 orders (4.3% of total)\n\nHigh-risk signals:\n• 3 orders from Tier-3 cities with COD\n• 2 repeat unreachable customers\n• 1 address verification failed\n\n💡 Tip: Enable pre-paid discount (₹50 off) for Tier-3 COD orders to reduce RTO by ~35%.`,
  'increase profit': `💰 **Ways to Increase Net Profit**\n\n1. **Reduce CPP** — Your current CPP is ₹298. Consolidating ad spend on top 3 SKUs could bring it to ₹240.\n\n2. **Bundle deals** — Wooden Block Set + Flash Cards bundle at ₹1,099 (saves buyer ₹49) could increase items-per-order from 1.3 → 2.1.\n\n3. **Prepaid push** — 61% orders are COD. Converting 20% to prepaid saves ₹52/order in RTO costs.\n\n4. **Lower RTO** — Current RTO at 4.1% vs industry avg 6.8%. Maintain this by calling unreachable customers within 2 hours.`,
  'today': `📊 **Today's Performance Summary (Jun 14)**\n\nOrders: 24 | Revenue: ₹38,400 | Net: +₹4,180\n\n✅ 18 delivered | 🚚 8 in transit | 📦 3 out for delivery\n⚠️ 2 failed delivery | ❌ 1 canceled | 🔄 2 RTO risk\n\nCPP: ₹264 (good — below ₹300 target)\n\n💡 Day is tracking well. Watch the 2 failed delivery orders — follow up before 6 PM for re-delivery attempt.`,
  'default': `🤖 **AI Co-Pilot (Demo)**\n\nI can analyse your store data and give you insights. In the live version, I have access to all your:\n• Order history & shipping data\n• Product costs & margins\n• Ad spend & ROAS\n• RTO patterns & risk factors\n\nTry asking:\n→ "Show top products"\n→ "What are my RTO risks?"\n→ "How can I increase profit?"\n→ "How is today performing?"`,
};

const fmt = (n) => '₹' + Math.abs(Number(n) || 0).toLocaleString('en-IN');

// ── NavItem ──────────────────────────────────────────────────────────────────
function NavItem({ icon: Icon, label, active, onClick, badge }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display:'flex', alignItems:'center', gap:12,
        width:'100%', padding:'11px 14px', borderRadius:12,
        background: active ? 'linear-gradient(135deg,rgba(99,102,241,0.18) 0%,rgba(34,211,238,0.05) 100%)'
          : hovered ? 'rgba(255,255,255,0.05)' : 'transparent',
        border: active ? '1px solid rgba(99,102,241,0.35)' : '1px solid transparent',
        color: active ? '#fff' : hovered ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.5)',
        cursor:'pointer', textAlign:'left',
        transition:'all 0.2s',
        fontFamily:'Outfit,sans-serif', fontSize:13.5, fontWeight: active ? 600 : 500,
        position:'relative',
        transform: hovered && !active ? 'translateX(2px)' : 'translateX(0)',
      }}
    >
      {active && (
        <div style={{ position:'absolute', left:0, top:'18%', bottom:'18%', width:3, borderRadius:'0 3px 3px 0', background:'linear-gradient(180deg,#6366f1,#38bdf8)', boxShadow:'0 0 12px rgba(99,102,241,0.6)' }} />
      )}
      <Icon size={17} strokeWidth={active ? 2.2 : 1.8} style={{ flexShrink:0, opacity: active ? 1 : 0.7 }} />
      <span style={{ flex:1 }}>{label}</span>
      {badge && <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:999, background:'rgba(99,102,241,0.15)', color:'#a5b4fc', border:'1px solid rgba(99,102,241,0.3)' }}>{badge}</span>}
      {active && <ChevronRight size={13} style={{ opacity:0.35, flexShrink:0 }} />}
    </button>
  );
}

// ── MetricTile ───────────────────────────────────────────────────────────────
function MetricTile({ label, value, color='rgba(226,232,240,0.9)', glow='white', onClick, highlight }) {
  const [hov, setHov] = useState(false);
  const glowMap = {
    green:'rgba(16,185,129,0.25)', red:'rgba(239,68,68,0.25)', blue:'rgba(96,165,250,0.25)',
    purple:'rgba(167,139,250,0.25)', orange:'rgba(249,115,22,0.25)', yellow:'rgba(251,191,36,0.25)',
    white:'rgba(255,255,255,0.12)', indigo:'rgba(99,102,241,0.25)',
  };
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        padding:'14px 12px', borderRadius:10, textAlign:'center',
        background: highlight ? glowMap[glow] || 'rgba(255,255,255,0.1)' : hov && onClick ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.04)',
        border: `1px solid ${highlight ? (glowMap[glow]?.replace('0.25','0.5') || 'rgba(255,255,255,0.3)') : 'rgba(255,255,255,0.08)'}`,
        cursor: onClick ? 'pointer' : 'default',
        transition:'all 0.2s',
        boxShadow: highlight ? `0 0 16px ${glowMap[glow] || 'rgba(255,255,255,0.1)'}` : 'none',
      }}
    >
      <div style={{ fontSize:11, color:'rgba(226,232,240,0.45)', textTransform:'uppercase', letterSpacing:'0.8px', marginBottom:6, lineHeight:1.3 }}>{label}</div>
      <div style={{ fontSize:22, fontWeight:700, color, letterSpacing:'-0.02em' }}>{value}</div>
    </div>
  );
}

// ── DemoDaily ────────────────────────────────────────────────────────────────
function DemoDaily() {
  const [scoreStart, setScoreStart] = useState('2026-06-07');
  const [scoreEnd, setScoreEnd] = useState('2026-06-14');
  const [tempStart, setTempStart] = useState('2026-06-07');
  const [tempEnd, setTempEnd] = useState('2026-06-14');
  const [feedStart, setFeedStart] = useState('2026-06-07');
  const [feedEnd, setFeedEnd] = useState('2026-06-14');
  const [showTiles, setShowTiles] = useState(false);
  const [activeFilter, setActiveFilter] = useState({});

  const scoreDays = DAILY.filter(d => d.date >= scoreStart && d.date <= scoreEnd);
  const totNet = scoreDays.reduce((s, d) => s + d.net, 0);
  const profDays = scoreDays.filter(d => d.net > 0);
  const lossDays = scoreDays.filter(d => d.net < 0);
  const profAmt = profDays.reduce((s, d) => s + d.net, 0);
  const lossAmt = lossDays.reduce((s, d) => s + d.net, 0);

  const feedDays = DAILY.filter(d => d.date >= feedStart && d.date <= feedEnd)
    .sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div style={{ paddingBottom:60 }}>
      {/* Scoreboard header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:12, marginBottom:20, padding:'16px 20px', borderRadius:14, background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.08)' }}>
        <h2 style={{ margin:0, fontSize:18, fontWeight:700, color:'#e2e8f0' }}>Profit / Loss Scoreboard</h2>
        <div style={{ display:'flex', alignItems:'flex-end', gap:12, flexWrap:'wrap' }}>
          <div>
            <label style={{ display:'block', fontSize:11, color:'rgba(226,232,240,0.4)', marginBottom:4 }}>Start Date</label>
            <input type="date" value={tempStart} onChange={e=>setTempStart(e.target.value)}
              style={{ padding:'6px 10px', borderRadius:8, border:'1px solid rgba(255,255,255,0.12)', background:'rgba(0,0,0,0.3)', color:'#e2e8f0', fontSize:13, colorScheme:'dark', outline:'none' }} />
          </div>
          <div>
            <label style={{ display:'block', fontSize:11, color:'rgba(226,232,240,0.4)', marginBottom:4 }}>End Date</label>
            <input type="date" value={tempEnd} onChange={e=>setTempEnd(e.target.value)}
              style={{ padding:'6px 10px', borderRadius:8, border:'1px solid rgba(255,255,255,0.12)', background:'rgba(0,0,0,0.3)', color:'#e2e8f0', fontSize:13, colorScheme:'dark', outline:'none' }} />
          </div>
          <button onClick={() => { setScoreStart(tempStart); setScoreEnd(tempEnd); }}
            style={{ padding:'8px 20px', borderRadius:8, background:'linear-gradient(90deg,#38bdf8,#3b82f6)', color:'#fff', border:'none', fontWeight:600, fontSize:13, cursor:'pointer', height:34 }}>
            Calculate
          </button>
        </div>
      </div>

      {/* Scoreboard card */}
      <div style={{ marginBottom:28, padding:24, borderRadius:16, background:'rgba(5,5,15,0.5)', border:'1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:16 }}>
          <div>
            <div style={{ fontSize:13, color:'rgba(226,232,240,0.5)', textTransform:'uppercase', letterSpacing:1, marginBottom:8 }}>Cumulative Net Profit</div>
            <div style={{ fontSize:40, fontWeight:800, letterSpacing:'-0.03em', color: totNet >= 0 ? '#34d399' : '#f87171', textShadow: totNet >= 0 ? '0 0 24px rgba(52,211,153,0.4)' : '0 0 24px rgba(248,113,113,0.4)' }}>
              {totNet >= 0 ? '+' : '-'}{fmt(Math.abs(totNet))}
            </div>
            <div style={{ fontSize:12, color:'rgba(226,232,240,0.35)', marginTop:4 }}>
              {new Date(scoreStart).toLocaleDateString('en-IN',{day:'numeric',month:'short'})} – {new Date(scoreEnd).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}
            </div>
            <div style={{ marginTop:16, display:'flex', gap:12, flexWrap:'wrap' }}>
              <div style={{ padding:'10px 16px', borderRadius:10, background:'rgba(16,185,129,0.1)', border:'1px solid rgba(16,185,129,0.3)' }}>
                <div style={{ fontSize:11, color:'rgba(255,255,255,0.6)', textTransform:'uppercase', marginBottom:6, fontWeight:600 }}>Profitable Days ({profDays.length})</div>
                <div style={{ fontSize:18, fontWeight:700, color:'#34d399' }}>+{fmt(profAmt)}</div>
              </div>
              <div style={{ padding:'10px 16px', borderRadius:10, background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)' }}>
                <div style={{ fontSize:11, color:'rgba(255,255,255,0.6)', textTransform:'uppercase', marginBottom:6, fontWeight:600 }}>Loss Days ({lossDays.length})</div>
                <div style={{ fontSize:18, fontWeight:700, color:'#f87171' }}>{fmt(Math.abs(lossAmt))}</div>
              </div>
            </div>
          </div>
          <button onClick={() => setShowTiles(t => !t)}
            style={{ padding:'8px 16px', borderRadius:8, background: showTiles ? 'rgba(56,189,248,0.15)' : 'rgba(255,255,255,0.05)', border:`1px solid ${showTiles ? 'rgba(56,189,248,0.4)' : 'rgba(255,255,255,0.1)'}`, color: showTiles ? '#38bdf8' : '#e2e8f0', fontWeight:600, cursor:'pointer', display:'flex', alignItems:'center', gap:8, fontSize:13 }}>
            <LayoutDashboard size={15} /> {showTiles ? 'Hide Tiles' : 'Tile View'}
          </button>
        </div>

        {showTiles && (
          <div style={{ marginTop:20, paddingTop:20, borderTop:'1px solid rgba(255,255,255,0.07)' }}>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(120px,1fr))', gap:10 }}>
              {scoreDays.sort((a,b)=>b.date.localeCompare(a.date)).map(d => (
                <div key={d.date} style={{ padding:'12px 10px', borderRadius:10, textAlign:'center',
                  background: d.net >= 0 ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
                  border:`1px solid ${d.net >= 0 ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
                  cursor:'pointer', transition:'transform 0.15s',
                }}
                  onMouseEnter={e=>e.currentTarget.style.transform='scale(1.04)'}
                  onMouseLeave={e=>e.currentTarget.style.transform='scale(1)'}
                >
                  <div style={{ fontSize:11, color:'rgba(255,255,255,0.7)', fontWeight:600, marginBottom:4 }}>
                    {new Date(d.date).toLocaleDateString('en-US',{day:'numeric',month:'short'})}
                  </div>
                  <div style={{ fontSize:15, fontWeight:700, color: d.net >= 0 ? '#34d399' : '#f87171' }}>
                    {d.net >= 0 ? '+' : ''}{fmt(d.net)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Daily Feed header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:12, marginBottom:20 }}>
        <h2 style={{ margin:0, fontSize:18, fontWeight:700, color:'#e2e8f0' }}>Daily Feed</h2>
        <div style={{ display:'flex', alignItems:'flex-end', gap:12 }}>
          <div>
            <label style={{ display:'block', fontSize:11, color:'rgba(226,232,240,0.4)', marginBottom:4 }}>Start</label>
            <input type="date" value={feedStart} onChange={e=>setFeedStart(e.target.value)}
              style={{ padding:'6px 10px', borderRadius:8, border:'1px solid rgba(255,255,255,0.12)', background:'rgba(0,0,0,0.3)', color:'#e2e8f0', fontSize:13, colorScheme:'dark', outline:'none' }} />
          </div>
          <div>
            <label style={{ display:'block', fontSize:11, color:'rgba(226,232,240,0.4)', marginBottom:4 }}>End</label>
            <input type="date" value={feedEnd} onChange={e=>setFeedEnd(e.target.value)}
              style={{ padding:'6px 10px', borderRadius:8, border:'1px solid rgba(255,255,255,0.12)', background:'rgba(0,0,0,0.3)', color:'#e2e8f0', fontSize:13, colorScheme:'dark', outline:'none' }} />
          </div>
        </div>
      </div>

      {/* Daily cards */}
      <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
        {feedDays.map(day => {
          const filter = activeFilter[day.date];
          const isProfit = day.net >= 0;
          return (
            <div key={day.date} style={{ borderRadius:16, background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.08)', overflow:'hidden' }}>
              {/* Day header */}
              <div style={{ padding:'14px 20px', display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:8, borderBottom:'1px solid rgba(255,255,255,0.06)', background:'rgba(0,0,0,0.15)' }}>
                <h3 style={{ margin:0, fontSize:15, fontWeight:700, color:'#e2e8f0' }}>{day.label}</h3>
                <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                  <span style={{ fontSize:13, fontWeight:600, padding:'4px 12px', borderRadius:999, background:'rgba(167,139,250,0.15)', color:'#c4b5fd', border:'1px solid rgba(167,139,250,0.3)' }}>
                    CPP: {fmt(day.cpp)}
                  </span>
                  <span style={{ fontSize:13, fontWeight:700, padding:'4px 12px', borderRadius:999,
                    background: isProfit ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                    color: isProfit ? '#34d399' : '#f87171',
                    border:`1px solid ${isProfit ? 'rgba(16,185,129,0.35)' : 'rgba(239,68,68,0.35)'}`,
                  }}>
                    Net: {isProfit ? '▲' : '▼'}{fmt(Math.abs(day.net))}
                  </span>
                </div>
              </div>

              {/* Metrics grid */}
              <div style={{ padding:'16px 20px' }}>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(110px,1fr))', gap:10 }}>
                  <MetricTile label="Orders" value={day.orders} onClick={() => setActiveFilter(f=>({...f,[day.date]:f[day.date]==='orders'?null:'orders'}))} highlight={filter==='orders'} />
                  <MetricTile label="Number of Items" value={day.items} />
                  <MetricTile label="CPP" value={fmt(day.cpp)} color="#c4b5fd" glow="purple" />
                  <MetricTile label="Fulfilled" value={day.fulfilled} color="#34d399" glow="green" onClick={() => setActiveFilter(f=>({...f,[day.date]:f[day.date]==='fulfilled'?null:'fulfilled'}))} highlight={filter==='fulfilled'} />
                  <MetricTile label="Delivered" value={day.delivered} color="#34d399" glow="green" onClick={() => setActiveFilter(f=>({...f,[day.date]:f[day.date]==='delivered'?null:'delivered'}))} highlight={filter==='delivered'} />
                  <MetricTile label="In Transit" value={day.transit} color="#60a5fa" glow="blue" onClick={() => setActiveFilter(f=>({...f,[day.date]:f[day.date]==='transit'?null:'transit'}))} highlight={filter==='transit'} />
                  <MetricTile label="Out for Delivery" value={day.otd} color="#a78bfa" glow="purple" onClick={() => setActiveFilter(f=>({...f,[day.date]:f[day.date]==='otd'?null:'otd'}))} highlight={filter==='otd'} />
                  <MetricTile label="Failed Delivery" value={day.failed} color="#f97316" glow="orange" onClick={() => setActiveFilter(f=>({...f,[day.date]:f[day.date]==='failed'?null:'failed'}))} highlight={filter==='failed'} />
                  <MetricTile label="Canceled" value={day.canceled} color="#f87171" glow="red" onClick={() => setActiveFilter(f=>({...f,[day.date]:f[day.date]==='canceled'?null:'canceled'}))} highlight={filter==='canceled'} />
                  <MetricTile label="Possibility of RTO" value={day.rtoRisk} color="#f59e0b" glow="yellow" onClick={() => setActiveFilter(f=>({...f,[day.date]:f[day.date]==='rtoRisk'?null:'rtoRisk'}))} highlight={filter==='rtoRisk'} />
                  <MetricTile label="RTO / Undelivered" value={day.rto} color="#f87171" glow="red" onClick={() => setActiveFilter(f=>({...f,[day.date]:f[day.date]==='rto'?null:'rto'}))} highlight={filter==='rto'} />
                  <MetricTile label="Unreachable" value={day.unreachable} color="#facc15" glow="yellow" onClick={() => setActiveFilter(f=>({...f,[day.date]:f[day.date]==='unreachable'?null:'unreachable'}))} highlight={filter==='unreachable'} />
                  <MetricTile label="Order Not Confirmed" value={day.notConfirmed} color="#f87171" glow="red" />
                  <MetricTile label="Revenue" value={fmt(day.revenue)} color="#60a5fa" glow="blue" />
                  <MetricTile label="Ad Spend" value={fmt(day.adSpend)} />
                  <MetricTile label="Net Profit" value={(isProfit?'+':'')+fmt(day.net)} color={isProfit?'#34d399':'#f87171'} glow={isProfit?'green':'red'} />
                </div>

                {/* Filtered orders table (demo) */}
                {filter && (
                  <div style={{ marginTop:16, padding:'14px 16px', borderRadius:10, background:'rgba(0,0,0,0.2)', border:'1px solid rgba(255,255,255,0.07)' }}>
                    <div style={{ fontSize:12, color:'rgba(226,232,240,0.5)', marginBottom:10 }}>
                      Showing <strong style={{color:'#a5b4fc'}}>{filter}</strong> orders for {day.label}
                    </div>
                    <table style={{ width:'100%', fontSize:12, borderCollapse:'collapse' }}>
                      <thead>
                        <tr>
                          {['Order #','Customer','Amount','Payment','Tags'].map(h => (
                            <th key={h} style={{ padding:'6px 8px', textAlign:'left', color:'rgba(226,232,240,0.4)', fontWeight:600, borderBottom:'1px solid rgba(255,255,255,0.07)' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {MOCK_ORDERS.slice(0, 4).map((o, i) => (
                          <tr key={i}>
                            <td style={{ padding:'8px', color:'#a5b4fc', fontWeight:600 }}>{o.id}</td>
                            <td style={{ padding:'8px', color:'rgba(226,232,240,0.8)' }}>{o.name}</td>
                            <td style={{ padding:'8px', color:'#e2e8f0' }}>{fmt(o.amount)}</td>
                            <td style={{ padding:'8px' }}>
                              <span style={{ fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:4, background: o.prepaid ? 'rgba(129,140,248,0.15)':'rgba(251,146,60,0.15)', color: o.prepaid ? '#818cf8':'#fb923c', border:`1px solid ${o.prepaid?'rgba(129,140,248,0.3)':'rgba(251,146,60,0.3)'}` }}>
                                {o.prepaid ? 'PREPAID' : 'COD'}
                              </span>
                            </td>
                            <td style={{ padding:'8px' }}>
                              <span style={{ fontSize:10, fontWeight:600, padding:'2px 8px', borderRadius:4, background:'rgba(96,165,250,0.12)', color:'#60a5fa', border:'1px solid rgba(96,165,250,0.25)' }}>
                                {o.tag}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div style={{ marginTop:8, fontSize:11, color:'rgba(226,232,240,0.3)', fontStyle:'italic' }}>
                      Demo data — showing 4 of {day.orders} orders
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {feedDays.length === 0 && (
          <div style={{ padding:40, textAlign:'center', color:'rgba(226,232,240,0.3)', fontSize:14 }}>
            No data for selected date range
          </div>
        )}
      </div>
    </div>
  );
}

// Mock orders for filter tables
const MOCK_ORDERS = [
  { id:'#1482', name:'Priya Sharma',    amount:1299, prepaid:true,  tag:'Delivered' },
  { id:'#1483', name:'Rahul Mehta',     amount:799,  prepaid:false, tag:'In Transit' },
  { id:'#1484', name:'Anjali Singh',    amount:449,  prepaid:false, tag:'Out for Delivery' },
  { id:'#1485', name:'Vikram Nair',     amount:1899, prepaid:true,  tag:'Delivered' },
  { id:'#1486', name:'Deepika Reddy',   amount:349,  prepaid:false, tag:'Failed Delivery' },
  { id:'#1487', name:'Arjun Patel',     amount:1299, prepaid:true,  tag:'Delivered' },
];

// ── DemoWeekly ───────────────────────────────────────────────────────────────
function DemoWeekly() {
  const maxRev = Math.max(...WEEKLY.map(w => w.revenue));
  return (
    <div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:16, marginBottom:32 }}>
        {[
          { label:'Total Orders (4 wk)', value:'705', color:'#60a5fa' },
          { label:'Total Revenue (4 wk)', value:'₹11.3L', color:'#34d399' },
          { label:'Net Profit (4 wk)', value:'₹69,200', color:'#34d399' },
          { label:'Avg RTO Rate', value:'4.8%', color:'#f59e0b' },
        ].map((s,i) => (
          <div key={i} style={{ padding:'20px', borderRadius:14, background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ fontSize:12, color:'rgba(226,232,240,0.4)', marginBottom:8 }}>{s.label}</div>
            <div style={{ fontSize:28, fontWeight:800, color:s.color, letterSpacing:'-0.02em' }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div style={{ padding:24, borderRadius:16, background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.08)', marginBottom:24 }}>
        <h3 style={{ margin:'0 0 20px', fontSize:15, fontWeight:700, color:'#e2e8f0' }}>Revenue by Week</h3>
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          {WEEKLY.map((w, i) => (
            <div key={i} style={{ display:'flex', alignItems:'center', gap:12 }}>
              <div style={{ width:120, fontSize:12, color:'rgba(226,232,240,0.5)', flexShrink:0 }}>{w.week}</div>
              <div style={{ flex:1, height:32, borderRadius:6, background:'rgba(255,255,255,0.04)', overflow:'hidden', position:'relative' }}>
                <div style={{ height:'100%', width:`${(w.revenue/maxRev*100).toFixed(1)}%`, background:'linear-gradient(90deg,#6366f1,#38bdf8)', borderRadius:6, transition:'width 0.8s ease', display:'flex', alignItems:'center', paddingLeft:10 }}>
                  <span style={{ fontSize:11, fontWeight:700, color:'rgba(255,255,255,0.9)', whiteSpace:'nowrap' }}>₹{(w.revenue/100000).toFixed(1)}L</span>
                </div>
              </div>
              <div style={{ width:80, textAlign:'right', fontSize:12, fontWeight:700, color: w.net >= 0 ? '#34d399' : '#f87171' }}>
                +{fmt(w.net)}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))', gap:16 }}>
        {WEEKLY.map((w, i) => (
          <div key={i} style={{ padding:20, borderRadius:14, background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ fontSize:13, fontWeight:700, color:'#e2e8f0', marginBottom:14 }}>{w.week}</div>
            {[
              { label:'Orders', value:w.orders },
              { label:'Revenue', value:fmt(w.revenue) },
              { label:'Ad Spend', value:fmt(w.adSpend) },
              { label:'Net Profit', value:(w.net>=0?'+':'')+fmt(w.net), color: w.net>=0?'#34d399':'#f87171' },
              { label:'Delivered', value:w.delivered, color:'#34d399' },
              { label:'RTO', value:w.rto, color:'#f87171' },
            ].map((r,j) => (
              <div key={j} style={{ display:'flex', justifyContent:'space-between', padding:'5px 0', borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
                <span style={{ fontSize:12, color:'rgba(226,232,240,0.45)' }}>{r.label}</span>
                <span style={{ fontSize:12, fontWeight:600, color:r.color||'#e2e8f0' }}>{r.value}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── DemoMonthly ──────────────────────────────────────────────────────────────
function DemoMonthly() {
  const maxOrders = Math.max(...MONTHLY.map(m => m.orders));
  return (
    <div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:16, marginBottom:32 }}>
        {[
          { label:'Total Orders (6 mo)', value:'5,020', color:'#60a5fa' },
          { label:'Total Revenue (6 mo)', value:'₹80.3L', color:'#34d399' },
          { label:'Total Net Profit (6 mo)', value:'₹6.65L', color:'#34d399' },
          { label:'Avg Monthly Growth', value:'+12.4%', color:'#a78bfa' },
        ].map((s,i) => (
          <div key={i} style={{ padding:'20px', borderRadius:14, background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ fontSize:12, color:'rgba(226,232,240,0.4)', marginBottom:8 }}>{s.label}</div>
            <div style={{ fontSize:28, fontWeight:800, color:s.color, letterSpacing:'-0.02em' }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div style={{ padding:24, borderRadius:16, background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.08)', marginBottom:24 }}>
        <h3 style={{ margin:'0 0 20px', fontSize:15, fontWeight:700, color:'#e2e8f0' }}>Orders by Month</h3>
        <div style={{ display:'flex', alignItems:'flex-end', gap:12, height:160 }}>
          {MONTHLY.map((m, i) => {
            const h = Math.round((m.orders / maxOrders) * 120);
            return (
              <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:6 }}>
                <div style={{ fontSize:10, fontWeight:700, color:'#34d399' }}>+₹{(m.net/1000).toFixed(0)}K</div>
                <div style={{ width:'100%', height:h, borderRadius:'6px 6px 0 0', background:'linear-gradient(180deg,#6366f1,#4f46e5)', display:'flex', alignItems:'flex-start', justifyContent:'center', paddingTop:4 }}>
                  <span style={{ fontSize:10, fontWeight:700, color:'rgba(255,255,255,0.8)' }}>{m.orders}</span>
                </div>
                <div style={{ fontSize:9, color:'rgba(226,232,240,0.4)', textAlign:'center', lineHeight:1.2 }}>
                  {m.month.split(' ')[0]}<br/>{m.month.split(' ')[1]}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:16 }}>
        {MONTHLY.map((m, i) => (
          <div key={i} style={{ padding:20, borderRadius:14, background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ fontSize:14, fontWeight:700, color:'#e2e8f0', marginBottom:12 }}>{m.month}</div>
            {[
              { label:'Orders', value:m.orders.toLocaleString('en-IN') },
              { label:'Revenue', value:fmt(m.revenue) },
              { label:'Net Profit', value:'+'+fmt(m.net), color:'#34d399' },
              { label:'Profit Margin', value:((m.net/m.revenue)*100).toFixed(1)+'%', color:'#a78bfa' },
            ].map((r,j) => (
              <div key={j} style={{ display:'flex', justifyContent:'space-between', padding:'5px 0', borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
                <span style={{ fontSize:12, color:'rgba(226,232,240,0.45)' }}>{r.label}</span>
                <span style={{ fontSize:12, fontWeight:600, color:r.color||'#e2e8f0' }}>{r.value}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── DemoAllTime ──────────────────────────────────────────────────────────────
function DemoAllTime() {
  const stats = [
    { label:'Total Orders',       value:'5,020',   sub:'Since Jan 2026',  icon:'📦', color:'#60a5fa' },
    { label:'Total Revenue',      value:'₹80.3L',  sub:'Gross sales',     icon:'💰', color:'#34d399' },
    { label:'Net Profit',         value:'₹6.65L',  sub:'After all costs', icon:'📈', color:'#34d399' },
    { label:'Avg Order Value',    value:'₹1,600',  sub:'Per order',       icon:'🧾', color:'#a78bfa' },
    { label:'Total Delivered',    value:'3,714',   sub:'74% deliver rate',icon:'✅', color:'#34d399' },
    { label:'Total RTO',          value:'201',     sub:'4.0% RTO rate',   icon:'🔄', color:'#f87171' },
    { label:'Avg Daily Orders',   value:'27.7',    sub:'Orders per day',  icon:'📅', color:'#60a5fa' },
    { label:'Best Day Revenue',   value:'₹72,000', sub:'Sat, Jun 7',      icon:'🏆', color:'#fbbf24' },
  ];
  return (
    <div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))', gap:16, marginBottom:32 }}>
        {stats.map((s,i) => (
          <div key={i} style={{ padding:'20px', borderRadius:14, background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', position:'relative', overflow:'hidden' }}>
            <div style={{ position:'absolute', top:0, left:0, right:0, height:2, background:`linear-gradient(90deg,${s.color},transparent)`, opacity:0.6 }} />
            <div style={{ fontSize:24, marginBottom:8 }}>{s.icon}</div>
            <div style={{ fontSize:28, fontWeight:800, color:s.color, letterSpacing:'-0.02em', marginBottom:4 }}>{s.value}</div>
            <div style={{ fontSize:12, color:'rgba(226,232,240,0.6)', fontWeight:600, marginBottom:3 }}>{s.label}</div>
            <div style={{ fontSize:11, color:'rgba(226,232,240,0.3)' }}>{s.sub}</div>
          </div>
        ))}
      </div>
      <div style={{ padding:24, borderRadius:16, background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.08)', textAlign:'center' }}>
        <div style={{ fontSize:14, color:'rgba(226,232,240,0.5)', marginBottom:4 }}>Store running since</div>
        <div style={{ fontSize:32, fontWeight:800, color:'#e2e8f0' }}>181 Days</div>
        <div style={{ fontSize:13, color:'rgba(226,232,240,0.4)', marginTop:4 }}>Jan 14, 2026 → Today</div>
      </div>
    </div>
  );
}

// ── DemoBusinessAnalytics ────────────────────────────────────────────────────
function DemoBusinessAnalytics() {
  return (
    <div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20, marginBottom:24 }}>
        <div style={{ padding:24, borderRadius:16, background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)' }}>
          <h3 style={{ margin:'0 0 16px', fontSize:14, fontWeight:700, color:'rgba(226,232,240,0.6)', textTransform:'uppercase', letterSpacing:1 }}>Payment Split</h3>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {[
              { label:'Prepaid Orders', pct:39, count:1958, color:'#818cf8' },
              { label:'COD Orders',     pct:61, count:3062, color:'#fb923c' },
            ].map((r,i) => (
              <div key={i}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
                  <span style={{ fontSize:13, color:'rgba(226,232,240,0.7)' }}>{r.label}</span>
                  <span style={{ fontSize:13, fontWeight:700, color:r.color }}>{r.pct}% · {r.count}</span>
                </div>
                <div style={{ height:8, borderRadius:4, background:'rgba(255,255,255,0.06)' }}>
                  <div style={{ height:'100%', width:`${r.pct}%`, borderRadius:4, background:r.color }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ padding:24, borderRadius:16, background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)' }}>
          <h3 style={{ margin:'0 0 16px', fontSize:14, fontWeight:700, color:'rgba(226,232,240,0.6)', textTransform:'uppercase', letterSpacing:1 }}>Delivery Performance</h3>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {[
              { label:'Delivered',    pct:74, color:'#34d399' },
              { label:'In Transit',   pct:12, color:'#60a5fa' },
              { label:'Failed',       pct:6,  color:'#f97316' },
              { label:'RTO',          pct:4,  color:'#f87171' },
              { label:'Canceled',     pct:4,  color:'#94a3b8' },
            ].map((r,i) => (
              <div key={i}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                  <span style={{ fontSize:12, color:'rgba(226,232,240,0.7)' }}>{r.label}</span>
                  <span style={{ fontSize:12, fontWeight:700, color:r.color }}>{r.pct}%</span>
                </div>
                <div style={{ height:6, borderRadius:3, background:'rgba(255,255,255,0.06)' }}>
                  <div style={{ height:'100%', width:`${r.pct}%`, borderRadius:3, background:r.color }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ padding:24, borderRadius:16, background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)' }}>
        <h3 style={{ margin:'0 0 16px', fontSize:14, fontWeight:700, color:'rgba(226,232,240,0.6)', textTransform:'uppercase', letterSpacing:1 }}>Top Cities by Orders</h3>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))', gap:12 }}>
          {[
            { city:'Mumbai',    orders:784 }, { city:'Delhi',     orders:621 },
            { city:'Bengaluru', orders:543 }, { city:'Hyderabad', orders:412 },
            { city:'Pune',      orders:387 }, { city:'Chennai',   orders:298 },
            { city:'Kolkata',   orders:254 }, { city:'Ahmedabad', orders:231 },
          ].map((c,i) => (
            <div key={i} style={{ padding:'12px 14px', borderRadius:10, background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.07)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <span style={{ fontSize:13, color:'rgba(226,232,240,0.8)' }}>{c.city}</span>
              <span style={{ fontSize:13, fontWeight:700, color:'#60a5fa' }}>{c.orders}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── DemoMoneyInMyPocket ──────────────────────────────────────────────────────
function DemoMoneyInMyPocket() {
  const [period, setPeriod] = useState('month');
  const data = {
    month: { revenue:460800, cod:280000, prepaid:180800, cogs:198000, shipping:72000, adSpend:58800, rtoLoss:18400, net:113600 },
    week:  { revenue:224400, cod:136000, prepaid:88400,  cogs:96000,  shipping:34000, adSpend:28600, rtoLoss:8800,  net:56400  },
  };
  const d = data[period] || data.month;
  const rows = [
    { label:'Gross Revenue',    value:d.revenue,   color:'#34d399', plus:true  },
    { label:'COD Collections',  value:d.cod,       color:'#34d399', plus:true, sub:true },
    { label:'Prepaid Revenue',  value:d.prepaid,   color:'#34d399', plus:true, sub:true },
    { label:'Cost of Goods',    value:d.cogs,      color:'#f87171', minus:true },
    { label:'Shipping Costs',   value:d.shipping,  color:'#f87171', minus:true },
    { label:'Ad Spend',         value:d.adSpend,   color:'#f87171', minus:true },
    { label:'RTO Losses',       value:d.rtoLoss,   color:'#f87171', minus:true },
  ];
  return (
    <div>
      <div style={{ display:'flex', gap:8, marginBottom:24 }}>
        {['week','month'].map(p => (
          <button key={p} onClick={() => setPeriod(p)}
            style={{ padding:'8px 20px', borderRadius:8, fontWeight:600, fontSize:13, cursor:'pointer',
              background: period===p ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.05)',
              border: period===p ? '1px solid rgba(99,102,241,0.4)' : '1px solid rgba(255,255,255,0.1)',
              color: period===p ? '#a5b4fc' : 'rgba(226,232,240,0.6)',
            }}>
            {p === 'week' ? 'This Week' : 'This Month'}
          </button>
        ))}
      </div>

      <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:24 }}>
        {rows.map((r,i) => (
          <div key={i} style={{ padding:'14px 18px', borderRadius:10, background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.07)', display:'flex', justifyContent:'space-between', alignItems:'center', marginLeft: r.sub ? 20 : 0 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              {r.sub && <div style={{ width:2, height:16, background:'rgba(255,255,255,0.15)', borderRadius:1 }} />}
              <span style={{ fontSize:13, color:'rgba(226,232,240,0.7)' }}>{r.label}</span>
            </div>
            <span style={{ fontSize:14, fontWeight:700, color:r.color }}>
              {r.minus ? '-' : r.plus ? '+' : ''}{fmt(r.value)}
            </span>
          </div>
        ))}
        <div style={{ padding:'18px', borderRadius:12, background:'rgba(52,211,153,0.08)', border:'2px solid rgba(52,211,153,0.3)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <span style={{ fontSize:16, fontWeight:700, color:'#e2e8f0' }}>💰 Money in My Pocket</span>
          <span style={{ fontSize:24, fontWeight:800, color:'#34d399' }}>+{fmt(d.net)}</span>
        </div>
      </div>
    </div>
  );
}

// ── DemoProducts ─────────────────────────────────────────────────────────────
function DemoProducts() {
  const [search, setSearch] = useState('');
  const filtered = PRODUCTS.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase()));
  return (
    <div>
      <div style={{ display:'flex', gap:12, marginBottom:20, flexWrap:'wrap', alignItems:'center' }}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search products or SKU..."
          style={{ flex:1, minWidth:200, padding:'10px 14px', borderRadius:10, border:'1px solid rgba(255,255,255,0.1)', background:'rgba(255,255,255,0.05)', color:'#e2e8f0', fontSize:13, outline:'none', fontFamily:'Outfit,sans-serif' }} />
        <div style={{ fontSize:13, color:'rgba(226,232,240,0.4)' }}>{filtered.length} products</div>
      </div>
      <div style={{ borderRadius:14, overflow:'hidden', border:'1px solid rgba(255,255,255,0.08)' }}>
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead>
            <tr style={{ background:'rgba(255,255,255,0.04)' }}>
              {['Product','SKU','Cost Price','Selling Price','Units Sold','Revenue','Margin'].map(h => (
                <th key={h} style={{ padding:'12px 14px', textAlign:'left', fontSize:11, color:'rgba(226,232,240,0.4)', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.8px', borderBottom:'1px solid rgba(255,255,255,0.07)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((p,i) => {
              const margin = (((p.price - p.cost) / p.price) * 100).toFixed(0);
              return (
                <tr key={i} style={{ borderBottom:'1px solid rgba(255,255,255,0.05)' }}
                  onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.03)'}
                  onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                  <td style={{ padding:'12px 14px', fontSize:13, color:'#e2e8f0', fontWeight:500 }}>{p.name}</td>
                  <td style={{ padding:'12px 14px', fontSize:12, color:'#a5b4fc', fontFamily:'monospace' }}>{p.sku}</td>
                  <td style={{ padding:'12px 14px', fontSize:13, color:'rgba(226,232,240,0.6)' }}>₹{p.cost}</td>
                  <td style={{ padding:'12px 14px', fontSize:13, color:'rgba(226,232,240,0.8)', fontWeight:600 }}>₹{p.price}</td>
                  <td style={{ padding:'12px 14px', fontSize:13, color:'rgba(226,232,240,0.8)' }}>{p.sold}</td>
                  <td style={{ padding:'12px 14px', fontSize:13, color:'#34d399', fontWeight:600 }}>₹{(p.revenue/1000).toFixed(0)}K</td>
                  <td style={{ padding:'12px 14px' }}>
                    <span style={{ fontSize:12, fontWeight:700, padding:'3px 10px', borderRadius:999, background: parseInt(margin) > 40 ? 'rgba(52,211,153,0.15)' : 'rgba(251,191,36,0.15)', color: parseInt(margin) > 40 ? '#34d399' : '#fbbf24', border:`1px solid ${parseInt(margin) > 40 ? 'rgba(52,211,153,0.35)' : 'rgba(251,191,36,0.35)'}` }}>
                      {margin}%
                    </span>
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

// ── DemoPricing ──────────────────────────────────────────────────────────────
function DemoPricing() {
  return (
    <div>
      <div style={{ marginBottom:20, padding:16, borderRadius:12, background:'rgba(99,102,241,0.08)', border:'1px solid rgba(99,102,241,0.2)', fontSize:13, color:'rgba(226,232,240,0.7)' }}>
        💡 Set cost prices and shipping costs for each product. This data powers your P&L, CPP, and Net Profit calculations.
      </div>
      <div style={{ borderRadius:14, overflow:'hidden', border:'1px solid rgba(255,255,255,0.08)' }}>
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead>
            <tr style={{ background:'rgba(255,255,255,0.04)' }}>
              {['Product','SKU','Cost Price (₹)','Shipping (₹)','Selling Price (₹)','Actions'].map(h => (
                <th key={h} style={{ padding:'12px 14px', textAlign:'left', fontSize:11, color:'rgba(226,232,240,0.4)', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.8px', borderBottom:'1px solid rgba(255,255,255,0.07)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PRODUCTS.map((p,i) => (
              <tr key={i} style={{ borderBottom:'1px solid rgba(255,255,255,0.05)' }}
                onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.03)'}
                onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                <td style={{ padding:'12px 14px', fontSize:13, color:'#e2e8f0' }}>{p.name}</td>
                <td style={{ padding:'12px 14px', fontSize:12, color:'#a5b4fc', fontFamily:'monospace' }}>{p.sku}</td>
                <td style={{ padding:'12px 14px', fontSize:13, color:'rgba(226,232,240,0.8)', fontWeight:600 }}>₹{p.cost}</td>
                <td style={{ padding:'12px 14px', fontSize:13, color:'rgba(226,232,240,0.6)' }}>₹{Math.round(p.cost * 0.35)}</td>
                <td style={{ padding:'12px 14px', fontSize:13, color:'#34d399' }}>₹{p.price}</td>
                <td style={{ padding:'12px 14px' }}>
                  <button onClick={() => alert('Demo: Edit pricing — in the live dashboard this opens an inline editor to update cost price, shipping cost and effective date.')}
                    style={{ padding:'5px 12px', borderRadius:6, background:'rgba(99,102,241,0.15)', border:'1px solid rgba(99,102,241,0.3)', color:'#a5b4fc', fontSize:12, fontWeight:600, cursor:'pointer' }}>
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── DemoConnectStore ─────────────────────────────────────────────────────────
function DemoConnectStore() {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
      <div style={{ padding:24, borderRadius:16, background:'rgba(52,211,153,0.06)', border:'1px solid rgba(52,211,153,0.2)', display:'flex', alignItems:'center', gap:16 }}>
        <ShieldCheck size={32} color="#34d399" />
        <div>
          <div style={{ fontSize:15, fontWeight:700, color:'#34d399', marginBottom:4 }}>Shopify Connected</div>
          <div style={{ fontSize:13, color:'rgba(226,232,240,0.6)' }}>bnbtoys.myshopify.com — Pro Plan · Last synced 2 min ago</div>
        </div>
      </div>

      <div style={{ padding:24, borderRadius:16, background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)' }}>
        <h3 style={{ margin:'0 0 16px', fontSize:15, fontWeight:700, color:'#e2e8f0' }}>Sync Options</h3>
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {[
            { label:'Incremental Sync', desc:'Sync orders from last sync date to now', icon:'🔄', action:'Sync Now' },
            { label:'Full Re-Sync',     desc:'Re-download all orders from Shopify',    icon:'📥', action:'Start Full Sync' },
            { label:'Custom Range',     desc:'Choose specific date range to sync',     icon:'📅', action:'Configure' },
          ].map((opt,i) => (
            <div key={i} style={{ padding:'16px', borderRadius:12, background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.07)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                <span style={{ fontSize:20 }}>{opt.icon}</span>
                <div>
                  <div style={{ fontSize:13, fontWeight:600, color:'#e2e8f0' }}>{opt.label}</div>
                  <div style={{ fontSize:12, color:'rgba(226,232,240,0.4)' }}>{opt.desc}</div>
                </div>
              </div>
              <button onClick={() => alert(`Demo: ${opt.label} — in the live dashboard, this triggers a real Shopify order sync.`)}
                style={{ padding:'8px 16px', borderRadius:8, background:'rgba(99,102,241,0.15)', border:'1px solid rgba(99,102,241,0.3)', color:'#a5b4fc', fontSize:13, fontWeight:600, cursor:'pointer' }}>
                {opt.action}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── DemoSettings ─────────────────────────────────────────────────────────────
function DemoSettings() {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      {[
        { section:'Store Details', fields:[{ label:'Store Name', value:'BnB Toys' }, { label:'Shopify Domain', value:'bnbtoys.myshopify.com' }] },
        { section:'Ad Platforms', fields:[{ label:'Meta Ads', value:'Connected' }, { label:'Google Ads', value:'Not connected' }] },
        { section:'Notifications', fields:[{ label:'Daily Summary Email', value:'Enabled' }, { label:'RTO Alerts', value:'Enabled' }] },
      ].map((s,i) => (
        <div key={i} style={{ padding:20, borderRadius:14, background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)' }}>
          <h3 style={{ margin:'0 0 14px', fontSize:13, fontWeight:700, color:'rgba(226,232,240,0.5)', textTransform:'uppercase', letterSpacing:1 }}>{s.section}</h3>
          {s.fields.map((f,j) => (
            <div key={j} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 0', borderBottom: j < s.fields.length-1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
              <span style={{ fontSize:13, color:'rgba(226,232,240,0.6)' }}>{f.label}</span>
              <span style={{ fontSize:13, fontWeight:600, color:'#e2e8f0' }}>{f.value}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

// ── CopilotPanel ─────────────────────────────────────────────────────────────
function CopilotPanel({ onClose }) {
  const [input, setInput] = useState('');
  const [msgs, setMsgs] = useState([
    { role:'ai', text: AI_QA.default }
  ]);
  const [thinking, setThinking] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:'smooth' }); }, [msgs]);

  const send = () => {
    const q = input.trim();
    if (!q || thinking) return;
    setInput('');
    setMsgs(m => [...m, { role:'user', text:q }]);
    setThinking(true);
    setTimeout(() => {
      const low = q.toLowerCase();
      let ans = AI_QA.default;
      if (low.includes('top') || low.includes('product') || low.includes('revenue')) ans = AI_QA['top products'];
      else if (low.includes('rto') || low.includes('risk') || low.includes('return')) ans = AI_QA['rto risk'];
      else if (low.includes('profit') || low.includes('increase') || low.includes('improve') || low.includes('aov')) ans = AI_QA['increase profit'];
      else if (low.includes('today') || low.includes('jun 14') || low.includes('performance')) ans = AI_QA['today'];
      setMsgs(m => [...m, { role:'ai', text:ans }]);
      setThinking(false);
    }, 1200);
  };

  const suggestions = ['Show top products', 'What are my RTO risks?', 'How can I increase profit?', "How is today performing?"];

  return (
    <div style={{
      position:'fixed', top:0, right:0, bottom:0, width:420, zIndex:200,
      background:'rgba(7,7,22,0.97)', backdropFilter:'blur(24px)',
      border:'1px solid rgba(255,255,255,0.1)', borderRight:'none',
      display:'flex', flexDirection:'column', fontFamily:'Outfit,sans-serif',
    }}>
      <div style={{ padding:'16px 20px', borderBottom:'1px solid rgba(255,255,255,0.08)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:32, height:32, borderRadius:10, background:'linear-gradient(135deg,#6366f1,#a855f7)', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Sparkles size={16} color="#fff" />
          </div>
          <div>
            <div style={{ fontSize:14, fontWeight:700, color:'#e2e8f0' }}>AI Co-Pilot</div>
            <div style={{ fontSize:11, color:'rgba(226,232,240,0.4)' }}>Powered by GPT-4o · Demo mode</div>
          </div>
        </div>
        <button onClick={onClose} style={{ background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:8, color:'rgba(226,232,240,0.6)', width:30, height:30, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <X size={16} />
        </button>
      </div>

      <div style={{ flex:1, overflowY:'auto', padding:'16px 20px', display:'flex', flexDirection:'column', gap:14 }}>
        {msgs.map((m, i) => (
          <div key={i} style={{ display:'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
            <div style={{
              maxWidth:'85%', padding:'12px 14px', borderRadius: m.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
              background: m.role === 'user' ? 'linear-gradient(135deg,rgba(99,102,241,0.4),rgba(168,85,247,0.4))' : 'rgba(255,255,255,0.06)',
              border:`1px solid ${m.role === 'user' ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.1)'}`,
              fontSize:13, color:'rgba(226,232,240,0.9)', lineHeight:1.6, whiteSpace:'pre-wrap',
            }}>
              {m.text}
            </div>
          </div>
        ))}
        {thinking && (
          <div style={{ display:'flex', gap:6, padding:'12px 14px', borderRadius:14, background:'rgba(255,255,255,0.06)', width:'fit-content' }}>
            {[0,1,2].map(i => <div key={i} style={{ width:6, height:6, borderRadius:'50%', background:'rgba(165,180,252,0.6)', animation:`dot 1.2s ease-in-out ${i*0.2}s infinite` }} />)}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {msgs.length <= 1 && (
        <div style={{ padding:'0 20px 12px' }}>
          <div style={{ fontSize:11, color:'rgba(226,232,240,0.35)', marginBottom:8 }}>Try asking:</div>
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            {suggestions.map((s,i) => (
              <button key={i} onClick={() => { setInput(s); setTimeout(()=>{ setInput(''); setMsgs(m => [...m, { role:'user', text:s }]); setThinking(true); setTimeout(()=>{ const low=s.toLowerCase(); let ans=AI_QA.default; if(low.includes('top')||low.includes('product'))ans=AI_QA['top products']; else if(low.includes('rto'))ans=AI_QA['rto risk']; else if(low.includes('profit')||low.includes('increase'))ans=AI_QA['increase profit']; else if(low.includes('today'))ans=AI_QA['today']; setMsgs(m=>[...m,{role:'ai',text:ans}]); setThinking(false); },1200); },0); }}
                style={{ padding:'8px 12px', borderRadius:8, background:'rgba(99,102,241,0.1)', border:'1px solid rgba(99,102,241,0.2)', color:'#a5b4fc', fontSize:12, cursor:'pointer', textAlign:'left', transition:'background 0.2s' }}
                onMouseEnter={e=>e.currentTarget.style.background='rgba(99,102,241,0.18)'}
                onMouseLeave={e=>e.currentTarget.style.background='rgba(99,102,241,0.1)'}>
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      <div style={{ padding:'12px 16px', borderTop:'1px solid rgba(255,255,255,0.08)', display:'flex', gap:10 }}>
        <input
          value={input}
          onChange={e=>setInput(e.target.value)}
          onKeyDown={e=>e.key==='Enter' && send()}
          placeholder="Ask about your store data..."
          style={{ flex:1, padding:'10px 14px', borderRadius:10, border:'1px solid rgba(255,255,255,0.12)', background:'rgba(255,255,255,0.06)', color:'#e2e8f0', fontSize:13, outline:'none', fontFamily:'Outfit,sans-serif' }}
        />
        <button onClick={send} disabled={!input.trim() || thinking}
          style={{ width:40, height:40, borderRadius:10, background:'linear-gradient(135deg,#6366f1,#a855f7)', border:'none', cursor: input.trim() && !thinking ? 'pointer' : 'not-allowed', display:'flex', alignItems:'center', justifyContent:'center', opacity: input.trim() && !thinking ? 1 : 0.4 }}>
          <Send size={16} color="#fff" />
        </button>
      </div>
      <style>{`@keyframes dot{0%,80%,100%{transform:scale(0.6);opacity:0.3}40%{transform:scale(1);opacity:1}}`}</style>
    </div>
  );
}

// ── DemoPage (main) ──────────────────────────────────────────────────────────
export default function DemoPage() {
  const [tab, setTab] = useState('dashboard');
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [notice, setNotice] = useState(true);

  const NAV_ANALYTICS = [
    { key:'dashboard', icon:LayoutDashboard, label:'Daily Dashboard' },
    { key:'weekly',    icon:BarChart,        label:'Weekly Performance' },
    { key:'monthly',   icon:Calendar,        label:'Monthly Overview' },
    { key:'alltime',   icon:TrendingUp,      label:'All-Time Analytics' },
    { key:'analytics', icon:PieChart,        label:'Business Analytics' },
    { key:'money',     icon:Wallet,          label:'Money In My Pocket' },
    { key:'sheet',     icon:List,            label:'Sheet View' },
  ];
  const NAV_MGMT = [
    { key:'products', icon:Package,   label:'Products' },
    { key:'pricing',  icon:DollarSign,label:'Pricing' },
    { key:'connect',  icon:Link2,     label:'Connect your Store' },
  ];
  const NAV_ACCOUNT = [
    { key:'advanced', icon:SlidersHorizontal, label:'Advanced Settings' },
    { key:'settings', icon:Settings,          label:'Settings' },
    { key:'support',  icon:Headphones,        label:'Talk to Support' },
  ];

  const titles = {
    dashboard:'Business Dashboard', weekly:'Weekly Performance', monthly:'Monthly Overview',
    alltime:'All-Time Analytics', analytics:'Business Analytics', money:'Money In My Pocket',
    sheet:'Sheet View', products:'Products', pricing:'Pricing', connect:'Connect your Store',
    advanced:'Advanced Settings', settings:'Settings', support:'Support',
  };

  const renderContent = () => {
    switch (tab) {
      case 'dashboard': return <DemoDaily />;
      case 'weekly':    return <DemoWeekly />;
      case 'monthly':   return <DemoMonthly />;
      case 'alltime':   return <DemoAllTime />;
      case 'analytics': return <DemoBusinessAnalytics />;
      case 'money':     return <DemoMoneyInMyPocket />;
      case 'products':  return <DemoProducts />;
      case 'pricing':   return <DemoPricing />;
      case 'connect':   return <DemoConnectStore />;
      case 'advanced':  return <DemoSettings />;
      case 'settings':  return <DemoSettings />;
      case 'sheet': return (
        <div style={{ padding:40, textAlign:'center' }}>
          <div style={{ fontSize:14, color:'rgba(226,232,240,0.5)', lineHeight:1.8 }}>
            <div style={{ fontSize:32, marginBottom:12 }}>📊</div>
            Sheet View exports your daily order data in a spreadsheet format.<br />
            In the live dashboard, you can view and export orders as rows with<br />
            per-column breakdown of all metrics.
          </div>
        </div>
      );
      case 'support': return (
        <div style={{ padding:40, textAlign:'center' }}>
          <div style={{ fontSize:32, marginBottom:12 }}>🎧</div>
          <div style={{ fontSize:16, fontWeight:700, color:'#e2e8f0', marginBottom:8 }}>Talk to Support</div>
          <div style={{ fontSize:13, color:'rgba(226,232,240,0.5)', marginBottom:20 }}>In the live dashboard you can raise tickets and chat with our support team.</div>
          <a href="/signup" style={{ padding:'12px 28px', borderRadius:10, background:'linear-gradient(135deg,#6366f1,#a855f7)', color:'#fff', fontWeight:700, textDecoration:'none', fontSize:14 }}>
            Sign Up to Access Support →
          </a>
        </div>
      );
      default: return <DemoDaily />;
    }
  };

  return (
    <div style={{ minHeight:'100vh', background:'#07071a', fontFamily:'Outfit,sans-serif', position:'relative',
      backgroundImage:'radial-gradient(ellipse 65% 45% at 8% 8%, rgba(167,139,250,0.1) 0%, transparent 60%), radial-gradient(ellipse 55% 40% at 92% 15%, rgba(56,189,248,0.08) 0%, transparent 60%)',
    }}>
      {/* Demo notice */}
      {notice && (
        <div style={{ position:'fixed', top:0, left:0, right:0, zIndex:300, background:'rgba(99,102,241,0.12)', backdropFilter:'blur(8px)', borderBottom:'1px solid rgba(99,102,241,0.25)', padding:'10px 24px', display:'flex', alignItems:'center', justifyContent:'space-between', gap:12 }}>
          <div style={{ fontSize:13, color:'rgba(226,232,240,0.85)' }}>
            🎮 <strong style={{ color:'#a5b4fc' }}>DEMO MODE</strong> — Explore the full dashboard with sample data from BnB Toys. No account needed.
            <a href="/signup" style={{ marginLeft:12, color:'#a5b4fc', fontWeight:700, textDecoration:'underline' }}>Create your free account →</a>
          </div>
          <button onClick={() => setNotice(false)} style={{ background:'none', border:'none', color:'rgba(226,232,240,0.4)', cursor:'pointer', fontSize:18, lineHeight:1 }}>×</button>
        </div>
      )}

      <div style={{ display:'flex', height:'100vh', overflow:'hidden', paddingTop: notice ? 41 : 0, transition:'padding-top 0.2s' }}>
        {/* Overlay for mobile */}
        {mobileSidebarOpen && (
          <div onClick={() => setMobileSidebarOpen(false)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.65)', backdropFilter:'blur(4px)', zIndex:9 }} />
        )}

        {/* ── SIDEBAR ── */}
        <aside style={{
          width:256, flexShrink:0,
          background:'rgba(7,7,22,0.85)', backdropFilter:'blur(32px)',
          borderRight:'1px solid rgba(255,255,255,0.07)',
          display:'flex', flexDirection:'column', zIndex:10, position:'relative',
        }}>
          {/* Brand */}
          <div style={{ padding:'20px 16px 18px', borderBottom:'1px solid rgba(255,255,255,0.06)', position:'relative' }}>
            <div style={{ position:'absolute', inset:0, background:'radial-gradient(ellipse at 50% 0%, rgba(99,102,241,0.14) 0%, transparent 70%)', pointerEvents:'none' }} />
            <div style={{ position:'relative', padding:'12px 16px 10px', borderRadius:14, background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)', display:'inline-block' }}>
              <BrandLogo variant="full" iconSize={44} />
            </div>
          </div>

          {/* Nav */}
          <nav style={{ flex:1, padding:'14px 10px', display:'flex', flexDirection:'column', gap:3, overflowY:'auto' }}>
            <div style={{ fontSize:'9.5px', fontWeight:700, color:'rgba(255,255,255,0.2)', letterSpacing:'1.2px', textTransform:'uppercase', padding:'8px 10px 6px' }}>Analytics</div>
            {NAV_ANALYTICS.map(n => <NavItem key={n.key} {...n} active={tab===n.key} onClick={() => { setTab(n.key); setMobileSidebarOpen(false); }} />)}

            <div style={{ height:1, background:'rgba(255,255,255,0.05)', margin:'10px 4px' }} />
            <div style={{ fontSize:'9.5px', fontWeight:700, color:'rgba(255,255,255,0.2)', letterSpacing:'1.2px', textTransform:'uppercase', padding:'8px 10px 6px' }}>Management</div>
            {NAV_MGMT.map(n => <NavItem key={n.key} {...n} active={tab===n.key} onClick={() => { setTab(n.key); setMobileSidebarOpen(false); }} />)}

            <div style={{ height:1, background:'rgba(255,255,255,0.05)', margin:'10px 4px' }} />
            <div style={{ fontSize:'9.5px', fontWeight:700, color:'rgba(255,255,255,0.2)', letterSpacing:'1.2px', textTransform:'uppercase', padding:'4px 10px 6px' }}>Account</div>
            {NAV_ACCOUNT.map(n => <NavItem key={n.key} {...n} active={tab===n.key} onClick={() => { setTab(n.key); setMobileSidebarOpen(false); }} />)}
          </nav>

          {/* User footer */}
          <div style={{ padding:'12px 10px', borderTop:'1px solid rgba(255,255,255,0.06)' }}>
            <a href="/signup" style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px', borderRadius:12, background:'rgba(99,102,241,0.08)', border:'1px solid rgba(99,102,241,0.2)', textDecoration:'none', transition:'all 0.2s' }}
              onMouseEnter={e=>{e.currentTarget.style.background='rgba(99,102,241,0.15)';}}
              onMouseLeave={e=>{e.currentTarget.style.background='rgba(99,102,241,0.08)';}}>
              <div style={{ width:32, height:32, borderRadius:9, background:'linear-gradient(135deg,#6366f1,#a855f7)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:800, color:'#fff' }}>D</div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:12, fontWeight:600, color:'#e2e8f0', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>demo@store.com</div>
                <div style={{ fontSize:10.5, color:'#a5b4fc', marginTop:1, fontWeight:600 }}>Create free account →</div>
              </div>
            </a>
          </div>
        </aside>

        {/* ── MAIN ── */}
        <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', position:'relative' }}>
          {/* Topbar */}
          <header style={{ height:66, flexShrink:0, background:'rgba(7,7,22,0.8)', backdropFilter:'blur(24px)', borderBottom:'1px solid rgba(255,255,255,0.07)', display:'flex', alignItems:'center', padding:'0 28px', gap:16, position:'relative' }}>
            <div style={{ flex:1, display:'flex', flexDirection:'column', gap:2 }}>
              <h1 style={{ margin:0, fontSize:17, fontWeight:700, color:'#e2e8f0', letterSpacing:'-0.02em' }}>{titles[tab] || 'Dashboard'}</h1>
              <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:11, color:'rgba(226,232,240,0.4)' }}>
                <span style={{ width:6, height:6, borderRadius:'50%', background:'#10b981', boxShadow:'0 0 8px rgba(16,185,129,0.8)', display:'inline-block', animation:'livePulse 2s ease-in-out infinite' }} />
                {DEMO.store_name} — Live &nbsp;·&nbsp; Pro Plan &nbsp;·&nbsp; Synced 2 min ago
              </div>
            </div>

            <a href="/" style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, color:'rgba(226,232,240,0.4)', textDecoration:'none', padding:'6px 10px', borderRadius:8, border:'1px solid rgba(255,255,255,0.08)', background:'rgba(255,255,255,0.04)', transition:'all 0.2s' }}
              onMouseEnter={e=>{e.currentTarget.style.color='rgba(226,232,240,0.8)'; e.currentTarget.style.background='rgba(255,255,255,0.07)';}}
              onMouseLeave={e=>{e.currentTarget.style.color='rgba(226,232,240,0.4)'; e.currentTarget.style.background='rgba(255,255,255,0.04)';}}>
              ← Back to Home
            </a>

            <a href="/signup" style={{ padding:'8px 16px', borderRadius:10, background:'linear-gradient(135deg,#6366f1,#a855f7)', color:'#fff', fontWeight:700, fontSize:13, textDecoration:'none' }}>
              Start Free
            </a>

            <button
              onClick={() => setCopilotOpen(o => !o)}
              style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 16px', borderRadius:10, background: copilotOpen ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.06)', border:`1px solid ${copilotOpen ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.1)'}`, color: copilotOpen ? '#a5b4fc' : 'rgba(226,232,240,0.8)', fontWeight:600, fontSize:13, cursor:'pointer', fontFamily:'Outfit,sans-serif', transition:'all 0.2s' }}>
              <Sparkles size={15} />
              Co-Pilot
            </button>
          </header>

          {/* Content */}
          <main style={{ flex:1, overflowY:'auto', padding:'28px 32px' }}>
            {renderContent()}
          </main>
        </div>
      </div>

      {/* Co-Pilot panel */}
      {copilotOpen && <CopilotPanel onClose={() => setCopilotOpen(false)} />}

      <style>{`
        @keyframes livePulse { 0%,100%{opacity:1;box-shadow:0 0 6px rgba(16,185,129,0.8)} 50%{opacity:0.5;box-shadow:0 0 2px rgba(16,185,129,0.3)} }
      `}</style>
    </div>
  );
}
