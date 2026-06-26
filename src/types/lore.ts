export type Locale = "zh-CN" | "en-US" | "ja-JP" | "ko-KR";

export type ImageType = "portrait" | "card" | "splash" | "other";

export interface SourceTrace {
  sourceUrl: string;
  sourceRevision?: string;
  scrapedAt: string;
  editor: string;
}

export interface CharacterImage {
  id: string;
  characterId: string;
  type: ImageType;
  title: string;
  localPath: string;
  copyright: string;
  source: SourceTrace;
}

export interface Character {
  id: string;
  name: string;
  aliases: string[];
  element: string;
  weapon: string;
  faction: string;
  rarity: number;
  releaseVersion: string;
  profile: string;
  locale: Locale;
  source: SourceTrace;
}

export interface VersionRecord {
  version: string;
  releaseDate: string;
  notes: string;
}

export interface VoiceLineEntry {
  id: string;
  characterId: string;
  version: string;
  locale: Locale;
  line: string;
  source: SourceTrace;
}

export interface VoiceLineStatRow {
  characterId: string;
  debutVersion: string;
  locale: Locale;
  sourcePageTitle: string;
  sourcePageExists: boolean;
  sourceLatestRevisionAt: string | null;
  sourceRevisionCount: number;
  countMethod: "tx_key_unique_nonempty";
  qualityStatus: "verified" | "missing_source";
  currentLineCount: number;
  perVersionLineCounts: Array<{
    version: string;
    lineCount: number;
  }>;
  totalLineCount: number;
  sources: string[];
  generatedAt: string;
}

export interface VoiceLineDetailRow {
  characterId: string;
  locale: Locale;
  sourcePageTitle: string;
  sourcePageExists: boolean;
  sourceLatestRevisionAt: string | null;
  sourceRevisionCount: number;
  generatedAt: string;
  lines: Array<{
    key: string;
    text: string;
    sourceFieldPath: string;
    firstSeenAt: string | null;
    firstSeenVersion: string | null;
  }>;
}

export interface VersionStatRow {
  version: string;
  releaseDate: string;
  characterCount: number;
  totalVoiceLines: number;
}

export type QuestCategory = "companion" | "event" | "side";

export type VersionHalfCode = "a" | "b";

export interface VersionHalfRecord {
  id: string;
  version: string;
  half: VersionHalfCode;
  label: string;
  labelZh: string;
  startDate: string;
  endDate: string;
}

export interface StorySegment {
  id: string;
  wikiTitle: string;
  nameZh: string;
  version: string;
  half: VersionHalfCode;
  versionHalf: string;
  sortOrder: number;
}

export interface StoryAppearanceRow {
  characterId: string;
  questId: string;
  wikiTitle: string;
  nameZh: string;
  version: string;
  half: VersionHalfCode;
  versionHalf: string;
}

export interface VersionHalfVoiceRow {
  characterId: string;
  locale: Locale;
  versionHalf: string;
  version: string;
  half: VersionHalfCode;
  lineCount: number;
}

export interface StoryDialogueRow {
  locale: "en" | "zh-Hans";
  characterId: string;
  questId: string;
  wikiTitle: string;
  nameZh: string;
  version: string;
  half: VersionHalfCode;
  versionHalf: string;
  lineCount: number;
  encoreStoryIds: number[];
}

export interface CharacterStorySegmentRow {
  segment: StorySegment;
  appeared: boolean;
  lineCount: number;
}

export interface OptionalQuestRecord {
  id: string;
  category: QuestCategory;
  encoreStoryId: number;
  nameZh: string;
  nameEn: string;
}

export interface OptionalQuestDialogueRow {
  locale: "en" | "zh-Hans";
  category: QuestCategory;
  characterId: string;
  questId: string;
  questName: string;
  questNameZh: string;
  lineCount: number;
  encoreStoryIds: number[];
}

export interface OptionalQuestAppearanceRow {
  category: QuestCategory;
  characterId: string;
  questId: string;
  questName: string;
  questNameZh: string;
}

export interface CharacterOptionalQuestRow {
  quest: OptionalQuestRecord;
  appeared: boolean;
  lineCount: number;
}

export interface VersionHalfRankingRow {
  characterId: string;
  characterName: string;
  voiceLineCount: number;
  appearanceCount: number;
  linesPerAppearance: number | null;
}

export interface CharacterWordCloudRow {
  characterId: string;
  locale: "en" | "zh-Hans";
  lineCount: number;
  terms: Array<{ term: string; count: number }>;
}
