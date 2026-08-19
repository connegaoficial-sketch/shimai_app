"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { CheckoutOrderSummary } from "@/components/public/CheckoutOrderSummary";
import { DeliveryLocationPicker } from "@/components/public/DeliveryLocationPicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { storeCheckoutResult } from "@/lib/checkout-session";
import {
  clearSavedCheckoutProfile,
  readSavedCheckoutProfile,
  writeSavedCheckoutProfile,
} from "@/lib/checkout/saved-profile";
import { OUT_OF_COVERAGE_MESSAGE } from "@/lib/delivery/zones";
import { formatMxn } from "@/lib/format";
import type { MenuProduct } from "@/lib/menu/get-menu-data";
import {
  formatPromoValue,
  previewCheckoutTotals,
  PROMO_CODE_STORAGE_KEY,
  type Promo,
} from "@/lib/promos/promos";
import { CheckoutError, requestCheckout } from "@/lib/stripe";
import { cn } from "@/lib/utils";
import { useCartStore } from "@/stores/cartStore";
import type { PaymentMethod, PaymentMethodsSetting } from "@/types";

type CheckoutClientProps = {
  paymentMethods: PaymentMethodsSetting;
  supabaseUrl: string;
  anonKey: string;
  products: MenuProduct[];
  prefill?: {
    fullName?: string | null;
    phone?: string | null;
  };
  promos?: Promo[];
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
    description:
      "Una vez recibamos tu transferencia, las hermanas preparan tu pedido con el mismo cuidado de siempre. Suele confirmarse en poco tiempo en horario de cocina.",
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
  products,
  prefill,
  promos = [],
}: CheckoutClientProps) {
  const router = useRouter();
  const items = useCartStore((s) => s.items);
  const clearCart = useCartStore((s) => s.clear);
  const [step, setStep] = useState<1 | 2>(1);
  const [fullName, setFullName] = useState(prefill?.fullName ?? "");
  const [phone, setPhone] = useState(prefill?.phone ?? "");
  const [addressText, setAddressText] = useState("");
  const [streetNumber, setStreetNumber] = useState("");
  const [deliveryLat, setDeliveryLat] = useState<number | null>(null);
  const [deliveryLng, setDeliveryLng] = useState<number | null>(null);
  const [quote, setQuote] = useState<DeliveryQuoteState>({ status: "idle" });
  const [references, setReferences] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [outOfCoverage, setOutOfCoverage] = useState(false);
  const [pending, setPending] = useState(false);
  const [rememberDetails, setRememberDetails] = useState(true);
  const [usingSavedAddress, setUsingSavedAddress] = useState(false);
  const [promoCode, setPromoCode] = useState("");

  useEffect(() => {
    const saved = readSavedCheckoutProfile();
    if (!saved) return;

    if (!prefill?.fullName?.trim()) {
      setFullName(saved.fullName);
    }
    if (!prefill?.phone?.trim()) {
      setPhone(saved.phone);
    }

    setAddressText(saved.addressText);
    setStreetNumber(saved.streetNumber);
    setDeliveryLat(saved.deliveryLat);
    setDeliveryLng(saved.deliveryLng);
    setReferences(saved.references);
    setUsingSavedAddress(true);
  }, [prefill?.fullName, prefill?.phone]);

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(PROMO_CODE_STORAGE_KEY);
      if (stored) setPromoCode(stored);
    } catch {
      /* ignore */
    }
  }, []);

  const enabledMethods = useMemo(() => {
    return (Object.keys(METHOD_COPY) as PaymentMethod[]).filter(
      (method) => paymentMethods[method],
    );
  }, [paymentMethods]);

  const productMap = useMemo(
    () => new Map(products.map((product) => [product.id, product])),
    [products],
  );

  const summary = useMemo(() => {
    const lines = items.map((item) => {
      const product = productMap.get(item.productId);
      const unitPrice = product ? Number(product.price) : 0;
      return {
        id: item.productId,
        name: product?.name ?? "Producto",
        quantity: item.quantity,
        lineTotal: unitPrice * item.quantity,
      };
    });
    const subtotal = lines.reduce((sum, line) => sum + line.lineTotal, 0);
    const deliveryFee = quote.status === "ok" ? quote.deliveryFee : null;
    const preview = previewCheckoutTotals({
      subtotal,
      deliveryFee,
      promos,
      promoCode,
    });

    return { lines, subtotal, ...preview };
  }, [items, productMap, promoCode, promos, quote]);

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

  function saveProfileForNextOrder() {
    if (!rememberDetails) {
      clearSavedCheckoutProfile();
      return;
    }
    if (deliveryLat == null || deliveryLng == null) return;

    writeSavedCheckoutProfile({
      fullName: fullName.trim(),
      phone: phone.trim(),
      addressText: addressText.trim(),
      streetNumber: streetNumber.trim(),
      deliveryLat,
      deliveryLng,
      references: references.trim(),
    });
  }

  function clearSavedAddress() {
    clearSavedCheckoutProfile();
    setAddressText("");
    setStreetNumber("");
    setDeliveryLat(null);
    setDeliveryLng(null);
    setReferences("");
    setQuote({ status: "idle" });
    setOutOfCoverage(false);
    setUsingSavedAddress(false);
    setError(null);
  }

  function startNewAddress() {
    setAddressText("");
    setStreetNumber("");
    setDeliveryLat(null);
    setDeliveryLng(null);
    setReferences("");
    setQuote({ status: "idle" });
    setOutOfCoverage(false);
    setUsingSavedAddress(false);
    setError(null);
  }

  function formatDeliveryAddress() {
    const street = addressText.trim();
    const number = streetNumber.trim();
    if (!number) return street;
    return `${street} ${number}`;
  }

  function goToPayment(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (!fullName.trim() || !phone.trim() || !addressText.trim()) {
      setError("Nombre, teléfono y dirección son obligatorios.");
      return;
    }
    if (deliveryLat == null || deliveryLng == null) {
      setError(
        "Confirma tu ubicación: elige una sugerencia o marca el pin en el mapa.",
      );
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
          delivery_address: formatDeliveryAddress(),
          delivery_lat: deliveryLat,
          delivery_lng: deliveryLng,
          promo_code: promoCode.trim() || null,
          success_url: `${origin}/confirmation?stripe=1`,
          cancel_url: `${origin}/checkout?cancelled=1`,
        },
      });

      storeCheckoutResult({
        ...result,
        customer_name: fullName.trim(),
      });
      saveProfileForNextOrder();
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

      {summary.lines.length > 0 ? (
        <div className="mb-6">
          <CheckoutOrderSummary
            lines={summary.lines}
            subtotal={summary.subtotal}
            deliveryFee={summary.deliveryFee}
            discount={summary.discount}
            promoLabel={summary.promoLabel}
            total={summary.total}
            couponInvalid={summary.couponInvalid}
          />
        </div>
      ) : null}

      {step === 1 ? (
        <form onSubmit={goToPayment} className="space-y-4">
          {usingSavedAddress ? (
            <div className="rounded-md border border-shimai-gold/25 bg-shimai-gold/10 px-4 py-3">
              <p className="font-sans text-sm text-shimai-ivory/85">
                ¡Hola de nuevo! Usamos tu última dirección. ¿Algo cambió? Puedes
                editarla aquí.
              </p>
              <div className="mt-3 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={startNewAddress}
                  className="font-sans text-xs text-shimai-gold underline-offset-2 hover:underline"
                >
                  Usar otra dirección
                </button>
                <button
                  type="button"
                  onClick={clearSavedAddress}
                  className="font-sans text-xs text-shimai-ivory/45 underline-offset-2 hover:text-shimai-ivory/70 hover:underline"
                >
                  Borrar datos guardados
                </button>
              </div>
            </div>
          ) : null}

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
            <DeliveryLocationPicker
              addressText={addressText}
              streetNumber={streetNumber}
              hasCoordinates={deliveryLat != null && deliveryLng != null}
              onAddressTextChange={(text) => {
                setAddressText(text);
                setUsingSavedAddress(false);
              }}
              onStreetNumberChange={setStreetNumber}
              onLocationClear={() => {
                setDeliveryLat(null);
                setDeliveryLng(null);
                setQuote({ status: "idle" });
                setOutOfCoverage(false);
                setUsingSavedAddress(false);
              }}
              onLocationSelect={(location) => {
                setAddressText(location.label);
                setDeliveryLat(location.lat);
                setDeliveryLng(location.lng);
                setOutOfCoverage(false);
                setError(null);
                setUsingSavedAddress(false);
              }}
            />
            {quote.status === "loading" ? (
              <p className="font-sans text-xs text-shimai-ivory/40">
                Calculando cobertura…
              </p>
            ) : null}
            {quote.status === "ok" ? (
              <p className="font-sans text-xs text-shimai-gold/90">
                Zona confirmada. El envío ya está en el total de arriba.
              </p>
            ) : null}
            {quote.status === "idle" ? (
              <p className="font-sans text-xs text-shimai-ivory/40">
                Elige una sugerencia o confirma tu pin en el mapa para validar
                tu zona.
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

          <label className="flex cursor-pointer items-start gap-3 rounded-md border border-white/[0.06] px-3 py-3">
            <input
              type="checkbox"
              checked={rememberDetails}
              onChange={(e) => setRememberDetails(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-shimai-gold"
            />
            <span className="font-sans text-sm leading-relaxed text-shimai-ivory/70">
              Recordar mis datos en este dispositivo para pedir más rápido la
              próxima vez.
              <span className="mt-1 block text-xs text-shimai-ivory/40">
                Se guardan solo en este celular o computadora.
              </span>
            </span>
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
            Elige cómo quieres pagar {summary.total != null ? formatMxn(summary.total) : "tu pedido"}.
          </p>

          {promos.length > 0 ? (
            <div className="mb-4 space-y-3 border border-white/[0.06] px-4 py-4">
              <p className="font-sans text-[10px] uppercase tracking-[0.2em] text-shimai-gold/80">
                Oferta de la casa
              </p>
              {promos.map((promo) => (
                <p
                  key={promo.id}
                  className="font-sans text-xs leading-relaxed text-shimai-ivory/55"
                >
                  {promo.title || formatPromoValue(promo)}
                  {promo.type === "first_order"
                    ? " · se aplica sola en tu primera compra"
                    : ""}
                </p>
              ))}
              <label className="block space-y-2">
                <span className="font-sans text-xs uppercase tracking-[0.16em] text-shimai-ivory/50">
                  Código de cupón
                </span>
                <Input
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                  placeholder="Opcional"
                  autoComplete="off"
                />
              </label>
            </div>
          ) : (
            <label className="mb-4 block space-y-2">
              <span className="font-sans text-xs uppercase tracking-[0.16em] text-shimai-ivory/50">
                Código de cupón
              </span>
              <Input
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                placeholder="Opcional"
                autoComplete="off"
              />
            </label>
          )}

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
