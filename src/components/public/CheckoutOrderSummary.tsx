import { formatMxn } from "@/lib/format";

export type CheckoutSummaryLine = {
  id: string;
  name: string;
  quantity: number;
  lineTotal: number;
};

type CheckoutOrderSummaryProps = {
  lines: CheckoutSummaryLine[];
  subtotal: number;
  deliveryFee: number | null;
  discount: number;
  promoLabel: string | null;
  total: number | null;
  couponInvalid?: boolean;
};

export function CheckoutOrderSummary({
  lines,
  subtotal,
  deliveryFee,
  discount,
  promoLabel,
  total,
  couponInvalid = false,
}: CheckoutOrderSummaryProps) {
  return (
    <aside className="border border-white/[0.08] bg-shimai-surface/70 p-4">
      <p className="font-sans text-[10px] uppercase tracking-[0.2em] text-shimai-gold/80">
        Tu pedido
      </p>
      <ul className="mt-3 space-y-2">
        {lines.map((line) => (
          <li
            key={line.id}
            className="flex items-start justify-between gap-3 font-sans text-sm text-shimai-ivory/80"
          >
            <span className="min-w-0">
              {line.quantity} × {line.name}
            </span>
            <span className="shrink-0 text-shimai-ivory">
              {formatMxn(line.lineTotal)}
            </span>
          </li>
        ))}
      </ul>

      <dl className="mt-4 space-y-2 border-t border-white/[0.06] pt-3">
        <Row label="Subtotal" value={formatMxn(subtotal)} />
        <Row
          label="Envío"
          value={
            deliveryFee == null
              ? "Pendiente de zona"
              : deliveryFee === 0
                ? "Gratis"
                : formatMxn(deliveryFee)
          }
        />
        {discount > 0 ? (
          <Row
            label={promoLabel || "Descuento"}
            value={`− ${formatMxn(discount)}`}
            accent
          />
        ) : null}
        {couponInvalid ? (
          <p className="font-sans text-xs text-seal-red/90">
            Ese cupón no está vigente. El total no incluye descuento.
          </p>
        ) : null}
        <div className="flex items-baseline justify-between gap-3 pt-1">
          <dt className="font-sans text-[11px] uppercase tracking-[0.16em] text-shimai-ivory/50">
            Total
          </dt>
          <dd className="font-serif text-2xl text-shimai-gold">
            {total == null ? "—" : formatMxn(total)}
          </dd>
        </div>
      </dl>
      <p className="mt-3 font-sans text-[11px] leading-relaxed text-shimai-ivory/35">
        {deliveryFee == null
          ? "Confirma tu zona para ver el total con envío."
          : "El total se confirma al crear el pedido."}
      </p>
    </aside>
  );
}

function Row({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="font-sans text-xs text-shimai-ivory/45">{label}</dt>
      <dd
        className={
          accent
            ? "font-sans text-sm text-shimai-gold"
            : "font-sans text-sm text-shimai-ivory"
        }
      >
        {value}
      </dd>
    </div>
  );
}
