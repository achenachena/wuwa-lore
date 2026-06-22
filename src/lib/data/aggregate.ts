import type {
  Character,
  CharacterStorySegmentRow,
  StoryAppearanceRow,
  StoryDialogueRow,
  StorySegment,
  VersionHalfRankingRow,
  VersionRecord,
  VersionStatRow,
  VoiceLineEntry,
  VoiceLineStatRow,
} from "@/types/lore";
import { isRoverCharacter } from "@/lib/i18n/locale";
import { compareVersion } from "@/lib/version/compare";

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

export function aggregateVoiceLineStats(params: {
  characters: Character[];
  versions: VersionRecord[];
  entries: VoiceLineEntry[];
  generatedAt?: string;
}): VoiceLineStatRow[] {
  const { characters, versions, entries } = params;
  const generatedAt = params.generatedAt ?? new Date().toISOString();

  const versionIds = versions.map((version) => version.version);
  const grouped = new Map<string, VoiceLineEntry[]>();

  for (const entry of entries) {
    const key = `${entry.characterId}::${entry.locale}`;
    const value = grouped.get(key);
    if (value) {
      value.push(entry);
    } else {
      grouped.set(key, [entry]);
    }
  }

  const rows: VoiceLineStatRow[] = [];
  const characterById = new Map(characters.map((character) => [character.id, character]));

  for (const [key, groupedEntries] of grouped.entries()) {
    const [characterId, locale] = key.split("::");
    const character = characterById.get(characterId);
    if (!character) {
      continue;
    }

    const counts = versionIds.map((version) => ({
      version,
      lineCount: groupedEntries.filter((entry) => entry.version === version).length,
    }));

    rows.push({
      characterId,
      debutVersion: character.releaseVersion,
      locale: locale as VoiceLineStatRow["locale"],
      sourcePageTitle: "raw-voice-entry",
      sourcePageExists: true,
      sourceLatestRevisionAt: null,
      sourceRevisionCount: groupedEntries.length,
      countMethod: "tx_key_unique_nonempty",
      qualityStatus: "verified",
      currentLineCount: counts.reduce((sum, item) => sum + item.lineCount, 0),
      perVersionLineCounts: counts,
      totalLineCount: counts.reduce((sum, item) => sum + item.lineCount, 0),
      sources: unique(groupedEntries.map((entry) => entry.source.sourceUrl)).sort((a, b) =>
        a.localeCompare(b),
      ),
      generatedAt,
    });
  }

  return rows.sort((a, b) => {
    const byCharacter = a.characterId.localeCompare(b.characterId);
    if (byCharacter !== 0) {
      return byCharacter;
    }
    return a.locale.localeCompare(b.locale);
  });
}

export function aggregateVersionStats(params: {
  versions: VersionRecord[];
  characters: Character[];
  voiceStats: VoiceLineStatRow[];
}): VersionStatRow[] {
  const { versions, characters, voiceStats } = params;
  const playableCharacters = characters.filter((character) => !isRoverCharacter(character.id));

  return versions.map((version) => {
    const characterCount = playableCharacters.filter(
      (character) => character.releaseVersion === version.version,
    ).length;

    const totalVoiceLines = voiceStats.reduce((sum, row) => {
      if (isRoverCharacter(row.characterId)) {
        return sum;
      }
      const perVersion = row.perVersionLineCounts.find((item) => item.version === version.version);
      return sum + (perVersion?.lineCount ?? 0);
    }, 0);

    return {
      version: version.version,
      releaseDate: version.releaseDate,
      characterCount,
      totalVoiceLines,
    };
  });
}

function sumDialogueByQuest(rows: StoryDialogueRow[], characterId: string): Map<string, number> {
  const dialogueByQuest = new Map<string, number>();
  for (const row of rows) {
    if (row.characterId !== characterId) {
      continue;
    }
    dialogueByQuest.set(row.questId, (dialogueByQuest.get(row.questId) ?? 0) + row.lineCount);
  }
  return dialogueByQuest;
}

export function didCharacterAppearInQuest(params: {
  characterId: string;
  questId: string;
  storyAppearances: StoryAppearanceRow[];
  dialogueLineCount: number;
}): boolean {
  const { characterId, questId, storyAppearances, dialogueLineCount } = params;
  if (dialogueLineCount > 0) {
    return true;
  }
  return storyAppearances.some((row) => row.characterId === characterId && row.questId === questId);
}

export function buildCharacterStorySegmentRows(params: {
  characterId: string;
  segments: StorySegment[];
  storyAppearances: StoryAppearanceRow[];
  storyDialogueStats: StoryDialogueRow[];
}): CharacterStorySegmentRow[] {
  const { characterId, segments, storyAppearances, storyDialogueStats } = params;
  const dialogueByQuest = sumDialogueByQuest(storyDialogueStats, characterId);

  return segments
    .map((segment) => {
      const lineCount = dialogueByQuest.get(segment.id) ?? 0;
      const appeared = didCharacterAppearInQuest({
        characterId,
        questId: segment.id,
        storyAppearances,
        dialogueLineCount: lineCount,
      });
      return { segment, appeared, lineCount };
    })
    .filter((row) => row.appeared || row.lineCount > 0);
}

