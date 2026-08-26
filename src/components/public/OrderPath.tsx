"use client";

import { useOrderingGate } from "@/components/public/OrderingGate";
import { Button } from "@/components/ui/button";
import { shimaiBrand } from "@/lib/brand/shimai";

const steps = [
  {
    title: "Empieza por lo que más piden",
    body: "Si no sabes qué ordenar, no hay drama: en cada grupo te marcamos lo que más piden. Ahí está el atajo.",
  },
  {
    title: "Arma tu pedido a tu ritmo",
    body: "Suma lo que se te antoje. Si te falta bebida o postre, el carrito te sugiere el siguiente paso.",
  },
  {
    title: "Paga como te acomode",
    body: `${shimaiBrand.operations.paymentsShort}. Confirmas y las hermanas preparan tu pedido.`,
  },
  {
    title: "Síguelo hasta tu casa",
    body: "Lo ves en tiempo real: cómo va en cocina y, cuando el repartidor sale, lo acompañas en el mapa.",
  },
] as const;

export function OrderPath() {
  const { acceptingOrders } = useOrderingGate();

  const scrollToMenu = () => {
    document.getElementById("menu")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section
      aria-labelledby="order-path-heading"
      className="bg-shimai-black"
    >
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-16">
        <header className="mx-auto max-w-xl text-center">
          <h2
            id="order-path-heading"
            className="font-serif text-3xl leading-tight text-shimai-ivory sm:text-4xl"
          >
            Del antojo a tu puerta
          </h2>
          <p className="mt-3 font-sans text-sm leading-relaxed text-shimai-ivory/50">
            Sin vueltas: eliges, pagas a tu modo y lo sigues hasta casa. Entrega
            en {shimaiBrand.operations.zonesShort.toLowerCase()}.
          </p>
        </header>

        <ol className="mt-10 grid gap-8 sm:grid-cols-2 sm:gap-x-10 sm:gap-y-12 lg:grid-cols-4">
          {steps.map((step, index) => (
            <li key={step.title} className="min-w-0">
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
          <Button
            type="button"
            size="lg"
            className="h-11 rounded-full px-8 sm:h-12 sm:px-10"
            onClick={scrollToMenu}
            glow={acceptingOrders}
            variant={acceptingOrders ? "primary" : "outline"}
          >
            {acceptingOrders ? shimaiBrand.primaryCta : "Ver la carta"}
          </Button>
        </div>
      </div>
    </section>
  );
}
