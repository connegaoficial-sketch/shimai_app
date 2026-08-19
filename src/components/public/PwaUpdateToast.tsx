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
      className="fixed inset-x-4 bottom-6 z-[70] mx-auto max-w-sm animate-shimai-toast-in border border-shimai-gold/30 bg-shimai-black/95 px-4 py-3 text-left shadow-[0_16px_48px_rgba(0,0,0,0.45)] backdrop-blur-md sm:inset-x-auto sm:bottom-auto sm:right-6 sm:top-24 sm:w-[22rem]"
    >
      <p className="font-sans text-[10px] uppercase tracking-[0.22em] text-shimai-gold/80">
        SHIMAI
      </p>
      <p className="mt-1 font-serif text-xl text-shimai-ivory">
        La app se actualizó
      </p>
      <p className="mt-1 font-sans text-sm text-shimai-ivory/60">
        Toca aquí para cargar la nueva versión.
      </p>
    </button>
  );
}
