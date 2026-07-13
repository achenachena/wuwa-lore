import { cache } from "react";

import { countQuestsByCategory } from "@/lib/data/quest-categories";
import {
  aggregateVersionStats,
  appearanceKey,
  buildAppearanceIndex,
  buildDialogueIndex,
  buildOptionalQuestRanking,
  didCharacterAppearInQuest,
} from "@/lib/data/aggregate";
import {
  loadCharacters,
  loadGeneratedStats,
  loadOptionalQuestAppearances,
  loadOptionalQuestCatalog,
  loadOptionalQuestCoverage,
  loadOptionalQuestDialogueStatsForLocale,
  loadOptionalQuestUnmappedSpeakers,
  loadStoryAppearances,
  loadStoryDialogueStatsForLocale,
  loadStorySegments,
  loadVersions,
} from "@/lib/data/loaders";
import { filterVoiceStatsForSite, getCharacterPortraitMap } from "@/lib/data/queries/shared";
import { getCharacterDisplayNameMap } from "@/lib/i18n/character-names";
import { isRoverCharacter, toEncoreLocale } from "@/lib/i18n/locale";
import { getSiteLocale } from "@/lib/i18n/server";
import type { QuestCategory } from "@/types/lore";

export const getOptionalQuestStatsPageData = cache(
  async (category: QuestCategory = "companion") => {
    const siteLocale = await getSiteLocale();
    const encoreLocale = toEncoreLocale(siteLocale);

    const [
      characters,
      quests,
      appearances,
      dialogueStats,
      coverage,
      unmappedSpeakers,
      portraits,
    ] = await Promise.all([
      loadCharacters(),
      loadOptionalQuestCatalog(),
      loadOptionalQuestAppearances(),
      loadOptionalQuestDialogueStatsForLocale(encoreLocale),
      loadOptionalQuestCoverage(),
      loadOptionalQuestUnmappedSpeakers(),
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
  },
);

export const getVersionStatsPageData = cache(async () => {
  const siteLocale = await getSiteLocale();
  const encoreLocale = toEncoreLocale(siteLocale);

  const [versions, characters, stats, storyDialogueStats] = await Promise.all([
    loadVersions(),
    loadCharacters(),
    loadGeneratedStats(),
    loadStoryDialogueStatsForLocale(encoreLocale),
  ]);
  const voiceStats = filterVoiceStatsForSite(stats, siteLocale);
  return aggregateVersionStats({
    versions,
    characters,
    voiceStats,
    storyDialogueStats,
  });
});

export const getVersionHalfStatsPageData = cache(
  async (params?: { fromVersion?: string; toVersion?: string }) => {
    const siteLocale = await getSiteLocale();
    const encoreLocale = toEncoreLocale(siteLocale);

    const [
      characters,
      storySegments,
      storyAppearances,
      storyDialogueStats,
      versions,
      portraits,
    ] = await Promise.all([
      loadCharacters(),
      loadStorySegments(),
      loadStoryAppearances(),
      loadStoryDialogueStatsForLocale(encoreLocale),
      loadVersions(),
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
  },
);
