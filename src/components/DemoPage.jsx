/**
 * DemoPage — Conversion-focused interactive dashboard demo.
 * Goal: Make store owners feel "How am I running my business without this?"
 */
import React, { useState, useRef, useEffect } from 'react';
import BrandLogo from './BrandLogo';
import {
  LayoutDashboard, BarChart, Calendar, TrendingUp, PieChart, Wallet, List,
  Package, DollarSign, Link2, SlidersHorizontal, Settings, Headphones,
  ChevronRight, Sparkles, Send, X, ShieldCheck, AlertTriangle, ArrowUp, ArrowDown, Zap,
} from 'lucide-react';

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
  warn:     '#f59e0b',
};

// ─── Dummy data ───────────────────────────────────────────────────────────────
const TODAY = {
  date:'2026-06-14', label:'Sunday, June 14, 2026',
  orders:47, items:63, cpp:381,
  fulfilled:41, delivered:35, transit:14, otd:6,
  failed:4, canceled:2, rtoRisk:5, rto:1, unreachable:2, notConfirmed:1,
  revenue:148300, adSpend:24000, prepaid:18, cash:29, net:47200,
};

const DAILY = [
  TODAY,
  { date:'2026-06-13', label:'Saturday, June 13, 2026', orders:52, items:71, cpp:378, fulfilled:46, delivered:40, transit:16, otd:7, failed:4, canceled:2, rtoRisk:6, rto:2, unreachable:2, notConfirmed:1, revenue:164400, adSpend:26820, prepaid:21, cash:31, net:52400 },
  { date:'2026-06-12', label:'Friday, June 12, 2026',   orders:28, items:36, cpp:491, fulfilled:24, delivered:20, transit:9,  otd:4, failed:2, canceled:1, rtoRisk:3, rto:1, unreachable:1, notConfirmed:0, revenue:88600,  adSpend:17680, prepaid:11, cash:17, net:-8840 },
  { date:'2026-06-11', label:'Thursday, June 11, 2026', orders:64, items:88, cpp:388, fulfilled:57, delivered:50, transit:20, otd:9, failed:6, canceled:3, rtoRisk:8, rto:2, unreachable:3, notConfirmed:2, revenue:202200, adSpend:34140, prepaid:26, cash:38, net:61800 },
  { date:'2026-06-10', label:'Wednesday, June 10, 2026',orders:41, items:55, cpp:385, fulfilled:37, delivered:32, transit:13, otd:5, failed:3, canceled:2, rtoRisk:5, rto:1, unreachable:2, notConfirmed:1, revenue:129800, adSpend:21170, prepaid:16, cash:25, net:38600 },
  { date:'2026-06-09', label:'Tuesday, June 9, 2026',   orders:19, items:24, cpp:511, fulfilled:16, delivered:13, transit:6,  otd:3, failed:2, canceled:1, rtoRisk:2, rto:0, unreachable:1, notConfirmed:0, revenue:60100,  adSpend:12260, prepaid:8,  cash:11, net:-23580 },
  { date:'2026-06-08', label:'Monday, June 8, 2026',    orders:53, items:72, cpp:383, fulfilled:47, delivered:42, transit:17, otd:7, failed:5, canceled:3, rtoRisk:7, rto:2, unreachable:2, notConfirmed:1, revenue:167700, adSpend:27580, prepaid:21, cash:32, net:46800 },
];

const WEEKLY = [
  { week:'May 19–25',    orders:187, revenue:299200, adSpend:72400,  net:18430, delivered:142, rto:8 },
  { week:'May 26–Jun 1', orders:204, revenue:326400, adSpend:81800,  net:23190, delivered:158, rto:9 },
  { week:'Jun 2–8',      orders:176, revenue:281600, adSpend:70600,  net:11240, delivered:134, rto:11 },
  { week:'Jun 9–14',     orders:138, revenue:224400, adSpend:58800,  net:16340, delivered:105, rto:6 },
];

const MONTHLY = [
  { month:'Jan 2026', orders:721,  revenue:1153600, net:68400 },
  { month:'Feb 2026', orders:834,  revenue:1334400, net:94200 },
  { month:'Mar 2026', orders:956,  revenue:1529600, net:128700 },
  { month:'Apr 2026', orders:1087, revenue:1739200, net:155800 },
  { month:'May 2026', orders:1134, revenue:1814400, net:174200 },
  { month:'Jun 2026', orders:304,  revenue:486400,  net:52400 },
];

const PRODUCTS = [
  { name:'Wooden Block Set (Classic)',  sku:'WBS-001', cost:380, price:799,  sold:312, revenue:249288 },
  { name:'Magnetic Tiles 32pc',         sku:'MT-032',  cost:620, price:1299, sold:248, revenue:322152 },
  { name:'Educational Flash Cards',     sku:'EFC-100', cost:120, price:349,  sold:487, revenue:169963 },
  { name:'STEM Robot Kit (Age 8+)',      sku:'STEM-R8', cost:890, price:1899, sold:143, revenue:271557 },
  { name:'Soft Plush Elephant 45cm',    sku:'SPE-045', cost:290, price:599,  sold:391, revenue:234209 },
  { name:'Rainbow Stacking Rings',      sku:'RSR-010', cost:180, price:449,  sold:528, revenue:237072 },
];

const SAMPLE_ORDERS = [
  { id:'#4821', name:'Priya Sharma',   amount:1299, prepaid:true,  tag:'Delivered' },
  { id:'#4822', name:'Rahul Mehta',    amount:799,  prepaid:false, tag:'In Transit' },
  { id:'#4823', name:'Anjali Singh',   amount:449,  prepaid:false, tag:'Out for Delivery' },
  { id:'#4824', name:'Vikram Nair',    amount:1899, prepaid:true,  tag:'Delivered' },
  { id:'#4825', name:'Deepika Reddy',  amount:349,  prepaid:false, tag:'Failed Delivery' },
];

const AI_QA = {
  products: `📦 Top Products by Revenue — Last 30 Days\n\n1. Magnetic Tiles 32pc — ₹3,22,152 (248 units)\n2. STEM Robot Kit — ₹2,71,557 (143 units)\n3. Wooden Block Set — ₹2,49,288 (312 units)\n\n💡 Magnetic Tiles has the highest AOV at ₹1,299. Bundle it with Flash Cards to push AOV above ₹1,600.`,
  rto: `⚠️ RTO Risk Analysis\n\nThis week: 6 orders at risk (4.3% of total)\n\nHigh-risk signals:\n• 3 orders from Tier-3 cities with COD\n• 2 repeat unreachable customers\n• 1 address verification failed\n\n💡 Enable a ₹50 prepaid discount for Tier-3 COD orders — reduces RTO by ~35%.`,
  profit: `💰 Ways to Increase Net Profit\n\n1. Reduce CPP — Current ₹385. Consolidate ad spend on top 3 SKUs → target ₹290.\n\n2. Bundle deals — Wooden Block + Flash Cards at ₹1,099 → items/order from 1.3 → 2.1.\n\n3. Prepaid push — 61% COD. Converting 20% to prepaid saves ₹52/order in RTO costs.\n\n4. Protect your RTO — 4.1% vs 6.8% industry avg. Call unreachable orders within 2 hrs.`,
  today: `📊 Today's Performance — Jun 14\n\nOrders: 47  |  Revenue: ₹1,48,300  |  Net: +₹47,200\n\n✅ 35 delivered  🚚 14 in transit  📦 6 out for delivery\n⚠️ 4 failed delivery  ❌ 2 canceled  🔄 5 RTO risk\n\nCPP: ₹381 — below ₹400 target ✓\n\n💡 Follow up on the 4 failed deliveries before 6 PM for a re-delivery attempt today.`,
  default: `👋 Hi! I'm your AI Co-Pilot.\n\nIn your live dashboard I have full access to:\n• Order history & real-time shipping status\n• Product-level costs & margins\n• Ad spend & ROAS by platform\n• RTO patterns & risk scoring\n\nTry asking me:\n→ "Show my top products"\n→ "What are my RTO risks?"\n→ "How can I increase profit?"\n→ "How is today performing?"`,
};

const fmt = (n) => '₹' + Math.abs(Number(n) || 0).toLocaleString('en-IN');

// ─── Primitives ───────────────────────────────────────────────────────────────

function KPICard({ label, value, sub, color, trend, trendUp }) {
  return (
    <div style={{ padding:'22px 20px', borderRadius:16, background:C.surface, border:`1px solid ${C.border}`, position:'relative', overflow:'hidden', flex:1, minWidth:0 }}>
      <div style={{ position:'absolute', top:0, left:0, right:0, height:2, background:`linear-gradient(90deg,${color},transparent)`, opacity:0.9 }} />
      <div style={{ fontSize:10, fontWeight:700, color:C.textMuted, textTransform:'uppercase', letterSpacing:'0.9px', marginBottom:10 }}>{label}</div>
      <div style={{ fontSize:28, fontWeight:800, color, fontFamily:'Outfit,sans-serif', letterSpacing:'-1px', lineHeight:1 }}>{value}</div>
      {(sub || trend) && (
        <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:9, flexWrap:'wrap' }}>
          {trend && (
            <span style={{ fontSize:11, fontWeight:700, color: trendUp ? C.profit : C.loss, display:'flex', alignItems:'center', gap:2 }}>
              {trendUp ? <ArrowUp size={10}/> : <ArrowDown size={10}/>}{trend}
            </span>
          )}
          {sub && <span style={{ fontSize:11, color:C.textMuted }}>{sub}</span>}
        </div>
      )}
    </div>
  );
}

