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

const baseItems = [
  {
    Icon: IconClock,
    label: "Horario",
    value: shimaiBrand.operations.hoursLabel,
    detailKey: "hours" as const,
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

type TrustStripProps = {
  /** From admin ordering_schedule — not hardcoded weekdays */
  hoursDetail?: string;
};

export function TrustStrip({
  hoursDetail = shimaiBrand.operations.hoursDetail,
}: TrustStripProps) {
  const items = baseItems.map((item) =>
    "detailKey" in item && item.detailKey === "hours"
      ? { Icon: item.Icon, label: item.label, value: item.value, detail: hoursDetail }
      : {
          Icon: item.Icon,
          label: item.label,
          value: item.value,
          detail: "detail" in item ? item.detail : hoursDetail,
        },
  );

  return (
    <section
      aria-label="Cómo pedimos y entregamos"
      className="relative bg-shimai-black"
    >
      {/* Same plane as hero/promo — typography grid, no surface band or cell chrome */}
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-x-10 gap-y-9 px-4 pb-12 pt-2 sm:gap-x-12 sm:px-6 sm:pb-14 md:grid-cols-4 md:gap-x-8">
        {items.map(({ Icon, label, value, detail }, index) => (
          <div
            key={label}
            className="shimai-trust-cell animate-shimai-fade-up flex flex-col gap-1.5"
            style={{ animationDelay: `${index * 70}ms` }}
          >
            <div className="flex items-center gap-2 text-shimai-gold/85">
              <Icon className="size-3.5 shrink-0" />
              <span className="font-sans text-[10px] uppercase tracking-[0.22em]">
                {label}
              </span>
            </div>
            <p className="font-serif text-lg leading-snug break-words text-shimai-ivory sm:text-xl">
              {value}
            </p>
            <p className="font-sans text-xs leading-relaxed break-words text-shimai-ivory/42">
              {detail}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
