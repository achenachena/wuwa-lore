import {
  aggregateVersionStats,
  buildCharacterStorySegmentRows,
  buildStorySegmentRanking,
  didCharacterAppearInQuest,
  filterStorySegmentsByRange,
  sumStoryDialogueByCharacter,
} from "@/lib/data/aggregate";
import {
  loadCharacterImages,
  loadCharacters,
  loadGeneratedStats,
  loadStoryAppearances,
  loadStoryDialogueStats,
  loadStorySegments,
  loadVersions,
} from "@/lib/data/loaders";
import { getCharacterDisplayNameMap } from "@/lib/i18n/character-names";
import { getSiteLocale } from "@/lib/i18n/server";
import { isRoverCharacter, toVoiceDataLocale, type SiteLocale } from "@/lib/i18n/locale";
import type { VoiceLineStatRow } from "@/types/lore";
import type { ImageType } from "@/types/lore";

function filterVoiceStatsForSite(stats: VoiceLineStatRow[], siteLocale: SiteLocale): VoiceLineStatRow[] {
  const locale = toVoiceDataLocale(siteLocale);
  return stats.filter((row) => row.locale === locale);
}

export async function getCharacterPortraitMap(): Promise<Map<string, string>> {
  const images = await loadCharacterImages();
  const priority: Record<ImageType, number> = {
    card: 0,
    portrait: 1,
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
}

export async function getCharacterLineTotalsForSite(): Promise<
  Map<string, { profileLines: number; storyLines: number; totalLines: number }>
> {
  const [stats, storyDialogue, siteLocale] = await Promise.all([
    loadGeneratedStats(),
    loadStoryDialogueStats(),
    getSiteLocale(),
  ]);
  const voiceStats = filterVoiceStatsForSite(stats, siteLocale);
  const storyByCharacter = sumStoryDialogueByCharacter(storyDialogue);
  const totals = new Map<string, { profileLines: number; storyLines: number; totalLines: number }>();

  for (const row of voiceStats) {
    if (isRoverCharacter(row.characterId)) {
      continue;
    }
    const storyLines = storyByCharacter.get(row.characterId) ?? 0;
    totals.set(row.characterId, {
      profileLines: row.totalLineCount,
      storyLines,
      totalLines: row.totalLineCount + storyLines,
    });
  }

  for (const [characterId, storyLines] of storyByCharacter) {
    if (isRoverCharacter(characterId) || totals.has(characterId)) {
      continue;
    }
    totals.set(characterId, {
      profileLines: 0,
      storyLines,
      totalLines: storyLines,
    });
  }

  return totals;
}

export async function getCharacterListData() {
  return loadCharacters();
}

export async function getCharacterDetailData(id: string) {
  const [characters, images, storySegments, storyAppearances, storyDialogueStats] =
    await Promise.all([
      loadCharacters(),
      loadCharacterImages(),
      loadStorySegments(),
      loadStoryAppearances(),
      loadStoryDialogueStats(),
    ]);
  const character = characters.find((item) => item.id === id);
  const characterImages = images.filter((item) => item.characterId === id);
  const characterStorySegments = buildCharacterStorySegmentRows({
    characterId: id,
    segments: storySegments,
    storyAppearances,
    storyDialogueStats,
  });

  return {
    character,
    characterImages,
    storySegments: characterStorySegments,
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
  const selectedSegments = filterStorySegmentsByRange({ segments: storySegments, fromVersion, toVersion });
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

  const matrix = playableCharacters.map((character) => ({
    character: {
      ...character,
      name: displayNames.get(character.id) ?? character.name,
    },
    cells: storySegments.map((segment) => {
      const dialogueLineCount =
        storyDialogueStats.find(
          (row) => row.characterId === character.id && row.questId === segment.id,
        )?.lineCount ?? 0;
      const appeared = didCharacterAppearInQuest({
        characterId: character.id,
        questId: segment.id,
        storyAppearances,
        dialogueLineCount,
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
