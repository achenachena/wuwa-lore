import { cookies, headers } from "next/headers";

import { messages, type Messages } from "@/lib/i18n/messages";
import { isSiteLocale, SITE_LOCALE_COOKIE, type SiteLocale } from "@/lib/i18n/locale";

function localeFromAcceptLanguage(header: string | null): SiteLocale | null {
  if (!header) {
    return null;
  }
  const preferred = header
    .split(",")
    .map((part) => {
      const [tag, qValue] = part.trim().split(";q=");
      return { tag: tag.toLowerCase(), q: qValue ? Number(qValue) : 1 };
    })
    .filter((part) => part.tag && !Number.isNaN(part.q))
    .sort((a, b) => b.q - a.q);

  for (const { tag } of preferred) {
    if (tag.startsWith("zh")) {
      return "zh";
    }
    if (tag.startsWith("en")) {
      return "en";
    }
  }
  return null;
}

export async function getSiteLocale(): Promise<SiteLocale> {
  const value = (await cookies()).get(SITE_LOCALE_COOKIE)?.value;
  if (isSiteLocale(value)) {
    return value;
  }
  const acceptLanguage = (await headers()).get("accept-language");
  return localeFromAcceptLanguage(acceptLanguage) ?? "zh";
}

export async function getMessages(): Promise<Messages> {
  const locale = await getSiteLocale();
  return messages[locale];
}
