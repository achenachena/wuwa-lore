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
