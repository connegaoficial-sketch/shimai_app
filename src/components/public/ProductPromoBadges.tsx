import type { ProductPromoBadge } from "@/lib/promos/promos";
import { cn } from "@/lib/utils";

type ProductPromoBadgesProps = {
  badges: ProductPromoBadge[];
  /** Card overlay vs inline next to title */
  placement?: "overlay" | "inline";
  className?: string;
  /** Max chips to show (default 2). */
  max?: number;
};

/**
 * Sakura promo chips — soft petal glow, clear discount type.
 */
export function ProductPromoBadges({
  badges,
  placement = "overlay",
  className,
  max = 2,
}: ProductPromoBadgesProps) {
  if (badges.length === 0) return null;
  const visible = badges.slice(0, max);

  return (
    <div
      className={cn(
        "flex flex-wrap gap-1.5",
        placement === "overlay" &&
          "pointer-events-none absolute right-2.5 top-2.5 z-[1]",
        className,
      )}
    >
      {visible.map((badge) => (
        <span
          key={`${badge.promoId}-${badge.type}`}
          title={badge.label}
          className={cn(
            "inline-flex items-center gap-1 border border-shimai-sakura/55",
            "bg-gradient-to-br from-shimai-sakura/25 via-shimai-sakura/12 to-shimai-black/80",
            "font-sans text-[10px] font-medium uppercase tracking-[0.14em] text-shimai-sakura",
            "shadow-[0_0_18px_rgba(232,165,181,0.28),inset_0_1px_0_rgba(255,255,255,0.12)]",
            "backdrop-blur-md",
            placement === "overlay" ? "rounded-full px-2.5 py-1" : "rounded-full px-2.5 py-1",
          )}
        >
          <span
            aria-hidden
            className="size-1 rounded-full bg-shimai-sakura shadow-[0_0_6px_rgba(232,165,181,0.9)]"
          />
          {badge.label}
        </span>
      ))}
    </div>
  );
}
