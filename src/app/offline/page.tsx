/**
 * Minimal offline fallback for PWA service worker.
 */
export default function OfflinePage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
      <h1 className="font-serif text-2xl text-gold">Sin conexión</h1>
      <p className="max-w-sm text-sm text-ivory/70">
        SHIMAI no puede cargar ahora. Revisa tu red e intenta de nuevo.
      </p>
    </main>
  );
}
