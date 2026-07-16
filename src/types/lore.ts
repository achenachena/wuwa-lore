/**
 * Domain + view-model types for the lore site.
 * Persisted shapes are inferred from Zod in `@/lib/data/schemas` and re-exported here.
 * Catalog enums live in `@/lib/domain/catalog`.
 */

export type {
  Locale,
  ImageType,
  QuestCategory,
  VersionHalfCode,
  EncoreStoryLocale,
} from "@/lib/domain/catalog";

export type {
  SourceTrace,
  Character,
  CharacterImage,
  VersionRecord,
  VoiceLineEntry,
  VoiceLineStatRow,
  VoiceLineDetailRow,
  VersionHalfRecord,
  StorySegment,
  StoryAppearanceRow,
  StoryDialogueRow,
  VersionHalfVoiceRow,
  OptionalQuestRecord,
  OptionalQuestDialogueRow,
  OptionalQuestAppearanceRow,
  OptionalQuestCoverageRow,
  UnmappedSpeakerRow,
  CharacterWordCloudRow,
} from "@/lib/data/schemas";

import type {
  OptionalQuestRecord,
  StorySegment,
} from "@/lib/data/schemas";

/** Aggregated per-version dashboard row (derived, not persisted as-is). */
export interface VersionStatRow {
  version: string;
  releaseDate: string;
  characterCount: number;
  totalVoiceLines: number;
}

export interface CharacterStorySegmentRow {
  segment: StorySegment;
  appeared: boolean;
  lineCount: number;
}

export interface CharacterOptionalQuestRow {
  quest: OptionalQuestRecord;
  appeared: boolean;
  lineCount: number;
}

/** Shared ranking row used by story-segment and optional-quest stats UIs. */
export interface CharacterRankingRow {
  characterId: string;
  characterName: string;
  voiceLineCount: number;
  appearanceCount: number;
  linesPerAppearance: number | null;
}

/** @deprecated Prefer CharacterRankingRow — alias kept for existing call sites. */
export type VersionHalfRankingRow = CharacterRankingRow;
