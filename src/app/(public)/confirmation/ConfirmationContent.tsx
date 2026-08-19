"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { WhatsAppLink } from "@/components/public/WhatsAppLink";
import { isWhatsAppConfigured } from "@/lib/contact/whatsapp";
import {
  readCheckoutResult,
  type StoredCheckoutResult,
} from "@/lib/checkout-session";
import { formatMxn } from "@/lib/format";

type ConfirmationContentProps = {
  whatsappPhone: string;
};

export function ConfirmationContent({ whatsappPhone }: ConfirmationContentProps) {
  const searchParams = useSearchParams();
  const orderIdParam = searchParams.get("order_id");
  const isStripeReturn = searchParams.get("stripe") === "1";
  const [result, setResult] = useState<StoredCheckoutResult | null>(null);

  useEffect(() => {
    setResult(readCheckoutResult());
  }, []);

  const orderId = result?.order_id ?? orderIdParam;
  const method = result?.payment_method;
  const bank = result?.bank_details;
  const transferWhatsApp =
    result?.whatsapp_phone?.trim() || whatsappPhone.trim();
  const proofMessage = orderId
    ? `Hola SHIMAI, envío comprobante de transferencia del pedido ${orderId}.`
    : "Hola SHIMAI, envío comprobante de transferencia de mi pedido.";

  return (
    <main className="min-h-full bg-shimai-black">
      <div className="border-b border-white/[0.06] px-4 py-4 sm:px-6">
        <Link
          href="/"
          className="font-serif text-xl tracking-wide text-shimai-ivory"
        >
          SHIMAI
        </Link>
      </div>

      <div className="mx-auto w-full max-w-lg px-4 py-12 sm:py-16">
        <p className="font-sans text-[11px] uppercase tracking-[0.28em] text-shimai-gold/80">
          Confirmación
        </p>

        {isStripeReturn || method === "card_online" ? (
          <>
            <h1 className="mt-3 font-serif text-4xl text-shimai-ivory">
              Pago recibido
            </h1>
            <p className="mt-3 font-sans text-sm leading-relaxed text-shimai-ivory/55">
              Gracias. Tu orden con tarjeta quedó registrada. Las hermanas ya
              la tienen en cocina.
            </p>
            <OrderTotals result={result} />
          </>
        ) : method === "bank_transfer" ? (
          <>
            <h1 className="mt-3 font-serif text-4xl text-shimai-ivory">
              Transferencia
            </h1>
            <p className="mt-3 font-sans text-sm leading-relaxed text-shimai-ivory/55">
              Gracias por tu confianza. Validamos el pago y te mantenemos al
              tanto — puedes seguir tu pedido desde aquí.
            </p>
            <OrderTotals result={result} />

            <div className="mt-8 space-y-4 border border-shimai-gold/30 bg-shimai-surface/80 p-5">
              <Detail label="Banco" value={bank?.bank_name || "—"} />
              <Detail label="Titular" value={bank?.holder_name || "—"} />
              <Detail
                label="CLABE"
                value={bank?.clabe || "—"}
                emphasize
                copyable
              />
              <Detail
                label="Cuenta"
                value={bank?.account_number || "—"}
                emphasize
                copyable
              />
              {typeof result?.total === "number" ? (
                <Detail
                  label="Total a transferir"
                  value={formatMxn(result.total)}
                  emphasize
                />
              ) : null}
            </div>

            {isWhatsAppConfigured(transferWhatsApp) ? (
              <div className="mt-4 rounded-md border border-[#25D366]/30 bg-[#25D366]/10 px-4 py-4">
                <p className="font-sans text-sm leading-relaxed text-shimai-ivory/85">
                  Envía tu comprobante al WhatsApp de SHIMAI
                </p>
                <WhatsAppLink
                  phone={transferWhatsApp}
                  message={proofMessage}
                  className="mt-3 text-base font-medium"
                />
              </div>
            ) : null}
          </>
        ) : (
          <>
            <h1 className="mt-3 font-serif text-4xl text-shimai-ivory">
              Preparando tu orden
            </h1>
            <p className="mt-2 font-serif text-2xl text-shimai-gold">🍣</p>
            <p className="mt-3 font-sans text-sm leading-relaxed text-shimai-ivory/55">
              {method === "card_terminal"
                ? "Cobramos con terminal al entregar. Mientras, la cocina arranca."
                : "Pagarás en efectivo a la entrega. Ya estamos preparando tu pedido."}
            </p>
            <OrderTotals result={result} />
          </>
        )}

        {orderId ? (
          <div className="mt-8 space-y-4 border-t border-white/[0.06] pt-6">
            <p className="font-sans text-xs tracking-wide text-shimai-ivory/45">
              ID del pedido{" "}
              <span className="text-shimai-gold">{orderId}</span>
            </p>
            <Link
              href={`/tracker/${orderId}`}
              className="inline-flex h-11 items-center border border-shimai-gold/40 px-5 font-sans text-sm text-shimai-ivory hover:border-shimai-gold hover:text-shimai-gold"
            >
              Seguir mi pedido
            </Link>
          </div>
        ) : (
          <p className="mt-8 font-sans text-sm text-shimai-ivory/45">
            No encontramos el detalle de la orden en esta sesión. Si pagaste con
            Stripe, conserva el correo de confirmación.
          </p>
        )}

        {result?.message ? (
          <p className="mt-4 font-sans text-sm text-shimai-ivory/60">
            {result.message}
          </p>
        ) : null}

        <Link
          href="/"
          className="mt-10 inline-flex h-11 items-center border border-shimai-gold bg-shimai-gold px-5 font-sans text-sm font-medium text-shimai-black hover:bg-shimai-gold/90"
        >
          Volver al menú
        </Link>
      </div>
    </main>
  );
}

