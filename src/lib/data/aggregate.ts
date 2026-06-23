import type {
  Character,
  CharacterOptionalQuestRow,
  CharacterStorySegmentRow,
  OptionalQuestAppearanceRow,
  OptionalQuestDialogueRow,
  OptionalQuestRecord,
  StoryAppearanceRow,
  StoryDialogueRow,
  StorySegment,
  VersionHalfRankingRow,
  VersionRecord,
  VersionStatRow,
  VoiceLineEntry,
  VoiceLineStatRow,
  QuestCategory,
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

export function sumStoryDialogueByCharacter(rows: StoryDialogueRow[]): Map<string, number> {
  const totals = new Map<string, number>();
  for (const row of rows) {
    totals.set(row.characterId, (totals.get(row.characterId) ?? 0) + row.lineCount);
  }
  return totals;
}

export function sumStoryDialogueByVersion(rows: StoryDialogueRow[]): Map<string, number> {
  const totals = new Map<string, number>();
  for (const row of rows) {
    totals.set(row.version, (totals.get(row.version) ?? 0) + row.lineCount);
  }
  return totals;
}

export function aggregateVersionStats(params: {
  versions: VersionRecord[];
  characters: Character[];
  voiceStats: VoiceLineStatRow[];
  storyDialogueStats?: StoryDialogueRow[];
}): VersionStatRow[] {
  const { versions, characters, voiceStats, storyDialogueStats } = params;
  const playableCharacters = characters.filter((character) => !isRoverCharacter(character.id));
  const storyLinesByVersion = storyDialogueStats
    ? sumStoryDialogueByVersion(storyDialogueStats)
    : null;

  return versions.map((version) => {
    const characterCount = playableCharacters.filter(
      (character) => character.releaseVersion === version.version,
    ).length;

    const totalVoiceLines = storyLinesByVersion
      ? (storyLinesByVersion.get(version.version) ?? 0)
      : voiceStats.reduce((sum, row) => {
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

export function getFirstAppearanceVersion(params: {
  characterId: string;
  segments: StorySegment[];
  storyAppearances: StoryAppearanceRow[];
  storyDialogueStats: StoryDialogueRow[];
}): string | null {
  const { characterId, segments, storyAppearances, storyDialogueStats } = params;
  const dialogueByQuest = sumDialogueByQuest(storyDialogueStats, characterId);
  let earliest: string | null = null;

  for (const segment of segments) {
    const lineCount = dialogueByQuest.get(segment.id) ?? 0;
    const appeared = didCharacterAppearInQuest({
      characterId,
      questId: segment.id,
      storyAppearances,
      dialogueLineCount: lineCount,
    });
    if (!appeared && lineCount <= 0) {
      continue;
    }
    if (!earliest || compareVersion(segment.version, earliest) < 0) {
      earliest = segment.version;
    }
  }

  return earliest;
}

export function buildFirstAppearanceVersionMap(params: {
  characters: Character[];
  segments: StorySegment[];
  storyAppearances: StoryAppearanceRow[];
  storyDialogueStats: StoryDialogueRow[];
}): Map<string, string | null> {
  const { characters, segments, storyAppearances, storyDialogueStats } = params;
  const map = new Map<string, string | null>();
  for (const character of characters) {
    if (isRoverCharacter(character.id)) {
      continue;
    }
    map.set(
      character.id,
      getFirstAppearanceVersion({
        characterId: character.id,
        segments,
        storyAppearances,
        storyDialogueStats,
      }),
    );
  }
  return map;
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

export function sumOptionalDialogueByCharacter(
  rows: OptionalQuestDialogueRow[],
  category?: QuestCategory,
): Map<string, number> {
  const totals = new Map<string, number>();
  for (const row of rows) {
    if (category && row.category !== category) {
      continue;
    }
    totals.set(row.characterId, (totals.get(row.characterId) ?? 0) + row.lineCount);
  }
  return totals;
}

export function buildCharacterOptionalQuestRows(params: {
  characterId: string;
  category: QuestCategory;
  quests: OptionalQuestRecord[];
  appearances: OptionalQuestAppearanceRow[];
  dialogueStats: OptionalQuestDialogueRow[];
}): CharacterOptionalQuestRow[] {
  const { characterId, category, quests, appearances, dialogueStats } = params;
  const dialogueByQuest = new Map<string, number>();
  for (const row of dialogueStats) {
    if (row.characterId !== characterId || row.category !== category) {
      continue;
    }
    dialogueByQuest.set(row.questId, (dialogueByQuest.get(row.questId) ?? 0) + row.lineCount);
  }

  const appearedQuestIds = new Set(
    appearances
      .filter((row) => row.characterId === characterId && row.category === category)
      .map((row) => row.questId),
  );
  for (const questId of dialogueByQuest.keys()) {
    appearedQuestIds.add(questId);
  }

  return quests
    .filter((quest) => quest.category === category && appearedQuestIds.has(quest.id))
    .map((quest) => {
      const lineCount = dialogueByQuest.get(quest.id) ?? 0;
      return {
        quest,
        appeared: appearedQuestIds.has(quest.id),
        lineCount,
      };
    })
    .sort((a, b) => b.lineCount - a.lineCount || a.quest.nameZh.localeCompare(b.quest.nameZh, "zh-CN"));
}

export function buildOptionalQuestRanking(params: {
  characters: Character[];
  category: QuestCategory;
  quests: OptionalQuestRecord[];
  appearances: OptionalQuestAppearanceRow[];
  dialogueStats: OptionalQuestDialogueRow[];
}): VersionHalfRankingRow[] {
  const { characters, category, quests, appearances, dialogueStats } = params;
  const characterById = new Map(characters.map((character) => [character.id, character]));
  const questIds = new Set(quests.filter((quest) => quest.category === category).map((quest) => quest.id));

  const dialogueByCharacter = new Map<string, number>();
  for (const row of dialogueStats) {
    if (row.category !== category || !questIds.has(row.questId)) {
      continue;
    }
    dialogueByCharacter.set(row.characterId, (dialogueByCharacter.get(row.characterId) ?? 0) + row.lineCount);
  }

  const appearancesByCharacter = new Map<string, number>();
  for (const row of appearances) {
    if (row.category !== category || !questIds.has(row.questId)) {
      continue;
    }
    appearancesByCharacter.set(row.characterId, (appearancesByCharacter.get(row.characterId) ?? 0) + 1);
  }

  const characterIds = unique([...dialogueByCharacter.keys(), ...appearancesByCharacter.keys()])
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
      if (b.voiceLineCount !== a.voiceLineCount) {
        return b.voiceLineCount - a.voiceLineCount;
      }
      if (b.appearanceCount !== a.appearanceCount) {
        return b.appearanceCount - a.appearanceCount;
      }
      return a.characterName.localeCompare(b.characterName);
    });
}
