"use client";

import { useState, useTransition } from "react";

import {
  deleteCategory,
  moveCategory,
  upsertCategory,
} from "@/app/(admin)/admin/(panel)/menu/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { Category } from "@/types/database";

type CategoriesAdminProps = {
  categories: Category[];
  productCounts: Record<string, number>;
};

type CategoryForm = {
  id?: string;
  name: string;
  description: string;
  is_active: boolean;
};

const EMPTY: CategoryForm = {
  name: "",
  description: "",
  is_active: true,
};

export function CategoriesAdmin({
  categories,
  productCounts,
}: CategoriesAdminProps) {
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<CategoryForm>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function openCreate() {
    setForm(EMPTY);
    setError(null);
    setFormOpen(true);
  }

  function openEdit(category: Category) {
    setForm({
      id: category.id,
      name: category.name,
      description: category.description ?? "",
      is_active: category.is_active,
    });
    setError(null);
    setFormOpen(true);
  }

  function onSave() {
    setError(null);
    startTransition(async () => {
      const result = await upsertCategory({
        id: form.id,
        name: form.name,
        description: form.description,
        is_active: form.is_active,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setFormOpen(false);
      setForm(EMPTY);
    });
  }

  function onDelete(category: Category) {
    const count = productCounts[category.id] ?? 0;
    if (count > 0) {
      setError(
        `“${category.name}” tiene ${count} producto${count === 1 ? "" : "s"}. Muévelos o elimínalos antes de borrar el grupo.`,
      );
      return;
    }
    if (!window.confirm(`¿Eliminar la categoría “${category.name}”?`)) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteCategory(category.id);
      if (!result.ok) setError(result.error);
    });
  }

  function onMove(categoryId: string, direction: "up" | "down") {
    setError(null);
    startTransition(async () => {
      const result = await moveCategory(categoryId, direction);
      if (!result.ok) setError(result.error);
    });
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-serif text-xl text-shimai-ivory">Categorías</h2>
          <p className="mt-1 font-sans text-sm text-shimai-ivory/50">
            Grupos del menú. Todas se ven igual en la página: tabs, destacado y
            grilla.
          </p>
        </div>
        <Button onClick={openCreate}>Nueva categoría</Button>
      </div>

      {error ? (
        <p className="font-sans text-sm text-seal-red" role="alert">
          {error}
        </p>
      ) : null}

      <div className="overflow-x-auto rounded-md border border-white/[0.08]">
        <table className="min-w-full border-collapse text-left font-sans text-sm">
          <thead className="bg-shimai-surface/80 text-[11px] uppercase tracking-[0.12em] text-shimai-ivory/50">
            <tr>
              <th className="px-3 py-3 font-medium">Orden</th>
              <th className="px-3 py-3 font-medium">Nombre</th>
              <th className="px-3 py-3 font-medium">Visible</th>
              <th className="px-3 py-3 font-medium">Productos</th>
              <th className="px-3 py-3 font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {categories.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-3 py-8 text-center text-shimai-ivory/45"
                >
                  Aún no hay categorías. Crea la primera para armar el menú.
                </td>
              </tr>
            ) : (
              categories.map((category, index) => (
                <tr
                  key={category.id}
                  className="border-t border-white/[0.06] hover:bg-white/[0.02]"
                >
                  <td className="px-3 py-3">
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={pending || index === 0}
                        onClick={() => onMove(category.id, "up")}
                        aria-label={`Subir ${category.name}`}
                      >
                        ↑
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={pending || index === categories.length - 1}
                        onClick={() => onMove(category.id, "down")}
                        aria-label={`Bajar ${category.name}`}
                      >
                        ↓
                      </Button>
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <p className="text-shimai-ivory">{category.name}</p>
                    {category.description ? (
                      <p className="mt-0.5 max-w-xs truncate text-[11px] text-shimai-ivory/40">
                        {category.description}
                      </p>
                    ) : null}
                  </td>
                  <td className="px-3 py-3">
                    <span
                      className={
                        category.is_active
                          ? "text-shimai-ivory/80"
                          : "text-seal-red"
                      }
                    >
                      {category.is_active ? "Sí" : "Oculta"}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-shimai-ivory/70">
                    {productCounts[category.id] ?? 0}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEdit(category)}
                      >
                        Editar
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={pending}
                        onClick={() => onDelete(category)}
                      >
                        Eliminar
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {formOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center animate-shimai-backdrop-in">
          <div className="w-full max-w-lg rounded-md border border-white/[0.1] bg-shimai-black p-5 shadow-xl animate-shimai-fade-up">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-serif text-xl text-shimai-ivory">
                {form.id ? "Editar categoría" : "Nueva categoría"}
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setFormOpen(false)}
              >
                Cerrar
              </Button>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="category-name">Nombre</Label>
                <Input
                  id="category-name"
                  value={form.name}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="Ane, Imōto, Postres…"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category-description">Descripción</Label>
                <Textarea
                  id="category-description"
                  value={form.description}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  placeholder="Texto bajo el título al abrir este grupo."
                />
              </div>
              <div className="flex items-center justify-between gap-4 rounded-md border border-white/[0.08] px-3 py-3">
                <div>
                  <Label htmlFor="category-active">Visible en el menú</Label>
                  <p className="mt-1 font-sans text-xs text-shimai-ivory/45">
                    Si la ocultas, no aparece en la página pública.
                  </p>
                </div>
                <Switch
                  id="category-active"
                  checked={form.is_active}
                  onCheckedChange={(checked) =>
                    setForm((prev) => ({ ...prev, is_active: checked }))
                  }
                  label="Visible en el menú"
                />
              </div>

              {error ? (
                <p className="font-sans text-sm text-seal-red" role="alert">
                  {error}
                </p>
              ) : null}

              <Button
                className="w-full"
                disabled={pending}
                onClick={onSave}
              >
                {pending ? "Guardando…" : "Guardar"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
