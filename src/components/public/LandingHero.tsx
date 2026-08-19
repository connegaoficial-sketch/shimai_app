"use client";

import { ShimaiHeroLogo } from "@/components/public/ShimaiHeroLogo";
import { shimaiBrand } from "@/lib/brand/shimai";

export function LandingHero() {
  const scrollToMenu = () => {
    document.getElementById("menu")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section
      aria-labelledby="hero-heading"
      className="relative overflow-hidden border-b border-white/[0.05]"
    >
      {/* Ambient light — gold warmth from above, sakura whisper below */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,rgba(201,164,92,0.18),transparent_60%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-[radial-gradient(ellipse_60%_40%_at_50%_100%,rgba(232,165,181,0.06),transparent_70%)]"
      />

      <div className="relative mx-auto flex max-w-6xl flex-col items-center px-4 py-12 text-center sm:px-6 sm:py-16 md:py-20">
        <div className="animate-shimai-fade-up w-full max-w-4xl">
          <ShimaiHeroLogo className="mx-auto" />
        </div>

        <div
          className="animate-shimai-fade-up mt-8 max-w-lg space-y-4"
          style={{ animationDelay: "80ms" }}
        >
          <p
            id="hero-heading"
            className="sr-only"
          >
            {shimaiBrand.name} {shimaiBrand.tagline}
          </p>
          <p className="font-sans text-sm leading-relaxed text-shimai-ivory/60">
            {shimaiBrand.description}
          </p>
        </div>

        <div
          className="animate-shimai-fade-up mt-10 flex flex-col items-center gap-4 sm:flex-row"
          style={{ animationDelay: "160ms" }}
        >
          <button
            type="button"
            onClick={scrollToMenu}
            className="group relative h-12 min-w-[200px] overflow-hidden border border-shimai-gold bg-shimai-gold px-8 font-sans text-sm font-medium tracking-wide text-shimai-black transition-colors hover:bg-shimai-gold/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-shimai-gold/60 focus-visible:ring-offset-2 focus-visible:ring-offset-shimai-black"
          >
            Ver menú
          </button>
          <p className="font-sans text-[11px] uppercase tracking-[0.22em] text-shimai-gold/60">
            Dark kitchen · Entrega a domicilio
          </p>
        </div>
      </div>
    </section>
  );
}
