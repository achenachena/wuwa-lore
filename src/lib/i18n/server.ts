import { cookies } from "next/headers";

import { messages, type Messages } from "@/lib/i18n/messages";
import { SITE_LOCALE_COOKIE, type SiteLocale } from "@/lib/i18n/locale";

export async function getSiteLocale(): Promise<SiteLocale> {
  const value = (await cookies()).get(SITE_LOCALE_COOKIE)?.value;
  if (value === "en" || value === "zh") {
    return value;
  }
  return "en";
}

export async function getMessages(): Promise<Messages> {
  const locale = await getSiteLocale();
  return messages[locale];
}
