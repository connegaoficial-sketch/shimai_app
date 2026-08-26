/**
 * Sisters story — editable from Admin → Configuración.
 * Accents stay tied to key (visual system); copy is CMS-driven.
 */

export type SisterKey = "ane" | "imoto" | "futari";
export type SisterAccent = "gold" | "sakura";

export type SisterCard = {
  key: SisterKey;
  label: string;
  subtitle: string;
  description: string;
  accent: SisterAccent;
};

export type SistersStorySetting = {
  heading: string;
  support: string;
  sisters: SisterCard[];
};

const ACCENT_BY_KEY: Record<SisterKey, SisterAccent> = {
  ane: "gold",
  imoto: "sakura",
  futari: "gold",
};

export const DEFAULT_SISTERS_STORY: SistersStorySetting = {
  heading: "Cocina de hermanas, menú fácil de elegir",
  support:
    "Tres caminos según tu antojo. No hace falta memorizar el menú: elige el que suena a lo que quieres hoy.",
  sisters: [
    {
      key: "ane",
      label: "Ane",
      subtitle: "La mayor",
      description:
        "Cuando se te antoja algo con más cuerpo o picante: empieza por Ane.",
      accent: "gold",
    },
    {
      key: "imoto",
      label: "Imōto",
      subtitle: "La menor",
      description:
        "Cuando quieres fresco y ligero, sin pensar de más: ve a Imōto.",
      accent: "sakura",
    },
    {
      key: "futari",
      label: "Futari",
      subtitle: "Juntas",
      description:
        "Cuando vas a compartir o no te decides: Futari es el atajo de la casa.",
      accent: "gold",
    },
  ],
};

function isSisterKey(value: unknown): value is SisterKey {
  return value === "ane" || value === "imoto" || value === "futari";
}

export function parseSistersStory(raw: unknown): SistersStorySetting {
  if (!raw || typeof raw !== "object") {
    return structuredClone(DEFAULT_SISTERS_STORY);
  }
  const obj = raw as Record<string, unknown>;
  const heading =
    typeof obj.heading === "string" && obj.heading.trim()
      ? obj.heading.trim()
      : DEFAULT_SISTERS_STORY.heading;
  const support =
    typeof obj.support === "string" && obj.support.trim()
      ? obj.support.trim()
      : DEFAULT_SISTERS_STORY.support;

  const byKey = new Map<SisterKey, SisterCard>();
  if (Array.isArray(obj.sisters)) {
    for (const item of obj.sisters) {
      if (!item || typeof item !== "object") continue;
      const row = item as Record<string, unknown>;
      if (!isSisterKey(row.key)) continue;
      const fallback = DEFAULT_SISTERS_STORY.sisters.find(
        (s) => s.key === row.key,
      )!;
      byKey.set(row.key, {
        key: row.key,
        label:
          typeof row.label === "string" && row.label.trim()
            ? row.label.trim()
            : fallback.label,
        subtitle:
          typeof row.subtitle === "string" && row.subtitle.trim()
            ? row.subtitle.trim()
            : fallback.subtitle,
        description:
          typeof row.description === "string" && row.description.trim()
            ? row.description.trim()
            : fallback.description,
        accent: ACCENT_BY_KEY[row.key],
      });
    }
  }

  const sisters = DEFAULT_SISTERS_STORY.sisters.map(
    (fallback) => byKey.get(fallback.key) ?? { ...fallback },
  );

  return { heading, support, sisters };
}

/** Payload shape persisted to settings (accent derived on read). */
export function toSistersStoryPayload(
  story: SistersStorySetting,
): Record<string, unknown> {
  return {
    heading: story.heading.trim(),
    support: story.support.trim(),
    sisters: story.sisters.map(({ key, label, subtitle, description }) => ({
      key,
      label: label.trim(),
      subtitle: subtitle.trim(),
      description: description.trim(),
    })),
  };
}
