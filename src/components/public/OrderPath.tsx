"use client";

import { shimaiBrand } from "@/lib/brand/shimai";

const steps = [
  {
    title: "Empieza por lo que más piden",
    body: "No hace falta recorrer todo. En cada grupo te marcamos lo que más piden, por si no sabes qué ordenar.",
  },
  {
    title: "Arma tu mesa",
    body: "Suma lo que se te antoje. Si te falta bebida o postre, el carrito te sugiere el siguiente paso.",
  },
  {
    title: "Paga a tu modo",
    body: `${shimaiBrand.operations.paymentsShort}. Confirmas y las hermanas preparan tu pedido.`,
  },
  {
    title: "Sigue tu pedido",
    body: "Lo ves en tiempo real: cómo va en cocina y, cuando el repartidor va a tu casa, lo sigues en el mapa desde el tracker.",
  },
] as const;

export function OrderPath() {
  const scrollToMenu = () => {
    document.getElementById("menu")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section
      aria-labelledby="order-path-heading"
      className="border-y border-white/[0.05] bg-shimai-black"
    >
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-16">
        <header className="mx-auto max-w-xl text-center">
          <h2
            id="order-path-heading"
            className="font-serif text-3xl leading-tight text-shimai-ivory sm:text-4xl"
          >
            Pedir sin dar vueltas
          </h2>
          <p className="mt-3 font-sans text-sm leading-relaxed text-shimai-ivory/50">
            Del antojo al tracker. Entrega en{" "}
            {shimaiBrand.operations.zonesShort.toLowerCase()}.
          </p>
        </header>

        <ol className="mt-10 grid gap-px bg-white/[0.06] sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, index) => (
            <li
              key={step.title}
              className="bg-shimai-black px-6 py-8 sm:px-7 sm:py-9"
            >
              <span className="font-serif text-3xl text-shimai-gold/50">
                {index + 1}
              </span>
              <h3 className="mt-3 font-serif text-xl text-shimai-ivory">
                {step.title}
              </h3>
              <p className="mt-2 font-sans text-sm leading-relaxed text-shimai-ivory/50">
                {step.body}
              </p>
            </li>
          ))}
        </ol>

        <div className="mt-10 flex justify-center">
          <span className="shimai-glow-border shimai-glow-border--square">
            <button
              type="button"
              onClick={scrollToMenu}
              className="h-11 px-8 font-sans text-sm font-medium tracking-wide border border-shimai-gold bg-shimai-gold text-shimai-black transition-[transform,background-color] duration-150 ease-out hover:bg-shimai-gold/90 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-shimai-gold/60 focus-visible:ring-offset-2 focus-visible:ring-offset-shimai-black sm:h-12 sm:px-10"
            >
              {shimaiBrand.primaryCta}
            </button>
          </span>
        </div>
      </div>
    </section>
  );
}
