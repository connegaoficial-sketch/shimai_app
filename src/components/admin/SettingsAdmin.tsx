"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { updateSetting } from "@/app/(admin)/admin/(panel)/settings/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type {
  BankDetailsSetting,
  DeliveryConfigSetting,
  DeliveryZone,
  PaymentMethodsSetting,
  WhatsAppContactSetting,
} from "@/types/database";
import type { Json } from "@/types/database";
import {
  WEEKDAY_OPTIONS,
  formatHoursDetail,
  type OrderingScheduleSetting,
} from "@/lib/ordering/schedule";
import {
  toSistersStoryPayload,
  type SistersStorySetting,
} from "@/lib/sisters/sisters";

type SettingsAdminProps = {
  paymentMethods: PaymentMethodsSetting;
  bankDetails: BankDetailsSetting;
  deliveryConfig: DeliveryConfigSetting;
  whatsappContact: WhatsAppContactSetting;
  orderingSchedule: OrderingScheduleSetting;
  sistersStory: SistersStorySetting;
};

type ZoneDraft = {
  radius_km: string;
  fee: string;
};

function toZoneDrafts(zones: DeliveryZone[]): ZoneDraft[] {
  return zones.map((z) => ({
    radius_km: String(z.radius_km),
    fee: String(z.fee),
  }));
}

