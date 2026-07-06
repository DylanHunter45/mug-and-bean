/**
 * Badge — a mono "spec label" pill, like a field on a catalogue card. Set in
 * monospace to tie into the data voice; tones map to flavour families
 * (cherry = fruit, survey = place/earthy, brass = sweet).
 */
import { cn } from "@/lib/utils";

export type BadgeTone = "neutral" | "cherry" | "survey" | "brass";

const toneClasses: Record<BadgeTone, string> = {
  neutral: "border-line bg-surface-2 text-ink-soft",
  cherry: "border-cherry/25 bg-cherry/[0.07] text-cherry-deep",
  survey: "border-survey/25 bg-survey/[0.07] text-survey",
  brass: "border-brass/30 bg-brass/[0.08] text-brass",
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
