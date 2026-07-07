/**
 * Input - single-line text field.
 *
 * Forwards a ref so it works inside client-side controlled forms. Pass
 * `invalid` to render the error state (also sets `aria-invalid` for AT). Always
 * pair with a `<label>` (see src/components/README.md) - the component is
 * intentionally label-agnostic so callers control association.
 *
 * `inputClasses()` is exported separately (mirroring `buttonClasses`) so the
 * field styling can be reused (e.g. on a `<textarea>` or `<select>`) and
 * unit-tested without a DOM.
 */
import { forwardRef } from "react";

import { cn } from "@/lib/utils";

const base =
  "w-full rounded-lg border bg-surface-2 px-3 py-2 text-sm text-ink outline-none transition-colors placeholder:text-muted disabled:cursor-not-allowed disabled:opacity-60";

const stateClasses = {
  invalid:
    "border-red-600/60 focus-visible:border-red-600 focus-visible:ring-2 focus-visible:ring-red-600/25",
  valid:
    "border-line focus-visible:border-cherry focus-visible:ring-2 focus-visible:ring-cherry/25",
};

export function inputClasses(opts?: {
  invalid?: boolean;
  className?: string;
}): string {
  const { invalid, className } = opts ?? {};
  return cn(
    base,
    invalid ? stateClasses.invalid : stateClasses.valid,
    className,
  );
}

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
      className={inputClasses({ invalid, className })}
      {...props}
    />
  );
});
