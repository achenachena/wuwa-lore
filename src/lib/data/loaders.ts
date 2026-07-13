import { promises as fs } from "node:fs";
import path from "node:path";
import { cache } from "react";
import { z } from "zod";

import { isRoverCharacter, type EncoreLocale } from "@/lib/i18n/locale";

import type {
  Character,
  CharacterImage,
  OptionalQuestAppearanceRow,
  OptionalQuestDialogueRow,
  OptionalQuestRecord,
  StoryAppearanceRow,
  StoryDialogueRow,
  StorySegment,
  VersionHalfVoiceRow,
  VersionRecord,
  VoiceLineDetailRow,
  VoiceLineStatRow,
  CharacterWordCloudRow,
} from "@/types/lore";
import {
  characterSchema,
  characterImageSchema,
  generatedStatsSchema,
  optionalQuestAppearanceRowSchema,
  optionalQuestDialogueRowSchema,
  optionalQuestRecordSchema,
  questCategorySchema,
  storyAppearanceRowSchema,
  storyDialogueRowSchema,
  storySegmentSchema,
  versionHalfVoiceRowSchema,
  versionSchema,
  voiceLineDetailRowSchema,
  characterWordCloudRowSchema,
} from "@/lib/data/schemas";

const root = process.cwd();
const cacheForever = process.env.NODE_ENV === "production";
const processCache = new Map<string, Promise<unknown>>();

async function readJsonFile<T>(filePath: string): Promise<T> {
  const text = await fs.readFile(filePath, "utf8");
  return JSON.parse(text) as T;
}

function memoize<T>(key: string, loader: () => Promise<T>): Promise<T> {
  if (!cacheForever) {
    return loader();
  }
  const existing = processCache.get(key);
  if (existing) {
    return existing as Promise<T>;
  }
  const promise = loader().catch((error: unknown) => {
    processCache.delete(key);
    throw error;
  });
  processCache.set(key, promise);
  return promise;
}

const optionalQuestCoverageSchema = z.object({
  category: questCategorySchema,
  questCount: z.number().int(),
  questsWithDialogue: z.number().int(),
  questsWithPlayableDialogue: z.number().int(),
  totalRawLines: z.number().int(),
  playableCharacterLines: z.number().int(),
  unmappedLines: z.number().int(),
  playableCharacterCount: z.number().int(),
});

const optionalQuestUnmappedSpeakerSchema = z.object({
  category: questCategorySchema,
  name: z.string(),
  lineCount: z.number().int(),
});

type OptionalQuestDialogueFile = {
  rows: OptionalQuestDialogueRow[];
  coverage: z.infer<typeof optionalQuestCoverageSchema>[] | null;
  unmappedSpeakers: z.infer<typeof optionalQuestUnmappedSpeakerSchema>[] | null;
};

const loadCharactersUncached = async (): Promise<Character[]> => {
  const dir = path.join(root, "content", "characters");
  const files = (await fs.readdir(dir)).filter((name) => name.endsWith(".json"));
  const characters = await Promise.all(
    files.map(async (file) => {
      const data = await readJsonFile<unknown>(path.join(dir, file));
      return characterSchema.parse(data);
    }),
  );
  return characters.sort((a, b) => a.id.localeCompare(b.id));
};

export const loadCharacters = cache((): Promise<Character[]> =>
  memoize("characters", loadCharactersUncached),
);

export const loadCharacterById = cache(async (id: string): Promise<Character | null> => {
  const filePath = path.join(root, "content", "characters", `${id}.json`);
  try {
    const data = await readJsonFile<unknown>(filePath);
    return characterSchema.parse(data);
  } catch {
    return null;
  }
});

export const loadVersions = cache((): Promise<VersionRecord[]> =>
  memoize("versions", async () => {
    const filePath = path.join(root, "content", "versions", "versions.json");
    const raw = await readJsonFile<unknown>(filePath);
    const parsed = versionSchema.array().parse(raw);
    return parsed.sort((a, b) => a.version.localeCompare(b.version, "en"));
  }),
);

export const loadCharacterImages = cache((): Promise<CharacterImage[]> =>
  memoize("character-images", async () => {
    const filePath = path.join(root, "content", "images", "images.json");
    const raw = await readJsonFile<unknown>(filePath);
    const parsed = characterImageSchema.array().parse(raw);
    return parsed.sort((a, b) => a.id.localeCompare(b.id));
  }),
);

export const loadGeneratedStats = cache((): Promise<VoiceLineStatRow[]> =>
  memoize("voice-line-stats", async () => {
    const filePath = path.join(root, "data", "derived", "voice-line-stats.json");
    const raw = await readJsonFile<unknown>(filePath);
    return generatedStatsSchema.parse(raw).rows;
  }),
);

