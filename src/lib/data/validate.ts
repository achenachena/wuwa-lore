import type { Character, VersionRecord, VoiceLineStatRow } from "@/types/lore";

export interface ValidationResult {
  ok: boolean;
  errors: string[];
  checkedAt: string;
}

export function validateCharactersAndVersions(
  characters: Character[],
  versions: VersionRecord[],
): ValidationResult {
  const versionSet = new Set(versions.map((version) => version.version));
  const idSet = new Set<string>();
  const errors: string[] = [];

  for (const character of characters) {
    if (idSet.has(character.id)) {
      errors.push(`Duplicate character id: ${character.id}`);
    } else {
      idSet.add(character.id);
    }
    if (!versionSet.has(character.releaseVersion)) {
      errors.push(
        `Character ${character.id} has invalid releaseVersion ${character.releaseVersion}`,
      );
    }
  }

  return {
    ok: errors.length === 0,
    errors,
    checkedAt: new Date().toISOString(),
  };
}

export function validateVoiceLineStats(rows: VoiceLineStatRow[]): ValidationResult {
  const errors: string[] = [];

  for (const row of rows) {
    let runningTotal = 0;
    for (const item of row.perVersionLineCounts) {
      if (!Number.isInteger(item.lineCount) || item.lineCount < 0) {
        errors.push(
          `Invalid lineCount (${item.lineCount}) for ${row.characterId} ${row.locale} ${item.version}`,
        );
      }
      runningTotal += item.lineCount;
    }

    if (runningTotal !== row.totalLineCount) {
      errors.push(
        `Total mismatch for ${row.characterId} ${row.locale}: ${runningTotal} !== ${row.totalLineCount}`,
      );
    }
  }

  return {
    ok: errors.length === 0,
    errors,
    checkedAt: new Date().toISOString(),
  };
}
