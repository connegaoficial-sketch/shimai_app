/**
 * Brand theme tokens — single source for Shimai visual identity.
 * Franchise-ready: swap this config per location without touching components.
 */
export const shimaiBrand = {
  name: "SHIMAI",
  tagline: "Sushi House",
  motto: "Por hermanas · Una historia · Un sabor",
  description:
    "Dos hermanas. Un menú. Intensidad de Ane, frescura de Imōto, y lo que crean juntas.",
  logos: {
    /** Full lockup — hero, OG, print-style moments */
    full: "/logo_shimai.jpeg",
    /** Hero intro — plays once on page load, then static full lockup */
    heroAnimation: "/Shimai_Sushi_House_logo_animation_202608191427.mp4",
    /** Circular emblem — header, footer, favicon-adjacent */
    emblem: "/logo_shimai_2.jpeg",
  },
  sisters: [
    {
      key: "ane",
      label: "Ane",
      subtitle: "La mayor",
      description:
        "Intensidad, fuego controlado y piezas con carácter. Para quien busca profundidad.",
      accent: "gold" as const,
    },
    {
      key: "imoto",
      label: "Imōto",
      subtitle: "La menor",
      description:
        "Frescura, ligereza y notas de sakura. Delicadeza que no sacrifica sabor.",
      accent: "sakura" as const,
    },
    {
      key: "futari",
      label: "Futari",
      subtitle: "Juntas",
      description:
        "Lo que nace cuando las dos hermanas crean en armonía. La firma de la casa.",
      accent: "gold" as const,
    },
  ],
} as const;

export type SisterAccent = (typeof shimaiBrand.sisters)[number]["accent"];
