/**
 * Badge - a mono "spec label" pill, like a field on a catalogue card. Set in
 * monospace to tie into the data voice; tones map to flavour families
 * (cherry = fruit, survey = place/earthy, brass = sweet).
 *
 * `badgeClasses()` is exported separately (mirroring `buttonClasses`) so the
 * pill styling can be reused on non-`<span>` elements and unit-tested without
 * a DOM - see src/components/README.md.
 */
import { cn } from "@/lib/utils";

export type BadgeTone = "neutral" | "cherry" | "survey" | "brass";

const base =
  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-mono text-eyebrow font-medium uppercase";

const toneClasses: Record<BadgeTone, string> = {
  neutral: "border-line bg-surface-2 text-ink-soft",
  cherry: "border-cherry/25 bg-cherry/[0.07] text-cherry-deep",
  survey: "border-survey/25 bg-survey/[0.07] text-survey",
  // brass-deep (not brass) for AA-legible text over the tint - see contrast.test
  brass: "border-brass/30 bg-brass/[0.08] text-brass-deep",
};

export function badgeClasses(opts?: {
  tone?: BadgeTone;
  className?: string;
}): string {
  const { tone = "neutral", className } = opts ?? {};
  return cn(base, toneClasses[tone], className);
}

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
}

export function Badge({ tone, className, ...props }: BadgeProps) {
  return <span className={badgeClasses({ tone, className })} {...props} />;
}
