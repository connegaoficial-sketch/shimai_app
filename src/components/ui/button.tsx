import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-shimai-gold/60 focus-visible:ring-offset-2 focus-visible:ring-offset-shimai-black disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary:
          "bg-shimai-gold text-shimai-black hover:bg-shimai-gold/90 border border-shimai-gold",
        sakura:
          "bg-shimai-sakura text-shimai-black hover:bg-shimai-sakura/90 border border-shimai-sakura",
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
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  },
);

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants>;

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, type = "button", ...props }, ref) => {
    return (
      <button
        ref={ref}
        type={type}
        className={cn(buttonVariants({ variant, size, className }))}
        {...props}
      />
    );
  },
);

Button.displayName = "Button";

export { Button, buttonVariants };
