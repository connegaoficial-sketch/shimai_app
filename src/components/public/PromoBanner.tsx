"use client";

import { useEffect, useRef, useState } from "react";

import {
  formatPromoValue,
  PROMO_CODE_STORAGE_KEY,
  type Promo,
} from "@/lib/promos/promos";
import { cn } from "@/lib/utils";

const DISMISS_KEY = "shimai-promo-banner-hidden";

type PromoBannerProps = {
  promos: Promo[];
};

function readDismissed(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((id): id is string => typeof id === "string")
      : [];
  } catch {
    return [];
  }
}

export function PromoBanner({ promos }: PromoBannerProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [copied, setCopied] = useState(false);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const dismissed = new Set(readDismissed());
    setVisible(promos.some((promo) => !dismissed.has(promo.id)));
    setIndex(0);
  }, [promos]);

  const dismissed = new Set(readDismissed());
  const visiblePromos = promos.filter((promo) => !dismissed.has(promo.id));
  const canSwipe = visiblePromos.length > 1;

  useEffect(() => {
    const root = scrollerRef.current;
    if (!root || !canSwipe) return;

    const slides = root.querySelectorAll<HTMLElement>("[data-promo-slide]");
    const observer = new IntersectionObserver(
      (entries) => {
        const mostVisible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (!mostVisible) return;
        const next = Number(
          (mostVisible.target as HTMLElement).dataset.promoIndex,
        );
        if (Number.isFinite(next)) setIndex(next);
      },
      { root, threshold: [0.55, 0.75] },
    );

    slides.forEach((slide) => observer.observe(slide));
    return () => observer.disconnect();
  }, [canSwipe, visiblePromos.length]);

  if (!visible || visiblePromos.length === 0) return null;

  const active = visiblePromos[index] ?? visiblePromos[0]!;

  function dismiss() {
    const next = [...readDismissed(), ...promos.map((item) => item.id)];
    localStorage.setItem(DISMISS_KEY, JSON.stringify([...new Set(next)]));
    setVisible(false);
  }

  function scrollToIndex(nextIndex: number) {
    const root = scrollerRef.current;
    const slide = root?.querySelector<HTMLElement>(
      `[data-promo-index="${nextIndex}"]`,
    );
    if (!root || !slide) return;
    root.scrollTo({ left: slide.offsetLeft, behavior: "smooth" });
    setIndex(nextIndex);
  }

  function go(delta: number) {
    if (!canSwipe) return;
    const next =
      (index + delta + visiblePromos.length) % visiblePromos.length;
    scrollToIndex(next);
  }

  async function copyCode(promo: Promo) {
    if (promo.type !== "coupon" || !promo.code) return;
    try {
      await navigator.clipboard.writeText(promo.code);
      sessionStorage.setItem(PROMO_CODE_STORAGE_KEY, promo.code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      sessionStorage.setItem(PROMO_CODE_STORAGE_KEY, promo.code);
    }
  }

  function scrollToMenu(promo: Promo) {
    if (promo.type === "coupon" && promo.code) {
      sessionStorage.setItem(PROMO_CODE_STORAGE_KEY, promo.code);
    }
    document.getElementById("menu")?.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <section
      aria-label="Oferta de la casa"
      aria-roledescription={canSwipe ? "carrusel" : undefined}
      className="border-b border-shimai-gold/20 bg-shimai-black"
    >
      <div className="relative mx-auto max-w-6xl">
        <button
          type="button"
          onClick={dismiss}
          aria-label="Cerrar oferta"
          className="absolute right-2 top-2 z-10 grid h-11 w-11 place-items-center font-sans text-lg text-shimai-ivory/40 hover:text-shimai-ivory sm:right-4 sm:top-3"
        >
          ×
        </button>

        <div
          ref={scrollerRef}
          tabIndex={canSwipe ? 0 : undefined}
          onKeyDown={(event) => {
            if (event.key === "ArrowRight") {
              event.preventDefault();
              go(1);
            }
            if (event.key === "ArrowLeft") {
              event.preventDefault();
              go(-1);
            }
          }}
          className={cn(
            "flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain",
            "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
            canSwipe ? "cursor-grab active:cursor-grabbing" : null,
          )}
        >
          {visiblePromos.map((promo, i) => {
            const hasCode = promo.type === "coupon" && promo.code.length > 0;
            return (
              <article
                key={promo.id}
                data-promo-slide
                data-promo-index={i}
                className="w-full shrink-0 snap-start px-4 py-4 pr-12 sm:px-6 sm:py-5 sm:pr-16"
              >
                <p className="font-sans text-[10px] uppercase tracking-[0.28em] text-shimai-gold/80">
                  Oferta de la casa
                  {canSwipe ? (
                    <span className="ml-2 tracking-[0.16em] text-shimai-ivory/35">
                      {i + 1}/{visiblePromos.length}
                    </span>
                  ) : null}
                </p>
                <p className="mt-1 font-serif text-xl leading-tight text-shimai-ivory sm:text-2xl">
                  {promo.title || formatPromoValue(promo)}
                </p>
                <p className="mt-1 max-w-xl font-sans text-sm text-shimai-ivory/55">
                  {promo.subtitle || formatPromoValue(promo)}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {hasCode ? (
                    <button
                      type="button"
                      onClick={() => void copyCode(promo)}
                      className="h-11 px-1 font-sans text-[11px] uppercase tracking-[0.2em] text-shimai-gold transition-colors hover:text-shimai-ivory"
                    >
                      {copied && active.id === promo.id
                        ? "Código copiado"
                        : `Código ${promo.code} · Copiar`}
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => scrollToMenu(promo)}
                    className="h-11 border border-shimai-gold/40 px-4 font-sans text-[11px] uppercase tracking-[0.16em] text-shimai-ivory transition-colors hover:border-shimai-gold hover:text-shimai-gold"
                  >
                    Ver menú
                  </button>
                </div>
              </article>
            );
          })}
        </div>

        {canSwipe ? (
          <div className="flex items-center justify-between gap-2 px-2 pb-3 sm:px-4">
            <p className="pl-2 font-sans text-[10px] uppercase tracking-[0.18em] text-shimai-ivory/35 sm:hidden">
              Desliza para ver más
            </p>
            <div className="ml-auto flex items-center">
              <button
                type="button"
                onClick={() => go(-1)}
                aria-label="Oferta anterior"
                className="grid h-11 w-11 place-items-center text-shimai-ivory/55 transition-colors hover:text-shimai-gold"
              >
                ‹
              </button>
              <div className="flex items-center" role="tablist" aria-label="Ofertas">
                {visiblePromos.map((item, i) => (
                  <button
                    key={item.id}
                    type="button"
                    role="tab"
                    aria-selected={i === index}
                    aria-label={`Oferta ${i + 1} de ${visiblePromos.length}`}
                    onClick={() => scrollToIndex(i)}
                    className="grid h-11 w-11 place-items-center"
                  >
                    <span
                      className={cn(
                        "rounded-full transition-all",
                        i === index
                          ? "h-2 w-5 bg-shimai-gold"
                          : "h-2 w-2 bg-shimai-ivory/30",
                      )}
                    />
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => go(1)}
                aria-label="Oferta siguiente"
                className="grid h-11 w-11 place-items-center text-shimai-ivory/55 transition-colors hover:text-shimai-gold"
              >
                ›
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
