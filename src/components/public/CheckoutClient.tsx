"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { AddressAutocomplete } from "@/components/public/AddressAutocomplete";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { storeCheckoutResult } from "@/lib/checkout-session";
import { OUT_OF_COVERAGE_MESSAGE } from "@/lib/delivery/zones";
import { formatMxn } from "@/lib/format";
import { CheckoutError, requestCheckout } from "@/lib/stripe";
import { cn } from "@/lib/utils";
import { useCartStore } from "@/stores/cartStore";
import type { PaymentMethod, PaymentMethodsSetting } from "@/types";

type CheckoutClientProps = {
  paymentMethods: PaymentMethodsSetting;
  supabaseUrl: string;
  anonKey: string;
  prefill?: {
    fullName?: string | null;
    phone?: string | null;
  };
};

type DeliveryQuoteState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ok"; deliveryFee: number }
  | { status: "out_of_coverage"; message: string }
  | { status: "error"; message: string };

const METHOD_COPY: Record<
  PaymentMethod,
  { title: string; description: string }
> = {
  card_online: {
    title: "Pagar con Tarjeta",
    description: "Pago seguro online con Stripe.",
  },
  cash: {
    title: "Efectivo al entregar",
    description: "Pagas al repartidor al recibir tu orden.",
  },
  card_terminal: {
    title: "Tarjeta al entregar (Terminal)",
    description: "Cobro con terminal en la entrega.",
  },
  bank_transfer: {
    title: "Transferencia Bancaria",
    description: "Te mostramos CLABE y datos al confirmar.",
  },
};

async function fetchDeliveryQuote(
  lat: number,
  lng: number,
): Promise<DeliveryQuoteState> {
  const response = await fetch("/api/delivery/quote", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ lat, lng }),
  });
  const data = (await response.json()) as {
    ok?: boolean;
    delivery_fee?: number;
    error?: string;
    code?: string;
  };

  if (!response.ok) {
    return {
      status: "error",
      message: data.error ?? "No se pudo calcular el envío.",
    };
  }

  if (data.ok === true && typeof data.delivery_fee === "number") {
    return { status: "ok", deliveryFee: data.delivery_fee };
  }

  return {
    status: "out_of_coverage",
    message: data.error ?? OUT_OF_COVERAGE_MESSAGE,
  };
}

