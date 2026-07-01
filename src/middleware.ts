import { NextResponse, type NextRequest } from "next/server";

import {
  applySecurityHeaders,
  isProbePath,
  isSameOriginRequest,
} from "@/lib/security/headers";
import { checkRateLimit } from "@/lib/security/rate-limit";

function clientKey(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "anonymous"
  );
}

function withSecurityHeaders(response: NextResponse): NextResponse {
  applySecurityHeaders(response);
  return response;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isProbePath(pathname)) {
    return withSecurityHeaders(new NextResponse(null, { status: 404 }));
  }

  if (pathname.startsWith("/api/")) {
    const limit = checkRateLimit(`api:${clientKey(request)}`, {
      windowMs: 60_000,
      max: 120,
    });
    if (!limit.allowed) {
      const response = NextResponse.json({ error: "Too many requests" }, { status: 429 });
      response.headers.set("Retry-After", String(limit.retryAfterSeconds));
      return withSecurityHeaders(response);
    }

    if (request.method !== "GET" && request.method !== "HEAD" && !isSameOriginRequest(request)) {
      const response = NextResponse.json({ error: "Forbidden" }, { status: 403 });
      return withSecurityHeaders(response);
    }
  }

  return withSecurityHeaders(NextResponse.next());
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
