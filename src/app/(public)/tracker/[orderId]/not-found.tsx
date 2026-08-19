import Link from "next/link";

export default function TrackerNotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-shimai-black px-4 text-center">
      <p className="font-serif text-3xl text-shimai-ivory">Pedido no encontrado</p>
      <p className="mt-3 max-w-sm font-sans text-sm text-shimai-ivory/55">
        No encontramos este pedido. Revisa el enlace desde tu confirmación o
        contacta a la cocina con tu número de orden.
      </p>
      <Link
        href="/"
        className="mt-8 inline-flex h-11 items-center border border-shimai-gold px-5 font-sans text-sm text-shimai-ivory hover:bg-shimai-gold/10"
      >
        Volver al menú
      </Link>
    </main>
  );
}
