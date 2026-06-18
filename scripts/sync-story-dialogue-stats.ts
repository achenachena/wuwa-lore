import { promises as fs } from "node:fs";
import path from "node:path";

type QuestHalfEntry = {
  wikiTitle: string;
  version: string;
  half: "a" | "b";
};

type QuestHalfMap = {
  quests: QuestHalfEntry[];
};

type EncoreLocale = "en" | "zh-Hans";

type EncoreRole = {
  Id: number;
  Name: string;
};

type EncoreStoryIndexItem = {
  Id: number;
  Name?: string;
  Title?: string;
};

type StoryDialogueRow = {
  locale: EncoreLocale;
  characterId: string;
  questId: string;
  wikiTitle: string;
  nameZh: string;
  version: string;
  half: "a" | "b";
  versionHalf: string;
  lineCount: number;
  encoreStoryIds: number[];
};

type StoryDialogueSnapshot = {
  generatedAt: string;
  source: {
    name: string;
    baseUrl: string;
    locales: EncoreLocale[];
    countMethod: string;
  };
  questCountByLocale: Record<EncoreLocale, number>;
  rows: StoryDialogueRow[];
};

const ENCORE_BASE = "https://api.encore.moe";
const ENCORE_V2_BASE = "https://api-v2.encore.moe/api";
const ENCORE_LOCALES: EncoreLocale[] = ["zh-Hans", "en"];
const nowIso = new Date().toISOString();

type WikiEncoreMapFile = {
  mappings: Record<string, Partial<Record<EncoreLocale, string[]>>>;
};

async function loadWikiEncoreMap(): Promise<WikiEncoreMapFile> {
  const mapPath = path.join(process.cwd(), "content", "stories", "wiki-encore-map.json");
  return JSON.parse(await fs.readFile(mapPath, "utf8")) as WikiEncoreMapFile;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/['".:]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const EN_NAME_TO_ID: Record<string, string> = {
  "Luuk Herssen": "luuk-herssen",
  Rover: "rover",
  "Rover: Spectro": "rover-spectro",
  "Rover: Havoc": "rover-havoc",
  "Rover: Aero": "rover-aero",
  Lucilla: "lucilla",
  Lucy: "lucy",
  Rebecca: "rebecca",
};

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "wuwa-lore/1.0",
      Referer: "https://encore.moe/",
      Accept: "application/json",
    },
  });
  if (!response.ok) {
    throw new Error(`Encore API failed ${response.status} for ${url}`);
  }
  return (await response.json()) as T;
}

async function fetchStoryDetail(locale: EncoreLocale, storyId: number): Promise<unknown | null> {
  const primaryUrl = `${ENCORE_BASE}/${locale}/story/${storyId}`;
  try {
    return await fetchJson<unknown>(primaryUrl);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.includes("403")) {
      throw error;
    }
  }

  const fallbackUrl = `${ENCORE_V2_BASE}/${locale}/story/${storyId}`;
  try {
    console.warn(`[${locale}] Encore v1 locked story ${storyId}; using api-v2 fallback`);
    return await fetchJson<unknown>(fallbackUrl);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`[${locale}] Encore story ${storyId} unavailable (${message})`);
    return null;
  }
}

function parseTemplateField(wikitext: string, key: string): string | undefined {
  const match = wikitext.match(new RegExp(`\\|\\s*${key}\\s*=\\s*([^\\n|]+)`));
  return match?.[1]?.trim().replace(/\[\[([^|\]]*\|)?([^\]]+)\]\]/g, "$2");
}

async function fetchQuestNameZh(wikiTitle: string): Promise<string> {
  const params = new URLSearchParams({
    action: "parse",
    page: wikiTitle,
    prop: "wikitext",
    format: "json",
  });
  const response = await fetch(`https://wutheringwaves.fandom.com/api.php?${params}`, {
    headers: { "User-Agent": "wuwa-lore/1.0" },
  });
  if (!response.ok) {
    return wikiTitle;
  }
  const data = (await response.json()) as { parse?: { wikitext?: { "*": string } } };
  const wikitext = data.parse?.wikitext?.["*"];
  if (!wikitext) {
    return wikiTitle;
  }
  return parseTemplateField(wikitext, "zhs") ?? wikiTitle;
}

