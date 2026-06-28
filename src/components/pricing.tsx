import { Check, ShieldCheck, Zap, Gift, Sparkles } from "lucide-react";

const tiers = [
  {
    name: "Starter",
    price: "₹999",
    cadence: "/ month",
    desc: "For new founders who want clarity without manual work",
    features: [
      "1 store connection",
      "Daily business dashboard",
      "Order tracking (COD + prepaid)",
      "Basic profit tracking",
      "Limited data history (30 days)",
      "Email support"
    ],
    highlight: false,
    cta: "Get Free Access"
  },
  {
    name: "Pro",
    price: "₹1,499",
    cadence: "/ month",
    desc: "For brands serious about controlling profit and reducing losses",
    features: [
      "Everything in Starter +",
      "Complete business analytics (no limits)",
      "SKU-level profit tracking",
      "Ad spend vs profit visibility",
      "Loss identification (RTO, failed delivery)",
      "AI-powered insights",
      "Weekly performance summaries",
      "Priority support"
    ],
    highlight: true,
    badge: "Most popular among growing D2C brands",
    cta: "Get Free Access"
  },
  {
    name: "Custom",
    price: "Custom",
    cadence: "",
    desc: "For multi-store and custom requirements",
    features: [
      "Custom dashboard creation",
      "Multi-store dashboards",
      "Custom reporting",
      "API integrations",
      "Dedicated account manager",
      "Workflow automation support"
    ],
    highlight: false,
    cta: "Request Demo"
  },
];

