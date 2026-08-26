import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * Default = backoffice / operational UI (no conic glow, soft square).
 * Pass `glow` for public CTAs (sakura conic ring + pill).
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-[transform,background-color,border-color,color,opacity] duration-150 ease-out active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-shimai-gold/60 focus-visible:ring-offset-2 focus-visible:ring-offset-shimai-black disabled:pointer-events-none disabled:opacity-50 disabled:active:scale-100",
  {
    variants: {
      variant: {
        primary:
          "border border-shimai-gold bg-shimai-gold text-shimai-black hover:bg-shimai-gold/90",
        sakura:
          "border border-shimai-sakura bg-shimai-sakura text-shimai-black hover:bg-shimai-sakura/90",
        outline:
          "border border-shimai-gold bg-transparent text-shimai-ivory hover:bg-shimai-gold/10",
        ghost: "bg-transparent text-shimai-ivory hover:bg-shimai-ivory/10",
        danger:
          "bg-seal-red text-shimai-ivory hover:bg-seal-red/90 border border-seal-red",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-12 rounded-md px-8 text-base",
        icon: "h-10 w-10 rounded-md",
      },
    },
    defaultVariants: {
      variant: "primary",
    },
  },
);

/** Layout classes must sit on the glow wrapper, not the inner button. */
const WRAPPER_CLASS_RE =
  /^(w-|min-w-|max-w-|flex-|grow|shrink|basis-|self-|justify-self-|col-|row-|m[trblxy]?-|mt-|mb-|ml-|mr-|mx-|my-|order-|hidden|block|inline|absolute|relative|sticky|fixed|rounded)/;

function splitGlowClasses(className?: string): {
  wrapper: string;
  button: string;
} {
  if (!className) return { wrapper: "", button: "" };
  const wrapper: string[] = [];
  const button: string[] = [];
  for (const token of className.split(/\s+/).filter(Boolean)) {
    if (WRAPPER_CLASS_RE.test(token)) {
      wrapper.push(token);
      if (token.startsWith("rounded")) button.push(token);
    } else {
      button.push(token);
    }
  }
  return { wrapper: wrapper.join(" "), button: button.join(" ") };
}

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
    /**
     * Public storefront only: rotating sakura conic ring.
     * Admin / driver leave this off (default).
     */
    glow?: boolean;
  };

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant, size, type = "button", glow = false, ...props },
    ref,
  ) => {
    if (!glow) {
      return (
        <button
          ref={ref}
          type={type}
          className={cn(buttonVariants({ variant, size, className }))}
          {...props}
        />
      );
    }

    const { wrapper, button: buttonClass } = splitGlowClasses(className);

    return (
      <span
        className={cn(
          "shimai-glow-border shimai-glow-border--pill",
          wrapper,
        )}
      >
        <button
          ref={ref}
          type={type}
          className={cn(
            buttonVariants({ variant, size, className: buttonClass }),
            "rounded-full",
          )}
          {...props}
        />
      </span>
    );
  },
);

Button.displayName = "Button";

export { Button, buttonVariants };
