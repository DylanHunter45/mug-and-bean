/**
 * Section — a full-width page band providing vertical rhythm. Pair
 * with a `<Container>` for horizontal layout. Renders a semantic `<section>`.
 */
import { cn } from "@/lib/utils";

export type SectionProps = React.HTMLAttributes<HTMLElement>;

export function Section({ className, ...props }: SectionProps) {
  return (
    <section
      className={cn("py-section-y lg:py-section-y-lg", className)}
      {...props}
    />
  );
}