export const loadVoiceLineDetails = cache((): Promise<VoiceLineDetailRow[]> =>
  memoize("voice-line-details", async () => {
    const filePath = path.join(root, "data", "derived", "voice-line-details.json");
    const raw = await readJsonFile<unknown>(filePath);
    return z.object({ rows: z.array(voiceLineDetailRowSchema) }).parse(raw).rows;
  }),
);

const loadWordCloudIndex = cache((): Promise<Map<string, CharacterWordCloudRow>> =>
  memoize("character-word-clouds-index", async () => {
    const filePath = path.join(root, "data", "derived", "character-word-clouds.json");
    const raw = await readJsonFile<unknown>(filePath);
    const parsed = z.object({ rows: z.array(characterWordCloudRowSchema) }).parse(raw);
    const index = new Map<string, CharacterWordCloudRow>();
    for (const row of parsed.rows) {
      index.set(`${row.characterId}::${row.locale}`, row);
    }
    return index;
  }),
);

export const loadCharacterWordCloud = cache(
  async (characterId: string, locale: EncoreLocale): Promise<CharacterWordCloudRow | null> => {
    try {
      const index = await loadWordCloudIndex();
      return index.get(`${characterId}::${locale}`) ?? null;
    } catch {
      return null;
    }
  },
);

export const loadValidationReport = cache(() =>
  memoize("validation-report", () =>
    readJsonFile<{
      generatedAt: string;
      ok: boolean;
      checks: {
        identityValidation: { ok: boolean; errors: string[] };
        statValidation: { ok: boolean; errors: string[] };
        officialValidation?: { ok: boolean; errors: string[] };
      };
    }>(path.join(root, "data", "derived", "validation-report.json")),
  ),
);

export const loadQualityReport = cache(() =>
  memoize("quality-report", () =>
    readJsonFile<{
      generatedAt: string;
      totalCharacters: number;
      expectedRows: number;
      actualRows: number;
      coveredCharacters: number;
      rowsWithContent: number;
      rowsWithoutContent: number;
      verifiedRows: number;
      missingSourceRows: number;
    }>(path.join(root, "data", "derived", "quality-report.json")),
  ),
);

export const loadChangeReport = cache(() =>
  memoize("change-report", () =>
    readJsonFile<{
      generatedAt: string;
      rowCoverage: {
        oldRowCount: number;
        newRowCount: number;
        addedRows: number;
        removedRows: number;
        changedRows: number;
      };
      currentLineCountDelta: {
        increasedRows: number;
        decreasedRows: number;
        unchangedRows: number;
      };
      samples: {
        added: Array<{ key: string; currentLineCount: number }>;
        removed: Array<{ key: string; previousLineCount: number }>;
        changed: Array<{
          key: string;
          previousLineCount: number;
          currentLineCount: number;
          delta: number;
        }>;
      };
    }>(path.join(root, "data", "derived", "change-report.json")),
  ),
);

export const loadOfficialVersionNotes = cache(() =>
  memoize("official-version-notes", () =>
    readJsonFile<{
      sourceName: string;
      sourceUrl: string;
      scrapedAt: string;
      editor: string;
      rows: Array<{
        version: string;
        releaseDate: string;
        noticeUrl: string;
        title: string;
        articleId: number | null;
        matchMethod: string;
      }>;
    }>(path.join(root, "content", "official", "version-notes.json")),
  ),
);

export const loadStorySegments = cache((): Promise<StorySegment[]> =>
  memoize("story-segments", async () => {
    const filePath = path.join(root, "content", "stories", "story-segments.json");
    const raw = await readJsonFile<unknown>(filePath);
    return z.object({ segments: z.array(storySegmentSchema) }).parse(raw).segments;
  }),
);

export const loadStoryAppearances = cache((): Promise<StoryAppearanceRow[]> =>
  memoize("story-appearances", async () => {
    const filePath = path.join(root, "data", "derived", "story-appearances.json");
    const raw = await readJsonFile<unknown>(filePath);
    const parsed = z.object({ rows: z.array(storyAppearanceRowSchema) }).parse(raw);
    return parsed.rows.filter((row) => !isRoverCharacter(row.characterId));
  }),
);

export const loadAllStoryDialogueStats = cache((): Promise<StoryDialogueRow[]> =>
  memoize("story-dialogue-stats", async () => {
    const filePath = path.join(root, "data", "derived", "story-dialogue-stats.json");
    const raw = await readJsonFile<unknown>(filePath);
    return z.object({ rows: z.array(storyDialogueRowSchema) }).parse(raw).rows;
  }),
);

