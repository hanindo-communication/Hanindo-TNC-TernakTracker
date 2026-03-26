import { createServerClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

const AUTH_GET_USER_TIMEOUT_MS = 12_000;

async function getUserWithTimeout(
  supabase: ReturnType<typeof createServerClient>,
): Promise<Awaited<ReturnType<typeof supabase.auth.getUser>>> {
  return Promise.race([
    supabase.auth.getUser(),
    new Promise<Awaited<ReturnType<typeof supabase.auth.getUser>>>(
      (_, reject) =>
        setTimeout(
          () =>
            reject(
              new Error(
                `supabase.auth.getUser() exceeded ${AUTH_GET_USER_TIMEOUT_MS}ms`,
              ),
            ),
          AUTH_GET_USER_TIMEOUT_MS,
        ),
    ),
  ]);
}

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  let user: User | null = null;
  try {
    const { data } = await getUserWithTimeout(supabase);
    user = data.user ?? null;
  } catch {
    user = null;
  }

  const path = request.nextUrl.pathname;

  if (!user && !path.startsWith("/login") && !path.startsWith("/auth")) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && path === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