export function SettingsAdmin({
  paymentMethods: initialPayments,
  bankDetails: initialBank,
  deliveryConfig: initialDelivery,
  whatsappContact: initialWhatsApp,
  orderingSchedule: initialOrdering,
  sistersStory: initialSisters,
}: SettingsAdminProps) {
  const router = useRouter();
  const [payments, setPayments] = useState(initialPayments);
  const [bank, setBank] = useState(initialBank);
  const [whatsappPhone, setWhatsappPhone] = useState(initialWhatsApp.phone);
  const [ordering, setOrdering] = useState(initialOrdering);
  const [sistersStory, setSistersStory] = useState(initialSisters);
  const [kitchenLat, setKitchenLat] = useState(
    String(initialDelivery.kitchen_coordinates.lat),
  );
  const [kitchenLng, setKitchenLng] = useState(
    String(initialDelivery.kitchen_coordinates.lng),
  );
  const [maxRadius, setMaxRadius] = useState(
    String(initialDelivery.max_radius_km),
  );
  const [zones, setZones] = useState<ZoneDraft[]>(
    toZoneDrafts(initialDelivery.zones),
  );
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function save(
    key:
      | "payment_methods"
      | "bank_details"
      | "delivery_config"
      | "whatsapp_contact"
      | "ordering_schedule"
      | "sisters_story",
    value:
      | PaymentMethodsSetting
      | BankDetailsSetting
      | DeliveryConfigSetting
      | WhatsAppContactSetting
      | OrderingScheduleSetting
      | Record<string, unknown>,
  ) {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await updateSetting(key, value as Json);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setMessage("Guardado.");
      router.refresh();
    });
  }

  function saveDelivery() {
    const lat = Number(kitchenLat);
    const lng = Number(kitchenLng);
    const max_radius_km = Number(maxRadius);

    if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
      setError("Latitud de cocina inválida.");
      return;
    }
    if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
      setError("Longitud de cocina inválida.");
      return;
    }
    if (!Number.isFinite(max_radius_km) || max_radius_km <= 0) {
      setError("max_radius_km inválido.");
      return;
    }

    const parsedZones: DeliveryZone[] = [];
    for (const zone of zones) {
      const radius_km = Number(zone.radius_km);
      const fee = Number(zone.fee);
      if (!Number.isFinite(radius_km) || radius_km <= 0) {
        setError("Cada zona necesita un radius_km > 0.");
        return;
      }
      if (!Number.isFinite(fee) || fee < 0) {
        setError("Cada zona necesita un fee ≥ 0.");
        return;
      }
      parsedZones.push({ radius_km, fee });
    }

    if (parsedZones.length === 0) {
      setError("Agrega al menos una zona de cobertura.");
      return;
    }

    parsedZones.sort((a, b) => a.radius_km - b.radius_km);
    const largest = parsedZones[parsedZones.length - 1]!.radius_km;
    if (max_radius_km < largest) {
      setError("max_radius_km debe ser ≥ al radio más grande de las zonas.");
      return;
    }

    save("delivery_config", {
      kitchen_coordinates: { lat, lng },
      zones: parsedZones,
      max_radius_km,
    });
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="font-serif text-2xl text-shimai-ivory">Configuración</h1>
        <p className="mt-1 font-sans text-sm text-shimai-ivory/50">
          Horario de pedidos, pagos, banco, WhatsApp, historia y zonas
        </p>
      </div>

      <section className="space-y-4 rounded-md border border-white/[0.08] p-4 sm:p-5">
        <h2 className="font-sans text-sm font-medium uppercase tracking-[0.14em] text-shimai-gold">
          Horario · días cerrados
        </h2>
        <p className="font-sans text-xs text-shimai-ivory/45">
          Marca los días en que la web no acepta pedidos (hora Ciudad de
          México). Lo que guardes aquí se refleja en la página pública: banner,
          botones y texto de horario.
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {WEEKDAY_OPTIONS.map(({ value, label }) => {
            const checked = ordering.closed_weekdays.includes(value);
            return (
              <label
                key={value}
                className="flex cursor-pointer items-center gap-3 border border-white/[0.06] px-3 py-2.5"
              >
                <input
                  type="checkbox"
                  className="size-4 accent-shimai-gold"
                  checked={checked}
                  onChange={(e) => {
                    setOrdering((prev) => {
                      const next = e.target.checked
                        ? [...prev.closed_weekdays, value]
                        : prev.closed_weekdays.filter((d) => d !== value);
                      return {
                        ...prev,
                        closed_weekdays: [...new Set(next)].sort(
                          (a, b) => a - b,
                        ),
                      };
                    });
                  }}
                />
                <span className="font-sans text-sm text-shimai-ivory">
                  {label}
                </span>
              </label>
            );
          })}
        </div>
        <p className="rounded-sm border border-white/[0.06] bg-white/[0.03] px-3 py-2 font-sans text-xs leading-relaxed text-shimai-ivory/55">
          Así se lee en la web:{" "}
          <span className="text-shimai-ivory">
            {formatHoursDetail(ordering.closed_weekdays)}
          </span>
        </p>
        <div className="flex items-center justify-between gap-4 border-t border-white/[0.06] pt-3">
          <div>
            <Label htmlFor="force_closed">Cerrar pedidos ahora</Label>
            <p className="mt-0.5 font-sans text-xs text-shimai-ivory/40">
              Override manual, sin importar el día.
            </p>
          </div>
          <Switch
            id="force_closed"
            checked={ordering.force_closed}
            onCheckedChange={(checked) =>
              setOrdering((prev) => ({ ...prev, force_closed: checked }))
            }
            label="Cerrar pedidos ahora"
          />
        </div>
        <Button
          disabled={pending}
          onClick={() =>
            save("ordering_schedule", {
              timezone: ordering.timezone || "America/Mexico_City",
              closed_weekdays: ordering.closed_weekdays,
              force_closed: ordering.force_closed,
            })
          }
        >
          Guardar días cerrados
        </Button>
      </section>

      <section className="space-y-4 rounded-md border border-white/[0.08] p-4 sm:p-5">
        <h2 className="font-sans text-sm font-medium uppercase tracking-[0.14em] text-shimai-gold">
          Hermanas (Ane · Imōto · Futari)
        </h2>
        <p className="font-sans text-xs text-shimai-ivory/45">
          Textos de la sección pública. Los acentos de color (oro / sakura) se
          mantienen por hermana.
        </p>
        <div className="space-y-2">
          <Label htmlFor="sisters_heading">Título de la sección</Label>
          <Input
            id="sisters_heading"
            value={sistersStory.heading}
            onChange={(e) =>
              setSistersStory((prev) => ({
                ...prev,
                heading: e.target.value,
              }))
            }
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="sisters_support">Texto de apoyo</Label>
          <Textarea
            id="sisters_support"
            value={sistersStory.support}
            onChange={(e) =>
              setSistersStory((prev) => ({
                ...prev,
                support: e.target.value,
              }))
            }
            rows={3}
          />
        </div>
        <div className="space-y-5">
          {sistersStory.sisters.map((sister, index) => (
            <div
              key={sister.key}
              className="space-y-3 border border-white/[0.06] p-3 sm:p-4"
            >
              <p className="font-sans text-[10px] uppercase tracking-[0.18em] text-shimai-gold/80">
                {sister.key === "ane"
                  ? "Ane"
                  : sister.key === "imoto"
                    ? "Imōto"
                    : "Futari"}
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor={`sister_label_${sister.key}`}>Nombre</Label>
                  <Input
                    id={`sister_label_${sister.key}`}
                    value={sister.label}
                    onChange={(e) => {
                      const value = e.target.value;
                      setSistersStory((prev) => {
                        const sisters = [...prev.sisters];
                        sisters[index] = {
                          ...sisters[index]!,
                          label: value,
                        };
                        return { ...prev, sisters };
                      });
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`sister_subtitle_${sister.key}`}>
                    Subtítulo
                  </Label>
                  <Input
                    id={`sister_subtitle_${sister.key}`}
                    value={sister.subtitle}
                    onChange={(e) => {
                      const value = e.target.value;
                      setSistersStory((prev) => {
                        const sisters = [...prev.sisters];
                        sisters[index] = {
                          ...sisters[index]!,
                          subtitle: value,
                        };
                        return { ...prev, sisters };
                      });
                    }}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor={`sister_desc_${sister.key}`}>Descripción</Label>
                <Textarea
                  id={`sister_desc_${sister.key}`}
                  value={sister.description}
                  onChange={(e) => {
                    const value = e.target.value;
                    setSistersStory((prev) => {
                      const sisters = [...prev.sisters];
                      sisters[index] = {
                        ...sisters[index]!,
                        description: value,
                      };
                      return { ...prev, sisters };
                    });
                  }}
                  rows={3}
                />
              </div>
            </div>
          ))}
        </div>
        <Button
          disabled={pending}
          onClick={() =>
            save("sisters_story", toSistersStoryPayload(sistersStory))
          }
        >
          Guardar hermanas
        </Button>
      </section>

      <section className="space-y-4 rounded-md border border-white/[0.08] p-4 sm:p-5">
        <h2 className="font-sans text-sm font-medium uppercase tracking-[0.14em] text-shimai-gold">
          Métodos de pago
        </h2>
        {(
          [
            ["card_online", "Tarjeta online"],
            ["cash", "Efectivo"],
            ["bank_transfer", "Transferencia"],
            ["card_terminal", "Terminal"],
          ] as const
        ).map(([key, label]) => (
          <div
            key={key}
            className="flex items-center justify-between gap-4 border-t border-white/[0.06] pt-3 first:border-t-0 first:pt-0"
          >
            <Label htmlFor={key}>{label}</Label>
            <Switch
              id={key}
              checked={payments[key]}
              onCheckedChange={(checked) =>
                setPayments((prev) => ({ ...prev, [key]: checked }))
              }
              label={label}
            />
          </div>
        ))}
        <Button
          disabled={pending}
          onClick={() => save("payment_methods", payments)}
        >
          Guardar métodos
        </Button>
      </section>

      <section className="space-y-4 rounded-md border border-white/[0.08] p-4 sm:p-5">
        <h2 className="font-sans text-sm font-medium uppercase tracking-[0.14em] text-shimai-gold">
          Datos bancarios
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="bank_name">Banco</Label>
            <Input
              id="bank_name"
              value={bank.bank_name}
              onChange={(e) =>
                setBank((p) => ({ ...p, bank_name: e.target.value }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="clabe">CLABE</Label>
            <Input
              id="clabe"
              value={bank.clabe}
              onChange={(e) =>
                setBank((p) => ({ ...p, clabe: e.target.value }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="account_number">Número de cuenta</Label>
            <Input
              id="account_number"
              value={bank.account_number}
              onChange={(e) =>
                setBank((p) => ({ ...p, account_number: e.target.value }))
              }
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="holder_name">Titular</Label>
            <Input
              id="holder_name"
              value={bank.holder_name}
              onChange={(e) =>
                setBank((p) => ({ ...p, holder_name: e.target.value }))
              }
            />
          </div>
        </div>
        <Button disabled={pending} onClick={() => save("bank_details", bank)}>
          Guardar banco
        </Button>
      </section>

      <section className="space-y-4 rounded-md border border-white/[0.08] p-4 sm:p-5">
        <h2 className="font-sans text-sm font-medium uppercase tracking-[0.14em] text-shimai-gold">
          WhatsApp
        </h2>
        <p className="font-sans text-xs text-shimai-ivory/45">
          Se muestra en la landing y en confirmaciones de transferencia para
          pedidos y comprobantes.
        </p>
        <div className="space-y-2">
          <Label htmlFor="whatsapp_phone">Número de WhatsApp</Label>
          <Input
            id="whatsapp_phone"
            value={whatsappPhone}
            onChange={(e) => setWhatsappPhone(e.target.value)}
            placeholder="487 123 4567"
            inputMode="tel"
            autoComplete="tel"
          />
          <p className="font-sans text-xs text-shimai-ivory/40">
            10 dígitos locales (Rioverde) o con lada +52. Ejemplo: 4871234567
          </p>
        </div>
        <Button
          disabled={pending}
          onClick={() => save("whatsapp_contact", { phone: whatsappPhone.trim() })}
        >
          Guardar WhatsApp
        </Button>
      </section>


      <section className="space-y-4 rounded-md border border-white/[0.08] p-4 sm:p-5">
        <h2 className="font-sans text-sm font-medium uppercase tracking-[0.14em] text-shimai-gold">
          Dark Kitchen · zonas
        </h2>
        <p className="font-sans text-xs text-shimai-ivory/45">
          Coordenadas origen y anillos de cobertura (radio km → fee). El fee
          final siempre lo calcula el backend.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="kitchen_lat">Latitud cocina</Label>
            <Input
              id="kitchen_lat"
              type="number"
              step="any"
              value={kitchenLat}
              onChange={(e) => setKitchenLat(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="kitchen_lng">Longitud cocina</Label>
            <Input
              id="kitchen_lng"
              type="number"
              step="any"
              value={kitchenLng}
              onChange={(e) => setKitchenLng(e.target.value)}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="max_radius_km">Radio máximo (km)</Label>
            <Input
              id="max_radius_km"
              type="number"
              min="0"
              step="0.1"
              value={maxRadius}
              onChange={(e) => setMaxRadius(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="font-sans text-xs uppercase tracking-[0.14em] text-shimai-ivory/50">
              Zonas
            </p>
            <Button
              size="sm"
              variant="outline"
              type="button"
              onClick={() =>
                setZones((prev) => [...prev, { radius_km: "", fee: "" }])
              }
            >
              Agregar zona
            </Button>
          </div>

          {zones.map((zone, index) => (
            <div
              key={`zone-${index}`}
              className="grid grid-cols-1 items-end gap-2 sm:grid-cols-[1fr_1fr_auto]"
            >
              <div className="space-y-2">
                <Label htmlFor={`radius-${index}`}>Radio km</Label>
                <Input
                  id={`radius-${index}`}
                  type="number"
                  min="0"
                  step="0.1"
                  value={zone.radius_km}
                  onChange={(e) =>
                    setZones((prev) =>
                      prev.map((row, i) =>
                        i === index
                          ? { ...row, radius_km: e.target.value }
                          : row,
                      ),
                    )
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`fee-${index}`}>Fee MXN</Label>
                <Input
                  id={`fee-${index}`}
                  type="number"
                  min="0"
                  step="0.01"
                  value={zone.fee}
                  onChange={(e) =>
                    setZones((prev) =>
                      prev.map((row, i) =>
                        i === index ? { ...row, fee: e.target.value } : row,
                      ),
                    )
                  }
                />
              </div>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={zones.length <= 1}
                onClick={() =>
                  setZones((prev) => prev.filter((_, i) => i !== index))
                }
              >
                Quitar
              </Button>
            </div>
          ))}
        </div>

        <Button disabled={pending} onClick={saveDelivery}>
          Guardar envío
        </Button>
      </section>

      {error ? (
        <p className="font-sans text-sm text-seal-red" role="alert">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="font-sans text-sm text-shimai-gold">{message}</p>
      ) : null}
    </div>
  );
}
