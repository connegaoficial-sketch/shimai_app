import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { getSupabasePublicEnv } from "@/lib/supabase/env";
import type { Database, UserRole } from "@/types/database";

type GateRole = "admin" | "driver";

/**
 * Next.js 16 Proxy: refresh session + gate /admin (admin) and /driver (driver).
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const { url, key } = getSupabasePublicEnv();

  const supabase = createServerClient<Database, "shimai">(url, key, {
    db: { schema: "shimai" },
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          supabaseResponse.cookies.set(name, value, options);
        });
        Object.entries(headers).forEach(([headerKey, headerValue]) => {
          supabaseResponse.headers.set(headerKey, headerValue);
        });
      },
    },
  });

  const { data: claimsData } = await supabase.auth.getClaims();
  const claims = claimsData?.claims;
  const userId =
    typeof claims?.sub === "string" && claims.sub.length > 0
      ? claims.sub
      : null;

  const pathname = request.nextUrl.pathname;
  const isAdminPath = pathname.startsWith("/admin");
  const isDriverPath = pathname.startsWith("/driver");
  const isAdminLogin = pathname === "/admin/login";
  const isDriverLogin = pathname === "/driver/login";

  if (!isAdminPath && !isDriverPath) {
    return supabaseResponse;
  }

  const gate: GateRole = isAdminPath ? "admin" : "driver";
  const loginPath = gate === "admin" ? "/admin/login" : "/driver/login";
  const homePath = gate === "admin" ? "/admin/orders" : "/driver";
  const isLoginPath = gate === "admin" ? isAdminLogin : isDriverLogin;

  if (!userId) {
    if (isLoginPath) {
      return supabaseResponse;
    }
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = loginPath;
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  const role = (profile?.role ?? null) as UserRole | null;
  const allowed = role === gate;

  if (isLoginPath) {
    if (allowed) {
      const dest = request.nextUrl.clone();
      dest.pathname = homePath;
      dest.search = "";
      return NextResponse.redirect(dest);
    }
    return supabaseResponse;
  }

  if (!allowed) {
    const homeUrl = request.nextUrl.clone();
    homeUrl.pathname = "/";
    homeUrl.search = "";
    return NextResponse.redirect(homeUrl);
  }

  return supabaseResponse;
}
