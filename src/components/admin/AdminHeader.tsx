"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

type AdminHeaderProps = {
  sisterName: string;
};

export function AdminHeader({ sisterName }: AdminHeaderProps) {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    setSigningOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/admin/login");
    router.refresh();
  }

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-white/[0.08] bg-shimai-black/95 px-4 sm:px-6">
      <div className="flex items-baseline gap-3">
        <span className="font-serif text-lg text-shimai-ivory sm:text-xl">
          SHIMAI
        </span>
        <span className="hidden font-sans text-xs text-shimai-ivory/50 sm:inline">
          Panel · {sisterName}
        </span>
      </div>
      <Button
        variant="ghost"
        size="sm"
        disabled={signingOut}
        onClick={() => void handleSignOut()}
      >
        {signingOut ? "Saliendo…" : "Cerrar sesión"}
      </Button>
    </header>
  );
}
