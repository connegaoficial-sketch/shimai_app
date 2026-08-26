/**
 * Brand theme tokens — single source for Shimai visual identity.
 * Franchise-ready: swap this config per location without touching components.
 *
 * Voice maxim: ~80% of frequent customers don't know what to order.
 * Every public string should reduce decision friction and suggest a start.
 */
export const shimaiBrand = {
  name: "SHIMAI",
  tagline: "Sushi House",
  motto: "Dos hermanas · Una historia · Un sabor",
  description:
    "Sushi de hermanas, a domicilio. Si no sabes qué pedir, ve por lo que más piden.",
  heroHeadline: "¿Qué se te antoja?",
  heroSupport:
    "Si no sabes, ve por lo que más piden. En unos 30 min llega a casa. Pagas como te acomode.",
  primaryCta: "Pedir ahora",
  /** Featured / “lo más pedido” primary action */
  featuredCta: "Lo quiero",
  /** Soft secondary lead for menu / empty states */
  undecidedLead:
    "Si no sabes por dónde empezar, ve por lo que más piden en cada grupo.",
  /** Label for signature / featured pieces (public UX, MX Spanish) */
  popularLabel: "Lo que más piden",
  popularShort: "Lo más pedido",
  logos: {
    /** Full lockup — hero, OG, print-style moments */
    full: "/logo_shimai.jpeg",
    /**
     * Hero static lockup — Lanczos 3× of `full` + soft oval alpha
     * (logo art unchanged; regenerate via `node scripts/upscale-hero-logo.mjs`).
     */
    heroFull: "/logo_shimai_hero_v2.png",
    /** Hero intro — plays once on page load, then static full lockup */
    heroAnimation: "/Shimai_Sushi_House_logo_animation_202608191427.mp4",
    /** Circular emblem — header, footer, favicon-adjacent */
    emblem: "/logo_shimai_2.jpeg",
  },
  operations: {
    hoursLabel: "10:00 – 22:00",
    /** Fallback only — public UI prefers OrderingStatus.hoursDetail from admin */
    hoursDetail: "De 10 am a 10 pm",
    deliveryEstimate: "Aprox. 30 min",
    deliveryDetail: "Tiempo aproximado de entrega",
    zonesShort: "Rioverde y alrededores",
    zonesDetail:
      "Rioverde, Ciudad Fernández, El Refugio y alrededores",
    paymentsShort: "Efectivo, terminal o transferencia",
    payments: ["Efectivo", "Terminal al entregar", "Transferencia"] as const,
  },
} as const;

export type { SisterAccent } from "@/lib/sisters/sisters";