export const loadStoryDialogueStatsForLocale = cache(
  async (locale: EncoreLocale): Promise<StoryDialogueRow[]> => {
    const rows = await loadAllStoryDialogueStats();
    return rows.filter(
      (row) => !isRoverCharacter(row.characterId) && row.locale === locale,
    );
  },
);

/** @deprecated Use loadStoryDialogueStatsForLocale with an explicit locale. */
export const loadStoryDialogueStats = loadStoryDialogueStatsForLocale;

export const loadOptionalQuestCatalog = cache((): Promise<OptionalQuestRecord[]> =>
  memoize("optional-quest-catalog", async () => {
    const filePath = path.join(root, "content", "stories", "optional-quest-catalog.json");
    const raw = await readJsonFile<unknown>(filePath);
    return z.object({ quests: z.array(optionalQuestRecordSchema) }).parse(raw).quests;
  }),
);

const loadOptionalQuestDialogueFile = cache((): Promise<OptionalQuestDialogueFile> =>
  memoize("optional-quest-dialogue-file", async () => {
    const filePath = path.join(root, "data", "derived", "optional-quest-dialogue-stats.json");
    const raw = await readJsonFile<unknown>(filePath);
    const parsed = z
      .object({
        rows: z.array(optionalQuestDialogueRowSchema),
        source: z
          .object({
            coverage: z.array(optionalQuestCoverageSchema).optional(),
            unmappedSpeakers: z.array(optionalQuestUnmappedSpeakerSchema).optional(),
          })
          .optional(),
      })
      .parse(raw);
    return {
      rows: parsed.rows,
      coverage: parsed.source?.coverage ?? null,
      unmappedSpeakers: parsed.source?.unmappedSpeakers ?? null,
    };
  }),
);

export const loadOptionalQuestDialogueStatsForLocale = cache(
  async (locale: EncoreLocale): Promise<OptionalQuestDialogueRow[]> => {
    const file = await loadOptionalQuestDialogueFile();
    return file.rows.filter(
      (row) => !isRoverCharacter(row.characterId) && row.locale === locale,
    );
  },
);

/** @deprecated Use loadOptionalQuestDialogueStatsForLocale with an explicit locale. */
export const loadOptionalQuestDialogueStats = loadOptionalQuestDialogueStatsForLocale;

export const loadOptionalQuestCoverage = cache(async () => {
  const file = await loadOptionalQuestDialogueFile();
  return file.coverage;
});

export const loadOptionalQuestUnmappedSpeakers = cache(async () => {
  const file = await loadOptionalQuestDialogueFile();
  return file.unmappedSpeakers;
});

export const loadOptionalQuestAppearances = cache((): Promise<OptionalQuestAppearanceRow[]> =>
  memoize("optional-quest-appearances", async () => {
    const filePath = path.join(root, "data", "derived", "optional-quest-appearances.json");
    const raw = await readJsonFile<unknown>(filePath);
    const parsed = z.object({ rows: z.array(optionalQuestAppearanceRowSchema) }).parse(raw);
    return parsed.rows.filter((row) => !isRoverCharacter(row.characterId));
  }),
);

export const loadVersionHalfVoiceStats = cache((): Promise<VersionHalfVoiceRow[]> =>
  memoize("version-half-voice-stats", async () => {
    const filePath = path.join(root, "data", "derived", "version-half-voice-stats.json");
    const raw = await readJsonFile<unknown>(filePath);
    return z.object({ rows: z.array(versionHalfVoiceRowSchema) }).parse(raw).rows;
  }),
);

export const loadSourceDiffReport = cache(() =>
  memoize("source-diff-report", () =>
    readJsonFile<{
      generatedAt: string;
      toleranceMinutes?: number;
      sources: {
        fandomVersionsFile: string;
        officialVersionsFile: string;
        officialSourceUrl: string;
        officialSourceName?: string;
      };
      summary: {
        fandomVersionCount: number;
        officialVersionCount: number;
        missingInOfficial: number;
        missingInFandom: number;
        alignedDate?: number;
        mismatchedDate: number;
        ok: boolean;
      };
      missingInOfficial: string[];
      missingInFandom: string[];
      alignedDate?: string[];
      mismatchedDate: Array<{
        version: string;
        fandomReleaseDate: string;
        officialReleaseDate: string;
        deltaMinutes: number;
        noticeUrl: string;
        officialMatchMethod?: string | null;
      }>;
    }>(path.join(root, "data", "derived", "source-diff-report.json")),
  ),
);
