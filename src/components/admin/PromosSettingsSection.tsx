"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  emptyPromo,
  formatPromoValue as formatPromoLabel,
  type Promo,
  type PromoType,
  type PromoValueType,
  type PromosSetting,
} from "@/lib/promos/promos";

type ProductOption = {
  id: string;
  name: string;
  categoryName: string;
};

type PromosSettingsSectionProps = {
  promos: PromosSetting;
  products: ProductOption[];
  pending: boolean;
  /** Increment after a successful save to collapse all cards. */
  collapseToken?: number;
  onChange: (next: PromosSetting) => void;
  onSave: () => void;
};

const TYPE_LABELS: Record<PromoType, string> = {
  first_order: "Primera compra",
  coupon: "Cupón",
  free_delivery: "Envío gratis",
  bogo_free: "2×1 (cobras el más caro)",
  bogo_half: "El 2º al % (más barato)",
};

function isBogo(type: PromoType): boolean {
  return type === "bogo_free" || type === "bogo_half";
}

function summaryLine(promo: Promo): string {
  const bits = [
    TYPE_LABELS[promo.type],
    promo.active ? "activa" : "inactiva",
    promo.title.trim() || null,
    isBogo(promo.type)
      ? `${promo.product_ids.length} producto${promo.product_ids.length === 1 ? "" : "s"}`
      : null,
  ].filter(Boolean);
  return bits.join(" · ");
}