function MetricCard({ label, value, color, glow = 'white', onClick, active }) {
  const [hov, setHov] = useState(false);
  return (
    <div
      className={`metric-card${onClick ? ' clickable' : ''} glow-${glow}${active ? ' active-filter' : ''}`}
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        position:'relative', overflow:'hidden', cursor: onClick ? 'pointer' : 'default',
        transform: hov && onClick ? 'translateY(-2px)' : 'none',
        transition:'transform 0.15s',
      }}
    >
      <div style={{ fontSize:10, fontWeight:700, color:C.textMuted, textTransform:'uppercase', letterSpacing:'0.8px', marginBottom:10, lineHeight:1.3 }}>{label}</div>
      <div className="metric-value" style={{ color: color || C.textMain, fontSize:26, lineHeight:1 }}>{value}</div>
    </div>
  );
}

function NavItem({ icon: Icon, label, active, onClick, badge }) {
  const [hov, setHov] = useState(false);
  return (
    <button onClick={onClick} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        display:'flex', alignItems:'center', gap:12, width:'100%', padding:'11px 14px', borderRadius:12,
        background: active ? 'linear-gradient(135deg,rgba(34,211,238,0.10),rgba(99,102,241,0.07))' : hov ? 'rgba(255,255,255,0.05)' : 'transparent',
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

function ConversionNudge({ text, cta }) {
  return (
    <div style={{ margin:'24px 0', padding:'16px 20px', borderRadius:14, background:'linear-gradient(135deg,rgba(34,211,238,0.06),rgba(99,102,241,0.04))', border:'1px solid rgba(34,211,238,0.18)', display:'flex', alignItems:'center', gap:14, flexWrap:'wrap' }}>
      <Zap size={18} color={C.primary} style={{ flexShrink:0 }} />
      <span style={{ flex:1, fontSize:13.5, color:'rgba(238,238,248,0.8)', lineHeight:1.65, minWidth:200 }}>{text}</span>
      <a href="/signup" style={{ padding:'9px 20px', borderRadius:10, background:'linear-gradient(135deg,#22d3ee,#6366f1)', color:'#000', fontWeight:800, fontSize:13, textDecoration:'none', whiteSpace:'nowrap', flexShrink:0 }}>{cta || 'Connect My Store →'}</a>
    </div>
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
  const totNet    = scoreDays.reduce((s,d) => s + d.net, 0);
  const profDays  = scoreDays.filter(d => d.net > 0);
  const lossDays  = scoreDays.filter(d => d.net < 0);
  const profAmt   = profDays.reduce((s,d) => s + d.net, 0);
  const lossAmt   = lossDays.reduce((s,d) => s + d.net, 0);
  const feedDays  = DAILY.filter(d => d.date >= feedStart && d.date <= feedEnd).sort((a,b) => b.date.localeCompare(a.date));
  const toggleFilter = (date, key) => setActiveFilter(f => ({ ...f, [date]: f[date] === key ? null : key }));

  return (
    <div style={{ paddingBottom:80 }}>

      {/* ── Today At a Glance ── */}
      <div style={{ marginBottom:26 }}>
        <div style={{ display:'flex', alignItems:'baseline', gap:12, marginBottom:14 }}>
          <h2 style={{ margin:0, fontSize:19, fontWeight:800, color:C.textMain, fontFamily:'Outfit,sans-serif' }}>Today at a Glance</h2>
          <span style={{ fontSize:12, color:C.textMuted }}>Sun, Jun 14 · Updated just now</span>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12 }}>
          <KPICard label="Orders Today"      value={TODAY.orders}          color="#60a5fa" sub={`${TODAY.items} items`}                   trend="+12%"  trendUp />
          <KPICard label="Revenue Today"     value={fmt(TODAY.revenue)}    color="#a78bfa" sub="vs ₹1,64,400 yesterday"                  trend="−9.7%" trendUp={false} />
          <KPICard label="Net Profit Today"  value={`+${fmt(TODAY.net)}`}  color={C.profit} sub="After ads, COGS & shipping"            trend="+31%"  trendUp />
          <KPICard label="Cost Per Purchase" value={fmt(TODAY.cpp)}        color={C.profit} sub="✓ Below ₹400 target" />
        </div>
      </div>

      {/* ── Attention alert ── */}
      <div style={{ marginBottom:26, padding:'13px 18px', borderRadius:13, background:'rgba(245,158,11,0.07)', border:'1px solid rgba(245,158,11,0.22)', display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
        <AlertTriangle size={17} color={C.warn} style={{ flexShrink:0 }} />
        <div style={{ flex:1, minWidth:200 }}>
          <span style={{ fontSize:13.5, fontWeight:700, color:'rgba(255,255,255,0.9)' }}>7 orders need your attention today</span>
          <span style={{ fontSize:13, color:C.textMuted }}> — 4 failed delivery, 2 unreachable, 1 not confirmed.</span>
        </div>
        <span style={{ fontSize:11.5, color:C.warn, fontWeight:700, padding:'4px 12px', borderRadius:8, border:'1px solid rgba(245,158,11,0.28)', background:'rgba(245,158,11,0.08)', whiteSpace:'nowrap', flexShrink:0 }}>Act before 6 PM</span>
      </div>

      {/* ── P/L Scoreboard ── */}
      <div style={{ marginBottom:26, padding:'22px 24px', background:'rgba(8,8,20,0.5)', border:`1px solid rgba(255,255,255,0.08)`, borderRadius:20 }}>
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', flexWrap:'wrap', gap:16, marginBottom:4 }}>
          <div>
            <div style={{ fontSize:10, fontWeight:800, color:C.textMuted, textTransform:'uppercase', letterSpacing:'1.2px', marginBottom:10 }}>Profit / Loss Scoreboard</div>
            <div style={{ fontSize:44, fontWeight:800, color: totNet >= 0 ? C.profit : C.loss, fontFamily:'Outfit,sans-serif', letterSpacing:'-2px', lineHeight:1,
              textShadow: totNet >= 0 ? '0 0 28px rgba(16,185,129,0.35)' : '0 0 28px rgba(244,63,94,0.35)' }}>
              {totNet >= 0 ? '+' : '−'}{fmt(Math.abs(totNet))}
            </div>
            <div style={{ fontSize:12, color:C.textMuted, marginTop:6 }}>
              {new Date(scoreStart+'T00:00:00').toLocaleDateString('en-IN',{day:'numeric',month:'short'})} – {new Date(scoreEnd+'T00:00:00').toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}
            </div>
            <div style={{ marginTop:16, display:'flex', gap:12, flexWrap:'wrap' }}>
              <div style={{ background:'rgba(16,185,129,0.08)', border:'1px solid rgba(16,185,129,0.22)', padding:'11px 16px', borderRadius:12 }}>
                <div style={{ fontSize:10, color:'rgba(255,255,255,0.45)', textTransform:'uppercase', fontWeight:700, letterSpacing:'0.8px', marginBottom:5 }}>Profit Days ({profDays.length})</div>
                <div style={{ fontSize:20, fontWeight:800, color:C.profit, fontFamily:'Outfit,sans-serif' }}>+{fmt(profAmt)}</div>
              </div>
              <div style={{ background:'rgba(244,63,94,0.08)', border:'1px solid rgba(244,63,94,0.22)', padding:'11px 16px', borderRadius:12 }}>
                <div style={{ fontSize:10, color:'rgba(255,255,255,0.45)', textTransform:'uppercase', fontWeight:700, letterSpacing:'0.8px', marginBottom:5 }}>Loss Days ({lossDays.length})</div>
                <div style={{ fontSize:20, fontWeight:800, color:C.loss, fontFamily:'Outfit,sans-serif' }}>−{fmt(Math.abs(lossAmt))}</div>
              </div>
            </div>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:10, alignItems:'flex-end' }}>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap', justifyContent:'flex-end' }}>
              <div>
                <label style={{ display:'block', fontSize:11, color:C.textMuted, marginBottom:4 }}>From</label>
                <input type="date" value={tempStart} onChange={e=>setTempStart(e.target.value)} style={{ padding:'6px 10px', borderRadius:6, border:`1px solid ${C.border}`, background:'rgba(0,0,0,0.2)', color:'white', colorScheme:'dark', fontSize:13, outline:'none' }} />
              </div>
              <div>
                <label style={{ display:'block', fontSize:11, color:C.textMuted, marginBottom:4 }}>To</label>
                <input type="date" value={tempEnd} onChange={e=>setTempEnd(e.target.value)} style={{ padding:'6px 10px', borderRadius:6, border:`1px solid ${C.border}`, background:'rgba(0,0,0,0.2)', color:'white', colorScheme:'dark', fontSize:13, outline:'none' }} />
              </div>
              <button onClick={() => { setScoreStart(tempStart); setScoreEnd(tempEnd); }}
                style={{ alignSelf:'flex-end', height:34, padding:'0 18px', borderRadius:6, background:'linear-gradient(90deg,#38bdf8,#3b82f6)', color:'white', border:'none', fontWeight:600, cursor:'pointer', fontSize:13, fontFamily:'Outfit,sans-serif' }}>
                Calculate
              </button>
            </div>
            <button onClick={() => setShowTiles(t=>!t)}
              style={{ padding:'7px 14px', borderRadius:8, background: showTiles ? 'rgba(34,211,238,0.10)' : 'rgba(255,255,255,0.05)', border:`1px solid ${showTiles ? 'rgba(34,211,238,0.3)' : 'rgba(255,255,255,0.1)'}`, color: showTiles ? C.primary : 'rgba(238,238,248,0.6)', fontWeight:600, cursor:'pointer', display:'flex', alignItems:'center', gap:7, fontSize:12, fontFamily:'Outfit,sans-serif', transition:'all 0.2s' }}>
              <LayoutDashboard size={13} /> {showTiles ? 'Hide Tiles' : 'Day-by-Day View'}
            </button>
          </div>
        </div>

        {showTiles && (
          <div style={{ borderTop:'1px solid rgba(255,255,255,0.06)', paddingTop:20, marginTop:16 }}>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(128px,1fr))', gap:10 }}>
              {scoreDays.slice().sort((a,b) => b.date.localeCompare(a.date)).map(d => (
                <div key={d.date}
                  onMouseEnter={e=>e.currentTarget.style.transform='scale(1.04)'}
                  onMouseLeave={e=>e.currentTarget.style.transform='scale(1)'}
                  style={{ padding:'13px 10px', borderRadius:12, textAlign:'center', cursor:'default', transition:'transform 0.15s',
                    background: d.net >= 0 ? 'rgba(16,185,129,0.09)' : 'rgba(244,63,94,0.09)',
                    border:`1px solid ${d.net >= 0 ? 'rgba(16,185,129,0.25)' : 'rgba(244,63,94,0.25)'}`,
                  }}>
                  <div style={{ fontSize:10, color:'rgba(255,255,255,0.55)', fontWeight:600, marginBottom:6 }}>
                    {new Date(d.date+'T00:00:00').toLocaleDateString('en-US',{weekday:'short',day:'numeric',month:'short'})}
                  </div>
                  <div style={{ fontSize:17, fontWeight:800, color: d.net >= 0 ? C.profit : C.loss, fontFamily:'Outfit,sans-serif' }}>
                    {d.net >= 0 ? '+' : '−'}{fmt(Math.abs(d.net))}
                  </div>
                  <div style={{ fontSize:10, color:C.textMuted, marginTop:4 }}>{d.orders} orders</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <ConversionNudge
        text="This is demo data for Kiddie Craft Co. Your actual profit could look very different — connect your Shopify store and see exactly what you're making."
        cta="See My Real Numbers →"
      />

      {/* ── Daily Feed ── */}
      <div style={{ display:'flex', alignItems:'center', gap:16, flexWrap:'wrap', marginBottom:18 }}>
        <h2 style={{ margin:0, fontSize:17, fontWeight:700, color:C.textMain, flex:1 }}>Daily Feed</h2>
        <div style={{ display:'flex', alignItems:'flex-end', gap:10, flexWrap:'wrap' }}>
          <div>
            <label style={{ display:'block', fontSize:11, color:C.textMuted, marginBottom:4 }}>From</label>
            <input type="date" value={feedStart} onChange={e=>setFeedStart(e.target.value)} style={{ padding:'6px 10px', borderRadius:6, border:`1px solid ${C.border}`, background:'rgba(0,0,0,0.2)', color:'white', colorScheme:'dark', fontSize:13, outline:'none' }} />
          </div>
          <div>
            <label style={{ display:'block', fontSize:11, color:C.textMuted, marginBottom:4 }}>To</label>
            <input type="date" value={feedEnd} onChange={e=>setFeedEnd(e.target.value)} style={{ padding:'6px 10px', borderRadius:6, border:`1px solid ${C.border}`, background:'rgba(0,0,0,0.2)', color:'white', colorScheme:'dark', fontSize:13, outline:'none' }} />
          </div>
        </div>
      </div>

      <div style={{ display:'flex', flexDirection:'column', gap:18 }}>
        {feedDays.map(day => {
          const isP = day.net >= 0;
          const filter = activeFilter[day.date];
          return (
            <div key={day.date} className="day-block">
              <div className="day-header" style={{ flexWrap:'wrap', gap:8 }}>
                <h2 style={{ fontSize:15, margin:0 }}>{day.label}</h2>
                <div className="day-actions">
                  <span style={{ fontSize:13, padding:'5px 14px', borderRadius:999, background:'rgba(167,139,250,0.13)', color:'#c4b5fd', border:'1px solid rgba(167,139,250,0.32)', fontWeight:600 }}>CPP: {fmt(day.cpp)}</span>
                  <span style={{ fontSize:13, padding:'5px 14px', borderRadius:999, fontWeight:700,
                    background: isP ? 'rgba(16,185,129,0.13)' : 'rgba(244,63,94,0.13)',
                    color: isP ? C.profit : C.loss,
                    border: `1px solid ${isP ? 'rgba(16,185,129,0.38)' : 'rgba(244,63,94,0.38)'}`,
                  }}>Net: {isP ? '+' : '−'}{fmt(Math.abs(day.net))}</span>
                </div>
              </div>

              <div className="metrics-grid" style={{ marginBottom:0 }}>
                <MetricCard label="Orders"             value={day.orders}      glow="white"   onClick={() => toggleFilter(day.date,'orders')}      active={filter==='orders'} />
                <MetricCard label="Items Shipped"      value={day.items}       glow="white" />
                <MetricCard label="Cost Per Purchase"  value={fmt(day.cpp)}    color={day.cpp < 400 ? C.profit : C.warn} glow={day.cpp < 400 ? 'green' : 'yellow'} />
                <MetricCard label="Fulfilled"          value={day.fulfilled}   color={C.profit}  glow="green"   onClick={() => toggleFilter(day.date,'fulfilled')} active={filter==='fulfilled'} />
                <MetricCard label="Delivered"          value={day.delivered}   color={C.profit}  glow="green"   onClick={() => toggleFilter(day.date,'delivered')} active={filter==='delivered'} />
                <MetricCard label="In Transit"         value={day.transit}     color="#60a5fa"   glow="blue"    onClick={() => toggleFilter(day.date,'transit')}   active={filter==='transit'} />
                <MetricCard label="Out for Delivery"   value={day.otd}         color="#c4b5fd"   glow="purple"  onClick={() => toggleFilter(day.date,'otd')}       active={filter==='otd'} />
                <MetricCard label="Failed Delivery"    value={day.failed}      color="#f97316"   glow="orange"  onClick={() => toggleFilter(day.date,'failed')}    active={filter==='failed'} />
                <MetricCard label="Canceled"           value={day.canceled}    color={C.loss}    glow="red"     onClick={() => toggleFilter(day.date,'canceled')}  active={filter==='canceled'} />
                <MetricCard label="RTO Risk"           value={day.rtoRisk}     color={C.warn}    glow="yellow"  onClick={() => toggleFilter(day.date,'rtoRisk')}   active={filter==='rtoRisk'} />
                <MetricCard label="RTO / Undelivered"  value={day.rto}         color={C.loss}    glow="red"     onClick={() => toggleFilter(day.date,'rto')}       active={filter==='rto'} />
                <MetricCard label="Unreachable"        value={day.unreachable} color="#facc15"   glow="yellow"  onClick={() => toggleFilter(day.date,'unreachable')} active={filter==='unreachable'} />
                <MetricCard label="Not Confirmed"      value={day.notConfirmed} color={C.loss}   glow="red" />
                <MetricCard label="Revenue"            value={fmt(day.revenue)} color="#60a5fa"  glow="blue" />
                <MetricCard label="Ad Spend"           value={fmt(day.adSpend)} glow="white" />
                <MetricCard label="Prepaid Orders"     value={day.prepaid}     color="#818cf8"   glow="indigo"  onClick={() => toggleFilter(day.date,'prepaid')}   active={filter==='prepaid'} />
                <MetricCard label="Cash on Delivery"   value={day.cash}        color="#fb923c"   glow="amber"   onClick={() => toggleFilter(day.date,'cash')}      active={filter==='cash'} />
                <MetricCard label="Net Profit"         value={(isP ? '+' : '−') + fmt(Math.abs(day.net))} color={isP ? C.profit : C.loss} glow={isP ? 'green' : 'red'} />
              </div>

              {filter && (
                <div style={{ marginTop:18, padding:'16px 18px', borderRadius:12, background:'rgba(0,0,0,0.25)', border:`1px solid ${C.border}` }}>
                  <div style={{ fontSize:12, color:C.textMuted, marginBottom:12 }}>
                    Showing <strong style={{color:C.primary}}>{filter}</strong> orders — {day.label.split(',')[0]}
                  </div>
                  <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                    <thead>
                      <tr>
                        {['Order #','Customer','Amount','Payment','Status'].map(h=>(
                          <th key={h} style={{ padding:'6px 10px', textAlign:'left', color:C.textMuted, fontWeight:700, fontSize:10, textTransform:'uppercase', letterSpacing:'0.8px', borderBottom:`1px solid ${C.border}` }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {SAMPLE_ORDERS.slice(0,5).map((o,i)=>(
                        <tr key={i} style={{ borderBottom:`1px solid rgba(255,255,255,0.04)` }}>
                          <td style={{ padding:'9px 10px', color:'#818cf8', fontWeight:700 }}>{o.id}</td>
                          <td style={{ padding:'9px 10px', color:'rgba(238,238,248,0.85)' }}>{o.name}</td>
                          <td style={{ padding:'9px 10px', color:C.textMain, fontWeight:700 }}>{fmt(o.amount)}</td>
                          <td style={{ padding:'9px 10px' }}>
                            <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:4,
                              background: o.prepaid ? 'rgba(129,140,248,0.12)' : 'rgba(251,146,60,0.12)',
                              color: o.prepaid ? '#818cf8' : '#fb923c',
                              border:`1px solid ${o.prepaid?'rgba(129,140,248,0.3)':'rgba(251,146,60,0.3)'}`}}>
                              {o.prepaid ? 'PREPAID' : 'COD'}
                            </span>
                          </td>
                          <td style={{ padding:'9px 10px' }}>
                            <span style={{ fontSize:10, fontWeight:600, padding:'2px 8px', borderRadius:4, background:'rgba(255,255,255,0.06)', color:C.textMuted }}>{o.tag}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div style={{ marginTop:8, fontSize:11, color:C.textDim, fontStyle:'italic' }}>
                    Demo — showing 5 of {day.orders} orders · Live dashboard shows all orders with full detail
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {feedDays.length === 0 && (
          <div style={{ padding:48, textAlign:'center', color:C.textDim }}>No data for selected range</div>
        )}
      </div>
    </div>
  );
}

// ─── DemoWeekly ───────────────────────────────────────────────────────────────
function DemoWeekly() {
  const maxRev = Math.max(...WEEKLY.map(w=>w.revenue));
  return (
    <div style={{ paddingBottom:80 }}>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(190px,1fr))', gap:12, marginBottom:26 }}>
        {[
          { label:'Orders (4 weeks)',   value:'705',      color:'#60a5fa' },
          { label:'Revenue (4 weeks)', value:'₹11.3L',   color:'#a78bfa' },
          { label:'Net Profit (4 wk)', value:'₹69,200',  color:C.profit  },
          { label:'Avg RTO Rate',       value:'4.8%',     color:C.warn    },
        ].map((s,i)=>(
          <div key={i} style={{ padding:'22px 20px', borderRadius:16, background:C.surface, border:`1px solid ${C.border}`, position:'relative', overflow:'hidden' }}>
            <div style={{ position:'absolute', top:0, left:0, right:0, height:2, background:`linear-gradient(90deg,${s.color},transparent)` }} />
            <div style={{ fontSize:10, color:C.textMuted, textTransform:'uppercase', fontWeight:700, letterSpacing:'1px', marginBottom:8 }}>{s.label}</div>
            <div style={{ fontSize:30, fontWeight:800, letterSpacing:'-1.5px', color:s.color, fontFamily:'Outfit,sans-serif' }}>{s.value}</div>
          </div>
        ))}
      </div>
      <div style={{ padding:24, borderRadius:18, background:'rgba(15,15,26,0.65)', border:`1px solid ${C.border}`, marginBottom:18 }}>
        <h3 style={{ margin:'0 0 20px', fontSize:12, fontWeight:700, color:C.textMuted, textTransform:'uppercase', letterSpacing:'1px' }}>Revenue by Week</h3>
        {WEEKLY.map((w,i)=>(
          <div key={i} style={{ display:'flex', alignItems:'center', gap:12, marginBottom:14 }}>
            <div style={{ width:120, fontSize:12, color:C.textMuted, flexShrink:0 }}>{w.week}</div>
            <div style={{ flex:1, height:38, borderRadius:8, background:'rgba(255,255,255,0.04)', overflow:'hidden' }}>
              <div style={{ height:'100%', width:`${(w.revenue/maxRev*100).toFixed(1)}%`, background:'linear-gradient(90deg,#22d3ee,#6366f1)', borderRadius:8, display:'flex', alignItems:'center', paddingLeft:12, transition:'width 0.8s' }}>
                <span style={{ fontSize:12, fontWeight:700, color:'rgba(255,255,255,0.9)', whiteSpace:'nowrap' }}>₹{(w.revenue/100000).toFixed(1)}L</span>
              </div>
            </div>
            <div style={{ width:100, textAlign:'right', fontSize:13, fontWeight:700, color: w.net>=0 ? C.profit : C.loss }}>
              {w.net>=0?'+':'−'}{fmt(w.net)}
            </div>
          </div>
        ))}
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))', gap:12 }}>
        {WEEKLY.map((w,i)=>(
          <div key={i} style={{ padding:'22px 20px', borderRadius:16, background:C.surface, border:`1px solid ${C.border}` }}>
            <div style={{ fontSize:13, fontWeight:700, color:C.textMain, marginBottom:14, fontFamily:'Outfit,sans-serif' }}>{w.week}</div>
            {[{l:'Orders',v:w.orders},{l:'Revenue',v:fmt(w.revenue)},{l:'Ad Spend',v:fmt(w.adSpend)},{l:'Net Profit',v:(w.net>=0?'+':'−')+fmt(w.net),c:w.net>=0?C.profit:C.loss},{l:'Delivered',v:w.delivered,c:C.profit},{l:'RTO',v:w.rto,c:C.loss}].map((r,j)=>(
              <div key={j} style={{ display:'flex', justifyContent:'space-between', padding:'6px 0', borderBottom:`1px solid rgba(255,255,255,0.05)` }}>
                <span style={{ fontSize:12, color:C.textMuted }}>{r.l}</span>
                <span style={{ fontSize:13, fontWeight:700, color:r.c||C.textMain }}>{r.v}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
      <ConversionNudge text="Weekly performance tracking helps you spot trends before they become problems. See your store's real weekly numbers." />
    </div>
  );
}

// ─── DemoMonthly ──────────────────────────────────────────────────────────────
function DemoMonthly() {
  const maxOrders = Math.max(...MONTHLY.map(m=>m.orders));
  return (
    <div style={{ paddingBottom:80 }}>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(190px,1fr))', gap:12, marginBottom:26 }}>
        {[
          {label:'Total Orders (6 mo)',  value:'5,036',  color:'#60a5fa'},
          {label:'Total Revenue (6 mo)', value:'₹80.8L', color:'#a78bfa'},
          {label:'Net Profit (6 mo)',    value:'₹6.73L', color:C.profit},
          {label:'Monthly Growth',       value:'+12.4%', color:'#c4b5fd'},
        ].map((s,i)=>(
          <div key={i} style={{ padding:'22px 20px', borderRadius:16, background:C.surface, border:`1px solid ${C.border}`, position:'relative', overflow:'hidden' }}>
            <div style={{ position:'absolute', top:0, left:0, right:0, height:2, background:`linear-gradient(90deg,${s.color},transparent)` }} />
            <div style={{ fontSize:10, color:C.textMuted, textTransform:'uppercase', fontWeight:700, letterSpacing:'1px', marginBottom:8 }}>{s.label}</div>
            <div style={{ fontSize:30, fontWeight:800, letterSpacing:'-1.5px', color:s.color, fontFamily:'Outfit,sans-serif' }}>{s.value}</div>
          </div>
        ))}
      </div>
      <div style={{ padding:24, borderRadius:18, background:'rgba(15,15,26,0.65)', border:`1px solid ${C.border}`, marginBottom:18 }}>
        <h3 style={{ margin:'0 0 20px', fontSize:12, fontWeight:700, color:C.textMuted, textTransform:'uppercase', letterSpacing:'1px' }}>Orders by Month</h3>
        <div style={{ display:'flex', alignItems:'flex-end', gap:10, height:200 }}>
          {MONTHLY.map((m,i)=>{
            const h = Math.round((m.orders/maxOrders)*160);
            return (
              <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:6 }}>
                <div style={{ fontSize:10, fontWeight:700, color:C.profit, textAlign:'center' }}>+₹{(m.net/1000).toFixed(0)}K</div>
                <div style={{ width:'100%', height:h, borderRadius:'8px 8px 0 0', background:'linear-gradient(180deg,#22d3ee,#6366f1)', display:'flex', alignItems:'flex-start', justifyContent:'center', paddingTop:6 }}>
                  <span style={{ fontSize:11, fontWeight:700, color:'rgba(255,255,255,0.9)' }}>{m.orders}</span>
                </div>
                <div style={{ fontSize:9, color:C.textMuted, textAlign:'center', lineHeight:1.4 }}>{m.month.split(' ')[0]}<br/>{m.month.split(' ')[1]}</div>
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
    <div style={{ paddingBottom:80 }}>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))', gap:12 }}>
        {[
          {label:'Total Orders',     value:'5,036',      sub:'Since Jan 2026',        icon:'📦', c:'#60a5fa'},
          {label:'Total Revenue',    value:'₹80.8L',     sub:'Gross sales',            icon:'💰', c:'#a78bfa'},
          {label:'Net Profit',       value:'₹6.73L',     sub:'After all costs',        icon:'📈', c:C.profit},
          {label:'Avg Order Value',  value:'₹1,604',     sub:'Per order',              icon:'🧾', c:'#c4b5fd'},
          {label:'Total Delivered',  value:'3,727',      sub:'74% delivery rate',      icon:'✅', c:C.profit},
          {label:'Total RTO',        value:'201',        sub:'4.0% RTO rate',          icon:'🔄', c:C.loss},
          {label:'Avg Daily Orders', value:'27.8',       sub:'Orders per day',         icon:'📅', c:'#60a5fa'},
          {label:'Best Day Revenue', value:'₹2,02,200',  sub:'Thu, Jun 11, 2026',     icon:'🏆', c:'#fbbf24'},
        ].map((s,i)=>(
          <div key={i} style={{ padding:'24px 20px', borderRadius:18, background:C.surface, border:`1px solid ${C.border}`, position:'relative', overflow:'hidden' }}>
            <div style={{ position:'absolute', top:0, left:0, right:0, height:2, background:`linear-gradient(90deg,${s.c},transparent)`, opacity:0.85 }} />
            <div style={{ fontSize:24, marginBottom:10 }}>{s.icon}</div>
            <div style={{ fontSize:30, fontWeight:800, letterSpacing:'-1.5px', color:s.c, fontFamily:'Outfit,sans-serif', lineHeight:1 }}>{s.value}</div>
            <div style={{ fontSize:12, color:'rgba(238,238,248,0.7)', fontWeight:600, marginTop:8 }}>{s.label}</div>
            <div style={{ fontSize:11, color:C.textDim, marginTop:3 }}>{s.sub}</div>
          </div>
        ))}
      </div>
      <ConversionNudge text="These are 6 months of growth for Kiddie Craft Co. What does your store's all-time data look like? Start tracking today." />
    </div>
  );
}

// ─── DemoBusinessAnalytics ────────────────────────────────────────────────────
function DemoBusinessAnalytics() {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16, paddingBottom:80 }}>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
        <div style={{ padding:24, borderRadius:18, background:C.surface, border:`1px solid ${C.border}` }}>
          <h3 style={{ margin:'0 0 18px', fontSize:12, fontWeight:700, color:C.textMuted, textTransform:'uppercase', letterSpacing:'1px' }}>Payment Split</h3>
          {[{label:'Prepaid',pct:39,count:1958,c:'#818cf8'},{label:'Cash on Delivery',pct:61,count:3078,c:'#fb923c'}].map((r,i)=>(
            <div key={i} style={{ marginBottom:16 }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:7 }}>
                <span style={{ fontSize:13, color:'rgba(238,238,248,0.75)' }}>{r.label}</span>
                <span style={{ fontSize:13, fontWeight:700, color:r.c }}>{r.pct}% · {r.count.toLocaleString()}</span>
              </div>
              <div style={{ height:9, borderRadius:5, background:'rgba(255,255,255,0.05)' }}>
                <div style={{ height:'100%', width:`${r.pct}%`, borderRadius:5, background:r.c }} />
              </div>
            </div>
          ))}
          <div style={{ marginTop:14, padding:'10px 14px', borderRadius:10, background:'rgba(245,158,11,0.06)', border:'1px solid rgba(245,158,11,0.18)', fontSize:12, color:'rgba(238,238,248,0.55)', lineHeight:1.65 }}>
            💡 Converting 20% of COD to prepaid could save roughly <strong style={{color:C.warn}}>₹32,000/month</strong> in RTO costs.
          </div>
        </div>
        <div style={{ padding:24, borderRadius:18, background:C.surface, border:`1px solid ${C.border}` }}>
          <h3 style={{ margin:'0 0 18px', fontSize:12, fontWeight:700, color:C.textMuted, textTransform:'uppercase', letterSpacing:'1px' }}>Delivery Performance</h3>
          {[{l:'Delivered',pct:74,c:C.profit},{l:'In Transit',pct:12,c:'#60a5fa'},{l:'Failed',pct:6,c:'#f97316'},{l:'RTO',pct:4,c:C.loss},{l:'Canceled',pct:4,c:'#475569'}].map((r,i)=>(
            <div key={i} style={{ marginBottom:12 }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
                <span style={{ fontSize:13, color:'rgba(238,238,248,0.75)' }}>{r.l}</span>
                <span style={{ fontSize:13, fontWeight:700, color:r.c }}>{r.pct}%</span>
              </div>
              <div style={{ height:7, borderRadius:4, background:'rgba(255,255,255,0.05)' }}>
                <div style={{ height:'100%', width:`${r.pct}%`, borderRadius:4, background:r.c }} />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ padding:24, borderRadius:18, background:C.surface, border:`1px solid ${C.border}` }}>
        <h3 style={{ margin:'0 0 18px', fontSize:12, fontWeight:700, color:C.textMuted, textTransform:'uppercase', letterSpacing:'1px' }}>Top Cities by Orders</h3>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(170px,1fr))', gap:10 }}>
          {[{c:'Mumbai',n:784},{c:'Delhi',n:621},{c:'Bengaluru',n:543},{c:'Hyderabad',n:412},{c:'Pune',n:387},{c:'Chennai',n:298},{c:'Kolkata',n:254},{c:'Ahmedabad',n:231}].map((x,i)=>(
            <div key={i} style={{ padding:'12px 14px', borderRadius:10, background:'rgba(255,255,255,0.03)', border:`1px solid ${C.border}`, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <span style={{ fontSize:13, color:'rgba(238,238,248,0.8)' }}>{x.c}</span>
              <span style={{ fontSize:14, fontWeight:800, color:'#60a5fa', fontFamily:'Outfit,sans-serif' }}>{x.n}</span>
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
    <div style={{ maxWidth:540, paddingBottom:80 }}>
      <div style={{ display:'flex', gap:8, marginBottom:22 }}>
        {['week','month'].map(p=>(
          <button key={p} onClick={()=>setPeriod(p)}
            style={{ padding:'9px 22px', borderRadius:10, fontWeight:700, fontSize:13, cursor:'pointer', fontFamily:'Outfit,sans-serif', transition:'all 0.2s',
              background: period===p ? 'rgba(34,211,238,0.10)' : 'rgba(255,255,255,0.05)',
              border: period===p ? '1px solid rgba(34,211,238,0.38)' : `1px solid ${C.border}`,
              color: period===p ? C.primary : C.textMuted,
            }}>
            {p === 'week' ? 'This Week' : 'This Month'}
          </button>
        ))}
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
        {[
          {label:'Gross Revenue',   val:d.rev,  c:C.profit, sym:'+'},
          {label:'↳ COD Revenue',   val:d.cod,  c:C.profit, sym:'+', sub:true},
          {label:'↳ Prepaid Rev.',  val:d.pre,  c:C.profit, sym:'+', sub:true},
          {label:'Cost of Goods',   val:d.cogs, c:C.loss,   sym:'−'},
          {label:'Shipping Costs',  val:d.ship, c:C.loss,   sym:'−'},
          {label:'Ad Spend',        val:d.ad,   c:C.loss,   sym:'−'},
          {label:'RTO Losses',      val:d.rto,  c:C.loss,   sym:'−'},
        ].map((r,i)=>(
          <div key={i} style={{ padding:'14px 18px', borderRadius:12, background:C.surface, border:`1px solid ${C.border}`, display:'flex', justifyContent:'space-between', alignItems:'center', marginLeft: r.sub ? 20 : 0 }}>
            <span style={{ fontSize:13.5, color: r.sub ? C.textMuted : 'rgba(238,238,248,0.85)', fontWeight: r.sub ? 400 : 500 }}>{r.label}</span>
            <span style={{ fontSize:16, fontWeight:800, color:r.c, fontFamily:'Outfit,sans-serif' }}>{r.sym}{fmt(r.val)}</span>
          </div>
        ))}
        <div style={{ padding:'20px 22px', borderRadius:16, background:'rgba(16,185,129,0.07)', border:'2px solid rgba(16,185,129,0.28)', display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:6 }}>
          <span style={{ fontSize:15, fontWeight:700, color:C.textMain, fontFamily:'Outfit,sans-serif' }}>💰 Money in My Pocket</span>
          <span style={{ fontSize:32, fontWeight:800, color:C.profit, letterSpacing:'-1.5px', fontFamily:'Outfit,sans-serif' }}>+{fmt(d.net)}</span>
        </div>
      </div>
      <ConversionNudge text={`See exactly what you're taking home — every rupee accounted for. Connect your Shopify store and see your real ${period === 'week' ? 'weekly' : 'monthly'} take-home.`} />
    </div>
  );
}

// ─── DemoProducts ─────────────────────────────────────────────────────────────
function DemoProducts() {
  const [q, setQ] = useState('');
  const rows = PRODUCTS.filter(p=>p.name.toLowerCase().includes(q.toLowerCase())||p.sku.toLowerCase().includes(q.toLowerCase()));
  return (
    <div style={{ paddingBottom:80 }}>
      <div style={{ display:'flex', gap:12, marginBottom:16, alignItems:'center' }}>
        <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search products or SKU..."
          style={{ flex:1, padding:'10px 14px', borderRadius:10, border:`1px solid ${C.border}`, background:C.surface, color:C.textMain, fontSize:13, outline:'none', fontFamily:'Outfit,sans-serif' }} />
        <span style={{ fontSize:12, color:C.textMuted, whiteSpace:'nowrap' }}>{rows.length} products</span>
      </div>
      <div style={{ borderRadius:18, overflow:'hidden', border:`1px solid ${C.border}` }}>
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead>
            <tr style={{ background:C.surface2 }}>
              {['Product','SKU','Cost Price','Selling Price','Units Sold','Revenue','Margin'].map(h=>(
                <th key={h} style={{ padding:'12px 14px', textAlign:'left', fontSize:10, color:C.textMuted, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.9px', borderBottom:`1px solid ${C.border}` }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((p,i)=>{
              const margin = (((p.price-p.cost)/p.price)*100).toFixed(0);
              return (
                <tr key={i} style={{ borderBottom:`1px solid rgba(255,255,255,0.04)`, transition:'background 0.15s' }}
                  onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.03)'}
                  onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                  <td style={{ padding:'13px 14px', fontSize:13.5, color:C.textMain, fontWeight:600 }}>{p.name}</td>
                  <td style={{ padding:'13px 14px', fontSize:12, color:'#818cf8', fontFamily:'monospace', fontWeight:700 }}>{p.sku}</td>
                  <td style={{ padding:'13px 14px', fontSize:13, color:C.textMuted }}>₹{p.cost}</td>
                  <td style={{ padding:'13px 14px', fontSize:13, color:'rgba(238,238,248,0.9)', fontWeight:700 }}>₹{p.price}</td>
                  <td style={{ padding:'13px 14px', fontSize:13, color:'rgba(238,238,248,0.8)' }}>{p.sold}</td>
                  <td style={{ padding:'13px 14px', fontSize:14, color:C.profit, fontWeight:800, fontFamily:'Outfit,sans-serif' }}>₹{(p.revenue/1000).toFixed(0)}K</td>
                  <td style={{ padding:'13px 14px' }}>
                    <span style={{ fontSize:12, fontWeight:700, padding:'4px 10px', borderRadius:999,
                      background: parseInt(margin)>40 ? 'rgba(16,185,129,0.12)' : 'rgba(251,191,36,0.12)',
                      color: parseInt(margin)>40 ? C.profit : '#fbbf24',
                      border:`1px solid ${parseInt(margin)>40 ? 'rgba(16,185,129,0.28)' : 'rgba(251,191,36,0.28)'}`,
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

// ─── AI Copilot ───────────────────────────────────────────────────────────────
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
    }, 900 + Math.random()*400);
  };

  const SUGGESTIONS = ['Show my top products','What are my RTO risks?','How can I increase profit?','How is today performing?'];

  return (
    <div style={{ position:'fixed', top:0, right:0, bottom:0, width:420, zIndex:300, background:'rgba(4,4,15,0.97)', backdropFilter:'blur(24px)', borderLeft:'1px solid rgba(255,255,255,0.08)', display:'flex', flexDirection:'column', fontFamily:'Outfit,sans-serif' }}>
      <div style={{ padding:'16px 20px', borderBottom:`1px solid ${C.border}`, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:36, height:36, borderRadius:11, background:'linear-gradient(135deg,#22d3ee,#6366f1)', display:'flex', alignItems:'center', justifyContent:'center' }}><Sparkles size={17} color="#fff" /></div>
          <div>
            <div style={{ fontSize:14, fontWeight:700, color:C.textMain }}>AI Co-Pilot</div>
            <div style={{ fontSize:11, color:C.textMuted }}>Powered by GPT-4o · Demo mode</div>
          </div>
        </div>
        <button onClick={onClose} style={{ width:30, height:30, borderRadius:8, background:'rgba(255,255,255,0.06)', border:`1px solid ${C.border}`, color:C.textMuted, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}><X size={15}/></button>
      </div>

      <div style={{ flex:1, overflowY:'auto', padding:'16px 20px', display:'flex', flexDirection:'column', gap:12 }}>
        {msgs.map((m,i)=>(
          <div key={i} style={{ display:'flex', justifyContent: m.role==='user'?'flex-end':'flex-start' }}>
            <div style={{ maxWidth:'88%', padding:'12px 15px',
              borderRadius: m.role==='user' ? '14px 14px 4px 14px' : '4px 14px 14px 14px',
              background: m.role==='user' ? 'linear-gradient(135deg,rgba(34,211,238,0.20),rgba(99,102,241,0.20))' : 'rgba(255,255,255,0.05)',
              border:`1px solid ${m.role==='user'?'rgba(34,211,238,0.26)':'rgba(255,255,255,0.08)'}`,
              fontSize:13.5, color:'rgba(238,238,248,0.9)', lineHeight:1.65, whiteSpace:'pre-wrap',
            }}>{m.text}</div>
          </div>
        ))}
        {thinking && (
          <div style={{ display:'flex', gap:5, padding:'12px 15px', borderRadius:'4px 14px 14px 14px', background:'rgba(255,255,255,0.05)', width:'fit-content', border:'1px solid rgba(255,255,255,0.07)' }}>
            {[0,1,2].map(i=><div key={i} style={{ width:7,height:7,borderRadius:'50%',background:'rgba(34,211,238,0.7)',animation:`dot 1.2s ease-in-out ${i*0.2}s infinite` }}/>)}
          </div>
        )}
        <div ref={bottomRef}/>
      </div>

      {msgs.length <= 1 && (
        <div style={{ padding:'0 20px 12px' }}>
          <div style={{ fontSize:10, color:C.textDim, marginBottom:8, textTransform:'uppercase', letterSpacing:'1px', fontWeight:700 }}>Try asking:</div>
          {SUGGESTIONS.map((s,i)=>(
            <button key={i} onClick={()=>fire(s)}
              style={{ display:'block', width:'100%', padding:'9px 13px', borderRadius:9, background:'rgba(34,211,238,0.05)', border:'1px solid rgba(34,211,238,0.14)', color:C.primary, fontSize:12.5, cursor:'pointer', textAlign:'left', marginBottom:6, fontFamily:'Outfit,sans-serif', transition:'background 0.2s' }}
              onMouseEnter={e=>e.currentTarget.style.background='rgba(34,211,238,0.10)'}
              onMouseLeave={e=>e.currentTarget.style.background='rgba(34,211,238,0.05)'}>
              → {s}
            </button>
          ))}
        </div>
      )}

      <div style={{ padding:'12px 16px', borderTop:`1px solid ${C.border}`, display:'flex', gap:10 }}>
        <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&fire(input)} placeholder="Ask about your store data..."
          style={{ flex:1, padding:'10px 14px', borderRadius:10, border:`1px solid ${C.border}`, background:C.surface, color:C.textMain, fontSize:13, outline:'none', fontFamily:'Outfit,sans-serif' }}/>
        <button onClick={()=>fire(input)} disabled={!input.trim()||thinking}
          style={{ width:40,height:40,borderRadius:10,background:'linear-gradient(135deg,#22d3ee,#6366f1)',border:'none',cursor:input.trim()&&!thinking?'pointer':'not-allowed',display:'flex',alignItems:'center',justifyContent:'center',opacity:input.trim()&&!thinking?1:0.4,flexShrink:0 }}>
          <Send size={16} color="#000"/>
        </button>
      </div>
      <style>{`@keyframes dot{0%,80%,100%{transform:scale(0.6);opacity:0.3}40%{transform:scale(1);opacity:1}}`}</style>
    </div>
  );
}

// ─── NAV ─────────────────────────────────────────────────────────────────────
const NAV = {
  analytics: [
    {key:'dashboard', icon:LayoutDashboard, label:'Daily Dashboard'},
    {key:'weekly',    icon:BarChart,         label:'Weekly Performance'},
    {key:'monthly',   icon:Calendar,         label:'Monthly Overview'},
    {key:'alltime',   icon:TrendingUp,        label:'All-Time Analytics'},
    {key:'analytics', icon:PieChart,         label:'Business Analytics'},
    {key:'money',     icon:Wallet,           label:'Money In My Pocket'},
    {key:'sheet',     icon:List,             label:'Sheet View'},
  ],
  mgmt: [
    {key:'products',  icon:Package,          label:'Products'},
    {key:'pricing',   icon:DollarSign,       label:'Pricing'},
    {key:'connect',   icon:Link2,            label:'Connect Store'},
  ],
  account: [
    {key:'advanced',  icon:SlidersHorizontal, label:'Advanced Settings'},
    {key:'settings',  icon:Settings,          label:'Settings'},
    {key:'support',   icon:Headphones,        label:'Talk to Support'},
  ],
};

const TITLES = {
  dashboard:'Business Dashboard', weekly:'Weekly Performance', monthly:'Monthly Overview',
  alltime:'All-Time Analytics', analytics:'Business Analytics', money:'Money In My Pocket',
  sheet:'Sheet View', products:'Products & Margins', pricing:'Cost & Pricing',
  connect:'Connect your Store', advanced:'Advanced Settings', settings:'Settings', support:'Talk to Support',
};

function LockedTab({ title }) {
  return (
    <div style={{ padding:'60px 24px', textAlign:'center', maxWidth:460, margin:'0 auto', paddingBottom:80 }}>
      <div style={{ width:60, height:60, borderRadius:18, background:'rgba(34,211,238,0.07)', border:'1px solid rgba(34,211,238,0.18)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 20px', fontSize:26 }}>🔒</div>
      <div style={{ fontSize:18, fontWeight:700, color:C.textMain, marginBottom:10, fontFamily:'Outfit,sans-serif' }}>{title}</div>
      <div style={{ fontSize:13.5, color:C.textMuted, marginBottom:28, lineHeight:1.8 }}>
        Fully functional in your live account — connected to your real Shopify store data. Sign up free to unlock everything.
      </div>
      <a href="/signup" style={{ display:'inline-block', padding:'13px 28px', borderRadius:12, background:'linear-gradient(135deg,#22d3ee,#6366f1)', color:'#000', fontWeight:800, textDecoration:'none', fontSize:14, fontFamily:'Outfit,sans-serif' }}>
        Connect My Store Free →
      </a>
      <div style={{ marginTop:12, fontSize:12, color:C.textDim }}>No credit card · 2-minute setup</div>
    </div>
  );
}

// ─── Email gate ───────────────────────────────────────────────────────────────
const EMAIL_RE = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
const LS_KEY   = 'pocket_demo_email';

function DemoGate({ onUnlock }) {
  const [email,     setEmail]     = useState('');
  const [error,     setError]     = useState('');
  const [loading,   setLoading]   = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const validate = (v) => {
    if (!v.trim())          return 'Please enter your email address.';
    if (!EMAIL_RE.test(v))  return 'That doesn\'t look like a valid email. Please check and try again.';
    return '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const err = validate(email);
    if (err) { setError(err); return; }

    setLoading(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || '';
      await fetch(`${apiUrl}/api/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ owner_email: email.trim().toLowerCase(), comment: 'Demo page lead', type: 'demo_lead' }),
      });
    } catch { /* non-critical — still unlock */ }

    localStorage.setItem(LS_KEY, email.trim().toLowerCase());
    setSubmitted(true);
    setTimeout(() => onUnlock(email.trim().toLowerCase()), 600);
  };

  return (
    <div style={{ position:'fixed', inset:0, zIndex:500, display:'flex', alignItems:'center', justifyContent:'center',
      background:'rgba(3,3,7,0.92)', backdropFilter:'blur(18px) saturate(140%)',
      backgroundImage:'radial-gradient(ellipse 70% 55% at 15% 10%,rgba(167,139,250,0.12) 0%,transparent 60%),radial-gradient(ellipse 60% 50% at 85% 20%,rgba(34,211,238,0.08) 0%,transparent 60%)',
      fontFamily:'Outfit,sans-serif',
    }}>

      {/* Preview glimpse behind — metric snippet */}
      <div style={{ position:'absolute', inset:0, overflow:'hidden', pointerEvents:'none' }}>
        <div style={{ position:'absolute', top:'15%', right:'5%', display:'flex', gap:12, opacity:0.12, filter:'blur(2px)', transform:'scale(0.9)' }}>
          {[{l:'Orders',v:'47'},{l:'Revenue',v:'₹1,48,300'},{l:'Net Profit',v:'+₹47,200'},{l:'CPP',v:'₹381'}].map((m,i)=>(
            <div key={i} style={{ padding:'18px 20px', borderRadius:14, background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', minWidth:130, textAlign:'center' }}>
              <div style={{ fontSize:10, color:'#7878a3', textTransform:'uppercase', letterSpacing:'0.8px', marginBottom:8 }}>{m.l}</div>
              <div style={{ fontSize:24, fontWeight:800, color:i===2?'#10b981':'#eeeef8', fontFamily:'Outfit,sans-serif' }}>{m.v}</div>
            </div>
          ))}
        </div>
        <div style={{ position:'absolute', bottom:'20%', left:'4%', opacity:0.08, filter:'blur(3px)', display:'flex', flexDirection:'column', gap:8 }}>
          {['Daily Dashboard','Weekly Performance','Monthly Overview','All-Time Analytics','Money In My Pocket'].map((l,i)=>(
            <div key={i} style={{ padding:'9px 14px', borderRadius:10, background:'rgba(255,255,255,0.05)', color:'rgba(255,255,255,0.5)', fontSize:13, width:200 }}>{l}</div>
          ))}
        </div>
      </div>

      {/* Gate card */}
      <div style={{ position:'relative', width:'100%', maxWidth:440, margin:'0 20px', padding:'40px 40px 36px',
        background:'rgba(13,13,26,0.95)', borderRadius:24, border:'1px solid rgba(34,211,238,0.18)',
        boxShadow:'0 0 60px rgba(34,211,238,0.08), 0 32px 80px rgba(0,0,0,0.6)',
      }}>

        {/* Brand */}
        <div style={{ display:'flex', justifyContent:'center', marginBottom:28 }}>
          <BrandLogo variant="full" iconSize={36} />
        </div>

        {/* Headline */}
        <div style={{ textAlign:'center', marginBottom:28 }}>
          <div style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'5px 14px', borderRadius:999, background:'rgba(16,185,129,0.10)', border:'1px solid rgba(16,185,129,0.25)', marginBottom:16 }}>
            <span style={{ width:6, height:6, borderRadius:'50%', background:'#10b981', boxShadow:'0 0 6px rgba(16,185,129,0.8)', animation:'livePulse 2s infinite', display:'inline-block' }} />
            <span style={{ fontSize:12, fontWeight:700, color:'#10b981', letterSpacing:'0.4px' }}>LIVE DEMO DASHBOARD</span>
          </div>
          <h2 style={{ margin:'0 0 10px', fontSize:22, fontWeight:800, color:'#eeeef8', letterSpacing:'-0.5px', lineHeight:1.3 }}>
            A D2C store made <span style={{ color:'#10b981' }}>+₹47,200</span> in profit today.
          </h2>
          <p style={{ margin:0, fontSize:14, color:'#7878a3', lineHeight:1.7 }}>
            Enter your email to explore the full dashboard — orders, profit, RTO, AI co-pilot and more.
          </p>
        </div>

        {/* Form */}
        {submitted ? (
          <div style={{ textAlign:'center', padding:'20px 0' }}>
            <div style={{ fontSize:32, marginBottom:10 }}>✅</div>
            <div style={{ fontSize:15, fontWeight:700, color:'#10b981' }}>Unlocking dashboard…</div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate>
            <div style={{ marginBottom: error ? 8 : 14 }}>
              <input
                ref={inputRef}
                type="email"
                value={email}
                onChange={e => { setEmail(e.target.value); if (error) setError(''); }}
                placeholder="you@example.com"
                autoComplete="email"
                style={{
                  width:'100%', boxSizing:'border-box', padding:'13px 16px',
                  borderRadius:12, fontSize:15, fontFamily:'Outfit,sans-serif',
                  background:'rgba(255,255,255,0.04)', color:'#eeeef8',
                  border: error ? '1.5px solid rgba(244,63,94,0.6)' : '1.5px solid rgba(255,255,255,0.12)',
                  outline:'none', transition:'border-color 0.2s',
                }}
                onFocus={e  => { if (!error) e.target.style.borderColor = 'rgba(34,211,238,0.5)'; }}
                onBlur={e   => { if (!error) e.target.style.borderColor = 'rgba(255,255,255,0.12)'; }}
              />
            </div>
            {error && (
              <div style={{ fontSize:12, color:'#f43f5e', marginBottom:12, paddingLeft:4 }}>{error}</div>
            )}
            <button type="submit" disabled={loading}
              style={{ width:'100%', padding:'13px 20px', borderRadius:12, border:'none',
                background: loading ? 'rgba(34,211,238,0.3)' : 'linear-gradient(135deg,#22d3ee,#6366f1)',
                color:'#000', fontSize:15, fontWeight:800, cursor: loading ? 'not-allowed' : 'pointer',
                fontFamily:'Outfit,sans-serif', transition:'opacity 0.2s', letterSpacing:'-0.2px',
              }}>
              {loading ? 'One moment…' : 'Explore the Dashboard →'}
            </button>
          </form>
        )}

        {/* Trust */}
        <div style={{ textAlign:'center', marginTop:18, fontSize:12, color:'#4a4a6e' }}>
          No spam · No credit card · Unsubscribe anytime
        </div>
      </div>

      <style>{`@keyframes livePulse{0%,100%{opacity:1;box-shadow:0 0 6px rgba(16,185,129,0.8)}50%{opacity:0.5;box-shadow:0 0 2px rgba(16,185,129,0.3)}}`}</style>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function DemoPage() {
  const [tab, setTab] = useState('dashboard');
  const [copilot, setCopilot] = useState(false);
  const [noticeDismissed, setNoticeDismissed] = useState(false);
  const [gateEmail, setGateEmail] = useState(() => localStorage.getItem(LS_KEY) || '');

  const renderContent = () => {
    switch(tab) {
      case 'dashboard': return <DemoDaily />;
      case 'weekly':    return <DemoWeekly />;
      case 'monthly':   return <DemoMonthly />;
      case 'alltime':   return <DemoAllTime />;
      case 'analytics': return <DemoBusinessAnalytics />;
      case 'money':     return <DemoMoney />;
      case 'products':  return <DemoProducts />;
      case 'pricing': return (
        <div style={{ paddingBottom:80 }}>
          <div style={{ marginBottom:16, padding:'13px 16px', borderRadius:11, background:'rgba(34,211,238,0.05)', border:'1px solid rgba(34,211,238,0.16)', fontSize:13, color:'rgba(238,238,248,0.6)', lineHeight:1.7 }}>
            💡 Set cost prices and shipping for each product. This powers your P&L, CPP, and net profit per order.
          </div>
          <div style={{ borderRadius:18, overflow:'hidden', border:`1px solid ${C.border}` }}>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr style={{ background:C.surface2 }}>
                  {['Product','SKU','Cost (₹)','Shipping (₹)','Price (₹)','Action'].map(h=>(
                    <th key={h} style={{ padding:'12px 14px', textAlign:'left', fontSize:10, color:C.textMuted, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.9px', borderBottom:`1px solid ${C.border}` }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {PRODUCTS.map((p,i)=>(
                  <tr key={i} style={{ borderBottom:`1px solid rgba(255,255,255,0.04)`, transition:'background 0.15s' }}
                    onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.03)'}
                    onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                    <td style={{ padding:'13px 14px', fontSize:13, color:C.textMain, fontWeight:500 }}>{p.name}</td>
                    <td style={{ padding:'13px 14px', fontSize:12, color:'#818cf8', fontFamily:'monospace', fontWeight:700 }}>{p.sku}</td>
                    <td style={{ padding:'13px 14px', fontSize:13, color:'rgba(238,238,248,0.8)', fontWeight:600 }}>₹{p.cost}</td>
                    <td style={{ padding:'13px 14px', fontSize:13, color:C.textMuted }}>₹{Math.round(p.cost*0.35)}</td>
                    <td style={{ padding:'13px 14px', fontSize:13, color:C.profit, fontWeight:700 }}>₹{p.price}</td>
                    <td style={{ padding:'13px 14px' }}>
                      <button onClick={()=>alert('Demo: In your live dashboard, this opens an inline editor.')}
                        style={{ padding:'5px 12px', borderRadius:6, background:'rgba(34,211,238,0.07)', border:'1px solid rgba(34,211,238,0.2)', color:C.primary, fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'Outfit,sans-serif' }}>Edit</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
      case 'connect': return (
        <div style={{ display:'flex', flexDirection:'column', gap:14, paddingBottom:80 }}>
          <div style={{ padding:'20px 22px', borderRadius:16, background:'rgba(16,185,129,0.06)', border:'1px solid rgba(16,185,129,0.2)', display:'flex', alignItems:'center', gap:16 }}>
            <ShieldCheck size={28} color={C.profit}/>
            <div>
              <div style={{ fontSize:15, fontWeight:700, color:C.profit, marginBottom:3 }}>Shopify Connected</div>
              <div style={{ fontSize:13, color:C.textMuted }}>demo-store.myshopify.com — Pro Plan · Last synced 2 min ago</div>
            </div>
          </div>
          {[
            {l:'Incremental Sync',d:'Sync orders from last sync date to now',icon:'🔄',a:'Sync Now'},
            {l:'Full Re-Sync',    d:'Re-download all historical orders from Shopify',icon:'📥',a:'Start Full Sync'},
            {l:'Custom Range',   d:'Choose a specific date range to sync',icon:'📅',a:'Configure'},
          ].map((opt,i)=>(
            <div key={i} style={{ padding:'18px 20px', borderRadius:14, background:C.surface, border:`1px solid ${C.border}`, display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
              <div style={{ display:'flex', alignItems:'center', gap:14 }}>
                <span style={{ fontSize:22 }}>{opt.icon}</span>
                <div>
                  <div style={{ fontSize:13.5, fontWeight:700, color:C.textMain }}>{opt.l}</div>
                  <div style={{ fontSize:12, color:C.textMuted, marginTop:2 }}>{opt.d}</div>
                </div>
              </div>
              <button onClick={()=>alert(`Demo: "${opt.l}" triggers a real Shopify sync in your live account.`)}
                style={{ padding:'8px 18px', borderRadius:8, background:'rgba(34,211,238,0.08)', border:'1px solid rgba(34,211,238,0.2)', color:C.primary, fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'Outfit,sans-serif', flexShrink:0 }}>{opt.a}</button>
            </div>
          ))}
        </div>
      );
      default: return <LockedTab title={TITLES[tab]} />;
    }
  };

  return (
    <div style={{ height:'100vh', background:C.bg, fontFamily:'Outfit,sans-serif', overflow:'hidden', position:'relative',
      backgroundImage:'radial-gradient(ellipse 65% 45% at 8% 8%,rgba(167,139,250,0.09) 0%,transparent 60%),radial-gradient(ellipse 55% 40% at 92% 15%,rgba(34,211,238,0.06) 0%,transparent 60%)',
    }}>
      {!gateEmail && <DemoGate onUnlock={setGateEmail} />}

      {/* ── Demo notice ── */}
      {!noticeDismissed && (
        <div style={{ position:'fixed', top:0, left:0, right:0, zIndex:400, background:'rgba(34,211,238,0.08)', backdropFilter:'blur(12px)', borderBottom:'1px solid rgba(34,211,238,0.16)', padding:'9px 24px', display:'flex', justifyContent:'center', alignItems:'center' }}>
          <div style={{ textAlign:'center', fontSize:13, color:'rgba(238,238,248,0.82)', lineHeight:1.5 }}>
            <strong style={{ color:C.primary }}>DEMO</strong> — You're exploring Kiddie Craft Co.'s dashboard: 47 orders · ₹1,48,300 revenue · <strong style={{color:C.profit}}>+₹47,200 profit</strong> today.
            &nbsp;<a href="/signup" style={{ color:C.primary, fontWeight:700, textDecoration:'underline' }}>See your store's numbers →</a>
          </div>
          <button onClick={()=>setNoticeDismissed(true)} style={{ position:'absolute', right:16, background:'none', border:'none', color:'rgba(238,238,248,0.3)', cursor:'pointer', fontSize:20, lineHeight:1, padding:4 }}>×</button>
        </div>
      )}

      <div style={{ display:'flex', height:'100%', paddingTop: noticeDismissed ? 0 : 40 }}>

        {/* ── Sidebar ── */}
        <aside style={{ width:248, flexShrink:0, background:'rgba(3,3,7,0.88)', backdropFilter:'blur(32px) saturate(160%)', borderRight:'1px solid rgba(255,255,255,0.06)', display:'flex', flexDirection:'column', zIndex:10 }}>
          <div style={{ padding:'18px 14px 16px', borderBottom:'1px solid rgba(255,255,255,0.06)', position:'relative' }}>
            <div style={{ position:'absolute', inset:0, background:'radial-gradient(ellipse at 50% 0%,rgba(34,211,238,0.10) 0%,transparent 70%)', pointerEvents:'none' }} />
            <div style={{ position:'relative', padding:'10px 14px 8px', borderRadius:13, background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)', display:'inline-block' }}>
              <BrandLogo variant="full" iconSize={40} />
            </div>
          </div>
          <nav style={{ flex:1, padding:'12px 8px', display:'flex', flexDirection:'column', gap:2, overflowY:'auto' }}>
            <div style={{ fontSize:'9px', fontWeight:800, color:'rgba(255,255,255,0.18)', letterSpacing:'1.4px', textTransform:'uppercase', padding:'8px 10px 5px' }}>Analytics</div>
            {NAV.analytics.map(n => <NavItem key={n.key} {...n} active={tab===n.key} onClick={()=>setTab(n.key)} />)}
            <div style={{ height:1, background:'rgba(255,255,255,0.05)', margin:'8px 4px' }} />
            <div style={{ fontSize:'9px', fontWeight:800, color:'rgba(255,255,255,0.18)', letterSpacing:'1.4px', textTransform:'uppercase', padding:'6px 10px 5px' }}>Management</div>
            {NAV.mgmt.map(n => <NavItem key={n.key} {...n} active={tab===n.key} onClick={()=>setTab(n.key)} />)}
            <div style={{ height:1, background:'rgba(255,255,255,0.05)', margin:'8px 4px' }} />
            <div style={{ fontSize:'9px', fontWeight:800, color:'rgba(255,255,255,0.18)', letterSpacing:'1.4px', textTransform:'uppercase', padding:'6px 10px 5px' }}>Account</div>
            {NAV.account.map(n => <NavItem key={n.key} {...n} active={tab===n.key} onClick={()=>setTab(n.key)} />)}
          </nav>
          <div style={{ padding:'12px 10px', borderTop:'1px solid rgba(255,255,255,0.06)' }}>
            <a href="/signup" style={{ display:'flex', alignItems:'center', gap:10, padding:'11px 12px', borderRadius:12, background:'rgba(34,211,238,0.07)', border:'1px solid rgba(34,211,238,0.18)', textDecoration:'none', transition:'all 0.2s' }}
              onMouseEnter={e=>{ e.currentTarget.style.background='rgba(34,211,238,0.13)'; e.currentTarget.style.borderColor='rgba(34,211,238,0.38)'; }}
              onMouseLeave={e=>{ e.currentTarget.style.background='rgba(34,211,238,0.07)'; e.currentTarget.style.borderColor='rgba(34,211,238,0.18)'; }}>
              <div style={{ width:32, height:32, borderRadius:9, flexShrink:0, background:'linear-gradient(135deg,#22d3ee,#6366f1)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:800, color:'#000' }}>{gateEmail ? gateEmail[0].toUpperCase() : 'D'}</div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:12, fontWeight:600, color:C.textMain, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{gateEmail || 'demo@yourstore.com'}</div>
                <div style={{ fontSize:10.5, color:C.primary, marginTop:1, fontWeight:700 }}>Start free — 3 months →</div>
              </div>
            </a>
          </div>
        </aside>

        {/* ── Main ── */}
        <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
          <header style={{ height:62, flexShrink:0, background:'rgba(3,3,7,0.82)', backdropFilter:'blur(24px)', borderBottom:'1px solid rgba(255,255,255,0.06)', display:'flex', alignItems:'center', padding:'0 28px', gap:14, position:'relative' }}>
            <div style={{ position:'absolute', bottom:-1, left:0, right:0, height:1, background:'linear-gradient(90deg,transparent,rgba(34,211,238,0.12) 30%,rgba(99,102,241,0.12) 70%,transparent)', pointerEvents:'none' }} />
            <div style={{ flex:1, display:'flex', flexDirection:'column', gap:1 }}>
              <h1 style={{ margin:0, fontSize:16, fontWeight:700, color:C.textMain, letterSpacing:'-0.02em', fontFamily:'Outfit,sans-serif' }}>{TITLES[tab]}</h1>
              <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:11, color:C.textMuted }}>
                <span style={{ width:6, height:6, borderRadius:'50%', background:'#10b981', boxShadow:'0 0 8px rgba(16,185,129,0.8)', display:'inline-block', animation:'livePulse 2s ease-in-out infinite' }} />
                Kiddie Craft Co. · Pro Plan · Synced just now
              </div>
            </div>
            <a href="/" style={{ fontSize:12, color:C.textMuted, textDecoration:'none', padding:'6px 12px', borderRadius:8, border:`1px solid ${C.border}`, background:'rgba(255,255,255,0.03)', transition:'all 0.2s', flexShrink:0 }}
              onMouseEnter={e=>{ e.currentTarget.style.color=C.textMain; e.currentTarget.style.background='rgba(255,255,255,0.06)'; }}
              onMouseLeave={e=>{ e.currentTarget.style.color=C.textMuted; e.currentTarget.style.background='rgba(255,255,255,0.03)'; }}>
              ← Back
            </a>
            <button onClick={()=>setCopilot(o=>!o)}
              style={{ display:'flex', alignItems:'center', gap:7, padding:'8px 14px', borderRadius:10,
                background: copilot ? 'rgba(34,211,238,0.14)' : 'rgba(99,102,241,0.10)',
                border:`1px solid ${copilot ? 'rgba(34,211,238,0.38)' : 'rgba(99,102,241,0.28)'}`,
                color: copilot ? C.primary : '#c4b5fd',
                fontWeight:700, fontSize:13, cursor:'pointer', fontFamily:'Outfit,sans-serif', transition:'all 0.2s', flexShrink:0,
                animation: !copilot ? 'glowPulse 3s ease-in-out infinite' : 'none',
              }}>
              <Sparkles size={14} /> AI Co-Pilot
            </button>
            <a href="/signup" style={{ padding:'9px 18px', borderRadius:10, background:'linear-gradient(135deg,#22d3ee,#6366f1)', color:'#000', fontWeight:800, fontSize:13, textDecoration:'none', flexShrink:0, whiteSpace:'nowrap' }}>
              Start Free →
            </a>
          </header>

          <main style={{ flex:1, overflowY:'auto', padding:'24px 30px' }}>
            {renderContent()}
          </main>

          {/* ── Sticky bottom CTA ── */}
          <div style={{ flexShrink:0, background:'rgba(3,3,7,0.96)', backdropFilter:'blur(20px)', borderTop:'1px solid rgba(34,211,238,0.10)', padding:'11px 30px', display:'flex', alignItems:'center', gap:16, justifyContent:'space-between', flexWrap:'wrap' }}>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <div style={{ width:7, height:7, borderRadius:'50%', background:C.profit, boxShadow:'0 0 8px rgba(16,185,129,0.7)', animation:'livePulse 2s infinite', flexShrink:0 }} />
              <span style={{ fontSize:13, color:'rgba(238,238,248,0.65)' }}>
                <strong style={{color:C.textMain}}>Kiddie Craft Co.</strong> made <strong style={{color:C.profit}}>+₹47,200</strong> today. <span style={{color:C.textMuted}}>What's your number?</span>
              </span>
            </div>
            <a href="/signup" style={{ padding:'10px 22px', borderRadius:10, background:'linear-gradient(135deg,#22d3ee,#6366f1)', color:'#000', fontWeight:800, fontSize:13.5, textDecoration:'none', whiteSpace:'nowrap', flexShrink:0, boxShadow:'0 0 20px rgba(34,211,238,0.22)' }}>
              Connect My Store — It's Free →
            </a>
          </div>
        </div>
      </div>

      {copilot && <CopilotPanel onClose={()=>setCopilot(false)} />}

      <style>{`
        @keyframes livePulse { 0%,100%{opacity:1;box-shadow:0 0 6px rgba(16,185,129,0.8)} 50%{opacity:0.5;box-shadow:0 0 2px rgba(16,185,129,0.3)} }
        @keyframes glowPulse { 0%,100%{box-shadow:0 0 0 0 rgba(99,102,241,0)} 50%{box-shadow:0 0 14px 2px rgba(99,102,241,0.32)} }
        main::-webkit-scrollbar { width:4px; }
        main::-webkit-scrollbar-track { background:transparent; }
        main::-webkit-scrollbar-thumb { background:rgba(34,211,238,0.14); border-radius:99px; }
      `}</style>
    </div>
  );
}
