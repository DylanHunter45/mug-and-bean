/**
 * Inline auth feedback banner.
 *
 * Renders an error (red) or informational message (neutral) above an auth form.
 * Auth server actions surface failures by redirecting back with `?error=` and
 * status notices with `?message=`; the pages pass those through to here.
 */
import { cn } from "@/lib/utils";

export function AuthAlert({
  error,
  message,
}: {
  error?: string;
  message?: string;
}) {
  const text = error ?? message;
  if (!text) return null;

  return (
    <p
      role={error ? "alert" : "status"}
      className={cn(
        "rounded-lg border px-3 py-2 text-sm",
        error
          ? "border-red-500/40 bg-red-500/10 text-red-300"
          : "border-line bg-surface-2 text-muted-bright",
      )}
    >
      {text}
    </p>
  );
}
