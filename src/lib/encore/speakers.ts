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
  "Young Galbrena": "galbrena",
  儿时的嘉贝莉娜: "galbrena",
  "Past Aemeath": "aemeath",
  旧日的爱弥斯: "aemeath",
  "Young Aemeath": "aemeath",
  年幼的爱弥斯: "aemeath",
  "Young Augusta": "augusta",
  年少的奥古斯塔: "augusta",
  "Chixia's Voice": "chixia",
  炽霞的声音: "chixia",
  "Zhezhi's Voice": "zhezhi",
  折枝的声音: "zhezhi",
  "Cartethyia's Frequency": "cartethyia",
  卡提希娅的频率留言: "cartethyia",
  "Demon King (Phrolova)": "phrolova",
  "魔王（弗洛洛）": "phrolova",
  "Hecate (Phrolova)": "phrolova",
  "赫卡忒（弗洛洛）": "phrolova",
  "Young Hiyuki": "hiyuki",
  小绯雪: "hiyuki",
  "Past Luuk Herssen": "luuk-herssen",
  "旧日的陆·赫斯": "luuk-herssen",
  "演员·洛瑟菈": "lucilla",
  "Qingxiao of the Past": "qingxiao",
  昔日的清宵: "qingxiao",
  // Named Hsin variants in Encore stories 100048 and 100050. NPC names
  // such as 心魔 / Inner Demon and 天演溯心 / Suhsin are not Hsin.
  "Hsin of the Past": "hsin",
  昔日的心: "hsin",
  "Hsin's Phantom": "hsin",
  心的幻影: "hsin",
  "Hsin the Moon Fox": "hsin",
  心月狐: "hsin",
  "Hsin's Voice": "hsin",
  心的声音: "hsin",
  "Hsin's Thoughts": "hsin",
  心的心声: "hsin",
  "Hsin's Past Shadow": "hsin",
  心的旧影: "hsin",
};

const MULTI_SPEAKER_SEPARATOR = /\s*(?:&|＆)\s*/;

export function normalizeSpeakerKey(speaker: string): string {
  return speaker
    .replace(/<[^>]*>/g, "")
    .replace(/\{message\}/g, "")
    .replace(/["“”「」]/g, "")
    .replace(/[?？]+$/g, "")
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

  for (const role of params.enRoles) {
    const localeName = localeById.get(role.Id);
    const characterId = encoreNameToCharacterId(role.Name);
    if (!params.knownCharacterIds.has(characterId)) {
      continue;
    }
    if (localeName) {
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
