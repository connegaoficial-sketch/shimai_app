import Image from "next/image";

import { shimaiBrand } from "@/lib/brand/shimai";
import { cn } from "@/lib/utils";

type ShimaiLogoProps = {
  variant?: "full" | "emblem";
  className?: string;
  priority?: boolean;
};

const SIZES = {
  full: { width: 480, height: 480, alt: "SHIMAI Sushi House — Por hermanas, una historia, un sabor" },
  emblem: { width: 56, height: 56, alt: "SHIMAI" },
} as const;

export function ShimaiLogo({
  variant = "emblem",
  className,
  priority = false,
}: ShimaiLogoProps) {
  const src =
    variant === "full" ? shimaiBrand.logos.full : shimaiBrand.logos.emblem;
  const { width, height, alt } = SIZES[variant];

  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      priority={priority}
      className={cn(
        variant === "full" ? "h-auto w-full max-w-[min(100%,28rem)]" : "h-full w-full object-contain",
        className,
      )}
    />
  );
}
