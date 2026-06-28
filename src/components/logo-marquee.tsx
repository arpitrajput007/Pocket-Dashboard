const logos = [
  "SHOPIFY", "SHIPROCKET", "ECOMEXPRESS", "DELHIVERY",
  "META ADS", "GOOGLE ADS", "CASHFREE", "RAZORPAY", "AMAZON",
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
            {[...logos, ...logos].map((name, i) => (
              <span
                key={i}
                className="text-lg font-semibold tracking-[0.2em] text-muted-foreground/70"
              >
                {name}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
