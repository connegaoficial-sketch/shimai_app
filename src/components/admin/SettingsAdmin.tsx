"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { updateSetting } from "@/app/(admin)/admin/(panel)/settings/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type {
  BankDetailsSetting,
  DeliveryConfigSetting,
  DeliveryZone,
  PaymentMethodsSetting,
} from "@/types/database";

type SettingsAdminProps = {
  paymentMethods: PaymentMethodsSetting;
  bankDetails: BankDetailsSetting;
  deliveryConfig: DeliveryConfigSetting;
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
}: SettingsAdminProps) {
  const router = useRouter();
  const [payments, setPayments] = useState(initialPayments);
  const [bank, setBank] = useState(initialBank);
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
    key: "payment_methods" | "bank_details" | "delivery_config",
    value: PaymentMethodsSetting | BankDetailsSetting | DeliveryConfigSetting,
  ) {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await updateSetting(key, value);
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
          Métodos de pago, banco y zonas de envío
        </p>
      </div>

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
              className="grid grid-cols-[1fr_1fr_auto] items-end gap-2"
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
