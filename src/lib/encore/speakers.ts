import { encoreNameToCharacterId } from "@/lib/slugify";
import type { EncoreRole } from "@/lib/encore/types";

const SKIPPED_SPEAKERS = new Set(["{PlayerName}", "漂泊者", "Rover"]);

export function normalizeSpeakerKey(speaker: string): string {
  return speaker
    .replace(/[·•]/g, "")
    .replace(/（[^）]*）/g, "")
    .replace(/\([^)]*\)/g, "")
    .trim();
}

export function countDialoguesBySpeaker(payload: unknown): Map<string, number> {
  const counts = new Map<string, number>();
  const walk = (node: unknown): void => {
    if (!node || typeof node !== "object") {
      return;
    }
    if (Array.isArray(node)) {
      for (const item of node) {
        walk(item);
      }
      return;
    }
    const record = node as Record<string, unknown>;
    if (Array.isArray(record.Dialogues)) {
      for (const dialogue of record.Dialogues) {
        if (!dialogue || typeof dialogue !== "object") {
          continue;
        }
        const speaker = String(
          (dialogue as Record<string, unknown>).Speaker ??
            (dialogue as Record<string, unknown>).SpeakerName ??
            "",
        ).trim();
        if (!speaker || SKIPPED_SPEAKERS.has(speaker)) {
          continue;
        }
        counts.set(speaker, (counts.get(speaker) ?? 0) + 1);
      }
    }
    for (const value of Object.values(record)) {
      walk(value);
    }
  };
  walk(payload);
  return counts;
}

export type SpeakerResolver = {
  resolveSpeaker: (speaker: string) => string | null;
  localeNamesByCharacter: Map<string, string>;
};

export function buildSpeakerResolver(params: {
  enRoles: EncoreRole[];
  localeRoles: EncoreRole[];
  knownCharacterIds: Set<string>;
}): SpeakerResolver {
  const localeById = new Map(
    params.localeRoles.map((role) => [role.Id, role.Name]),
  );
  const speakerToCharacter = new Map<string, string>();
  const localeNamesByCharacter = new Map<string, string>();

  for (const role of params.enRoles) {
    const localeName = localeById.get(role.Id);
    const characterId = encoreNameToCharacterId(role.Name);
    if (!params.knownCharacterIds.has(characterId)) {
      continue;
    }
    if (localeName) {
      localeNamesByCharacter.set(characterId, localeName);
      speakerToCharacter.set(localeName, characterId);
      speakerToCharacter.set(normalizeSpeakerKey(localeName), characterId);
    }
    speakerToCharacter.set(role.Name, characterId);
    speakerToCharacter.set(normalizeSpeakerKey(role.Name), characterId);
  }

  function resolveSpeaker(speaker: string): string | null {
    if (speakerToCharacter.has(speaker)) {
      return speakerToCharacter.get(speaker) ?? null;
    }
    const normalized = normalizeSpeakerKey(speaker);
    if (speakerToCharacter.has(normalized)) {
      return speakerToCharacter.get(normalized) ?? null;
    }
    for (const [characterId, localeName] of localeNamesByCharacter.entries()) {
      const normalizedLocale = normalizeSpeakerKey(localeName);
      if (
        speaker.includes(localeName) ||
        normalized.includes(normalizedLocale) ||
        normalizedLocale.includes(normalized)
      ) {
        return characterId;
      }
    }
    return null;
  }

  return { resolveSpeaker, localeNamesByCharacter };
}
