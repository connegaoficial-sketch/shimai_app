import Image from "next/image";

import { shimaiBrand } from "@/lib/brand/shimai";
import { cn } from "@/lib/utils";

type ShimaiLogoProps = {
  variant?: "full" | "emblem" | "heroFull";
  className?: string;
  priority?: boolean;
};

const SIZES = {
  full: {
    width: 1248,
    height: 832,
    alt: "SHIMAI Sushi House — Por hermanas, una historia, un sabor",
  },
  heroFull: {
    width: 3744,
    height: 2496,
    alt: "SHIMAI Sushi House — Por hermanas, una historia, un sabor",
  },
  emblem: { width: 56, height: 56, alt: "SHIMAI" },
} as const;

export function ShimaiLogo({
  variant = "emblem",
  className,
  priority = false,
}: ShimaiLogoProps) {
  const src =
    variant === "heroFull"
      ? shimaiBrand.logos.heroFull
      : variant === "full"
        ? shimaiBrand.logos.full
        : shimaiBrand.logos.emblem;
  const { width, height, alt } = SIZES[variant];

  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      priority={priority}
      sizes={
        variant === "heroFull"
          ? "(max-width: 768px) 100vw, min(92vw, 56rem)"
          : undefined
      }
      className={cn(
        variant === "emblem"
          ? "h-full w-full object-contain"
          : variant === "heroFull"
            ? "h-auto w-auto max-w-none"
            : "h-auto w-full max-w-[min(100%,28rem)]",
        className,
      )}
    />
  );
}
