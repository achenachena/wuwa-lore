export type SiteLocale = "en" | "zh";

export const SITE_LOCALE_COOKIE = "wuwa-lore-locale";

export type EncoreLocale = "en" | "zh-Hans";

export function toEncoreLocale(siteLocale: SiteLocale): EncoreLocale {
  return siteLocale === "zh" ? "zh-Hans" : "en";
}

export function segmentDisplayName(
  segment: { nameZh: string; wikiTitle: string },
  siteLocale: SiteLocale,
): string {
  return siteLocale === "zh" ? segment.nameZh : segment.wikiTitle;
}

export function formatStorySegmentLabel(
  segment: { version: string; nameZh: string; wikiTitle: string },
  siteLocale: SiteLocale,
): string {
  return `${segment.version} · ${segmentDisplayName(segment, siteLocale)}`;
}
