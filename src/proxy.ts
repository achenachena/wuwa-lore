import { NextResponse, type NextRequest } from "next/server";
import { isSiteLocale, SITE_LOCALE_COOKIE } from "@/lib/i18n/locale";

export function proxy(request: NextRequest) {
  const locale = request.nextUrl.searchParams.get("lang") ?? undefined;
  const headers = new Headers(request.headers);
  // Only the URL may supply this override, never an incoming client header.
  headers.delete("x-site-locale");
  if (isSiteLocale(locale)) headers.set("x-site-locale", locale);
  const response = NextResponse.next({ request: { headers } });
  if (isSiteLocale(locale)) {
    response.cookies.set(SITE_LOCALE_COOKIE, locale, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
      httpOnly: true,
      secure: request.nextUrl.protocol === "https:",
    });
  }
  return response;
}

export const config = {
  matcher: ["/", "/characters/:path*", "/stats/:path*", "/methodology"],
};
