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
 * Edges dissolve with CSS mask + overlays so no hard frame lines show.
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
      <div
        className={cn(
          "absolute inset-0",
          // Soft oval dissolve — kills any residual frame at the strip bounds
          "shimai-sakura-divider-mask",
          size === "large" ? "opacity-70 sm:opacity-75" : "opacity-55 sm:opacity-65",
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

      {/* Deep fade into page black — taller than the strip so seams never read */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[45%] bg-gradient-to-b from-shimai-black via-shimai-black/80 to-transparent"
      />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[45%] bg-gradient-to-t from-shimai-black via-shimai-black/80 to-transparent"
      />
      <div
        className="pointer-events-none absolute inset-y-0 left-0 w-[12%] bg-gradient-to-r from-shimai-black to-transparent"
      />
      <div
        className="pointer-events-none absolute inset-y-0 right-0 w-[12%] bg-gradient-to-l from-shimai-black to-transparent"
      />
    </div>
  );
}