function flattenEncoreStories(storyTypes: Array<{ Stories?: EncoreStoryIndexItem[] }>): EncoreStoryIndexItem[] {
  const items: EncoreStoryIndexItem[] = [];
  for (const type of storyTypes) {
    for (const group of type.Stories ?? []) {
      if (typeof group.Id === "number") {
        items.push(group);
      }
      for (const nested of (group as { Stories?: EncoreStoryIndexItem[] }).Stories ?? []) {
        items.push(nested);
      }
    }
  }
  return items;
}

function resolveEncoreStoryIds(
  locale: EncoreLocale,
  wikiTitle: string,
  nameZh: string,
  storyIdsByName: Map<string, number[]>,
  wikiEncoreMap: WikiEncoreMapFile,
): number[] {
  const namesToTry: string[] = [];
  const mapped = wikiEncoreMap.mappings[wikiTitle]?.[locale];
  if (mapped?.length) {
    namesToTry.push(...mapped);
  } else if (locale === "en") {
    namesToTry.push(wikiTitle);
  } else {
    namesToTry.push(nameZh);
  }

  const ids = new Set<number>();
  for (const name of namesToTry) {
    for (const id of storyIdsByName.get(name) ?? []) {
      ids.add(id);
    }
  }
  return [...ids];
}

