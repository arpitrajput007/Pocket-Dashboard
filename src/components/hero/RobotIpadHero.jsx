import React, { useEffect, useRef, useState } from "react";
import DashboardScroller from "./DashboardScroller";
import RobotFallback from "./RobotFallback";
import BrandLogo from '../BrandLogo';

/**
 * RobotIpadHero
 * - Sticky hero pinned for ~3x viewport so the iPad content changes as you scroll.
 * - Robot PNG (/robot-mascot.png) is composited behind the iPad. Falls back to an SVG mascot.
 * - Inside the iPad: auto-scrolling dashboard + scene swap driven by scroll progress.
 */
export default function RobotIpadHero() {
  const wrapperRef = useRef(null);
  const [progress, setProgress] = useState(0);
  const [sceneIndex, setSceneIndex] = useState(0);
  const [robotOk, setRobotOk] = useState(false);
  const [robotChecked, setRobotChecked] = useState(false);

  // Check robot image availability once
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      setRobotOk(true);
      setRobotChecked(true);
    };
    img.onerror = () => {
      setRobotOk(false);
      setRobotChecked(true);
    };
    img.src = "/robot-mascot.png";
  }, []);

  // Scroll pinning: map scroll Y within the wrapper to 0..1 progress
  useEffect(() => {
    const onScroll = () => {
      const el = wrapperRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const total = el.offsetHeight - window.innerHeight;
      const scrolled = Math.min(
        Math.max(-rect.top, 0),
        Math.max(total, 1),
      );
      const p = total > 0 ? scrolled / total : 0;
      setProgress(p);

      // 3 scenes, evenly distributed
      if (p < 0.33) setSceneIndex(0);
      else if (p < 0.66) setSceneIndex(1);
      else setSceneIndex(2);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  const headlines = [
    {
      kicker: "TODAY · LIVE",
      title: "Your real profit,",
      sub: "updating by the second.",
      body: "Orders, fulfilment, RTO, ad spend and net profit. All stitched into one live dashboard that auto-refreshes with every Shopify and Shiprocket webhook.",
    },
    {
      kicker: "THIS WEEK · TRENDS",
      title: "Spot leaks before",
      sub: "they dent your cash flow.",
      body: "Canceled orders, possibility-of-RTO, unreachable customers and failed deliveries. 7-day rollups so you see patterns, not just numbers.",
    },
    {
      kicker: "THIS MONTH · MARGIN",
      title: "Know what to double down on.",
      sub: "And what to cut.",
      body: "Track SKU-level profit, prepaid vs COD performance, ROAS, MER and real business margins. An AI co-pilot helps you make smarter spending decisions.",
    },
  ];

  const headline = headlines[sceneIndex];

  return (
    <section
      ref={wrapperRef}
      data-testid="robot-hero-wrapper"
      className="relative"
      style={{ height: "320vh" }}
    >
      <div className="sticky top-0 h-screen w-full overflow-hidden">
        {/* Backdrop */}
        <div className="absolute inset-0 bg-[var(--bg-0)]" />
        <div className="aurora" />
        <div className="absolute inset-0 grid-bg" />

        {/* Ticker of integrations */}
        <div
          className="absolute top-24 left-0 right-0 z-10 overflow-hidden"
          data-testid="integrations-ticker"
        >
          <div className="relative opacity-60">
            <div className="ticker-track flex gap-10 whitespace-nowrap text-[11px] font-mono tracking-[0.28em] text-white/45">
              {[
                { name: "SHOPIFY" },
                { name: "WOOCOMMERCE", soon: true },
                { name: "SHIPROCKET" },
                { name: "DELHIVERY" },
                { name: "ECOMEXPRESS" },
                { name: "META ADS" },
                { name: "GOOGLE ADS" },
                { name: "CASHFREE" },
                { name: "RAZORPAY" },
                { name: "AMAZON" },
              ]
                .concat([
                  { name: "SHOPIFY" },
                  { name: "WOOCOMMERCE", soon: true },
                  { name: "SHIPROCKET" },
                  { name: "DELHIVERY" },
                  { name: "ECOMEXPRESS" },
                  { name: "META ADS" },
                  { name: "GOOGLE ADS" },
                  { name: "CASHFREE" },
                  { name: "RAZORPAY" },
                  { name: "AMAZON" },
                ])
                .map((item, i) => (
                  <span key={i} className="flex items-center gap-10">
                    {item.name}
                    {item.soon && (
                      <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.25)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 3, padding: '1px 4px' }}>
                        SOON
                      </span>
                    )}
                    <span className="h-1 w-1 rounded-full bg-white/20" />
                  </span>
                ))}
            </div>
          </div>
        </div>

        {/* Content grid */}
        <div className="relative z-10 h-full max-w-[1400px] mx-auto px-6 md:px-10 grid grid-cols-1 lg:grid-cols-12 items-center gap-8 pt-28 pb-10">
          {/* Left copy */}
          <div className="lg:col-span-5 order-2 lg:order-1">
            {/* Brand logo lockup — premium placement, matches screenshot */}
            <div style={{ marginBottom: '28px' }}>
              <BrandLogo variant="full" iconSize={68} />
            </div>

            <div
              key={`kicker-${sceneIndex}`}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 bg-white/[0.03] text-[10px] font-mono tracking-[0.22em] text-white/70"
              data-testid="hero-kicker"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 live-dot" />
              {headline.kicker}
            </div>

            <h1
              key={`title-${sceneIndex}`}
              className="mt-5 font-display font-semibold leading-[0.98] text-[42px] sm:text-[56px] lg:text-[68px] tracking-tight"
              data-testid="hero-title"
            >
              <span className="block text-white">{headline.title}</span>
              <span className="block brand-gradient-text">{headline.sub}</span>
            </h1>

            <p
              key={`body-${sceneIndex}`}
              className="mt-5 text-white/60 text-[15px] leading-relaxed max-w-[520px]"
              data-testid="hero-body"
            >
              {headline.body}
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <a
                href="#cta"
                data-testid="hero-cta-primary"
                className="relative inline-flex items-center gap-2 px-5 py-3 rounded-full brand-gradient text-black font-semibold text-[14px] overflow-hidden shine"
              >
                Free for 3 Months
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  className="relative z-[2]"
                >
                  <path
                    d="M3 8h10M9 4l4 4-4 4"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </a>
              <a
                href="/demo"
                data-testid="hero-cta-secondary"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-full border border-white/15 text-white/90 text-[14px] font-medium hover:bg-white/[0.04] transition"
              >
                <span className="h-2 w-2 rounded-full bg-cyan-300" /> View Demo
              </a>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-4 text-[11px] font-mono text-white/45">
              <span>NO CREDIT CARD</span>
              <span className="h-1 w-1 rounded-full bg-white/25" />
              <span>SETUP IN &lt; 10 MIN</span>
              <span className="h-1 w-1 rounded-full bg-white/25" />
              <span>SHOPIFY · WOO · COD</span>
            </div>

            {/* scroll hint */}
            <div className="hidden lg:flex mt-10 items-center gap-3 text-[10px] font-mono tracking-[0.25em] text-white/35">
              <span>SCROLL TO EXPLORE</span>
              <div className="h-[1px] w-16 bg-gradient-to-r from-white/30 to-transparent" />
            </div>
          </div>

          {/* Right stage: robot + iPad (enlarged landscape) */}
          <div className="lg:col-span-7 order-1 lg:order-2 relative">
            <div
              className="relative mx-auto"
              style={{
                width: "100%",
                maxWidth: 860,
                aspectRatio: "1 / 1",
              }}
              data-testid="robot-stage"
            >
              {/* Robot image fills the 1:1 stage */}
              <div className="absolute inset-0 pointer-events-none" aria-hidden>
                {robotChecked && robotOk ? (
                  <>
                    <img
                      src="/robot-mascot.png"
                      alt=""
                      className="absolute inset-0 w-full h-full object-contain float-slow"
                      data-testid="robot-image"
                      style={{
                        filter:
                          "drop-shadow(0 40px 80px rgba(34,211,238,.35)) drop-shadow(0 20px 60px rgba(168,85,247,.35))",
                      }}
                    />
                    {/* Glowing blinking eyes overlaid on the visor */}
                    <div
                      className="absolute inset-0 pointer-events-none"
                      data-testid="robot-eyes-layer"
                      style={{ animation: "float 6s ease-in-out infinite" }}
                    >
                      <span
                        className="absolute robot-eye"
                        data-testid="robot-eye-left"
                        style={{ left: "44%", top: "18.5%" }}
                      />
                      <span
                        className="absolute robot-eye"
                        data-testid="robot-eye-right"
                        style={{ left: "53%", top: "18.5%" }}
                      />
                    </div>
                  </>
                ) : (
                  <RobotFallback />
                )}
              </div>

              {/* iPad overlay — enlarged and floating slightly in front of the robot tablet.
                  Percentages keep it centered on the tablet area. */}
              <div
                className="absolute z-10"
                style={{
                  left: "15%",
                  top: "40%",
                  width: "70%",
                  height: "50%",
                }}
                data-testid="ipad-stage"
              >
                <DashboardScroller sceneIndex={sceneIndex} />
              </div>

              {/* Floating callouts around iPad */}
              <FloatingCallouts sceneIndex={sceneIndex} />
            </div>
          </div>
        </div>

        {/* Progress rail */}
        <div
          className="absolute right-4 top-1/2 -translate-y-1/2 h-40 w-[2px] bg-white/10 rounded-full hidden md:block"
          data-testid="scroll-progress-rail"
        >
          <div
            className="w-full rounded-full brand-gradient"
            style={{ height: `${Math.round(progress * 100)}%` }}
          />
        </div>
      </div>
    </section>
  );
}

