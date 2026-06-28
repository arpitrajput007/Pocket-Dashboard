const logos = [
  { name: "SHOPIFY" },
  { name: "WOOCOMMERCE", soon: true },
  { name: "SHIPROCKET" },
  { name: "ECOMEXPRESS" },
  { name: "DELHIVERY" },
  { name: "META ADS" },
  { name: "GOOGLE ADS" },
  { name: "CASHFREE" },
  { name: "RAZORPAY" },
  { name: "AMAZON" },
];

export function LogoMarquee() {
  return (
    <section className="relative py-10">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mb-6 text-center text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Works with the tools you already use
        </div>
        <div
          className="relative overflow-hidden"
          style={{
            maskImage:
              "linear-gradient(to right, transparent, black 10%, black 90%, transparent)",
          }}
        >
          <div className="flex w-max animate-marquee gap-12 whitespace-nowrap">
            {[...logos, ...logos].map((item, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-2 text-lg font-semibold tracking-[0.2em] text-muted-foreground/70"
              >
                {item.name}
                {item.soon && (
                  <span className="text-[9px] font-bold tracking-widest text-muted-foreground/40 border border-muted-foreground/20 rounded px-1.5 py-0.5">
                    SOON
                  </span>
                )}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
