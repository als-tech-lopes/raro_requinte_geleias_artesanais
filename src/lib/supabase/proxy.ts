import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isAuthorizedAdmin } from "@/lib/auth/authorization";
import type { Database } from "@/types/database";

export async function updateSession(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const isLogin = request.nextUrl.pathname === "/login";

  if (!url || !key) {
    return isLogin
      ? NextResponse.next({ request })
      : NextResponse.redirect(new URL("/login?error=config", request.url));
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient<Database>(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let authorized = false;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("ativo, papel")
      .eq("id", user.id)
      .maybeSingle();
    authorized = isAuthorizedAdmin(profile);
  }

  if (isLogin && authorized) {
    return copyCookies(response, NextResponse.redirect(new URL("/dashboard", request.url)));
  }

  if (!isLogin && !authorized) {
    const reason = user ? "unauthorized" : "session";
    return copyCookies(
      response,
      NextResponse.redirect(new URL(`/login?error=${reason}`, request.url)),
    );
  }

  return response;
}

function copyCookies(source: NextResponse, target: NextResponse) {
  source.cookies.getAll().forEach((cookie) => target.cookies.set(cookie));
  return target;
}
