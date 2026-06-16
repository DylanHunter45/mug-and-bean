/**
 * Next.js middleware.
 *
 * Lives in `src/` (not the project root) because this project uses a `src/`
 * directory — Next.js only detects middleware at `src/middleware.ts` in that
 * layout. It delegates to `updateSession`, which refreshes the Supabase auth
 * session on every request and redirects unauthenticated traffic away from
 * protected routes. The matcher skips static assets and image files so we only
 * pay the auth round-trip on real navigations / data requests.
 */
import type { NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     *  - _next/static (build assets)
     *  - _next/image (image optimization)
     *  - favicon.ico
     *  - common image extensions
     * Tweak this list as static asset routes are added.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
