import * as React from "react";

import { cn } from "@/lib/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", ...props }, ref) => {
    return (
      <input
        ref={ref}
        type={type}
        className={cn(
          "flex h-12 w-full rounded-md border border-shimai-ivory/15 bg-shimai-surface px-4 font-sans text-sm text-shimai-ivory placeholder:text-shimai-ivory/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-shimai-gold/50 disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        {...props}
      />
    );
  },
);

Input.displayName = "Input";

export { Input };
