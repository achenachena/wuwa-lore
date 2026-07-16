import { z } from "zod";

import {
  ENCORE_STORY_LOCALES,
  IMAGE_TYPES,
  QUEST_CATEGORIES,
  VERSION_HALVES,
  VOICE_LOCALES,
} from "@/lib/domain/catalog";

export const localeSchema = z.enum(VOICE_LOCALES);
export const imageTypeSchema = z.enum(IMAGE_TYPES);
export const versionHalfSchema = z.enum(VERSION_HALVES);
export const encoreStoryLocaleSchema = z.enum(ENCORE_STORY_LOCALES);
export const questCategorySchema = z.enum(QUEST_CATEGORIES);

export const sourceTraceSchema = z.object({
  sourceUrl: z.url(),
  sourceRevision: z.string().optional(),
  scrapedAt: z.iso.datetime(),
  editor: z.string().min(1),
});

export const characterSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  aliases: z.array(z.string()),
  element: z.string().min(1),
  weapon: z.string().min(1),
  faction: z.string().min(1),
  rarity: z.number().int().min(0).max(5),
  releaseVersion: z.string().min(1),
  profile: z.string().min(1),
  locale: localeSchema,
  source: sourceTraceSchema,
});

export const characterImageSchema = z.object({
  id: z.string().min(1),
  characterId: z.string().min(1),
  type: imageTypeSchema,
  title: z.string().min(1),
  localPath: z.string().min(1),
  copyright: z.string().min(1),
  source: sourceTraceSchema,
});

export const versionSchema = z.object({
  version: z.string().min(1),
  releaseDate: z.string().min(1),
  notes: z.string(),
});

export const voiceLineEntrySchema = z.object({
  id: z.string().min(1),
  characterId: z.string().min(1),
  version: z.string().min(1),
  locale: localeSchema,
  line: z.string().min(1),
  source: sourceTraceSchema,
});

export const rawVoiceSnapshotSchema = z.object({
  snapshotId: z.string().min(1),
  entries: z.array(voiceLineEntrySchema),
});

export const voiceLineStatRowSchema = z.object({
  characterId: z.string().min(1),
  debutVersion: z.string().min(1),
  locale: localeSchema,
  sourcePageTitle: z.string().min(1),
  sourcePageExists: z.boolean(),
  sourceLatestRevisionAt: z.iso.datetime().nullable(),
  sourceRevisionCount: z.number().int().min(0),
  countMethod: z.literal("tx_key_unique_nonempty"),
  qualityStatus: z.enum(["verified", "missing_source"]),
  currentLineCount: z.number().int().min(0),
  perVersionLineCounts: z.array(
    z.object({
      version: z.string().min(1),
      lineCount: z.number().int().min(0),
    }),
  ),
  totalLineCount: z.number().int().min(0),
  sources: z.array(z.url()),
  generatedAt: z.iso.datetime(),
});

export const generatedStatsSchema = z.object({
  generatedAt: z.iso.datetime(),
  rows: z.array(voiceLineStatRowSchema),
});

export const versionHalfRecordSchema = z.object({
  id: z.string().min(1),
  version: z.string().min(1),
  half: versionHalfSchema,
  label: z.string().min(1),
  labelZh: z.string().min(1),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
});

export const storySegmentSchema = z.object({
  id: z.string().min(1),
  wikiTitle: z.string().min(1),
  nameZh: z.string().min(1),
  version: z.string().min(1),
  half: versionHalfSchema,
  versionHalf: z.string().min(1),
  sortOrder: z.number().int().min(0),
});

export const storyAppearanceRowSchema = z.object({
  characterId: z.string().min(1),
  questId: z.string().min(1),
  wikiTitle: z.string().min(1),
  nameZh: z.string().min(1),
  version: z.string().min(1),
  half: versionHalfSchema,
  versionHalf: z.string().min(1),
});

export const storyDialogueRowSchema = z.object({
  locale: encoreStoryLocaleSchema,
  characterId: z.string().min(1),
  questId: z.string().min(1),
  wikiTitle: z.string().min(1),
  nameZh: z.string().min(1),
  version: z.string().min(1),
  half: versionHalfSchema,
  versionHalf: z.string().min(1),
  lineCount: z.number().int().min(0),
  encoreStoryIds: z.array(z.number().int()),
});

