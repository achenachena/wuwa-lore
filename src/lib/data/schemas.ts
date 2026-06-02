import { z } from "zod";

export const localeSchema = z.enum(["zh-CN", "en-US", "ja-JP", "ko-KR"]);

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
  type: z.enum(["portrait", "card", "splash", "other"]),
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
