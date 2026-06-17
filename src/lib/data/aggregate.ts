import type {
  Character,
  Locale,
  VersionHalfRankingRow,
  VersionHalfRecord,
  VersionRecord,
  VersionStatRow,
  VoiceLineEntry,
  VoiceLineStatRow,
} from "@/types/lore";
import type { StoryAppearanceRow, VersionHalfVoiceRow } from "@/types/lore";

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

  return versions.map((version) => {
    const characterCount = characters.filter(
      (character) => character.releaseVersion === version.version,
    ).length;

    const totalVoiceLines = voiceStats.reduce((sum, row) => {
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

function compareVersion(a: string, b: string): number {
  const pa = a.split(".").map((x) => Number(x));
  const pb = b.split(".").map((x) => Number(x));
  for (let i = 0; i < Math.max(pa.length, pb.length); i += 1) {
    const da = pa[i] ?? 0;
    const db = pb[i] ?? 0;
    if (da !== db) {
      return da - db;
    }
  }
  return 0;
}

export function buildVersionHalfRanking(params: {
  characters: Character[];
  versionHalves: VersionHalfRecord[];
  storyAppearances: StoryAppearanceRow[];
  versionHalfVoiceStats: VersionHalfVoiceRow[];
  selectedHalfIds: string[];
  locale: Locale;
}): VersionHalfRankingRow[] {
  const { characters, storyAppearances, versionHalfVoiceStats, selectedHalfIds, locale } = params;
  const selected = new Set(selectedHalfIds);
  const characterById = new Map(characters.map((character) => [character.id, character]));

  const voiceByCharacter = new Map<string, number>();
  for (const row of versionHalfVoiceStats) {
    if (row.locale !== locale || !selected.has(row.versionHalf)) {
      continue;
    }
    voiceByCharacter.set(row.characterId, (voiceByCharacter.get(row.characterId) ?? 0) + row.lineCount);
  }

  const appearancesByCharacter = new Map<string, number>();
  for (const row of storyAppearances) {
    if (!selected.has(row.versionHalf)) {
      continue;
    }
    appearancesByCharacter.set(
      row.characterId,
      (appearancesByCharacter.get(row.characterId) ?? 0) + row.appearanceCount,
    );
  }

  const characterIds = unique([
    ...voiceByCharacter.keys(),
    ...appearancesByCharacter.keys(),
  ]).sort((a, b) => a.localeCompare(b));

  return characterIds
    .map((characterId) => {
      const voiceLineCount = voiceByCharacter.get(characterId) ?? 0;
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

export function filterVersionHalvesByRange(params: {
  versionHalves: VersionHalfRecord[];
  fromVersion: string;
  toVersion: string;
}): VersionHalfRecord[] {
  const { versionHalves, fromVersion, toVersion } = params;
  return versionHalves.filter((half) => {
    const cmpFrom = compareVersion(half.version, fromVersion);
    const cmpTo = compareVersion(half.version, toVersion);
    return cmpFrom >= 0 && cmpTo <= 0;
  });
}
