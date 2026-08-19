"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  emptyPromo,
  formatPromoValue,
  type Promo,
  type PromoType,
  type PromoValueType,
  type PromosSetting,
} from "@/lib/promos/promos";

type PromosSettingsSectionProps = {
  promos: PromosSetting;
  pending: boolean;
  onChange: (next: PromosSetting) => void;
  onSave: () => void;
};

const TYPE_LABELS: Record<PromoType, string> = {
  first_order: "Primera compra",
  coupon: "Cupón",
  free_delivery: "Envío gratis",
};

export function PromosSettingsSection({
  promos,
  pending,
  onChange,
  onSave,
}: PromosSettingsSectionProps) {
  function updateItem(id: string, patch: Partial<Promo>) {
    onChange({
      items: promos.items.map((item) =>
        item.id === id ? { ...item, ...patch } : item,
      ),
    });
  }

  return (
    <section className="space-y-4 rounded-md border border-white/[0.08] p-4 sm:p-5">
      <div>
        <h2 className="font-sans text-sm font-medium uppercase tracking-[0.14em] text-shimai-gold">
          Promociones
        </h2>
        <p className="mt-1 font-sans text-xs text-shimai-ivory/45">
          Banner en la home y descuento real en checkout. Primera compra se
          aplica sola; el cupón requiere código; envío gratis puede combinarse.
        </p>
      </div>

      {promos.items.length === 0 ? (
        <p className="font-sans text-sm text-shimai-ivory/45">
          No hay promociones. Agrega una para mostrarla en la landing.
        </p>
      ) : (
        <div className="space-y-5">
          {promos.items.map((promo, index) => (
            <article
              key={promo.id}
              className="space-y-3 border border-white/[0.06] p-3 sm:p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="font-sans text-xs uppercase tracking-[0.16em] text-shimai-ivory/50">
                  Promo {index + 1}
                  {promo.active ? ` · ${formatPromoValue(promo)}` : " · inactiva"}
                </p>
                <div className="flex items-center gap-3">
                  <Switch
                    id={`promo-active-${promo.id}`}
                    checked={promo.active}
                    onCheckedChange={(checked) =>
                      updateItem(promo.id, { active: checked })
                    }
                    label="Activa"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      onChange({
                        items: promos.items.filter((item) => item.id !== promo.id),
                      })
                    }
                  >
                    Quitar
                  </Button>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor={`title-${promo.id}`}>Título</Label>
                  <Input
                    id={`title-${promo.id}`}
                    value={promo.title}
                    onChange={(e) =>
                      updateItem(promo.id, { title: e.target.value })
                    }
                    placeholder="Primera orden · 10% en tu pedido"
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor={`subtitle-${promo.id}`}>Subtítulo</Label>
                  <Input
                    id={`subtitle-${promo.id}`}
                    value={promo.subtitle}
                    onChange={(e) =>
                      updateItem(promo.id, { subtitle: e.target.value })
                    }
                    placeholder="Se aplica solo en tu primera compra"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`type-${promo.id}`}>Tipo</Label>
                  <select
                    id={`type-${promo.id}`}
                    value={promo.type}
                    onChange={(e) =>
                      updateItem(promo.id, {
                        type: e.target.value as PromoType,
                      })
                    }
                    className="h-10 w-full border border-white/10 bg-shimai-black px-3 font-sans text-sm text-shimai-ivory"
                  >
                    {(Object.keys(TYPE_LABELS) as PromoType[]).map((type) => (
                      <option key={type} value={type}>
                        {TYPE_LABELS[type]}
                      </option>
                    ))}
                  </select>
                </div>
                {promo.type === "coupon" ? (
                  <div className="space-y-2">
                    <Label htmlFor={`code-${promo.id}`}>Código</Label>
                    <Input
                      id={`code-${promo.id}`}
                      value={promo.code}
                      onChange={(e) =>
                        updateItem(promo.id, {
                          code: e.target.value.toUpperCase(),
                        })
                      }
                      placeholder="SHIMAI10"
                    />
                  </div>
                ) : (
                  <div />
                )}
                {promo.type !== "free_delivery" ? (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor={`value-type-${promo.id}`}>Descuento</Label>
                      <select
                        id={`value-type-${promo.id}`}
                        value={promo.value_type}
                        onChange={(e) =>
                          updateItem(promo.id, {
                            value_type: e.target.value as PromoValueType,
                          })
                        }
                        className="h-10 w-full border border-white/10 bg-shimai-black px-3 font-sans text-sm text-shimai-ivory"
                      >
                        <option value="percent">Porcentaje %</option>
                        <option value="fixed">Monto fijo MXN</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`value-${promo.id}`}>
                        {promo.value_type === "percent" ? "Porcentaje" : "Monto"}
                      </Label>
                      <Input
                        id={`value-${promo.id}`}
                        type="number"
                        min="0"
                        step={promo.value_type === "percent" ? "1" : "0.01"}
                        value={String(promo.value)}
                        onChange={(e) =>
                          updateItem(promo.id, {
                            value: Number(e.target.value) || 0,
                          })
                        }
                      />
                    </div>
                  </>
                ) : null}
                <div className="space-y-2">
                  <Label htmlFor={`min-${promo.id}`}>Mínimo de pedido (MXN)</Label>
                  <Input
                    id={`min-${promo.id}`}
                    type="number"
                    min="0"
                    step="1"
                    value={String(promo.min_subtotal)}
                    onChange={(e) =>
                      updateItem(promo.id, {
                        min_subtotal: Number(e.target.value) || 0,
                      })
                    }
                    placeholder="0 = sin mínimo"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`start-${promo.id}`}>Desde (opcional)</Label>
                  <Input
                    id={`start-${promo.id}`}
                    type="datetime-local"
                    value={toLocalInput(promo.starts_at)}
                    onChange={(e) =>
                      updateItem(promo.id, {
                        starts_at: fromLocalInput(e.target.value),
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`end-${promo.id}`}>Hasta (opcional)</Label>
                  <Input
                    id={`end-${promo.id}`}
                    type="datetime-local"
                    value={toLocalInput(promo.ends_at)}
                    onChange={(e) =>
                      updateItem(promo.id, {
                        ends_at: fromLocalInput(e.target.value),
                      })
                    }
                  />
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() =>
            onChange({ items: [...promos.items, emptyPromo()] })
          }
        >
          Agregar promo
        </Button>
        <Button disabled={pending} onClick={onSave}>
          Guardar promociones
        </Button>
      </div>
    </section>
  );
}

function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function fromLocalInput(value: string): string | null {
  if (!value.trim()) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}