export function Pricing() {
  return (
    <section id="pricing" className="relative py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mx-auto max-w-2xl text-center">
          <div className="mb-4 inline-flex rounded-full border border-glass-border bg-glass px-3 py-1 text-[11px] uppercase tracking-widest text-muted-foreground">
            Pricing
          </div>
          <h2 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            Simple, <span className="text-gradient">profit-focused</span> pricing
          </h2>
          <p className="mt-4 text-muted-foreground text-lg">
            Start free. Upgrade when you're ready to take control.
          </p>
        </div>

        {/* ── Promo Banner ── */}
        <div className="promo-banner mx-auto mt-10 max-w-3xl">
          <div className="promo-banner-inner flex flex-wrap items-center justify-center gap-3 rounded-2xl px-6 py-4">
            <span className="promo-gift-icon">
              <Gift className="h-5 w-5" />
            </span>
            <div className="text-center sm:text-left">
              <p className="promo-title">🎉 Limited Time — Everything is Free for 3 Months!</p>
              <p className="promo-subtitle">No credit card required · Full access · All features unlocked</p>
            </div>
            <span className="promo-pill">Ends Soon</span>
          </div>
        </div>

        <div className="mt-10 grid gap-5 lg:grid-cols-3">
          {tiers.map((t) => (
            <div
              key={t.name}
              className={`gradient-border relative rounded-3xl pricing-card ${
                t.highlight ? "shadow-glow pro-highlight" : "opacity-90 hover:opacity-100"
              }`}
            >
              <div
                className={`relative flex h-full flex-col justify-between rounded-3xl p-7 ${
                  t.highlight ? "glass-strong" : "glass"
                }`}
              >
                <div>
                  {t.highlight && (
                    <span className="absolute -top-3 left-1/2 inline-flex w-max -translate-x-1/2 items-center gap-1 rounded-full px-4 py-1 text-[11px] font-semibold uppercase tracking-wider text-primary-foreground"
                      style={{ background: "var(--gradient-button)" }}
                    >
                      <Zap className="h-3 w-3" fill="currentColor" /> {t.badge}
                    </span>
                  )}
                  <div className="text-lg font-medium text-foreground">{t.name}</div>

                  {/* Price block */}
                  {t.price !== "Custom" ? (
                    <div className="mt-3">
                      {/* Original price — strikethrough */}
                      <div className="flex items-baseline gap-1.5">
                        <span className="original-price">{t.price}</span>
                        {t.cadence && <span className="original-cadence">{t.cadence}</span>}
                      </div>
                      {/* Free promo price */}
                      <div className="free-price-block mt-1.5 flex items-baseline gap-1">
                        <span className="free-price-amount">₹0</span>
                        <span className="free-price-cadence">/ month</span>
                      </div>
                      {/* Free badge */}
                      <div className="free-badge mt-2.5">
                        <span className="free-badge-dot" />
                        Free for 3 months
                      </div>
                    </div>
                  ) : (
                    <div className="mt-3 flex items-baseline gap-1">
                      <span className="text-4xl font-semibold tracking-tight">{t.price}</span>
                    </div>
                  )}

                  <p className="mt-3 text-sm text-muted-foreground">{t.desc}</p>

                  <a
                    href="#cta"
                    className={`mt-6 inline-flex w-full items-center justify-center rounded-full px-4 py-3 text-sm font-medium ${
                      t.highlight
                        ? "btn-aurora"
                        : "border border-glass-border bg-glass text-foreground hover:bg-glass-strong"
                    }`}
                  >
                    {t.cta}
                  </a>

                  <ul className="mt-8 space-y-3 text-sm">
                    {t.features.map((f) => (
                      <li key={f} className="flex items-start gap-2.5 text-muted-foreground text-[13px] leading-tight">
                        <Check className="h-4 w-4 shrink-0 text-accent" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mx-auto mt-16 max-w-4xl text-center">
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-8 text-sm text-muted-foreground">
            <span className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-accent" />
              Works with Shopify & COD businesses · WooCommerce coming soon
            </span>
            <span className="hidden sm:inline-block opacity-30">·</span>
            <span className="flex items-center gap-2">
               Setup in under 10 minutes
            </span>
            <span className="hidden sm:inline-block opacity-30">·</span>
            <span className="flex items-center gap-2">
               Cancel anytime
            </span>
          </div>

          <div className="mt-12">
            <h3 className="text-2xl font-semibold tracking-tight text-foreground">
              Stop guessing your numbers. Start running your business with clarity.
            </h3>
          </div>
        </div>
      </div>

      <style>{`
        .pricing-card {
          transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
          transform: scale(1);
        }
        .pricing-card:hover {
          transform: translateY(-8px) scale(1.02);
          box-shadow: 0 20px 40px -10px rgba(99,102,241,0.2), 0 0 0 1px rgba(99,102,241,0.15);
          z-index: 10;
        }
        .pricing-card.pro-highlight {
          transform: scale(1.05);
          z-index: 5;
          box-shadow: 0 10px 30px -10px rgba(99,102,241,0.3);
        }
        .pricing-card.pro-highlight:hover {
          transform: translateY(-8px) scale(1.07);
          box-shadow: 0 25px 50px -12px rgba(99,102,241,0.4), 0 0 0 1px rgba(99,102,241,0.3);
          z-index: 10;
        }

        /* ── Original price strikethrough ── */
        .original-price {
          font-size: 1.35rem;
          font-weight: 600;
          color: rgba(148,163,184,0.55);
          text-decoration: line-through;
          text-decoration-color: rgba(248,113,113,0.7);
          text-decoration-thickness: 2px;
          letter-spacing: -0.01em;
        }
        .original-cadence {
          font-size: 0.75rem;
          color: rgba(148,163,184,0.4);
          text-decoration: line-through;
          text-decoration-color: rgba(248,113,113,0.5);
        }

        /* ── Free promo price ── */
        .free-price-block {
          display: flex;
          align-items: baseline;
          gap: 4px;
        }
        .free-price-amount {
          font-size: 2.75rem;
          font-weight: 700;
          letter-spacing: -0.03em;
          background: linear-gradient(135deg, #34d399 0%, #6ee7b7 40%, #a7f3d0 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          line-height: 1;
        }
        .free-price-cadence {
          font-size: 0.8rem;
          color: rgba(52,211,153,0.75);
          font-weight: 500;
        }

        /* ── "Free for 3 months" badge ── */
        .free-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: linear-gradient(135deg, rgba(52,211,153,0.15) 0%, rgba(110,231,183,0.1) 100%);
          border: 1px solid rgba(52,211,153,0.3);
          border-radius: 999px;
          padding: 4px 12px;
          font-size: 0.7rem;
          font-weight: 700;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: #34d399;
          width: fit-content;
          animation: badge-pulse 2.8s ease-in-out infinite;
        }
        .free-badge-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #34d399;
          flex-shrink: 0;
          animation: dot-ping 2.8s ease-in-out infinite;
          box-shadow: 0 0 0 0 rgba(52,211,153,0.6);
        }
        @keyframes badge-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(52,211,153,0); }
          50% { box-shadow: 0 0 14px 2px rgba(52,211,153,0.2); }
        }
        @keyframes dot-ping {
          0%, 100% { box-shadow: 0 0 0 0 rgba(52,211,153,0.6); }
          50% { box-shadow: 0 0 0 5px rgba(52,211,153,0); }
        }

        /* ── Promo banner ── */
        .promo-banner {
          animation: banner-slide-in 0.7s cubic-bezier(0.34,1.56,0.64,1) both;
        }
        @keyframes banner-slide-in {
          from { opacity: 0; transform: translateY(-16px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0)   scale(1);    }
        }
        .promo-banner-inner {
          background: linear-gradient(135deg,
            rgba(52,211,153,0.12) 0%,
            rgba(99,102,241,0.1) 50%,
            rgba(52,211,153,0.08) 100%
          );
          border: 1px solid rgba(52,211,153,0.28);
          backdrop-filter: blur(12px);
          box-shadow: 0 0 40px -10px rgba(52,211,153,0.25),
                      inset 0 1px 0 rgba(255,255,255,0.06);
          animation: glow-breathe 3.5s ease-in-out infinite;
        }
        @keyframes glow-breathe {
          0%, 100% { box-shadow: 0 0 30px -10px rgba(52,211,153,0.2), inset 0 1px 0 rgba(255,255,255,0.06); }
          50%       { box-shadow: 0 0 55px -8px  rgba(52,211,153,0.38), inset 0 1px 0 rgba(255,255,255,0.06); }
        }
        .promo-gift-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: linear-gradient(135deg, rgba(52,211,153,0.25), rgba(99,102,241,0.2));
          border: 1px solid rgba(52,211,153,0.35);
          color: #34d399;
          flex-shrink: 0;
          animation: gift-spin 6s ease-in-out infinite;
        }
        @keyframes gift-spin {
          0%, 85%, 100% { transform: rotate(0deg) scale(1); }
          90%            { transform: rotate(-12deg) scale(1.1); }
          95%            { transform: rotate(10deg) scale(1.1); }
        }
        .promo-title {
          font-size: 0.95rem;
          font-weight: 700;
          color: #e2e8f0;
          margin: 0;
          line-height: 1.3;
        }
        .promo-subtitle {
          font-size: 0.72rem;
          color: rgba(148,163,184,0.75);
          margin: 2px 0 0;
          letter-spacing: 0.02em;
        }
        .promo-pill {
          flex-shrink: 0;
          background: linear-gradient(135deg, #34d399, #6ee7b7);
          color: #0d1a12;
          font-size: 0.62rem;
          font-weight: 800;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          padding: 4px 10px;
          border-radius: 999px;
          animation: pill-throb 2.2s ease-in-out infinite;
        }
        @keyframes pill-throb {
          0%, 100% { transform: scale(1);    opacity: 1;    }
          50%       { transform: scale(1.06); opacity: 0.85; }
        }
      `}</style>
    </section>
  );
}
