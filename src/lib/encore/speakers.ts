import { encoreNameToCharacterId } from "@/lib/slugify";
import type { EncoreRole } from "@/lib/encore/types";

const SKIPPED_SPEAKERS = new Set(["{PlayerName}", "漂泊者", "Rover"]);

/**
 * Plot identities used before a playable character's canonical name is revealed.
 * Keep these explicit: fuzzy matching cannot safely distinguish named disguises
 * from NPCs. Sources are documented in scripts/audit-dialogue-attribution.ts.
 */
const SPEAKER_ALIASES: Record<string, string> = {
  '"Cat of the Nether Lamp"': "jingran",
  "Cat of the Nether Lamp": "jingran",
  "「鬼猫挈灯」": "jingran",
  Fleurdelys: "cartethyia",
  芙露德莉斯: "cartethyia",
  Kharon: "galbrena",
  卡戎: "galbrena",
  "The Shorekeeper": "shorekeeper",
};

const MULTI_SPEAKER_SEPARATOR = /\s*(?:&|＆)\s*/;

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
  resolveSpeakers: (speaker: string) => string[];
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

  for (const [speaker, characterId] of Object.entries(SPEAKER_ALIASES)) {
    if (params.knownCharacterIds.has(characterId)) {
      speakerToCharacter.set(speaker, characterId);
      speakerToCharacter.set(normalizeSpeakerKey(speaker), characterId);
    }
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

  function resolveSpeakers(speaker: string): string[] {
    const direct = resolveSpeaker(speaker);
    const parts = speaker.split(MULTI_SPEAKER_SEPARATOR).filter(Boolean);
    if (parts.length < 2) {
      return direct ? [direct] : [];
    }
    const resolved = parts
      .map(resolveSpeaker)
      .filter((id): id is string => Boolean(id));
    if (resolved.length > 0) {
      return [...new Set(resolved)];
    }
    return direct ? [direct] : [];
  }

  return { resolveSpeakers };
}

export function storyLineCountAdjustments(params: {
  locale: "en" | "zh-Hans";
  storyId: number;
}): Map<string, number> {
  // In Xuanling Sings, Storm Quelled (Encore 100046), Jingran speaks seven
  // anonymous lines immediately before being named "Cat of the Nether Lamp".
  // Fandom quest dialogue and The Nethermancer's Requiem establish that alias.
  if (params.storyId === 100046) {
    return new Map([["jingran", 7]]);
  }
  return new Map();
}
