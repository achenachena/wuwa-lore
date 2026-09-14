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
  optionalQuestDialogueRowSchema,
  optionalQuestRecordSchema,
  storyAppearanceRowSchema,
  storyDialogueRowSchema,
  storySegmentSchema,
  versionSchema,
  voiceLineDetailRowSchema,
  type Character,
  type CharacterImage,
  type CharacterWordCloudRow,
  type OptionalQuestAppearanceRow,
  type OptionalQuestDialogueRow,
  type OptionalQuestRecord,
  type StoryAppearanceRow,
  type StoryDialogueRow,
  type StorySegment,
  type VersionRecord,
  type VoiceLineDetailRow,
  type VoiceLineStatRow,
} from "@/lib/data/schemas";
import { isRoverCharacter, type EncoreLocale } from "@/lib/i18n/locale";

export const loadCharacters = defineLoader(async () => {
  const dir = dataPath("content", "characters");
  const files = (await fs.readdir(dir)).filter((name) =>
    name.endsWith(".json"),
  );
  const characters = await Promise.all(
    files.map(async (file) => {
      const data = await readJsonFile<unknown>(
        dataPath("content", "characters", file),
      );
      return characterSchema.parse(data);
    }),
  );
  return characters.sort((a, b) => a.id.localeCompare(b.id));
});

export const loadCharacterById = cache(
  async (id: string): Promise<Character | null> => {
    try {
      const data = await readJsonFile<unknown>(
        dataPath("content", "characters", `${id}.json`),
      );
      return characterSchema.parse(data);
    } catch {
      return null;
    }
  },
);

export const loadVersions = defineParsedJsonLoader(
  "content/versions/versions.json",
  (raw): VersionRecord[] =>
    versionSchema
      .array()
      .parse(raw)
      .sort((a, b) => a.version.localeCompare(b.version, "en")),
);

export const loadCharacterImages = defineParsedJsonLoader(
  "content/images/images.json",
  (raw): CharacterImage[] =>
    characterImageSchema
      .array()
      .parse(raw)
      .sort((a, b) => a.id.localeCompare(b.id)),
);

export const loadGeneratedStats = defineParsedJsonLoader(
  "data/derived/voice-line-stats.json",
  (raw): VoiceLineStatRow[] => generatedStatsSchema.parse(raw).rows,
);

export const loadVoiceLineDetails = defineParsedJsonLoader(
  "data/derived/voice-line-details.json",
  (raw): VoiceLineDetailRow[] =>
    z.object({ rows: z.array(voiceLineDetailRowSchema) }).parse(raw).rows,
);

const loadWordCloudIndex = defineParsedJsonLoader(
  "data/derived/character-word-clouds.json",
  (raw): Map<string, CharacterWordCloudRow> => {
    const parsed = z
      .object({ rows: z.array(characterWordCloudRowSchema) })
      .parse(raw);
    const index = new Map<string, CharacterWordCloudRow>();
    for (const row of parsed.rows) {
      index.set(`${row.characterId}::${row.locale}`, row);
    }
    return index;
  },
);

export const loadCharacterWordCloud = cache(
  async (
    characterId: string,
    locale: EncoreLocale,
  ): Promise<CharacterWordCloudRow | null> => {
    try {
      const index = await loadWordCloudIndex();
      return index.get(`${characterId}::${locale}`) ?? null;
    } catch {
      return null;
    }
  },
);

export const loadStorySegments = defineParsedJsonLoader(
  "content/stories/story-segments.json",
  (raw): StorySegment[] =>
    z.object({ segments: z.array(storySegmentSchema) }).parse(raw).segments,
);

export const loadStoryAppearances = defineParsedJsonLoader(
  "data/derived/story-appearances.json",
  (raw): StoryAppearanceRow[] =>
    z
      .object({ rows: z.array(storyAppearanceRowSchema) })
      .parse(raw)
      .rows.filter((row) => !isRoverCharacter(row.characterId)),
);

export const loadAllStoryDialogueStats = defineParsedJsonLoader(
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

export const loadOptionalQuestCatalog = defineParsedJsonLoader(
  "content/stories/optional-quest-catalog.json",
  (raw): OptionalQuestRecord[] =>
    z.object({ quests: z.array(optionalQuestRecordSchema) }).parse(raw).quests,
);

const loadOptionalQuestDialogueRows = defineParsedJsonLoader(
  "data/derived/optional-quest-dialogue-stats.json",
  (raw): OptionalQuestDialogueRow[] =>
    z.object({ rows: z.array(optionalQuestDialogueRowSchema) }).parse(raw).rows,
);

export const loadOptionalQuestDialogueStatsForLocale = cache(
  async (locale: EncoreLocale): Promise<OptionalQuestDialogueRow[]> => {
    const rows = await loadOptionalQuestDialogueRows();
    return rows.filter(
      (row) => !isRoverCharacter(row.characterId) && row.locale === locale,
    );
  },
);

export const loadOptionalQuestAppearances = defineParsedJsonLoader(
  "data/derived/optional-quest-appearances.json",
  (raw): OptionalQuestAppearanceRow[] =>
    z
      .object({ rows: z.array(optionalQuestAppearanceRowSchema) })
      .parse(raw)
      .rows.filter((row) => !isRoverCharacter(row.characterId)),
);
