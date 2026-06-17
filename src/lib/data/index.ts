import { aggregateVersionStats, aggregateVoiceLineStats, aggregateStoryDialogueByVersion, buildVersionHalfRanking, filterVersionHalvesByRange } from "@/lib/data/aggregate";
import {
  loadCharacterImages,
  loadCharacters,
  loadGeneratedStats,
  loadRawVoiceEntries,
  loadStoryAppearances,
  loadStoryDialogueStats,
  loadVersionHalves,
  loadVoiceLineDetails,
  loadVersions,
} from "@/lib/data/loaders";

export async function getCharacterListData() {
  return loadCharacters();
}

export async function getCharacterDetailData(id: string) {
  const [characters, stats, images, details, storyDialogueStats] = await Promise.all([
    loadCharacters(),
    loadGeneratedStats(),
    loadCharacterImages(),
    loadVoiceLineDetails(),
    loadStoryDialogueStats(),
  ]);
  const character = characters.find((item) => item.id === id);
  const characterStats = stats.filter((item) => item.characterId === id);
  const characterImages = images.filter((item) => item.characterId === id);
  const characterVoiceDetails = details.filter((item) => item.characterId === id);
  const storyDialogueByVersion = aggregateStoryDialogueByVersion(
    storyDialogueStats.filter((row) => row.characterId === id),
  ).get(id);
  return {
    character,
    characterStats,
    characterImages,
    characterVoiceDetails,
    storyDialogueByVersion: storyDialogueByVersion ?? new Map<string, number>(),
  };
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
}) {
  const [characters, versionHalves, storyAppearances, storyDialogueStats, versions] =
    await Promise.all([
      loadCharacters(),
      loadVersionHalves(),
      loadStoryAppearances(),
      loadStoryDialogueStats(),
      loadVersions(),
    ]);

  const fromVersion = params?.fromVersion ?? versions[0]?.version ?? "1.0";
  const toVersion = params?.toVersion ?? versions[versions.length - 1]?.version ?? "3.4";
  const selectedHalves = filterVersionHalvesByRange({ versionHalves, fromVersion, toVersion });
  const selectedHalfIds = selectedHalves.map((half) => half.id);

  const ranking = buildVersionHalfRanking({
    characters,
    versionHalves,
    storyAppearances,
    storyDialogueStats,
    selectedHalfIds,
  });

  const matrix = characters.map((character) => ({
    character,
    cells: versionHalves.map((half) => {
      const appearance = storyAppearances.find(
        (row) => row.characterId === character.id && row.versionHalf === half.id,
      );
      const dialogueLineCount = storyDialogueStats
        .filter((row) => row.characterId === character.id && row.versionHalf === half.id)
        .reduce((sum, row) => sum + row.lineCount, 0);

      return {
        versionHalf: half.id,
        labelZh: half.labelZh,
        appearanceCount: appearance?.appearanceCount ?? 0,
        questTitlesZh: appearance?.questTitlesZh ?? [],
        dialogueLineCount,
      };
    }),
  }));

  return {
    fromVersion,
    toVersion,
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
