"use client";

import { ShimaiHeroLogo } from "@/components/public/ShimaiHeroLogo";
import { useOrderingGate } from "@/components/public/OrderingGate";
import { Button } from "@/components/ui/button";
import { shimaiBrand } from "@/lib/brand/shimai";

export function LandingHero() {
  const { acceptingOrders, headline, hoursDetail } = useOrderingGate();

  const scrollToMenu = () => {
    document.getElementById("menu")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section
      aria-labelledby="hero-heading"
      className="relative overflow-hidden border-b border-white/[0.05]"
    >
      {/* Full-bleed cinematic stage — logo/video owns the first plane */}
      <div className="relative w-full">
        <ShimaiHeroLogo />
        {/* Soft fade from cinema into copy so the stage never ends with a hard cut */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-shimai-black via-shimai-black/70 to-transparent sm:h-32"
        />
      </div>

      <div className="relative mx-auto flex max-w-6xl flex-col items-center px-4 pb-12 pt-2 text-center sm:px-6 sm:pb-16 md:pb-20">
        <div
          className="animate-shimai-fade-up max-w-md space-y-3"
          style={{ animationDelay: "120ms" }}
        >
          <h1
            id="hero-heading"
            className="font-serif text-3xl leading-tight tracking-tight text-balance text-shimai-ivory sm:text-4xl md:text-[2.75rem]"
          >
            {acceptingOrders ? shimaiBrand.heroHeadline : headline}
          </h1>
          <p className="font-sans text-sm leading-relaxed text-shimai-ivory/60 sm:text-[15px]">
            {acceptingOrders
              ? shimaiBrand.heroSupport
              : "Puedes mirar la carta con calma. Los pedidos vuelven con el siguiente día de cocina."}
          </p>
        </div>

        <div
          className="animate-shimai-fade-up mt-9 flex flex-col items-center gap-3"
          style={{ animationDelay: "200ms" }}
        >
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
          <p className="max-w-xs font-sans text-xs leading-relaxed text-shimai-ivory/40">
            {shimaiBrand.operations.zonesDetail} · {hoursDetail}
          </p>
        </div>
      </div>
    </section>
  );
}
