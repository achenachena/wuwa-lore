import { aggregateVersionStats, aggregateVoiceLineStats, buildVersionHalfRanking, filterVersionHalvesByRange } from "@/lib/data/aggregate";
import {
  loadCharacterImages,
  loadCharacters,
  loadGeneratedStats,
  loadRawVoiceEntries,
  loadStoryAppearances,
  loadVersionHalfVoiceStats,
  loadVersionHalves,
  loadVoiceLineDetails,
  loadVersions,
} from "@/lib/data/loaders";
import type { Locale } from "@/types/lore";

export async function getCharacterListData() {
  return loadCharacters();
}

export async function getCharacterDetailData(id: string) {
  const [characters, stats, images, details] = await Promise.all([
    loadCharacters(),
    loadGeneratedStats(),
    loadCharacterImages(),
    loadVoiceLineDetails(),
  ]);
  const character = characters.find((item) => item.id === id);
  const characterStats = stats.filter((item) => item.characterId === id);
  const characterImages = images.filter((item) => item.characterId === id);
  const characterVoiceDetails = details.filter((item) => item.characterId === id);
  return { character, characterStats, characterImages, characterVoiceDetails };
}

export async function getVersionStatsPageData() {
  const [versions, characters, stats] = await Promise.all([
    loadVersions(),
    loadCharacters(),
    loadGeneratedStats(),
  ]);
  return aggregateVersionStats({ versions, characters, voiceStats: stats });
}

export async function getVersionHalfStatsPageData(params?: {
  fromVersion?: string;
  toVersion?: string;
  locale?: Locale;
}) {
  const [characters, versionHalves, storyAppearances, versionHalfVoiceStats, versions] =
    await Promise.all([
      loadCharacters(),
      loadVersionHalves(),
      loadStoryAppearances(),
      loadVersionHalfVoiceStats(),
      loadVersions(),
    ]);

  const fromVersion = params?.fromVersion ?? versions[0]?.version ?? "1.0";
  const toVersion = params?.toVersion ?? versions[versions.length - 1]?.version ?? "3.4";
  const locale = params?.locale ?? "zh-CN";
  const selectedHalves = filterVersionHalvesByRange({ versionHalves, fromVersion, toVersion });
  const selectedHalfIds = selectedHalves.map((half) => half.id);

  const ranking = buildVersionHalfRanking({
    characters,
    versionHalves,
    storyAppearances,
    versionHalfVoiceStats,
    selectedHalfIds,
    locale,
  });

  const matrix = characters.map((character) => ({
    character,
    cells: versionHalves.map((half) => {
      const appearance = storyAppearances.find(
        (row) => row.characterId === character.id && row.versionHalf === half.id,
      );
      const voiceLineCounts = {
        "zh-CN": 0,
        "en-US": 0,
        "ja-JP": 0,
        "ko-KR": 0,
      } satisfies Record<Locale, number>;
      for (const row of versionHalfVoiceStats) {
        if (row.characterId === character.id && row.versionHalf === half.id) {
          voiceLineCounts[row.locale] += row.lineCount;
        }
      }

      return {
        versionHalf: half.id,
        labelZh: half.labelZh,
        appearanceCount: appearance?.appearanceCount ?? 0,
        questTitlesZh: appearance?.questTitlesZh ?? [],
        voiceLineCounts,
      };
    }),
  }));

  return {
    fromVersion,
    toVersion,
    locale,
    versionHalves,
    selectedHalves,
    ranking,
    matrix,
  };
}

export async function computeStatsFromRaw() {
  const [versions, characters, entries] = await Promise.all([
    loadVersions(),
    loadCharacters(),
    loadRawVoiceEntries(),
  ]);
  return aggregateVoiceLineStats({ characters, versions, entries });
}
