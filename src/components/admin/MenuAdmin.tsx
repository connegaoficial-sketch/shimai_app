"use client";

import Image from "next/image";
import { useMemo, useState, useTransition } from "react";

import {
  deleteProduct,
  upsertProduct,
  type ProductInput,
} from "@/app/(admin)/admin/(panel)/menu/actions";
import { CategoriesAdmin } from "@/components/admin/CategoriesAdmin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { formatMxn } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";
import type { Category, Product } from "@/types/database";

const BUCKET = "shimai-products";

type MenuAdminProps = {
  products: Product[];
  categories: Category[];
};

type FormState = {
  id?: string;
  name: string;
  description: string;
  price: string;
  category_id: string;
  is_available: boolean;
  is_signature: boolean;
  image_url: string | null;
};

const EMPTY_FORM: FormState = {
  name: "",
  description: "",
  price: "",
  category_id: "",
  is_available: true,
  is_signature: false,
  image_url: null,
};

export function MenuAdmin({ products, categories }: MenuAdminProps) {
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [pending, startTransition] = useTransition();

  const categoryName = useMemo(() => {
    const map = new Map(categories.map((c) => [c.id, c.name]));
    return (id: string) => map.get(id) ?? "—";
  }, [categories]);

  const productCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const product of products) {
      counts[product.category_id] = (counts[product.category_id] ?? 0) + 1;
    }
    return counts;
  }, [products]);

  const filtered = products.filter((p) =>
    categoryFilter === "all" ? true : p.category_id === categoryFilter,
  );

  function openCreate() {
    setForm({
      ...EMPTY_FORM,
      category_id: categories[0]?.id ?? "",
    });
    setError(null);
    setFormOpen(true);
  }

  function openEdit(product: Product) {
    setForm({
      id: product.id,
      name: product.name,
      description: product.description ?? "",
      price: String(product.price),
      category_id: product.category_id,
      is_available: product.is_available,
      is_signature: product.is_signature,
      image_url: product.image_url,
    });
    setError(null);
    setFormOpen(true);
  }

  async function onUpload(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type,
        });
      if (uploadError) {
        setError(uploadError.message);
        return;
      }
      const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
      setForm((prev) => ({ ...prev, image_url: data.publicUrl }));
    } finally {
      setUploading(false);
    }
  }

  function onSubmit() {
    setError(null);
    const price = Number(form.price);
    const input: ProductInput = {
      id: form.id,
      name: form.name,
      description: form.description,
      price,
      category_id: form.category_id,
      is_available: form.is_available,
      is_signature: form.is_signature,
      image_url: form.image_url,
    };

    startTransition(async () => {
      const result = await upsertProduct(input);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setFormOpen(false);
      setForm(EMPTY_FORM);
    });
  }

  function onDelete(productId: string) {
    if (!window.confirm("¿Eliminar este producto?")) return;
    startTransition(async () => {
      const result = await deleteProduct(productId);
      if (!result.ok) {
        setError(result.error);
      }
    });
  }

  return (
    <div className="space-y-10">
      <div>
        <h1 className="font-serif text-2xl text-shimai-ivory">Menú</h1>
        <p className="mt-1 font-sans text-sm text-shimai-ivory/50">
          Categorías, productos y disponibilidad
        </p>
      </div>

      <CategoriesAdmin categories={categories} productCounts={productCounts} />

      <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-serif text-xl text-shimai-ivory">Productos</h2>
          <p className="mt-1 font-sans text-sm text-shimai-ivory/50">
            Piezas de cada grupo
          </p>
        </div>
        <Button onClick={openCreate} disabled={categories.length === 0}>
          Nuevo producto
        </Button>
      </div>
      {categories.length === 0 ? (
        <p className="font-sans text-sm text-shimai-ivory/45">
          Crea una categoría antes de agregar productos.
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <Label htmlFor="category-filter" className="sr-only">
          Filtrar categoría
        </Label>
        <select
          id="category-filter"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="h-10 rounded-md border border-shimai-ivory/15 bg-shimai-surface px-3 font-sans text-sm text-shimai-ivory"
        >
          <option value="all">Todas las categorías</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <span className="font-sans text-xs text-shimai-ivory/40">
          {filtered.length} productos
        </span>
      </div>

      <div className="overflow-x-auto rounded-md border border-white/[0.08]">
        <table className="min-w-full border-collapse text-left font-sans text-sm">
          <thead className="bg-shimai-surface/80 text-[11px] uppercase tracking-[0.12em] text-shimai-ivory/50">
            <tr>
              <th className="px-3 py-3 font-medium">Nombre</th>
              <th className="px-3 py-3 font-medium">Categoría</th>
              <th className="px-3 py-3 font-medium">Precio</th>
              <th className="px-3 py-3 font-medium">Disponible</th>
              <th className="px-3 py-3 font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((product) => (
              <tr
                key={product.id}
                className="border-t border-white/[0.06] hover:bg-white/[0.02]"
              >
                <td className="px-3 py-3">
                  <div className="flex items-center gap-3">
                    {product.image_url ? (
                      <Image
                        src={product.image_url}
                        alt=""
                        width={40}
                        height={40}
                        className="h-10 w-10 rounded object-cover"
                      />
                    ) : (
                      <span className="flex h-10 w-10 items-center justify-center rounded bg-shimai-surface text-[10px] text-shimai-ivory/30">
                        —
                      </span>
                    )}
                    <div>
                      <p className="text-shimai-ivory">{product.name}</p>
                      {product.is_signature ? (
                        <p className="text-[11px] text-shimai-gold">
                          Destacado del grupo
                        </p>
                      ) : null}
                    </div>
                  </div>
                </td>
                <td className="px-3 py-3 text-shimai-ivory/70">
                  {categoryName(product.category_id)}
                </td>
                <td className="px-3 py-3 text-shimai-gold">
                  {formatMxn(Number(product.price))}
                </td>
                <td className="px-3 py-3">
                  <span
                    className={
                      product.is_available
                        ? "text-shimai-ivory/80"
                        : "text-seal-red"
                    }
                  >
                    {product.is_available ? "Sí" : "No"}
                  </span>
                </td>
                <td className="px-3 py-3">
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openEdit(product)}
                    >
                      Editar
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={pending}
                      onClick={() => onDelete(product.id)}
                    >
                      Eliminar
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {formOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center animate-shimai-backdrop-in">
          <div className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-md border border-white/[0.1] bg-shimai-black p-5 shadow-xl animate-shimai-fade-up">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-serif text-xl text-shimai-ivory">
                {form.id ? "Editar producto" : "Nuevo producto"}
              </h2>
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
                <Label htmlFor="name">Nombre</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, name: e.target.value }))
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Descripción</Label>
                <Textarea
                  id="description"
                  value={form.description}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, description: e.target.value }))
                  }
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="price">Precio (MXN)</Label>
                  <Input
                    id="price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.price}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, price: e.target.value }))
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category_id">Categoría</Label>
                  <select
                    id="category_id"
                    value={form.category_id}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, category_id: e.target.value }))
                    }
                    className="flex h-12 w-full rounded-md border border-shimai-ivory/15 bg-shimai-surface px-4 font-sans text-sm text-shimai-ivory"
                    required
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-between gap-4 rounded-md border border-white/[0.08] px-3 py-3">
                <Label htmlFor="is_available">Disponible</Label>
                <Switch
                  id="is_available"
                  checked={form.is_available}
                  onCheckedChange={(checked) =>
                    setForm((p) => ({ ...p, is_available: checked }))
                  }
                  label="Disponible"
                />
              </div>
              <div className="flex items-start justify-between gap-4 rounded-md border border-white/[0.08] px-3 py-3">
                <div className="min-w-0">
                  <Label htmlFor="is_signature">Destacado de este grupo</Label>
                  <p className="mt-1 font-sans text-xs leading-relaxed text-shimai-ivory/45">
                    Se muestra grande al abrir la categoría. Si activas otro de
                    este grupo, este deja de ser el destacado.
                  </p>
                </div>
                <Switch
                  id="is_signature"
                  checked={form.is_signature}
                  onCheckedChange={(checked) =>
                    setForm((p) => ({ ...p, is_signature: checked }))
                  }
                  label="Destacado de este grupo"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="image">Imagen</Label>
                <Input
                  id="image"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  disabled={uploading || pending}
                  onChange={(e) => void onUpload(e.target.files?.[0])}
                />
                {form.image_url ? (
                  <div className="relative mt-2 h-32 w-full overflow-hidden rounded border border-white/[0.08]">
                    <Image
                      src={form.image_url}
                      alt="Preview"
                      fill
                      className="object-cover"
                    />
                  </div>
                ) : null}
              </div>

              {error ? (
                <p className="font-sans text-sm text-seal-red" role="alert">
                  {error}
                </p>
              ) : null}

              <Button
                className="w-full"
                disabled={pending || uploading}
                onClick={onSubmit}
              >
                {pending ? "Guardando…" : "Guardar"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
      </div>
    </div>
  );
}
