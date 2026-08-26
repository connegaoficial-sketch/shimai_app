import type { MenuProduct } from "@/lib/menu/get-menu-data";
import { cn } from "@/lib/utils";

type ProductCardMetaProps = {
  product: MenuProduct;
  className?: string;
  /** denser lines for grid cards */
  compact?: boolean;
};

/**
 * Fixed-height meta block so cards stay aligned whether copy is short, long, or sushi fields.
 */
export function ProductCardMeta({
  product,
  className,
  compact = true,
}: ProductCardMetaProps) {
  const text = compact
    ? "font-sans text-xs leading-relaxed text-shimai-ivory/50"
    : "font-sans text-sm leading-relaxed text-shimai-ivory/55";

  return (
    <div
      className={cn(
        compact ? "min-h-[2.75rem]" : "min-h-[3.25rem]",
        className,
      )}
    >
      {product.is_sushi ? (
        <div className="space-y-0.5">
          {product.filling ? (
            <p className={cn(text, "line-clamp-1")}>
              <span className="text-shimai-ivory/35">Por dentro · </span>
              {product.filling}
            </p>
          ) : null}
          {product.topping ? (
            <p className={cn(text, "line-clamp-1")}>
              <span className="text-shimai-ivory/35">Por fuera · </span>
              {product.topping}
            </p>
          ) : null}
          {!product.filling && !product.topping ? (
            <p className={cn(text, "invisible")} aria-hidden>
              —
            </p>
          ) : null}
        </div>
      ) : product.description ? (
        <p className={cn(text, "line-clamp-2")}>{product.description}</p>
      ) : (
        <p className={cn(text, "invisible line-clamp-2")} aria-hidden>
          —
        </p>
      )}
    </div>
  );
}