export function CheckoutClient({
  paymentMethods,
  supabaseUrl,
  anonKey,
  prefill,
}: CheckoutClientProps) {
  const router = useRouter();
  const items = useCartStore((s) => s.items);
  const clearCart = useCartStore((s) => s.clear);
  const [step, setStep] = useState<1 | 2>(1);
  const [fullName, setFullName] = useState(prefill?.fullName ?? "");
  const [phone, setPhone] = useState(prefill?.phone ?? "");
  const [addressText, setAddressText] = useState("");
  const [deliveryLat, setDeliveryLat] = useState<number | null>(null);
  const [deliveryLng, setDeliveryLng] = useState<number | null>(null);
  const [quote, setQuote] = useState<DeliveryQuoteState>({ status: "idle" });
  const [references, setReferences] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [outOfCoverage, setOutOfCoverage] = useState(false);
  const [pending, setPending] = useState(false);

  const enabledMethods = useMemo(() => {
    return (Object.keys(METHOD_COPY) as PaymentMethod[]).filter(
      (method) => paymentMethods[method],
    );
  }, [paymentMethods]);

  useEffect(() => {
    if (deliveryLat == null || deliveryLng == null) {
      setQuote({ status: "idle" });
      return;
    }

    let cancelled = false;
    setQuote({ status: "loading" });

    void fetchDeliveryQuote(deliveryLat, deliveryLng).then((result) => {
      if (cancelled) return;
      setQuote(result);
      if (result.status === "out_of_coverage") {
        setOutOfCoverage(true);
        setError(result.message);
      } else {
        setOutOfCoverage(false);
        if (result.status === "error") {
          setError(result.message);
        } else {
          setError(null);
        }
      }
    });

    return () => {
      cancelled = true;
    };
  }, [deliveryLat, deliveryLng]);

  const paymentBlocked =
    outOfCoverage ||
    quote.status !== "ok" ||
    deliveryLat == null ||
    deliveryLng == null;

  function goToPayment(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (!fullName.trim() || !phone.trim() || !addressText.trim()) {
      setError("Nombre, teléfono y dirección son obligatorios.");
      return;
    }
    if (deliveryLat == null || deliveryLng == null) {
      setError("Selecciona una dirección de la lista para ubicar tu zona.");
      return;
    }
    if (items.length === 0) {
      setError("Tu carrito está vacío.");
      return;
    }
    if (quote.status === "out_of_coverage") {
      setOutOfCoverage(true);
      setError(quote.message);
      return;
    }
    if (quote.status !== "ok") {
      setError("Espera a que calculemos tu zona de envío.");
      return;
    }

    setStep(2);
  }

  async function placeOrder(method: PaymentMethod) {
    setError(null);
    setOutOfCoverage(false);

    if (deliveryLat == null || deliveryLng == null) {
      setError("Faltan coordenadas de entrega.");
      return;
    }

    setPending(true);
    try {
      const origin = window.location.origin;
      const notesParts = [
        references.trim() ? `Referencias: ${references.trim()}` : null,
        notes.trim() || null,
      ].filter(Boolean);

      const result = await requestCheckout({
        supabaseUrl,
        anonKey,
        body: {
          items: items.map((item) => ({
            product_id: item.productId,
            quantity: item.quantity,
          })),
          payment_method: method,
          client_phone: phone.trim(),
          customer_name: fullName.trim(),
          delivery_notes: notesParts.length > 0 ? notesParts.join(" · ") : null,
          delivery_address: addressText.trim(),
          delivery_lat: deliveryLat,
          delivery_lng: deliveryLng,
          success_url: `${origin}/confirmation?stripe=1`,
          cancel_url: `${origin}/checkout?cancelled=1`,
        },
      });

      storeCheckoutResult({
        ...result,
        customer_name: fullName.trim(),
      });
      clearCart();

      if (method === "card_online" && result.checkout_url) {
        window.location.href = result.checkout_url;
        return;
      }

      router.push(`/confirmation?order_id=${result.order_id}`);
    } catch (err) {
      if (err instanceof CheckoutError && err.code === "OUT_OF_COVERAGE") {
        setOutOfCoverage(true);
        setError(err.message || OUT_OF_COVERAGE_MESSAGE);
        setStep(1);
      } else {
        setError(
          err instanceof Error ? err.message : "No se pudo crear la orden.",
        );
      }
      setPending(false);
    }
  }

  if (items.length === 0 && step === 1) {
    return (
      <div className="mx-auto flex w-full max-w-lg flex-col items-center gap-4 px-4 py-20 text-center">
        <h1 className="font-serif text-3xl text-shimai-ivory">Carrito vacío</h1>
        <p className="font-sans text-sm text-shimai-ivory/50">
          Elige piezas del menú para continuar.
        </p>
        <Link
          href="/"
          className="inline-flex h-10 items-center border border-shimai-gold px-4 font-sans text-sm text-shimai-ivory hover:bg-shimai-gold/10"
        >
          Volver al menú
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-lg px-4 py-8 sm:py-12">
      <div className="mb-8 space-y-2">
        <p className="font-sans text-[11px] uppercase tracking-[0.28em] text-shimai-gold/80">
          Checkout
        </p>
        <h1 className="font-serif text-4xl text-shimai-ivory">
          {step === 1 ? "Tus datos" : "Pago"}
        </h1>
        <div className="flex gap-2 pt-2">
          <span
            className={cn(
              "h-px w-10",
              step === 1 ? "bg-shimai-gold" : "bg-shimai-ivory/20",
            )}
          />
          <span
            className={cn(
              "h-px w-10",
              step === 2 ? "bg-shimai-gold" : "bg-shimai-ivory/20",
            )}
          />
        </div>
      </div>

      {outOfCoverage ? (
        <div
          className="mb-4 border border-seal-red bg-shimai-black px-4 py-3 font-sans text-sm text-shimai-ivory"
          role="alert"
        >
          <p className="font-medium text-seal-red">Sin cobertura</p>
          <p className="mt-1 text-shimai-ivory/90">
            {error ?? OUT_OF_COVERAGE_MESSAGE}
          </p>
        </div>
      ) : error ? (
        <p className="mb-4 border border-seal-red/40 bg-seal-red/10 px-3 py-2 font-sans text-sm text-shimai-ivory">
          {error}
        </p>
      ) : null}

      {step === 1 ? (
        <form onSubmit={goToPayment} className="space-y-4">
          <label className="block space-y-2">
            <span className="font-sans text-xs uppercase tracking-[0.16em] text-shimai-ivory/50">
              Nombre
            </span>
            <Input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Tu nombre"
              autoComplete="name"
              required
            />
          </label>
          <label className="block space-y-2">
            <span className="font-sans text-xs uppercase tracking-[0.16em] text-shimai-ivory/50">
              Teléfono
            </span>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="55..."
              inputMode="tel"
              autoComplete="tel"
              required
            />
          </label>
          <div className="space-y-2">
            <span className="font-sans text-xs uppercase tracking-[0.16em] text-shimai-ivory/50">
              Dirección de entrega
            </span>
            <AddressAutocomplete
              value={addressText}
              placeholder="Escribe calle y número…"
              onChangeText={(text) => {
                setAddressText(text);
                setDeliveryLat(null);
                setDeliveryLng(null);
                setQuote({ status: "idle" });
                setOutOfCoverage(false);
                setError(null);
              }}
              onSelect={(place) => {
                setAddressText(place.label);
                setDeliveryLat(place.lat);
                setDeliveryLng(place.lng);
                setOutOfCoverage(false);
                setError(null);
              }}
            />
            {quote.status === "loading" ? (
              <p className="font-sans text-xs text-shimai-ivory/40">
                Calculando cobertura…
              </p>
            ) : null}
            {quote.status === "ok" ? (
              <p className="font-sans text-xs text-shimai-gold/90">
                Envío estimado {formatMxn(quote.deliveryFee)} (lo confirma el
                servidor al pagar)
              </p>
            ) : null}
            {quote.status === "idle" ? (
              <p className="font-sans text-xs text-shimai-ivory/40">
                Elige una sugerencia del autocompletado para validar tu zona.
              </p>
            ) : null}
          </div>
          <label className="block space-y-2">
            <span className="font-sans text-xs uppercase tracking-[0.16em] text-shimai-ivory/50">
              Referencias
            </span>
            <Input
              value={references}
              onChange={(e) => setReferences(e.target.value)}
              placeholder="Color de fachada, piso, etc."
            />
          </label>
          <label className="block space-y-2">
            <span className="font-sans text-xs uppercase tracking-[0.16em] text-shimai-ivory/50">
              Notas para la cocina
            </span>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Sin wasabi, timbre roto..."
            />
          </label>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="mt-4 w-full"
            disabled={outOfCoverage || quote.status !== "ok"}
          >
            Continuar al pago
          </Button>
          <Link
            href="/"
            className="block text-center font-sans text-sm text-shimai-ivory/45 hover:text-shimai-gold"
          >
            Volver al menú
          </Link>
        </form>
      ) : (
        <div className="space-y-3">
          <p className="mb-4 font-sans text-sm text-shimai-ivory/55">
            El total y la tarifa de envío los confirma el servidor. Elige cómo
            quieres pagar.
          </p>

          {enabledMethods.map((method) => {
            const copy = METHOD_COPY[method];
            return (
              <button
                key={method}
                type="button"
                disabled={pending || paymentBlocked}
                onClick={() => void placeOrder(method)}
                className={cn(
                  "w-full border px-4 py-4 text-left transition-colors",
                  "border-shimai-gold/30 bg-shimai-surface/70 hover:border-shimai-gold hover:bg-shimai-gold/10",
                  "disabled:cursor-not-allowed disabled:opacity-50",
                )}
              >
                <p className="font-serif text-xl text-shimai-gold">
                  {copy.title}
                </p>
                <p className="mt-1 font-sans text-xs text-shimai-ivory/50">
                  {copy.description}
                </p>
              </button>
            );
          })}

          <Button
            type="button"
            variant="ghost"
            className="w-full"
            disabled={pending}
            onClick={() => setStep(1)}
          >
            Volver a datos
          </Button>

          {pending ? (
            <p className="text-center font-sans text-xs text-shimai-gold/80">
              Preparando tu orden…
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}
