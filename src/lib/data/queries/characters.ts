import { cache } from "react";

import { QUEST_CATEGORIES } from "@/lib/data/quest-categories";
import {
  buildCharacterOptionalQuestRows,
  buildCharacterStorySegmentRows,
  buildFirstAppearanceVersionMap,
  getFirstAppearanceVersion,
  sumOptionalDialogueByCharacter,
  sumStoryDialogueByCharacter,
} from "@/lib/data/aggregate";
import {
  loadCharacterById,
  loadCharacterImages,
  loadCharacterWordCloud,
  loadCharacters,
  loadGeneratedStats,
  loadOptionalQuestAppearances,
  loadOptionalQuestCatalog,
  loadOptionalQuestDialogueStatsForLocale,
  loadStoryAppearances,
  loadStoryDialogueStatsForLocale,
  loadStorySegments,
  loadVersions,
} from "@/lib/data/loaders";
import { filterVoiceStatsForSite, getCharacterPortraitMap } from "@/lib/data/queries/shared";
import { isRoverCharacter, toEncoreLocale } from "@/lib/i18n/locale";
import { getSiteLocale } from "@/lib/i18n/server";

export const getCharacterLineTotalsForSite = cache(async () => {
  const siteLocale = await getSiteLocale();
  const encoreLocale = toEncoreLocale(siteLocale);

  const [stats, storyDialogue, optionalDialogue] = await Promise.all([
    loadGeneratedStats(),
    loadStoryDialogueStatsForLocale(encoreLocale),
    loadOptionalQuestDialogueStatsForLocale(encoreLocale),
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
});

export const getHomeSummary = cache(async () => {
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
});

export const getCharacterAppearanceVersionMap = cache(async () => {
  const [characters, segments, storyAppearances, siteLocale] = await Promise.all([
    loadCharacters(),
    loadStorySegments(),
    loadStoryAppearances(),
    getSiteLocale(),
  ]);
  const storyDialogueStats = await loadStoryDialogueStatsForLocale(
    toEncoreLocale(siteLocale),
  );
  return buildFirstAppearanceVersionMap({
    characters,
    segments,
    storyAppearances,
    storyDialogueStats,
  });
});

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
    loadStoryDialogueStatsForLocale(encoreLocale),
    loadOptionalQuestCatalog(),
    loadOptionalQuestAppearances(),
    loadOptionalQuestDialogueStatsForLocale(encoreLocale),
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
