"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

type AdminHeaderProps = {
  sisterName: string;
};

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function AdminHeader({ sisterName }: AdminHeaderProps) {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);
  const [canInstall, setCanInstall] = useState(false);
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      Boolean((navigator as Navigator & { standalone?: boolean }).standalone);

    if (isStandalone) {
      setCanInstall(false);
      return;
    }

    setCanInstall(true);

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
    };
  }, []);

  async function handleInstall() {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      try {
        await deferredPrompt.userChoice;
      } catch {
        // ignore
      }
      setDeferredPrompt(null);
      setCanInstall(false);
      return;
    }

    // Fallback hints if browser has not fired beforeinstallprompt
    const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent);
    if (isIos) {
      window.alert(
        "Para instalar en iPhone/iPad:\n1. Toca el botón Compartir (icono cuadrado con flecha abajo).\n2. Elige 'Añadir a pantalla de inicio'.",
      );
    } else {
      window.alert(
        "Para instalar en Chrome/Edge:\nPulsa el icono de instalar en la barra de direcciones o abre el menú (⋮) y selecciona 'Instalar SHIMAI Admin'.",
      );
    }
  }

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

      <div className="flex items-center gap-2">
        {canInstall ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => void handleInstall()}
            className="border-shimai-gold/40 text-shimai-gold hover:bg-shimai-gold/15 text-xs font-medium"
            title="Instalar SHIMAI Admin como aplicación en tu pantalla de inicio"
          >
            <span>📲</span>
            <span className="hidden sm:inline">Descargar App</span>
            <span className="sm:hidden">App</span>
          </Button>
        ) : null}

        <Button
          variant="ghost"
          size="sm"
          disabled={signingOut}
          onClick={() => void handleSignOut()}
        >
          {signingOut ? "Saliendo…" : "Cerrar sesión"}
        </Button>
      </div>
    </header>
  );
}
