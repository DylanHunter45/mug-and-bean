/**
 * Input — single-line text field.
 *
 * Forwards a ref so it works inside client-side controlled forms. Pass
 * `invalid` to render the error state (also sets `aria-invalid` for AT). Always
 * pair with a `<label>` (see src/components/README.md) — the component is
 * intentionally label-agnostic so callers control association.
 */
import { forwardRef } from "react";

import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, invalid, ...props },
  ref,
) {
  return (
    <input
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(
        "w-full rounded-lg border bg-surface-2 px-3 py-2 text-sm text-cream outline-none transition-colors placeholder:text-muted/60 disabled:cursor-not-allowed disabled:opacity-60",
        invalid
          ? "border-red-500/60 focus-visible:border-red-400 focus-visible:ring-2 focus-visible:ring-red-500/30"
          : "border-line focus-visible:border-jade focus-visible:ring-2 focus-visible:ring-jade/25",
        className,
      )}
      {...props}
    />
  );
});
