import type { SiteLocale } from "@/lib/i18n/locale";

const CJK_PATTERN = /[\u4e00-\u9fff\u3400-\u4dbf]/;
const LATIN_PATTERN = /[A-Za-z]/;

export function containsCjk(text: string): boolean {
  return CJK_PATTERN.test(text);
}

export function containsLatin(text: string): boolean {
  return LATIN_PATTERN.test(text);
}

export function profileForLocale(profile: string, locale: SiteLocale): string | null {
  const trimmed = profile.trim();
  if (!trimmed) {
    return null;
  }
  if (locale === "zh") {
    return containsCjk(trimmed) ? trimmed : null;
  }
  return containsLatin(trimmed) && !containsCjk(trimmed) ? trimmed : containsCjk(trimmed) ? null : trimmed;
}