function OrderTotals({ result }: { result: StoredCheckoutResult | null }) {
  if (!result || typeof result.total !== "number") return null;

  return (
    <div className="mt-6 space-y-3 border border-white/[0.08] bg-shimai-surface/70 p-5">
      {result.items?.length ? (
        <ul className="space-y-2">
          {result.items.map((item) => (
            <li
              key={`${item.product_id}-${item.name}`}
              className="flex items-start justify-between gap-3 font-sans text-sm text-shimai-ivory/80"
            >
              <span>
                {item.quantity} × {item.name}
              </span>
              <span className="shrink-0 text-shimai-ivory">
                {formatMxn(item.line_total)}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="space-y-2 border-t border-white/[0.06] pt-3">
        <Detail label="Subtotal" value={formatMxn(result.subtotal)} />
        <Detail label="Envío" value={formatMxn(result.delivery_fee)} />
        {typeof result.discount === "number" && result.discount > 0 ? (
          <Detail
            label={result.promo_label || "Descuento"}
            value={`− ${formatMxn(result.discount)}`}
          />
        ) : null}
        <Detail label="Total" value={formatMxn(result.total)} emphasize />
      </div>
    </div>
  );
}

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    if (!value || value === "—") return;

    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      type="button"
      onClick={() => void copy()}
      aria-label={copied ? `${label} copiado` : `Copiar ${label}`}
      className="mt-1 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-shimai-gold/35 text-shimai-gold transition-colors hover:border-shimai-gold hover:bg-shimai-gold/10"
    >
      {copied ? (
        <span className="font-sans text-xs font-medium" aria-hidden>
          ✓
        </span>
      ) : (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          className="h-4 w-4"
          aria-hidden
        >
          <rect x="9" y="9" width="13" height="13" rx="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
      )}
    </button>
  );
}

function Detail({
  label,
  value,
  emphasize = false,
  copyable = false,
}: {
  label: string;
  value: string;
  emphasize?: boolean;
  copyable?: boolean;
}) {
  const canCopy = copyable && value !== "—" && value.trim().length > 0;

  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0 flex-1">
        <p className="font-sans text-[10px] uppercase tracking-[0.2em] text-shimai-ivory/40">
          {label}
        </p>
        <p
          className={
            emphasize
              ? "mt-1 break-all font-serif text-xl text-shimai-gold"
              : "mt-1 font-sans text-sm text-shimai-ivory"
          }
        >
          {value}
        </p>
      </div>
      {canCopy ? <CopyButton value={value} label={label} /> : null}
    </div>
  );
}
