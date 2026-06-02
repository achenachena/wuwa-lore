import type {
  Character,
  VersionRecord,
  VersionStatRow,
  VoiceLineEntry,
  VoiceLineStatRow,
} from "@/types/lore";

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