function FloatingCallouts({ sceneIndex }) {
  const sets = [
    [
      { pos: "top-8 -left-6", title: "Net Today", value: "₹15,077", color: "#10b981" },
      { pos: "top-40 -right-8", title: "Revenue", value: "₹61,062", color: "#ffffff" },
      { pos: "bottom-24 -left-10", title: "RTO Risk", value: "5", color: "#ef4444" },
    ],
    [
      { pos: "top-8 -left-6", title: "Weekly Net", value: "₹1.08L", color: "#10b981" },
      { pos: "top-40 -right-8", title: "Delivered", value: "241", color: "#22d3ee" },
      { pos: "bottom-24 -left-10", title: "Ad Spend", value: "₹1.54L", color: "#f59e0b" },
    ],
    [
      { pos: "top-8 -left-6", title: "March Net", value: "₹4.38L", color: "#10b981" },
      { pos: "top-40 -right-8", title: "ROAS", value: "3.01×", color: "#a855f7" },
      { pos: "bottom-24 -left-10", title: "Orders", value: "1,324", color: "#22d3ee" },
    ],
  ];
  const items = sets[sceneIndex];
  return (
    <>
      {items.map((c, i) => (
        <div
          key={`${sceneIndex}-${i}`}
          className={`absolute ${c.pos} z-20 hidden md:block`}
          data-testid={`floating-callout-${i}`}
          style={{
            animation: `floatCallout 6s ease-in-out ${i * 0.4}s infinite`,
          }}
        >
          <div className="glass-card px-3 py-2 flex items-center gap-2 min-w-[140px]">
            <span
              className="h-2 w-2 rounded-full"
              style={{ background: c.color, boxShadow: `0 0 12px ${c.color}` }}
            />
            <div>
              <div className="text-[8px] font-mono tracking-[0.22em] text-white/50">
                {c.title.toUpperCase()}
              </div>
              <div
                className="font-display font-semibold text-[14px]"
                style={{ color: c.color }}
              >
                {c.value}
              </div>
            </div>
          </div>
        </div>
      ))}
      <style>{`
        @keyframes floatCallout {
          0%,100% { transform: translateY(0) }
          50% { transform: translateY(-10px) }
        }
      `}</style>
    </>
  );
}
