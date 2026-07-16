import {
  ENCORE_STORY_LOCALES,
  SITE_LOCALES,
  type EncoreStoryLocale,
  type SiteLocaleCode,
} from "@/lib/domain/catalog";

export type SiteLocale = SiteLocaleCode;
export type EncoreLocale = EncoreStoryLocale;

export const SITE_LOCALE_COOKIE = "wuwa-lore-locale";

export function isSiteLocale(value: string | undefined): value is SiteLocale {
  return SITE_LOCALES.includes(value as SiteLocale);
}

export function toEncoreLocale(siteLocale: SiteLocale): EncoreLocale {
  return siteLocale === "zh" ? "zh-Hans" : "en";
}

export type VoiceDataLocale = "zh-CN" | "en-US";

export function toVoiceDataLocale(siteLocale: SiteLocale): VoiceDataLocale {
  return siteLocale === "zh" ? "zh-CN" : "en-US";
}

export { SITE_LOCALES, ENCORE_STORY_LOCALES };

export const ROVER_CHARACTER_IDS = new Set([
  "rover",
  "rover-havoc",
  "rover-spectro",
  "rover-aero",
  "rover-electro",
]);

export function isRoverCharacter(characterId: string): boolean {
  return ROVER_CHARACTER_IDS.has(characterId);
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