export const versionHalfVoiceRowSchema = z.object({
  characterId: z.string().min(1),
  locale: localeSchema,
  versionHalf: z.string().min(1),
  version: z.string().min(1),
  half: versionHalfSchema,
  lineCount: z.number().int().min(0),
});

export const optionalQuestRecordSchema = z.object({
  id: z.string().min(1),
  category: questCategorySchema,
  encoreStoryId: z.number().int(),
  nameZh: z.string().min(1),
  nameEn: z.string().min(1),
});

export const optionalQuestDialogueRowSchema = z.object({
  locale: encoreStoryLocaleSchema,
  category: questCategorySchema,
  characterId: z.string().min(1),
  questId: z.string().min(1),
  questName: z.string().min(1),
  questNameZh: z.string().min(1),
  lineCount: z.number().int().min(0),
  encoreStoryIds: z.array(z.number().int()),
});

export const optionalQuestAppearanceRowSchema = z.object({
  category: questCategorySchema,
  characterId: z.string().min(1),
  questId: z.string().min(1),
  questName: z.string().min(1),
  questNameZh: z.string().min(1),
});

export const optionalQuestCoverageSchema = z.object({
  category: questCategorySchema,
  questCount: z.number().int(),
  questsWithDialogue: z.number().int(),
  questsWithPlayableDialogue: z.number().int(),
  totalRawLines: z.number().int(),
  playableCharacterLines: z.number().int(),
  unmappedLines: z.number().int(),
  playableCharacterCount: z.number().int(),
});

export const optionalQuestUnmappedSpeakerSchema = z.object({
  category: questCategorySchema,
  name: z.string(),
  lineCount: z.number().int(),
});

export const voiceLineDetailRowSchema = z.object({
  characterId: z.string().min(1),
  locale: localeSchema,
  sourcePageTitle: z.string().min(1),
  sourcePageExists: z.boolean(),
  sourceLatestRevisionAt: z.iso.datetime().nullable(),
  sourceRevisionCount: z.number().int().min(0),
  generatedAt: z.iso.datetime(),
  lines: z.array(
    z
      .object({
        key: z.string().min(1),
        text: z.string().min(1),
        sourceFieldPath: z.string().min(1).optional(),
        firstSeenAt: z.iso.datetime().nullable(),
        firstSeenVersion: z.string().nullable(),
      })
      .transform((line) => ({
        ...line,
        sourceFieldPath: line.sourceFieldPath ?? `${line.key}_tx`,
      })),
  ),
});

export const characterWordCloudRowSchema = z.object({
  characterId: z.string().min(1),
  locale: encoreStoryLocaleSchema,
  lineCount: z.number().int().min(0),
  terms: z.array(
    z.object({
      term: z.string().min(1),
      count: z.number().int().min(1),
    }),
  ),
});

/** Persisted / loaded domain types — derived from Zod so parse results stay aligned. */
export type SourceTrace = z.infer<typeof sourceTraceSchema>;
export type Character = z.infer<typeof characterSchema>;
export type CharacterImage = z.infer<typeof characterImageSchema>;
export type VersionRecord = z.infer<typeof versionSchema>;
export type VoiceLineEntry = z.infer<typeof voiceLineEntrySchema>;
export type VoiceLineStatRow = z.infer<typeof voiceLineStatRowSchema>;
export type VoiceLineDetailRow = z.infer<typeof voiceLineDetailRowSchema>;
export type VersionHalfRecord = z.infer<typeof versionHalfRecordSchema>;
export type StorySegment = z.infer<typeof storySegmentSchema>;
export type StoryAppearanceRow = z.infer<typeof storyAppearanceRowSchema>;
export type StoryDialogueRow = z.infer<typeof storyDialogueRowSchema>;
export type VersionHalfVoiceRow = z.infer<typeof versionHalfVoiceRowSchema>;
export type OptionalQuestRecord = z.infer<typeof optionalQuestRecordSchema>;
export type OptionalQuestDialogueRow = z.infer<typeof optionalQuestDialogueRowSchema>;
export type OptionalQuestAppearanceRow = z.infer<typeof optionalQuestAppearanceRowSchema>;
export type OptionalQuestCoverageRow = z.infer<typeof optionalQuestCoverageSchema>;
export type UnmappedSpeakerRow = z.infer<typeof optionalQuestUnmappedSpeakerSchema>;
export type CharacterWordCloudRow = z.infer<typeof characterWordCloudRowSchema>;
