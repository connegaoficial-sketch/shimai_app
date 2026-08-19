"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import { formatMxn } from "@/lib/format";
import {
  readCheckoutResult,
  type StoredCheckoutResult,
} from "@/lib/checkout-session";

function ConfirmationContent() {
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
          </>
        ) : method === "bank_transfer" ? (
          <>
            <h1 className="mt-3 font-serif text-4xl text-shimai-ivory">
              Transferencia
            </h1>
            <p className="mt-3 font-sans text-sm leading-relaxed text-shimai-ivory/55">
              Realiza el depósito con estos datos. Tu orden quedará en espera
              de comprobante.
            </p>

            <div className="mt-8 space-y-4 border border-shimai-gold/30 bg-shimai-surface/80 p-5">
              <Detail label="Banco" value={bank?.bank_name || "—"} />
              <Detail label="Titular" value={bank?.holder_name || "—"} />
              <Detail
                label="CLABE"
                value={bank?.clabe || "—"}
                emphasize
              />
              <Detail
                label="Cuenta"
                value={bank?.account_number || "—"}
                emphasize
              />
              {typeof result?.total === "number" ? (
                <Detail
                  label="Total a transferir"
                  value={formatMxn(result.total)}
                  emphasize
                />
              ) : null}
            </div>
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

function Detail({
  label,
  value,
  emphasize = false,
}: {
  label: string;
  value: string;
  emphasize?: boolean;
}) {
  return (
    <div>
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
  );
}

export default function ConfirmationPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-full items-center justify-center bg-shimai-black font-sans text-sm text-shimai-ivory/50">
          Cargando confirmación…
        </main>
      }
    >
      <ConfirmationContent />
    </Suspense>
  );
}
