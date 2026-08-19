import * as React from "react";

import { cn } from "@/lib/utils";

export type LabelProps = React.LabelHTMLAttributes<HTMLLabelElement>;

const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, ...props }, ref) => (
    <label
      ref={ref}
      className={cn(
        "block font-sans text-[11px] font-medium uppercase tracking-[0.14em] text-shimai-ivory/55",
        className,
      )}
      {...props}
    />
  ),
);

Label.displayName = "Label";

export { Label };
