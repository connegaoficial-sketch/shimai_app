import Image from "next/image";

import { cn } from "@/lib/utils";

const MOTIFS = {
  /** Pausas grandes — “bajo el árbol” */
  branches: {
    src: "/sakura-dividers/sakura-strip-branches.png",
    alt: "",
  },
  /** Pausas medias — lluvia suave */
  petals: {
    src: "/sakura-dividers/sakura-strip-petals.png",
    alt: "",
  },
  /** Opcional festón */
  garland: {
    src: "/sakura-dividers/sakura-strip-garland.png",
    alt: "",
  },
} as const;

type SakuraDividerProps = {
  motif?: keyof typeof MOTIFS;
  /** large = pausa A · medium = pausa B */
  size?: "large" | "medium";
  className?: string;
};

/**
 * Respiro visual entre secciones — guirnalda sakura sobre negro SHIMAI.
 * Decorative only (aria-hidden).
 */
export function SakuraDivider({
  motif = "branches",
  size = "large",
  className,
}: SakuraDividerProps) {
  const asset = MOTIFS[motif];

  return (
    <div
      aria-hidden
      className={cn(
        "relative w-full overflow-hidden bg-shimai-black",
        size === "large"
          ? "h-20 sm:h-28 md:h-32"
          : "h-14 sm:h-20 md:h-24",
        className,
      )}
    >
      <Image
        src={asset.src}
        alt=""
        fill
        className={cn(
          "object-cover object-center",
          size === "large" ? "opacity-70 sm:opacity-75" : "opacity-55 sm:opacity-65",
        )}
        sizes="100vw"
        priority={false}
      />
      {/* Soft fade so the strip dissolves into page black */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-8 bg-gradient-to-b from-shimai-black to-transparent sm:h-10" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-shimai-black to-transparent sm:h-10" />
    </div>
  );
}
