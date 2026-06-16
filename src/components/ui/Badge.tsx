/**
 * Badge — a mono "spec label" pill, like a field on a cupping card.
 * Set in monospace to tie into the data voice of the design system.
 */
import { cn } from "@/lib/utils";

export type BadgeTone = "neutral" | "jade" | "amber";

const toneClasses: Record<BadgeTone, string> = {
  neutral: "border-line bg-surface text-muted-bright",
  jade: "border-jade/30 bg-jade/10 text-jade",
  amber: "border-amber/30 bg-amber/10 text-amber",
};

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
}

export function Badge({ tone = "neutral", className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-mono text-eyebrow font-medium uppercase",
        toneClasses[tone],
        className,
      )}
      {...props}
    />
  );
}