function countDialoguesBySpeaker(payload: unknown): Map<string, number> {
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
        if (!speaker || speaker === "{PlayerName}" || speaker === "漂泊者" || speaker === "Rover") {
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

function normalizeSpeakerKey(speaker: string): string {
  return speaker
    .replace(/[·•]/g, "")
    .replace(/（[^）]*）/g, "")
    .replace(/\([^)]*\)/g, "")
    .trim();
}

function buildSpeakerToCharacterId(params: {
  enRoles: EncoreRole[];
  localeRoles: EncoreRole[];
  knownCharacterIds: Set<string>;
}): Map<string, string> {
  const localeById = new Map(params.localeRoles.map((role) => [role.Id, role.Name]));
  const speakerToCharacter = new Map<string, string>();

  for (const role of params.enRoles) {
    const localeName = localeById.get(role.Id);
    const characterId = EN_NAME_TO_ID[role.Name] ?? slugify(role.Name);
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

  return speakerToCharacter;
}

function resolveSpeaker(
  speaker: string,
  speakerToCharacter: Map<string, string>,
  localeNamesByCharacter: Map<string, string>,
): string | null {
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

async function syncLocale(params: {
  locale: EncoreLocale;
  map: QuestHalfMap;
  wikiEncoreMap: WikiEncoreMapFile;
  knownCharacterIds: Set<string>;
  enRoles: EncoreRole[];
}): Promise<{ rows: StoryDialogueRow[]; processedQuests: number }> {
  const { locale, map, wikiEncoreMap, knownCharacterIds, enRoles } = params;
  const [localeRolesPayload, storyPayload] = await Promise.all([
    fetchJson<{ roleList: EncoreRole[] }>(`${ENCORE_BASE}/${locale}/character`),
    fetchJson<{ storyTypes: Array<{ Stories?: EncoreStoryIndexItem[] }> }>(
      `${ENCORE_BASE}/${locale}/story`,
    ),
  ]);

  const speakerToCharacter = buildSpeakerToCharacterId({
    enRoles,
    localeRoles: localeRolesPayload.roleList,
    knownCharacterIds,
  });
  const localeNamesByCharacter = new Map<string, string>();
  for (const role of localeRolesPayload.roleList) {
    const enRole = enRoles.find((item) => item.Id === role.Id);
    if (!enRole) {
      continue;
    }
    const characterId = EN_NAME_TO_ID[enRole.Name] ?? slugify(enRole.Name);
    if (knownCharacterIds.has(characterId)) {
      localeNamesByCharacter.set(characterId, role.Name);
    }
  }

  const storyIdsByName = new Map<string, number[]>();
  for (const story of flattenEncoreStories(storyPayload.storyTypes)) {
    const name = story.Name ?? story.Title;
    if (name && typeof story.Id === "number") {
      const list = storyIdsByName.get(name) ?? [];
      list.push(story.Id);
      storyIdsByName.set(name, list);
    }
  }

  const aggregate = new Map<
    string,
    {
      lineCount: number;
      encoreStoryIds: Set<number>;
      nameZh: string;
      wikiTitle: string;
      version: string;
      half: "a" | "b";
      versionHalf: string;
    }
  >();

  let processedQuests = 0;
  for (const quest of map.quests) {
    const questId = slugify(quest.wikiTitle);
    const nameZh = await fetchQuestNameZh(quest.wikiTitle);
    const storyIds = resolveEncoreStoryIds(locale, quest.wikiTitle, nameZh, storyIdsByName, wikiEncoreMap);
    if (storyIds.length === 0) {
      console.warn(`[${locale}] No encore story match for ${quest.wikiTitle} (${nameZh})`);
      await new Promise((resolve) => setTimeout(resolve, 120));
      continue;
    }

    const versionHalf = `${quest.version}-${quest.half}`;
    const speakerCounts = new Map<string, number>();
    for (const storyId of storyIds) {
      const detail = await fetchStoryDetail(locale, storyId);
      if (!detail) {
        continue;
      }
      for (const [speaker, count] of countDialoguesBySpeaker(detail).entries()) {
        speakerCounts.set(speaker, (speakerCounts.get(speaker) ?? 0) + count);
      }
      await new Promise((resolve) => setTimeout(resolve, 60));
    }

    for (const [speaker, count] of speakerCounts.entries()) {
      const characterId = resolveSpeaker(speaker, speakerToCharacter, localeNamesByCharacter);
      if (!characterId) {
        continue;
      }
      const key = `${characterId}::${questId}`;
      const bucket = aggregate.get(key) ?? {
        lineCount: 0,
        encoreStoryIds: new Set<number>(),
        nameZh,
        wikiTitle: quest.wikiTitle,
        version: quest.version,
        half: quest.half,
        versionHalf,
      };
      bucket.lineCount += count;
      for (const storyId of storyIds) {
        bucket.encoreStoryIds.add(storyId);
      }
      aggregate.set(key, bucket);
    }

    processedQuests += 1;
    await new Promise((resolve) => setTimeout(resolve, 80));
  }

  const rows: StoryDialogueRow[] = [...aggregate.entries()]
    .map(([key, bucket]) => {
      const [characterId, questId] = key.split("::");
      return {
        locale,
        characterId,
        questId,
        wikiTitle: bucket.wikiTitle,
        nameZh: bucket.nameZh,
        version: bucket.version,
        half: bucket.half,
        versionHalf: bucket.versionHalf,
        lineCount: bucket.lineCount,
        encoreStoryIds: [...bucket.encoreStoryIds].sort((a, b) => a - b),
      };
    })
    .sort((a, b) => {
      const byCharacter = a.characterId.localeCompare(b.characterId);
      if (byCharacter !== 0) {
        return byCharacter;
      }
      return a.questId.localeCompare(b.questId);
    });

  return { rows, processedQuests };
}

async function main() {
  const mapPath = path.join(process.cwd(), "content", "stories", "quest-half-map.json");
  const charactersDir = path.join(process.cwd(), "content", "characters");
  const map = JSON.parse(await fs.readFile(mapPath, "utf8")) as QuestHalfMap;
  const wikiEncoreMap = await loadWikiEncoreMap();

  const characterFiles = (await fs.readdir(charactersDir)).filter((file) => file.endsWith(".json"));
  const knownCharacterIds = new Set(characterFiles.map((file) => file.replace(/\.json$/, "")));

  const enRolesPayload = await fetchJson<{ roleList: EncoreRole[] }>(`${ENCORE_BASE}/en/character`);

  const allRows: StoryDialogueRow[] = [];
  const questCountByLocale: Record<EncoreLocale, number> = { en: 0, "zh-Hans": 0 };

  for (const locale of ENCORE_LOCALES) {
    const { rows, processedQuests } = await syncLocale({
      locale,
      map,
      wikiEncoreMap,
      knownCharacterIds,
      enRoles: enRolesPayload.roleList,
    });
    allRows.push(...rows);
    questCountByLocale[locale] = processedQuests;
    console.log(`[${locale}] synced ${rows.length} dialogue rows from ${processedQuests} quests`);
  }

  const snapshot: StoryDialogueSnapshot = {
    generatedAt: nowIso,
    source: {
      name: "encore.moe",
      baseUrl: ENCORE_BASE,
      locales: ENCORE_LOCALES,
      countMethod: "main_story_dialogue_speaker_lines",
    },
    questCountByLocale,
    rows: allRows,
  };

  const outPath = path.join(process.cwd(), "data", "derived", "story-dialogue-stats.json");
  await fs.writeFile(outPath, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
  console.log(`Story dialogue stats synced: ${allRows.length} total rows -> ${outPath}`);
}

main().catch((error: unknown) => {
  console.error("Story dialogue sync failed", error);
  process.exitCode = 1;
});
