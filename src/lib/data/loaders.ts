import { promises as fs } from "node:fs";
import { cache } from "react";
import { z } from "zod";

import {
  dataPath,
  defineLoader,
  defineParsedJsonLoader,
  readJsonFile,
} from "@/lib/data/loaders-helpers";
import {
  characterImageSchema,
  characterSchema,
  characterWordCloudRowSchema,
  generatedStatsSchema,
  optionalQuestAppearanceRowSchema,
  optionalQuestCoverageSchema,
  optionalQuestDialogueRowSchema,
  optionalQuestRecordSchema,
  optionalQuestUnmappedSpeakerSchema,
  storyAppearanceRowSchema,
  storyDialogueRowSchema,
  storySegmentSchema,
  versionHalfVoiceRowSchema,
  versionSchema,
  voiceLineDetailRowSchema,
  type Character,
  type CharacterImage,
  type CharacterWordCloudRow,
  type OptionalQuestAppearanceRow,
  type OptionalQuestCoverageRow,
  type OptionalQuestDialogueRow,
  type OptionalQuestRecord,
  type StoryAppearanceRow,
  type StoryDialogueRow,
  type StorySegment,
  type UnmappedSpeakerRow,
  type VersionHalfVoiceRow,
  type VersionRecord,
  type VoiceLineDetailRow,
  type VoiceLineStatRow,
} from "@/lib/data/schemas";
import { isRoverCharacter, type EncoreLocale } from "@/lib/i18n/locale";

type OptionalQuestDialogueFile = {
  rows: OptionalQuestDialogueRow[];
  coverage: OptionalQuestCoverageRow[] | null;
  unmappedSpeakers: UnmappedSpeakerRow[] | null;
};

export const loadCharacters = defineLoader("characters", async () => {
  const dir = dataPath("content", "characters");
  const files = (await fs.readdir(dir)).filter((name) => name.endsWith(".json"));
  const characters = await Promise.all(
    files.map(async (file) => {
      const data = await readJsonFile<unknown>(dataPath("content", "characters", file));
      return characterSchema.parse(data);
    }),
  );
  return characters.sort((a, b) => a.id.localeCompare(b.id));
});

export const loadCharacterById = cache(async (id: string): Promise<Character | null> => {
  try {
    const data = await readJsonFile<unknown>(dataPath("content", "characters", `${id}.json`));
    return characterSchema.parse(data);
  } catch {
    return null;
  }
});

export const loadVersions = defineParsedJsonLoader(
  "versions",
  "content/versions/versions.json",
  (raw): VersionRecord[] =>
    versionSchema
      .array()
      .parse(raw)
      .sort((a, b) => a.version.localeCompare(b.version, "en")),
);

export const loadCharacterImages = defineParsedJsonLoader(
  "character-images",
  "content/images/images.json",
  (raw): CharacterImage[] =>
    characterImageSchema
      .array()
      .parse(raw)
      .sort((a, b) => a.id.localeCompare(b.id)),
);

export const loadGeneratedStats = defineParsedJsonLoader(
  "voice-line-stats",
  "data/derived/voice-line-stats.json",
  (raw): VoiceLineStatRow[] => generatedStatsSchema.parse(raw).rows,
);

export const loadVoiceLineDetails = defineParsedJsonLoader(
  "voice-line-details",
  "data/derived/voice-line-details.json",
  (raw): VoiceLineDetailRow[] =>
    z.object({ rows: z.array(voiceLineDetailRowSchema) }).parse(raw).rows,
);

const loadWordCloudIndex = defineParsedJsonLoader(
  "character-word-clouds-index",
  "data/derived/character-word-clouds.json",
  (raw): Map<string, CharacterWordCloudRow> => {
    const parsed = z.object({ rows: z.array(characterWordCloudRowSchema) }).parse(raw);
    const index = new Map<string, CharacterWordCloudRow>();
    for (const row of parsed.rows) {
      index.set(`${row.characterId}::${row.locale}`, row);
    }
    return index;
  },
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

export const loadValidationReport = defineLoader("validation-report", () =>
  readJsonFile<{
    generatedAt: string;
    ok: boolean;
    checks: {
      identityValidation: { ok: boolean; errors: string[] };
      statValidation: { ok: boolean; errors: string[] };
      officialValidation?: { ok: boolean; errors: string[] };
    };
  }>(dataPath("data", "derived", "validation-report.json")),
);

export const loadQualityReport = defineLoader("quality-report", () =>
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
  }>(dataPath("data", "derived", "quality-report.json")),
);

export const loadChangeReport = defineLoader("change-report", () =>
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
  }>(dataPath("data", "derived", "change-report.json")),
);

export const loadOfficialVersionNotes = defineLoader("official-version-notes", () =>
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
  }>(dataPath("content", "official", "version-notes.json")),
);

export const loadStorySegments = defineParsedJsonLoader(
  "story-segments",
  "content/stories/story-segments.json",
  (raw): StorySegment[] =>
    z.object({ segments: z.array(storySegmentSchema) }).parse(raw).segments,
);

export const loadStoryAppearances = defineParsedJsonLoader(
  "story-appearances",
  "data/derived/story-appearances.json",
  (raw): StoryAppearanceRow[] =>
    z
      .object({ rows: z.array(storyAppearanceRowSchema) })
      .parse(raw)
      .rows.filter((row) => !isRoverCharacter(row.characterId)),
);

export const loadAllStoryDialogueStats = defineParsedJsonLoader(
  "story-dialogue-stats",
  "data/derived/story-dialogue-stats.json",
  (raw): StoryDialogueRow[] =>
    z.object({ rows: z.array(storyDialogueRowSchema) }).parse(raw).rows,
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

export const loadOptionalQuestCatalog = defineParsedJsonLoader(
  "optional-quest-catalog",
  "content/stories/optional-quest-catalog.json",
  (raw): OptionalQuestRecord[] =>
    z.object({ quests: z.array(optionalQuestRecordSchema) }).parse(raw).quests,
);

const loadOptionalQuestDialogueFile = defineParsedJsonLoader(
  "optional-quest-dialogue-file",
  "data/derived/optional-quest-dialogue-stats.json",
  (raw): OptionalQuestDialogueFile => {
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
  },
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

export const loadOptionalQuestAppearances = defineParsedJsonLoader(
  "optional-quest-appearances",
  "data/derived/optional-quest-appearances.json",
  (raw): OptionalQuestAppearanceRow[] =>
    z
      .object({ rows: z.array(optionalQuestAppearanceRowSchema) })
      .parse(raw)
      .rows.filter((row) => !isRoverCharacter(row.characterId)),
);

export const loadVersionHalfVoiceStats = defineParsedJsonLoader(
  "version-half-voice-stats",
  "data/derived/version-half-voice-stats.json",
  (raw): VersionHalfVoiceRow[] =>
    z.object({ rows: z.array(versionHalfVoiceRowSchema) }).parse(raw).rows,
);

export const loadSourceDiffReport = defineLoader("source-diff-report", () =>
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
  }>(dataPath("data", "derived", "source-diff-report.json")),
);
