"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { updatePromosSetting } from "@/app/(admin)/admin/(panel)/promos/actions";
import { PromosSettingsSection } from "@/components/admin/PromosSettingsSection";
import type { PromosSetting } from "@/lib/promos/promos";
import type { Json } from "@/types/database";

type PromosAdminProps = {
  promos: PromosSetting;
  products: { id: string; name: string; categoryName: string }[];
};

export function PromosAdmin({
  promos: initialPromos,
  products,
}: PromosAdminProps) {
  const router = useRouter();
  const [promos, setPromos] = useState(initialPromos);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [collapseToken, setCollapseToken] = useState(0);

  function save() {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await updatePromosSetting(promos as unknown as Json);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setMessage("Promociones guardadas.");
      setCollapseToken((token) => token + 1);
      router.refresh();
    });
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <div>
        <h1 className="font-serif text-3xl text-shimai-ivory">Promociones</h1>
        <p className="mt-2 max-w-xl font-sans text-sm text-shimai-ivory/50">
          Activa 2×1, segundo al %, cupones, primera compra o envío gratis.
          El descuento real siempre lo calcula el servidor al cotizar y cobrar.
        </p>
      </div>

      <PromosSettingsSection
        promos={promos}
        products={products}
        pending={pending}
        collapseToken={collapseToken}
        onChange={setPromos}
        onSave={save}
      />

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
