import { cache } from "react";

import {
  QUEST_CATEGORIES,
  countQuestsByCategory,
} from "@/lib/data/quest-categories";
import {
  aggregateVersionStats,
  appearanceKey,
  buildAppearanceIndex,
  buildCharacterOptionalQuestRows,
  buildCharacterStorySegmentRows,
  buildDialogueIndex,
  buildFirstAppearanceVersionMap,
  buildOptionalQuestRanking,
  didCharacterAppearInQuest,
  getFirstAppearanceVersion,
  sumOptionalDialogueByCharacter,
  sumStoryDialogueByCharacter,
} from "@/lib/data/aggregate";
import {
  loadCharacterById,
  loadCharacterImages,
  loadCharacters,
  loadCharacterWordCloud,
  loadGeneratedStats,
  loadOptionalQuestAppearances,
  loadOptionalQuestCatalog,
  loadOptionalQuestCoverage,
  loadOptionalQuestDialogueStats,
  loadOptionalQuestUnmappedSpeakers,
  loadStoryAppearances,
  loadStoryDialogueStats,
  loadStorySegments,
  loadVersions,
} from "@/lib/data/loaders";
import { getCharacterDisplayNameMap } from "@/lib/i18n/character-names";
import {
  isRoverCharacter,
  toEncoreLocale,
  toVoiceDataLocale,
  type SiteLocale,
} from "@/lib/i18n/locale";
import { getSiteLocale } from "@/lib/i18n/server";
import type { ImageType, QuestCategory, VoiceLineStatRow } from "@/types/lore";

function filterVoiceStatsForSite(
  stats: VoiceLineStatRow[],
  siteLocale: SiteLocale,
): VoiceLineStatRow[] {
  const locale = toVoiceDataLocale(siteLocale);
  return stats.filter((row) => row.locale === locale);
}

export const getCharacterPortraitMap = cache(
  async (): Promise<Map<string, string>> => {
    const images = await loadCharacterImages();
    const priority: Record<ImageType, number> = {
      portrait: 0,
      card: 1,
      splash: 2,
      other: 3,
    };
    const map = new Map<string, { path: string; rank: number }>();

    for (const image of images) {
      const rank = priority[image.type];
      const current = map.get(image.characterId);
      if (!current || rank < current.rank) {
        map.set(image.characterId, { path: image.localPath, rank });
      }
    }

    return new Map(
      [...map.entries()].map(([characterId, value]) => [
        characterId,
        value.path,
      ]),
    );
  },
);

export async function getCharacterLineTotalsForSite(): Promise<
  Map<
    string,
    {
      profileLines: number;
      storyLines: number;
      companionLines: number;
      eventLines: number;
      sideLines: number;
      totalLines: number;
    }
  >
> {
  const [stats, storyDialogue, optionalDialogue, siteLocale] =
    await Promise.all([
      loadGeneratedStats(),
      loadStoryDialogueStats(),
      loadOptionalQuestDialogueStats(),
      getSiteLocale(),
    ]);
  const voiceStats = filterVoiceStatsForSite(stats, siteLocale);
  const storyByCharacter = sumStoryDialogueByCharacter(storyDialogue);
  const optionalByCategory = Object.fromEntries(
    QUEST_CATEGORIES.map((category) => [
      category,
      sumOptionalDialogueByCharacter(optionalDialogue, category),
    ]),
  ) as Record<(typeof QUEST_CATEGORIES)[number], Map<string, number>>;

  type TotalsBucket = {
    profileLines: number;
    storyLines: number;
    companionLines: number;
    eventLines: number;
    sideLines: number;
    totalLines: number;
  };

  const emptyBucket = (): TotalsBucket => ({
    profileLines: 0,
    storyLines: 0,
    companionLines: 0,
    eventLines: 0,
    sideLines: 0,
    totalLines: 0,
  });

  const totals = new Map<string, TotalsBucket>();

  function ensure(characterId: string): TotalsBucket {
    const current = totals.get(characterId) ?? emptyBucket();
    totals.set(characterId, current);
    return current;
  }

  function applyMap(
    source: Map<string, number>,
    assign: (bucket: TotalsBucket, value: number) => void,
  ) {
    for (const [characterId, value] of source) {
      if (isRoverCharacter(characterId)) {
        continue;
      }
      assign(ensure(characterId), value);
    }
  }

  for (const row of voiceStats) {
    if (isRoverCharacter(row.characterId)) {
      continue;
    }
    ensure(row.characterId).profileLines = row.totalLineCount;
  }

  applyMap(storyByCharacter, (bucket, value) => {
    bucket.storyLines = value;
  });

  for (const category of QUEST_CATEGORIES) {
    const field = `${category}Lines` as const;
    applyMap(optionalByCategory[category], (bucket, value) => {
      bucket[field] = value;
    });
  }

  for (const bucket of totals.values()) {
    bucket.totalLines =
      bucket.profileLines +
      bucket.storyLines +
      QUEST_CATEGORIES.reduce(
        (sum, category) => sum + bucket[`${category}Lines`],
        0,
      );
  }

  return totals;
}

export async function getHomeSummary() {
  const [characters, versions, lineTotals] = await Promise.all([
    loadCharacters(),
    loadVersions(),
    getCharacterLineTotalsForSite(),
  ]);
  let totalLines = 0;
  for (const row of lineTotals.values()) {
    totalLines += row.totalLines;
  }
  return {
    characterCount: characters.filter(
      (character) => !isRoverCharacter(character.id),
    ).length,
    versionCount: versions.length,
    totalLines,
  };
}

export async function getCharacterAppearanceVersionMap(): Promise<
  Map<string, string | null>
