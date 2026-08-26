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
 * Respiro visual entre secciones — sakura que se disuelve en el negro.
 * Sin marco ni franja: máscara + fades más altos que el strip.
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
          ? "h-16 sm:h-24 md:h-28"
          : "h-12 sm:h-16 md:h-20",
        className,
      )}
    >
      <div
        className={cn(
          "absolute inset-0 shimai-sakura-divider-mask",
          size === "large" ? "opacity-45 sm:opacity-55" : "opacity-35 sm:opacity-45",
        )}
      >
        <Image
          src={asset.src}
          alt=""
          fill
          className="object-cover object-center"
          sizes="100vw"
          priority={false}
        />
      </div>

      {/* Fades taller than the strip so top/bottom never read as a hard cut */}
      <div className="pointer-events-none absolute inset-x-0 -top-[30%] h-[70%] bg-gradient-to-b from-shimai-black via-shimai-black/90 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 -bottom-[30%] h-[70%] bg-gradient-to-t from-shimai-black via-shimai-black/90 to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 left-0 w-[18%] bg-gradient-to-r from-shimai-black to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-[18%] bg-gradient-to-l from-shimai-black to-transparent" />
    </div>
  );
}
