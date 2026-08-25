import { shimaiBrand } from "@/lib/brand/shimai";

function IconClock({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

function IconTruck({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M3 7h11v10H3z" />
      <path d="M14 10h4l3 3v4h-7" />
      <circle cx="7" cy="18" r="1.5" />
      <circle cx="17" cy="18" r="1.5" />
    </svg>
  );
}

function IconMapPin({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 21s-6-5.3-6-10a6 6 0 1 1 12 0c0 4.7-6 10-6 10z" />
      <circle cx="12" cy="11" r="2" />
    </svg>
  );
}

function IconWallet({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M3 7.5A2.5 2.5 0 0 1 5.5 5H19a1 1 0 0 1 1 1v2" />
      <rect x="3" y="8" width="18" height="11" rx="2" />
      <path d="M16 13.5h2" />
    </svg>
  );
}

const items = [
  {
    Icon: IconClock,
    label: "Horario",
    value: shimaiBrand.operations.hoursLabel,
    detail: shimaiBrand.operations.hoursDetail,
  },
  {
    Icon: IconTruck,
    label: "Entrega",
    value: shimaiBrand.operations.deliveryEstimate,
    detail: shimaiBrand.operations.deliveryDetail,
  },
  {
    Icon: IconMapPin,
    label: "Zona",
    value: shimaiBrand.operations.zonesShort,
    detail: shimaiBrand.operations.zonesDetail,
  },
  {
    Icon: IconWallet,
    label: "Pago",
    value: shimaiBrand.operations.paymentsShort,
    detail: shimaiBrand.operations.payments.join(" · "),
  },
] as const;

export function TrustStrip() {
  return (
    <section
      aria-label="Cómo pedimos y entregamos"
      className="relative border-b border-white/[0.06] bg-shimai-surface/50"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-shimai-gold/40 to-transparent"
      />
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-px bg-white/[0.06] md:grid-cols-4">
        {items.map(({ Icon, label, value, detail }, index) => (
          <div
            key={label}
            className="shimai-trust-cell animate-shimai-fade-up flex flex-col gap-2.5 bg-shimai-black px-4 py-6 sm:px-5 sm:py-7"
            style={{ animationDelay: `${index * 70}ms` }}
          >
            <div className="flex items-center gap-2.5 text-shimai-gold">
              <span className="flex size-8 items-center justify-center border border-shimai-gold/25 bg-shimai-gold/5">
                <Icon className="size-4 shrink-0" />
              </span>
              <span className="font-sans text-[10px] uppercase tracking-[0.22em] text-shimai-gold/85">
                {label}
              </span>
            </div>
            <p className="font-serif text-lg leading-snug break-words text-shimai-ivory sm:text-2xl">
              {value}
            </p>
            <p className="font-sans text-xs leading-relaxed break-words text-shimai-ivory/45">
              {detail}
            </p>
            <span
              aria-hidden
              className="mt-1 h-px w-8 bg-gradient-to-r from-shimai-gold/55 to-transparent"
            />
          </div>
        ))}
      </div>
    </section>
  );
}
