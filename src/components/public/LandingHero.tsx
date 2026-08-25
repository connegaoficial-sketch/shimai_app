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
            {shimaiBrand.heroHeadline}
          </h1>
          <p className="font-sans text-sm leading-relaxed text-shimai-ivory/60 sm:text-[15px]">
            {shimaiBrand.heroSupport}
          </p>
        </div>

        <div
          className="animate-shimai-fade-up mt-9 flex flex-col items-center gap-3"
          style={{ animationDelay: "200ms" }}
        >
          <span className="shimai-glow-border shimai-glow-border--square">
            <button
              type="button"
              onClick={scrollToMenu}
              className="h-11 px-8 font-sans text-sm font-medium tracking-wide border border-shimai-gold bg-shimai-gold text-shimai-black transition-[transform,background-color] duration-150 ease-out hover:bg-shimai-gold/90 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-shimai-gold/60 focus-visible:ring-offset-2 focus-visible:ring-offset-shimai-black sm:h-12 sm:px-10"
            >
              {shimaiBrand.primaryCta}
            </button>
          </span>
          <p className="max-w-xs font-sans text-xs leading-relaxed text-shimai-ivory/40">
            {shimaiBrand.operations.zonesDetail} ·{" "}
            {shimaiBrand.operations.hoursDetail}
          </p>
        </div>
      </div>
    </section>
  );
}
