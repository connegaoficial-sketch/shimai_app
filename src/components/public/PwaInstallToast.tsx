"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

const DISMISS_KEY = "shimai-pwa-install-dismissed";
const DISMISS_MS = 7 * 24 * 60 * 60 * 1000;

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isStandalone(): boolean {
  if (typeof window === "undefined") return true;
  const media = window.matchMedia("(display-mode: standalone)").matches;
  const iosStandalone =
    "standalone" in navigator &&
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
  return media || iosStandalone;
}

function isIosSafari(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const iOS = /iPad|iPhone|iPod/.test(ua);
  const webkit = /WebKit/.test(ua);
  const chromeIos = /CriOS|FxiOS|EdgiOS/.test(ua);
  return iOS && webkit && !chromeIos;
}

function wasDismissedRecently(): boolean {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    const at = Number(raw);
    if (!Number.isFinite(at)) return false;
    return Date.now() - at < DISMISS_MS;
  } catch {
    return false;
  }
}

function copyForPath(pathname: string): { title: string; body: string } {
  if (pathname.startsWith("/driver")) {
    return {
      title: "App de repartidor",
      body: "Recibe avisos de nuevos repartos al instante.",
    };
  }
  if (pathname.startsWith("/tracker")) {
    return {
      title: "Instala SHIMAI",
      body: "Sigue tu pedido y recibe avisos en camino.",
    };
  }
  return {
    title: "Descarga la app SHIMAI",
    body: "Más rápido desde tu inicio, como app nativa.",
  };
}

export function PwaInstallToast() {
  const pathname = usePathname() ?? "/";
  const [visible, setVisible] = useState(false);
  const [iosHint, setIosHint] = useState(false);
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null,
  );

  useEffect(() => {
    if (pathname.startsWith("/admin")) return;
    if (isStandalone()) return;
    if (wasDismissedRecently()) return;

    let cancelled = false;
    let showTimer: number | undefined;

    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      if (cancelled) return;
      setDeferred(event as BeforeInstallPromptEvent);
      setIosHint(false);
      window.clearTimeout(showTimer);
      showTimer = window.setTimeout(() => {
        if (!cancelled) setVisible(true);
      }, 1800);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);

    // iOS Safari never fires beforeinstallprompt — show add-to-home tip
    if (isIosSafari()) {
      setIosHint(true);
      showTimer = window.setTimeout(() => {
        if (!cancelled) setVisible(true);
      }, 2200);
    } else {
      // If Chrome never fires the event, still hint how to install
      showTimer = window.setTimeout(() => {
        if (!cancelled) setVisible(true);
      }, 4500);
    }

    return () => {
      cancelled = true;
      window.clearTimeout(showTimer);
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
    };
  }, [pathname]);

  function dismiss() {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      // ignore quota / private mode
    }
    setVisible(false);
  }

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    try {
      await deferred.userChoice;
    } catch {
      // ignore
    }
    setDeferred(null);
    dismiss();
  }

  if (!visible) return null;

  const copy = copyForPath(pathname);
  const canNativeInstall = Boolean(deferred) && !iosHint;

  return (
    <div
      role="dialog"
      aria-label="Instalar aplicación"
      className="fixed right-3 top-[max(0.75rem,env(safe-area-inset-top,0px))] z-[68] w-64 max-w-[calc(100vw-1.5rem)] animate-shimai-toast-in border border-shimai-gold/30 bg-shimai-black/95 px-3 py-2.5 shadow-[0_12px_32px_rgba(0,0,0,0.45)] backdrop-blur-md sm:right-5 sm:top-5"
    >
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="font-sans text-[9px] uppercase tracking-[0.18em] text-shimai-gold/80">
            App SHIMAI
          </p>
          <p className="mt-0.5 font-serif text-[15px] leading-snug text-shimai-ivory">
            {copy.title}
          </p>
          <p className="mt-1 font-sans text-[11px] leading-snug text-shimai-ivory/60">
            {iosHint
              ? "Safari: Compartir → Añadir a inicio."
              : canNativeInstall
                ? copy.body
                : `${copy.body} Chrome: ⋮ → Instalar.`}
          </p>
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Cerrar"
          className="shrink-0 font-sans text-base leading-none text-shimai-ivory/40 hover:text-shimai-ivory"
        >
          ×
        </button>
      </div>

      <div className="mt-2.5 flex gap-1.5">
        {canNativeInstall ? (
          <button
            type="button"
            onClick={() => void install()}
            className="inline-flex h-8 flex-1 items-center justify-center border border-shimai-gold bg-shimai-gold px-2 font-sans text-xs font-medium text-shimai-black hover:bg-shimai-gold/90"
          >
            Instalar
          </button>
        ) : null}
        <button
          type="button"
          onClick={dismiss}
          className="inline-flex h-8 flex-1 items-center justify-center border border-white/[0.12] px-2 font-sans text-xs text-shimai-ivory/70 hover:border-shimai-gold/40 hover:text-shimai-ivory"
        >
          Ahora no
        </button>
      </div>
    </div>
  );
}
