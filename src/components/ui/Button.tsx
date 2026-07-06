/**
 * Button — the primary interactive control.
 *
 * `buttonClasses()` is exported separately so the same look can be applied to
 * non-button elements (e.g. a Next.js `<Link>` styled as a CTA) without losing
 * semantics — see src/components/README.md.
 */
import { cn } from "@/lib/utils";

export type ButtonVariant = "primary" | "secondary" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-full font-medium transition-[transform,background-color,border-color,box-shadow] duration-200 ease-out hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cherry focus-visible:ring-offset-2 focus-visible:ring-offset-paper disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0";

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-cherry text-white hover:bg-cherry-deep hover:shadow-glow",
  secondary:
    "border border-line bg-surface text-ink hover:border-cherry/50 hover:bg-surface-2",
  ghost: "text-ink hover:bg-surface-2",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2.5 text-sm",
  lg: "px-6 py-3 text-base",
};

export function buttonClasses(opts?: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
}): string {
  const { variant = "primary", size = "md", className } = opts ?? {};
  return cn(base, variantClasses[variant], sizeClasses[size], className);
}

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export function Button({ variant, size, className, ...props }: ButtonProps) {
  return (
    <button
      className={buttonClasses({ variant, size, className })}
      {...props}
    />
  );
}
