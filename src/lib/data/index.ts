import { cache } from "react";

import {
  aggregateVersionStats,
  appearanceKey,
  buildAppearanceIndex,
  buildCharacterOptionalQuestRows,
  buildCharacterStorySegmentRows,
  buildDialogueIndex,
  buildFirstAppearanceVersionMap,
  buildOptionalQuestRanking,
  buildStorySegmentRanking,
  didCharacterAppearInQuest,
  filterStorySegmentsByRange,
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

function filterVoiceStatsForSite(stats: VoiceLineStatRow[], siteLocale: SiteLocale): VoiceLineStatRow[] {
  const locale = toVoiceDataLocale(siteLocale);
  return stats.filter((row) => row.locale === locale);
}

export const getCharacterPortraitMap = cache(async (): Promise<Map<string, string>> => {
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

  return new Map([...map.entries()].map(([characterId, value]) => [characterId, value.path]));
});

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
  const [stats, storyDialogue, optionalDialogue, siteLocale] = await Promise.all([
    loadGeneratedStats(),
    loadStoryDialogueStats(),
    loadOptionalQuestDialogueStats(),
    getSiteLocale(),
  ]);
  const voiceStats = filterVoiceStatsForSite(stats, siteLocale);
  const storyByCharacter = sumStoryDialogueByCharacter(storyDialogue);
  const companionByCharacter = sumOptionalDialogueByCharacter(optionalDialogue, "companion");
  const eventByCharacter = sumOptionalDialogueByCharacter(optionalDialogue, "event");
  const sideByCharacter = sumOptionalDialogueByCharacter(optionalDialogue, "side");
  const totals = new Map<
    string,
    {
      profileLines: number;
      storyLines: number;
      companionLines: number;
      eventLines: number;
      sideLines: number;
      totalLines: number;
    }
  >();

  function ensure(characterId: string) {
    const current = totals.get(characterId) ?? {
      profileLines: 0,
      storyLines: 0,
      companionLines: 0,
      eventLines: 0,
      sideLines: 0,
      totalLines: 0,
    };
    totals.set(characterId, current);
    return current;
  }

  for (const row of voiceStats) {
    if (isRoverCharacter(row.characterId)) {
      continue;
    }
    ensure(row.characterId).profileLines = row.totalLineCount;
  }

  for (const [characterId, storyLines] of storyByCharacter) {
    if (isRoverCharacter(characterId)) {
      continue;
    }
    ensure(characterId).storyLines = storyLines;
  }
  for (const [characterId, lines] of companionByCharacter) {
    if (!isRoverCharacter(characterId)) {
      ensure(characterId).companionLines = lines;
    }
  }
  for (const [characterId, lines] of eventByCharacter) {
    if (!isRoverCharacter(characterId)) {
      ensure(characterId).eventLines = lines;
    }
  }
  for (const [characterId, lines] of sideByCharacter) {
    if (!isRoverCharacter(characterId)) {
      ensure(characterId).sideLines = lines;
    }
  }

  for (const [characterId, bucket] of totals) {
    bucket.totalLines =
      bucket.profileLines +
      bucket.storyLines +
      bucket.companionLines +
      bucket.eventLines +
      bucket.sideLines;
    totals.set(characterId, bucket);
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
    characterCount: characters.filter((character) => !isRoverCharacter(character.id)).length,
    versionCount: versions.length,
    totalLines,
  };
}

export async function getCharacterAppearanceVersionMap(): Promise<Map<string, string | null>> {
  const [characters, segments, storyAppearances, storyDialogueStats] = await Promise.all([
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

  const optionalQuestStats = (["companion", "event", "side"] as QuestCategory[]).map((category) => ({
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

export async function getOptionalQuestStatsPageData(category: QuestCategory = "companion") {
  const [characters, quests, appearances, dialogueStats, coverage, unmappedSpeakers, siteLocale, portraits] =
    await Promise.all([
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
  const playableCharacters = characters.filter((character) => !isRoverCharacter(character.id));

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

  const questCounts = {
    companion: 0,
    event: 0,
    side: 0,
  } satisfies Record<QuestCategory, number>;
  for (const quest of quests) {
    questCounts[quest.category] += 1;
  }

  return {
    category,
    quests: quests.filter((quest) => quest.category === category),
    ranking,
    coverage,
    unmappedSpeakers,
    characterPortraits: Object.fromEntries(portraits),
    questCounts,
  };
}

export async function getVersionStatsPageData() {
  const [versions, characters, stats, storyDialogueStats, siteLocale] = await Promise.all([
    loadVersions(),
    loadCharacters(),
    loadGeneratedStats(),
    loadStoryDialogueStats(),
    getSiteLocale(),
  ]);
  const voiceStats = filterVoiceStatsForSite(stats, siteLocale);
  return aggregateVersionStats({ versions, characters, voiceStats, storyDialogueStats });
}

export async function getVersionHalfStatsPageData(params?: {
  fromVersion?: string;
  toVersion?: string;
}) {
  const [characters, storySegments, storyAppearances, storyDialogueStats, versions, siteLocale, portraits] =
    await Promise.all([
      loadCharacters(),
      loadStorySegments(),
      loadStoryAppearances(),
      loadStoryDialogueStats(),
      loadVersions(),
      getSiteLocale(),
      getCharacterPortraitMap(),
    ]);
  const displayNames = await getCharacterDisplayNameMap(siteLocale);
  const playableCharacters = characters.filter((character) => !isRoverCharacter(character.id));

  const fromVersion = params?.fromVersion ?? versions[0]?.version ?? "1.0";
  const toVersion = params?.toVersion ?? versions[versions.length - 1]?.version ?? "3.4";
  const selectedSegments = filterStorySegmentsByRange({
    segments: storySegments,
    fromVersion,
    toVersion,
  });
  const selectedSegmentIds = selectedSegments.map((segment) => segment.id);

  const ranking = buildStorySegmentRanking({
    characters: playableCharacters,
    storySegments,
    storyAppearances,
    storyDialogueStats,
    selectedSegmentIds,
  }).map((row) => ({
    ...row,
    characterName: displayNames.get(row.characterId) ?? row.characterName,
  }));

  const appearanceIndex = buildAppearanceIndex(storyAppearances);
  const dialogueIndex = buildDialogueIndex(storyDialogueStats);

  const matrix = playableCharacters.map((character) => ({
    character: {
      id: character.id,
      name: displayNames.get(character.id) ?? character.name,
      releaseVersion: character.releaseVersion,
    },
    cells: storySegments.map((segment) => {
      const dialogueLineCount =
        dialogueIndex.get(appearanceKey(character.id, segment.id)) ?? 0;
      const appeared = didCharacterAppearInQuest({
        characterId: character.id,
        questId: segment.id,
        storyAppearances,
        dialogueLineCount,
        appearanceIndex,
      });

      return {
        segmentId: segment.id,
        labelZh: segment.nameZh,
        version: segment.version,
        versionHalf: segment.versionHalf,
        appeared,
        dialogueLineCount,
      };
    }),
  }));

  return {
    fromVersion,
    toVersion,
    storySegments,
    selectedSegments,
    ranking,
    matrix,
    characterPortraits: Object.fromEntries(portraits),
  };
}

export async function getVoiceStatsForSite(): Promise<VoiceLineStatRow[]> {
  const [stats, siteLocale] = await Promise.all([loadGeneratedStats(), getSiteLocale()]);
  return filterVoiceStatsForSite(stats, siteLocale);
}