> {
  const [characters, segments, storyAppearances, storyDialogueStats] =
    await Promise.all([
      loadCharacters(),
      loadStorySegments(),
      loadStoryAppearances(),
      loadStoryDialogueStats(),
    ]);
  return buildFirstAppearanceVersionMap({
    characters,
    segments,
    storyAppearances,
    storyDialogueStats,
  });
}

export async function getCharacterListData() {
  return loadCharacters();
}

export const getCharacterDetailData = cache(async (id: string) => {
  const siteLocale = await getSiteLocale();
  const encoreLocale = toEncoreLocale(siteLocale);

  const [
    character,
    images,
    storySegments,
    storyAppearances,
    storyDialogueStats,
    optionalQuests,
    optionalAppearances,
    optionalDialogueStats,
    portraits,
    wordCloud,
  ] = await Promise.all([
    loadCharacterById(id),
    loadCharacterImages(),
    loadStorySegments(),
    loadStoryAppearances(),
    loadStoryDialogueStats(),
    loadOptionalQuestCatalog(),
    loadOptionalQuestAppearances(),
    loadOptionalQuestDialogueStats(),
    getCharacterPortraitMap(),
    loadCharacterWordCloud(id, encoreLocale),
  ]);

  const characterImages = images.filter((item) => item.characterId === id);
  const characterStorySegments = buildCharacterStorySegmentRows({
    characterId: id,
    segments: storySegments,
    storyAppearances,
    storyDialogueStats,
  });
  const firstAppearanceVersion = character
    ? getFirstAppearanceVersion({
        characterId: id,
        segments: storySegments,
        storyAppearances,
        storyDialogueStats,
      })
    : null;

  const optionalQuestStats = QUEST_CATEGORIES.map((category) => ({
    category,
    rows: buildCharacterOptionalQuestRows({
      characterId: id,
      category,
      quests: optionalQuests,
      appearances: optionalAppearances,
      dialogueStats: optionalDialogueStats,
    }),
  }));

  return {
    character,
    characterImages,
    storySegments: characterStorySegments,
    optionalQuestStats,
    portraitUrl: portraits.get(id) ?? null,
    firstAppearanceVersion,
    wordCloud,
  };
});

export async function getOptionalQuestStatsPageData(
  category: QuestCategory = "companion",
) {
  const [
    characters,
    quests,
    appearances,
    dialogueStats,
    coverage,
    unmappedSpeakers,
    siteLocale,
    portraits,
  ] = await Promise.all([
    loadCharacters(),
    loadOptionalQuestCatalog(),
    loadOptionalQuestAppearances(),
    loadOptionalQuestDialogueStats(),
    loadOptionalQuestCoverage(),
    loadOptionalQuestUnmappedSpeakers(),
    getSiteLocale(),
    getCharacterPortraitMap(),
  ]);
  const displayNames = await getCharacterDisplayNameMap(siteLocale);
  const playableCharacters = characters.filter(
    (character) => !isRoverCharacter(character.id),
  );

  const ranking = buildOptionalQuestRanking({
    characters: playableCharacters,
    category,
    quests,
    appearances,
    dialogueStats,
  }).map((row) => ({
    ...row,
    characterName: displayNames.get(row.characterId) ?? row.characterName,
  }));

  return {
    category,
    quests: quests.filter((quest) => quest.category === category),
    ranking,
    coverage,
    unmappedSpeakers,
    characterPortraits: Object.fromEntries(portraits),
    questCounts: countQuestsByCategory(quests),
  };
}

export async function getVersionStatsPageData() {
  const [versions, characters, stats, storyDialogueStats, siteLocale] =
    await Promise.all([
      loadVersions(),
      loadCharacters(),
      loadGeneratedStats(),
      loadStoryDialogueStats(),
      getSiteLocale(),
    ]);
  const voiceStats = filterVoiceStatsForSite(stats, siteLocale);
  return aggregateVersionStats({
    versions,
    characters,
    voiceStats,
    storyDialogueStats,
  });
}

export async function getVersionHalfStatsPageData(params?: {
  fromVersion?: string;
  toVersion?: string;
}) {
  const [
    characters,
    storySegments,
    storyAppearances,
    storyDialogueStats,
    versions,
    siteLocale,
    portraits,
  ] = await Promise.all([
    loadCharacters(),
    loadStorySegments(),
    loadStoryAppearances(),
    loadStoryDialogueStats(),
    loadVersions(),
    getSiteLocale(),
    getCharacterPortraitMap(),
  ]);
  const displayNames = await getCharacterDisplayNameMap(siteLocale);
  const playableCharacters = characters.filter(
    (character) => !isRoverCharacter(character.id),
  );

  const fromVersion = params?.fromVersion ?? versions[0]?.version ?? "1.0";
  const toVersion =
    params?.toVersion ?? versions[versions.length - 1]?.version ?? "3.5";

  const appearanceIndex = buildAppearanceIndex(storyAppearances);
  const dialogueIndex = buildDialogueIndex(storyDialogueStats);

  const matrix = playableCharacters.map((character) => ({
    character: {
      id: character.id,
      name: displayNames.get(character.id) ?? character.name,
      releaseVersion: character.releaseVersion,
    },
    cells: storySegments.flatMap((segment) => {
      const dialogueLineCount =
        dialogueIndex.get(appearanceKey(character.id, segment.id)) ?? 0;
      const appeared = didCharacterAppearInQuest({
        characterId: character.id,
        questId: segment.id,
        storyAppearances,
        dialogueLineCount,
        appearanceIndex,
      });

      if (!appeared && dialogueLineCount <= 0) {
        return [];
      }

      return [{ segmentId: segment.id, appeared, dialogueLineCount }];
    }),
  }));

  return {
    fromVersion,
    toVersion,
    storySegments,
    matrix,
    characterPortraits: Object.fromEntries(portraits),
  };
}
