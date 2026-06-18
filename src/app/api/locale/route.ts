import { NextResponse } from "next/server";

import { SITE_LOCALE_COOKIE, type SiteLocale } from "@/lib/i18n/locale";

export async function POST(request: Request) {
  const body = (await request.json()) as { locale?: string };
  if (body.locale !== "en" && body.locale !== "zh") {
    return NextResponse.json({ error: "Invalid locale" }, { status: 400 });
  }

  const response = NextResponse.json({ ok: true, locale: body.locale satisfies SiteLocale });
  response.cookies.set(SITE_LOCALE_COOKIE, body.locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  return response;
}
