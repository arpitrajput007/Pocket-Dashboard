import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import BrandLogo from './BrandLogo';
import SocialLinks from './SocialLinks';
import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

export function CtaFooter() {
  const [session, setSession] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  const ctaHref = session ? "/dashboard" : "/signup";
  const ctaLabel = session ? "Go to Dashboard" : "Start Your 14-Day Free Trial";
  return (
    <section id="cta" className="relative py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-4">
        <div className="gradient-border relative overflow-hidden rounded-3xl">
          <div
            className="glass-strong relative rounded-3xl px-8 py-16 text-center sm:px-16"
          >
            {/* Background glow */}
            <div
              className="pointer-events-none absolute inset-0 opacity-20"
              style={{
                background:
                  "radial-gradient(ellipse at 50% 50%, oklch(0.78 0.18 305), transparent 70%)",
              }}
            />

            <div className="relative">
              <h2 className="mx-auto max-w-2xl text-4xl font-semibold tracking-tight sm:text-5xl">
                Stop guessing your numbers.
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">
                Start running your business with clarity and control.
              </p>

              <div className="relative mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link
                  to={ctaHref}
                  className="btn-aurora group inline-flex items-center justify-center gap-2 rounded-full px-7 py-3 text-sm font-medium no-underline"
                >
                  {ctaLabel}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
                <Link
                  to="/login"
                  className="glass inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-medium hover:bg-glass-strong no-underline"
                >
                  Sign In
                </Link>
              </div>
              <div className="relative mt-6 text-xs text-muted-foreground">
                No credit card required · Cancel anytime · Built for Indian D2C businesses
              </div>
            </div>
          </div>
        </div>

        <footer className="mx-auto mt-16 max-w-6xl px-4 text-xs text-muted-foreground">
          <div className="flex flex-col items-center justify-between gap-6 border-t border-glass-border pt-8 sm:flex-row">
            <div className="flex flex-col items-center gap-3 sm:items-start">
              <BrandLogo variant="compact" iconSize={32} />
              <div className="text-center sm:text-left">
                <div className="text-sm font-medium text-foreground/80 mb-1">Revenue is vanity. Profit is sanity.</div>
                <div>We help you track what actually matters. © {new Date().getFullYear()} Pocket Dashboard.</div>
              </div>
            </div>
            <div className="flex flex-col items-center gap-4 sm:items-end">
              <SocialLinks size="sm" variant="footer" />
              <div className="flex items-center gap-5">
                <a href="/privacy" target="_blank" rel="noopener noreferrer" className="hover:text-foreground no-underline">Privacy</a>
                <a href="/terms" target="_blank" rel="noopener noreferrer" className="hover:text-foreground no-underline">Terms</a>
                <a href="/contact-us" target="_blank" rel="noopener noreferrer" className="hover:text-foreground no-underline">Contact</a>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </section>
  );
}

