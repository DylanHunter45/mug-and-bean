/**
 * Tiny shared utilities. This module exists from the scaffold onward so unit
 * testing is wired up. Real helpers land as features are built.
 */

/**
 * Conditionally joins class names, dropping falsy values. A dependency-free
 * stand-in until/if `clsx` is introduced in the design-system task.
 */
export function cn(
  ...classes: Array<string | false | null | undefined>
): string {
  return classes.filter(Boolean).join(" ");
}
