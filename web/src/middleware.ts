import { NextResponse, type NextRequest } from "next/server";

const BASE = process.env.NEXT_PUBLIC_AUTH_URL ?? "http://localhost:4000";
const SETUP_CACHE_COOKIE = "setup-done";
const SETUP_CACHE_TTL = 5 * 60; // 5 minutes in seconds
const SESSION_COOKIE = "better-auth.session_token";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Never redirect the setup page itself or static/API routes
  if (
    pathname.startsWith("/setup") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Protect /app/* — unauthenticated users go to sign-in
  if (pathname.startsWith("/app")) {
    const sessionCookie = req.cookies.get(SESSION_COOKIE);
    if (!sessionCookie) {
      return NextResponse.redirect(new URL("/sign-in", req.url));
    }
  }

  // Check cookie cache — avoid hitting the server on every request
  const cached = req.cookies.get(SETUP_CACHE_COOKIE);
  if (cached?.value === "1") return NextResponse.next();

  try {
    const res = await fetch(`${BASE}/api/setup`, { cache: "no-store" });
    const data = await res.json() as { required?: boolean };

    if (data.required) {
      return NextResponse.redirect(new URL("/setup", req.url));
    }

    // Cache the "setup done" result for 5 minutes
    const response = NextResponse.next();
    response.cookies.set(SETUP_CACHE_COOKIE, "1", {
      maxAge: SETUP_CACHE_TTL,
      httpOnly: true,
      sameSite: "lax",
    });
    return response;
  } catch {
    // Server unreachable — let the request through; app will show its own error state
    return NextResponse.next();
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
