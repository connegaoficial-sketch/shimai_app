"use client";

import { useEffect, useState } from "react";

function askWaitingWorkerToActivate(worker: ServiceWorker) {
  worker.postMessage({ type: "SKIP_WAITING" });
  worker.postMessage({ action: "skipWaiting" });
}

export function PwaUpdateToast() {
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(
    null,
  );

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") return;

    let cancelled = false;
    let refreshing = false;

    const onControllerChange = () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    };

    navigator.serviceWorker.addEventListener(
      "controllerchange",
      onControllerChange,
    );

    async function watch(registration: ServiceWorkerRegistration) {
      const track = (worker: ServiceWorker | null) => {
        if (!worker) return;
        worker.addEventListener("statechange", () => {
          if (
            worker.state === "installed" &&
            navigator.serviceWorker.controller &&
            !cancelled
          ) {
            setWaitingWorker(worker);
          }
        });
      };

      if (registration.waiting && navigator.serviceWorker.controller) {
        setWaitingWorker(registration.waiting);
      }

      track(registration.installing);
      registration.addEventListener("updatefound", () => {
        track(registration.installing);
      });

      const check = () => {
        void registration.update().catch(() => undefined);
      };

      check();
      const interval = window.setInterval(check, 5 * 60 * 1000);
      const onVisible = () => {
        if (document.visibilityState === "visible") check();
      };
      document.addEventListener("visibilitychange", onVisible);

      return () => {
        window.clearInterval(interval);
        document.removeEventListener("visibilitychange", onVisible);
      };
    }

    let teardownWatch: (() => void) | undefined;

    void navigator.serviceWorker.ready
      .then((registration) => {
        if (cancelled) return;
        return watch(registration);
      })
      .then((cleanup) => {
        teardownWatch = cleanup;
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
      teardownWatch?.();
      navigator.serviceWorker.removeEventListener(
        "controllerchange",
        onControllerChange,
      );
    };
  }, []);

  if (!waitingWorker) return null;

  return (
    <button
      type="button"
      onClick={() => askWaitingWorkerToActivate(waitingWorker)}
      className="fixed bottom-[max(1rem,env(safe-area-inset-bottom,0px))] right-3 z-[70] w-64 max-w-[calc(100vw-1.5rem)] animate-shimai-toast-in border border-shimai-gold/30 bg-shimai-black/95 px-3 py-2.5 text-left shadow-[0_12px_32px_rgba(0,0,0,0.45)] backdrop-blur-md sm:bottom-5 sm:right-5"
    >
      <p className="font-sans text-[9px] uppercase tracking-[0.18em] text-shimai-gold/80">
        SHIMAI
      </p>
      <p className="mt-0.5 font-serif text-[15px] leading-snug text-shimai-ivory">
        La app se actualizó
      </p>
      <p className="mt-1 font-sans text-[11px] leading-snug text-shimai-ivory/60">
        Toca para cargar la nueva versión
      </p>
    </button>
  );
}