export function PromosSettingsSection({
  promos,
  products,
  pending,
  collapseToken = 0,
  onChange,
  onSave,
}: PromosSettingsSectionProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    if (collapseToken === 0) return;
    setExpandedIds(new Set());
  }, [collapseToken]);

  function updateItem(id: string, patch: Partial<Promo>) {
    onChange({
      items: promos.items.map((item) =>
        item.id === id ? { ...item, ...patch } : item,
      ),
    });
  }

  function toggleProduct(promoId: string, productId: string, checked: boolean) {
    const promo = promos.items.find((item) => item.id === promoId);
    if (!promo) return;
    const nextIds = checked
      ? [...new Set([...promo.product_ids, productId])]
      : promo.product_ids.filter((id) => id !== productId);
    updateItem(promoId, { product_ids: nextIds });
  }

  function toggleExpanded(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function expandOnly(id: string) {
    setExpandedIds(new Set([id]));
  }

  function addPromo() {
    const promo = emptyPromo();
    onChange({ items: [...promos.items, promo] });
    setExpandedIds((prev) => new Set(prev).add(promo.id));
  }

  function collapseAll() {
    setExpandedIds(new Set());
  }

  function expandAll() {
    setExpandedIds(new Set(promos.items.map((item) => item.id)));
  }

  return (
    <section className="space-y-4 rounded-md border border-white/[0.08] p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-sans text-sm font-medium uppercase tracking-[0.14em] text-shimai-gold">
            Reglas y productos
          </h2>
          <p className="mt-1 max-w-xl font-sans text-xs text-shimai-ivory/45">
            El descuento real siempre lo calcula el servidor. 2×1 cobra el de
            mayor precio; “2º al %” descuenta ese porcentaje del más barato de
            cada par. Al guardar, las promos se colapsan para revisar sin
            amontonar.
          </p>
        </div>
        {promos.items.length > 1 ? (
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="ghost" onClick={expandAll}>
              Expandir todas
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={collapseAll}
            >
              Colapsar todas
            </Button>
          </div>
        ) : null}
      </div>

      {promos.items.length === 0 ? (
        <p className="font-sans text-sm text-shimai-ivory/45">
          No hay promociones. Agrega una para mostrarla en la landing.
        </p>
      ) : (
        <div className="space-y-3">
          {promos.items.map((promo, index) => {
            const expanded = expandedIds.has(promo.id);
            return (
              <article
                key={promo.id}
                className="border border-white/[0.06] p-3 sm:p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => toggleExpanded(promo.id)}
                    className="min-w-0 flex-1 text-left"
                    aria-expanded={expanded}
                  >
                    <p className="font-sans text-xs uppercase tracking-[0.16em] text-shimai-ivory/50">
                      Promo {index + 1}
                      {promo.active
                        ? ` · ${formatPromoLabel(promo)}`
                        : " · inactiva"}
                    </p>
                    <p className="mt-1 truncate font-sans text-sm text-shimai-ivory">
                      {promo.title.trim() || TYPE_LABELS[promo.type]}
                    </p>
                    {!expanded ? (
                      <p className="mt-0.5 truncate font-sans text-[11px] text-shimai-ivory/40">
                        {summaryLine(promo)}
                      </p>
                    ) : null}
                  </button>
                  <div className="flex shrink-0 items-center gap-2">
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
                      variant="outline"
                      onClick={() =>
                        expanded
                          ? toggleExpanded(promo.id)
                          : expandOnly(promo.id)
                      }
                    >
                      {expanded ? "Colapsar" : "Expandir"}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        onChange({
                          items: promos.items.filter(
                            (item) => item.id !== promo.id,
                          ),
                        })
                      }
                    >
                      Quitar
                    </Button>
                  </div>
                </div>

                {expanded ? (
                  <div className="mt-4 space-y-3 border-t border-white/[0.06] pt-4">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-2 sm:col-span-2">
                        <Label htmlFor={`title-${promo.id}`}>Título</Label>
                        <Input
                          id={`title-${promo.id}`}
                          value={promo.title}
                          onChange={(e) =>
                            updateItem(promo.id, { title: e.target.value })
                          }
                          placeholder="2×1 en rolls seleccionados"
                        />
                      </div>
                      <div className="space-y-2 sm:col-span-2">
                        <Label htmlFor={`subtitle-${promo.id}`}>
                          Subtítulo
                        </Label>
                        <Input
                          id={`subtitle-${promo.id}`}
                          value={promo.subtitle}
                          onChange={(e) =>
                            updateItem(promo.id, { subtitle: e.target.value })
                          }
                          placeholder="Se cobra el de mayor precio"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`type-${promo.id}`}>Tipo</Label>
                        <select
                          id={`type-${promo.id}`}
                          value={promo.type}
                          onChange={(e) => {
                            const type = e.target.value as PromoType;
                            updateItem(promo.id, {
                              type,
                              value:
                                type === "bogo_half"
                                  ? promo.value || 50
                                  : type === "bogo_free"
                                    ? 0
                                    : promo.value || 10,
                            });
                          }}
                          className="h-10 w-full border border-white/10 bg-shimai-black px-3 font-sans text-sm text-shimai-ivory"
                        >
                          {(Object.keys(TYPE_LABELS) as PromoType[]).map(
                            (type) => (
                              <option key={type} value={type}>
                                {TYPE_LABELS[type]}
                              </option>
                            ),
                          )}
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

                      {promo.type === "bogo_half" ? (
                        <div className="space-y-2">
                          <Label htmlFor={`half-${promo.id}`}>
                            % del 2º (el más barato)
                          </Label>
                          <Input
                            id={`half-${promo.id}`}
                            type="number"
                            min="1"
                            max="100"
                            step="1"
                            value={String(promo.value || 50)}
                            onChange={(e) =>
                              updateItem(promo.id, {
                                value: Number(e.target.value) || 50,
                              })
                            }
                          />
                        </div>
                      ) : null}

                      {promo.type !== "free_delivery" &&
                      !isBogo(promo.type) ? (
                        <>
                          <div className="space-y-2">
                            <Label htmlFor={`value-type-${promo.id}`}>
                              Descuento
                            </Label>
                            <select
                              id={`value-type-${promo.id}`}
                              value={promo.value_type}
                              onChange={(e) =>
                                updateItem(promo.id, {
                                  value_type: e.target
                                    .value as PromoValueType,
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
                              {promo.value_type === "percent"
                                ? "Porcentaje"
                                : "Monto"}
                            </Label>
                            <Input
                              id={`value-${promo.id}`}
                              type="number"
                              min="0"
                              step={
                                promo.value_type === "percent" ? "1" : "0.01"
                              }
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
                        <Label htmlFor={`min-${promo.id}`}>
                          Mínimo de pedido (MXN)
                        </Label>
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
                        <Label htmlFor={`start-${promo.id}`}>
                          Desde (opcional)
                        </Label>
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
                        <Label htmlFor={`end-${promo.id}`}>
                          Hasta (opcional)
                        </Label>
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

                    {isBogo(promo.type) ? (
                      <div className="space-y-2 border-t border-white/[0.06] pt-3">
                        <Label>Productos en la promo</Label>
                        <p className="font-sans text-[11px] text-shimai-ivory/40">
                          Marca sushi, bebidas o lo que aplique. Sin productos
                          seleccionados, la promo no descuenta.
                        </p>
                        {products.length === 0 ? (
                          <p className="font-sans text-xs text-shimai-ivory/45">
                            No hay productos en el menú todavía.
                          </p>
                        ) : (
                          <div className="max-h-48 space-y-1 overflow-y-auto border border-white/[0.06] p-2">
                            {products.map((product) => {
                              const checked = promo.product_ids.includes(
                                product.id,
                              );
                              return (
                                <label
                                  key={product.id}
                                  className="flex cursor-pointer items-start gap-2 px-1 py-1.5 hover:bg-white/[0.03]"
                                >
                                  <input
                                    type="checkbox"
                                    className="mt-0.5 size-4 accent-shimai-gold"
                                    checked={checked}
                                    onChange={(e) =>
                                      toggleProduct(
                                        promo.id,
                                        product.id,
                                        e.target.checked,
                                      )
                                    }
                                  />
                                  <span className="min-w-0 font-sans text-xs leading-snug text-shimai-ivory">
                                    <span className="block truncate">
                                      {product.name}
                                    </span>
                                    <span className="text-shimai-ivory/35">
                                      {product.categoryName}
                                    </span>
                                  </span>
                                </label>
                              );
                            })}
                          </div>
                        )}
                        <p className="font-sans text-[11px] text-shimai-ivory/40">
                          {promo.product_ids.length} seleccionado
                          {promo.product_ids.length === 1 ? "" : "s"}
                        </p>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" onClick={addPromo}>
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