export function buildStorySegmentRanking(params: {
  characters: Character[];
  storySegments: StorySegment[];
  storyAppearances: StoryAppearanceRow[];
  storyDialogueStats: StoryDialogueRow[];
  selectedSegmentIds: string[];
}): VersionHalfRankingRow[] {
  const { characters, storyAppearances, storyDialogueStats, selectedSegmentIds } = params;
  const selected = new Set(selectedSegmentIds);
  const characterById = new Map(characters.map((character) => [character.id, character]));

  const dialogueByCharacter = new Map<string, number>();
  for (const row of storyDialogueStats) {
    if (!selected.has(row.questId)) {
      continue;
    }
    dialogueByCharacter.set(row.characterId, (dialogueByCharacter.get(row.characterId) ?? 0) + row.lineCount);
  }

  const appearancesByCharacter = new Map<string, Set<string>>();
  for (const row of storyAppearances) {
    if (!selected.has(row.questId)) {
      continue;
    }
    const halves = appearancesByCharacter.get(row.characterId) ?? new Set<string>();
    halves.add(row.versionHalf);
    appearancesByCharacter.set(row.characterId, halves);
  }
  for (const row of storyDialogueStats) {
    if (!selected.has(row.questId) || row.lineCount <= 0) {
      continue;
    }
    const halves = appearancesByCharacter.get(row.characterId) ?? new Set<string>();
    halves.add(row.versionHalf);
    appearancesByCharacter.set(row.characterId, halves);
  }

  const characterIds = unique([
    ...dialogueByCharacter.keys(),
    ...appearancesByCharacter.keys(),
  ])
    .filter((characterId) => !isRoverCharacter(characterId))
    .sort((a, b) => a.localeCompare(b));

  return characterIds
    .map((characterId) => {
      const voiceLineCount = dialogueByCharacter.get(characterId) ?? 0;
      const appearanceCount = appearancesByCharacter.get(characterId)?.size ?? 0;
      return {
        characterId,
        characterName: characterById.get(characterId)?.name ?? characterId,
        voiceLineCount,
        appearanceCount,
        linesPerAppearance:
          appearanceCount > 0 ? Number((voiceLineCount / appearanceCount).toFixed(2)) : null,
      };
    })
    .sort((a, b) => {
      const aScore = a.linesPerAppearance ?? -1;
      const bScore = b.linesPerAppearance ?? -1;
      if (bScore !== aScore) {
        return bScore - aScore;
      }
      if (b.voiceLineCount !== a.voiceLineCount) {
        return b.voiceLineCount - a.voiceLineCount;
      }
      return a.characterName.localeCompare(b.characterName);
    });
}

export function buildVersionHalfRanking(params: {
  characters: Character[];
  versionHalves: { id: string }[];
  storyAppearances: StoryAppearanceRow[];
  storyDialogueStats: StoryDialogueRow[];
  selectedHalfIds: string[];
}): VersionHalfRankingRow[] {
  const { characters, storyAppearances, storyDialogueStats, selectedHalfIds } = params;
  const selected = new Set(selectedHalfIds);
  const characterById = new Map(characters.map((character) => [character.id, character]));

  const dialogueByCharacter = new Map<string, number>();
  for (const row of storyDialogueStats) {
    if (!selected.has(row.versionHalf)) {
      continue;
    }
    dialogueByCharacter.set(row.characterId, (dialogueByCharacter.get(row.characterId) ?? 0) + row.lineCount);
  }

  const appearancesByCharacter = new Map<string, number>();
  const appearanceKeys = new Set<string>();
  for (const row of storyAppearances) {
    if (!selected.has(row.versionHalf)) {
      continue;
    }
    appearanceKeys.add(`${row.characterId}::${row.questId}`);
  }
  for (const row of storyDialogueStats) {
    if (!selected.has(row.versionHalf) || row.lineCount <= 0) {
      continue;
    }
    appearanceKeys.add(`${row.characterId}::${row.questId}`);
  }
  for (const key of appearanceKeys) {
    const characterId = key.split("::")[0] ?? "";
    appearancesByCharacter.set(characterId, (appearancesByCharacter.get(characterId) ?? 0) + 1);
  }

  const characterIds = unique([
    ...dialogueByCharacter.keys(),
    ...appearancesByCharacter.keys(),
  ])
    .filter((characterId) => !isRoverCharacter(characterId))
    .sort((a, b) => a.localeCompare(b));

  return characterIds
    .map((characterId) => {
      const voiceLineCount = dialogueByCharacter.get(characterId) ?? 0;
      const appearanceCount = appearancesByCharacter.get(characterId) ?? 0;
      return {
        characterId,
        characterName: characterById.get(characterId)?.name ?? characterId,
        voiceLineCount,
        appearanceCount,
        linesPerAppearance:
          appearanceCount > 0 ? Number((voiceLineCount / appearanceCount).toFixed(2)) : null,
      };
    })
    .sort((a, b) => {
      const aScore = a.linesPerAppearance ?? -1;
      const bScore = b.linesPerAppearance ?? -1;
      if (bScore !== aScore) {
        return bScore - aScore;
      }
      if (b.voiceLineCount !== a.voiceLineCount) {
        return b.voiceLineCount - a.voiceLineCount;
      }
      return a.characterName.localeCompare(b.characterName);
    });
}

export function aggregateStoryDialogueByVersion(rows: StoryDialogueRow[]): Map<string, Map<string, number>> {
  const byCharacter = new Map<string, Map<string, number>>();
  for (const row of rows) {
    const versionMap = byCharacter.get(row.characterId) ?? new Map<string, number>();
    versionMap.set(row.version, (versionMap.get(row.version) ?? 0) + row.lineCount);
    byCharacter.set(row.characterId, versionMap);
  }
  return byCharacter;
}

export function filterStorySegmentsByRange(params: {
  segments: StorySegment[];
  fromVersion: string;
  toVersion: string;
}): StorySegment[] {
  const { segments, fromVersion, toVersion } = params;
  return segments.filter((segment) => {
    const cmpFrom = compareVersion(segment.version, fromVersion);
    const cmpTo = compareVersion(segment.version, toVersion);
    return cmpFrom >= 0 && cmpTo <= 0;
  });
}
