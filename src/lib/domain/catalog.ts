/**
 * Domain catalogs — single source of truth for closed enums.
 * Add a value here first; schemas, i18n, and UI should consume these constants.
 */

export const QUEST_CATEGORIES = ["companion", "event", "side"] as const;
export type QuestCategory = (typeof QUEST_CATEGORIES)[number];

export const IMAGE_TYPES = ["portrait", "card", "splash", "other"] as const;
export type ImageType = (typeof IMAGE_TYPES)[number];

export const VERSION_HALVES = ["a", "b"] as const;
export type VersionHalfCode = (typeof VERSION_HALVES)[number];

/** Voice-line / profile data locales (Fandom-style). */
export const VOICE_LOCALES = ["zh-CN", "en-US", "ja-JP", "ko-KR"] as const;
export type Locale = (typeof VOICE_LOCALES)[number];

/** Story/quest dialogue locales (encore.moe). */
export const ENCORE_STORY_LOCALES = ["en", "zh-Hans"] as const;
export type EncoreStoryLocale = (typeof ENCORE_STORY_LOCALES)[number];

export const SITE_LOCALES = ["en", "zh"] as const;
export type SiteLocaleCode = (typeof SITE_LOCALES)[number];
