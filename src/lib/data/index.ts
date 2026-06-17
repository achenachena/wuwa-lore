import {
  aggregateVersionStats,
  aggregateVoiceLineStats,
  buildCharacterStorySegmentRows,
  buildStorySegmentRanking,
  filterStorySegmentsByRange,
} from "@/lib/data/aggregate";
import {
  loadCharacterImages,
  loadCharacters,
  loadGeneratedStats,
  loadRawVoiceEntries,
  loadStoryAppearances,
  loadStoryDialogueStats,
  loadStorySegments,
  loadVersions,
} from "@/lib/data/loaders";

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
  const [characters, storySegments, storyAppearances, storyDialogueStats, versions] =
    await Promise.all([
      loadCharacters(),
      loadStorySegments(),
      loadStoryAppearances(),
      loadStoryDialogueStats(),
      loadVersions(),
    ]);

  const fromVersion = params?.fromVersion ?? versions[0]?.version ?? "1.0";
  const toVersion = params?.toVersion ?? versions[versions.length - 1]?.version ?? "3.4";
  const selectedSegments = filterStorySegmentsByRange({ segments: storySegments, fromVersion, toVersion });
  const selectedSegmentIds = selectedSegments.map((segment) => segment.id);

  const ranking = buildStorySegmentRanking({
    characters,
    storySegments,
    storyAppearances,
    storyDialogueStats,
    selectedSegmentIds,
  });

  const matrix = characters.map((character) => ({
    character,
    cells: storySegments.map((segment) => {
      const appeared = storyAppearances.some(
        (row) => row.characterId === character.id && row.questId === segment.id,
      );
      const dialogueLineCount =
        storyDialogueStats.find(
          (row) => row.characterId === character.id && row.questId === segment.id,
        )?.lineCount ?? 0;

      return {
        segmentId: segment.id,
        labelZh: segment.nameZh,
        version: segment.version,
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
