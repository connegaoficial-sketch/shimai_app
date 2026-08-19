import type { NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/proxy";

/**
 * Next.js 16 Proxy — gates /admin (admin) and /driver (driver).
 */
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    "/admin",
    "/admin/:path*",
    "/driver",
    "/driver/:path*",
  ],
};
