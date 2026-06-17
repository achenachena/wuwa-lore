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
    locale: string;
    countMethod: string;
  };
  questCount: number;
  rows: StoryDialogueRow[];
};

const ENCORE_BASE = "https://api.encore.moe";
const LOCALE = "zh-Hans";
const nowIso = new Date().toISOString();

/** Wiki quest title -> encore.moe story name(s) when zhs labels differ. */
const WIKI_TO_ENCORE_STORY_NAMES: Record<string, string[]> = {
  "Utterance of Marvels": ["万象新声·上"],
  "First Resonance": ["万象新声·下"],
  "Echoing Marche": ["万象新声·上"],
  "Ominous Star": ["万象新声·上"],
  "Clashing Blades": ["万象新声·上"],
  "Rewinding Raindrops": ["万象新声·上"],
  "Grand Warstorm": ["万象新声·上"],
  "Advance toward the Future from Today": ["万象新声·下"],
  "Beyond the Shore's End": ["行至海岸尽头"],
};

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
  wikiTitle: string,
  nameZh: string,
  storyIdByName: Map<string, number>,
): number[] {
  const aliases = WIKI_TO_ENCORE_STORY_NAMES[wikiTitle];
  if (aliases) {
    return aliases
      .map((name) => storyIdByName.get(name))
      .filter((id): id is number => typeof id === "number");
  }

  const direct = storyIdByName.get(nameZh);
  if (direct) {
    return [direct];
  }

  const normalized = nameZh.replace(/[·…?！!]/g, "").trim();
  const fuzzy = [...storyIdByName.entries()].find(([name]) =>
    name.replace(/[·…?！!]/g, "").includes(normalized),
  );
  if (fuzzy) {
    return [fuzzy[1]];
  }

  return [];
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
        if (!speaker || speaker === "{PlayerName}" || speaker === "漂泊者") {
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

function buildSpeakerToCharacterId(params: {
  enRoles: EncoreRole[];
  zhRoles: EncoreRole[];
  knownCharacterIds: Set<string>;
}): Map<string, string> {
  const zhById = new Map(params.zhRoles.map((role) => [role.Id, role.Name]));
  const speakerToCharacter = new Map<string, string>();

  for (const role of params.enRoles) {
    const zhName = zhById.get(role.Id);
    const characterId = EN_NAME_TO_ID[role.Name] ?? slugify(role.Name);
    if (!params.knownCharacterIds.has(characterId) && characterId !== "lucilla") {
      continue;
    }
    if (zhName) {
      speakerToCharacter.set(zhName, characterId);
    }
    speakerToCharacter.set(role.Name, characterId);
  }

  return speakerToCharacter;
}

function resolveSpeaker(
  speaker: string,
  speakerToCharacter: Map<string, string>,
  zhNamesByCharacter: Map<string, string>,
): string | null {
  if (speakerToCharacter.has(speaker)) {
    return speakerToCharacter.get(speaker) ?? null;
  }
  for (const [characterId, zhName] of zhNamesByCharacter.entries()) {
    if (speaker.includes(zhName)) {
      return characterId;
    }
  }
  return null;
}

async function main() {
  const mapPath = path.join(process.cwd(), "content", "stories", "quest-half-map.json");
  const charactersDir = path.join(process.cwd(), "content", "characters");
  const map = JSON.parse(await fs.readFile(mapPath, "utf8")) as QuestHalfMap;

  const characterFiles = (await fs.readdir(charactersDir)).filter((file) => file.endsWith(".json"));
  const knownCharacterIds = new Set(
    characterFiles.map((file) => file.replace(/\.json$/, "")).concat(["lucilla"]),
  );

  const [enRolesPayload, zhRolesPayload, storyPayload] = await Promise.all([
    fetchJson<{ roleList: EncoreRole[] }>(`${ENCORE_BASE}/en/character`),
    fetchJson<{ roleList: EncoreRole[] }>(`${ENCORE_BASE}/${LOCALE}/character`),
    fetchJson<{ storyTypes: Array<{ Stories?: EncoreStoryIndexItem[] }> }>(
      `${ENCORE_BASE}/${LOCALE}/story`,
    ),
  ]);

  const speakerToCharacter = buildSpeakerToCharacterId({
    enRoles: enRolesPayload.roleList,
    zhRoles: zhRolesPayload.roleList,
    knownCharacterIds,
  });
  const zhNamesByCharacter = new Map<string, string>();
  for (const role of zhRolesPayload.roleList) {
    const enRole = enRolesPayload.roleList.find((item) => item.Id === role.Id);
    if (!enRole) {
      continue;
    }
    const characterId = EN_NAME_TO_ID[enRole.Name] ?? slugify(enRole.Name);
    if (knownCharacterIds.has(characterId)) {
      zhNamesByCharacter.set(characterId, role.Name);
    }
  }

  const encoreStories = flattenEncoreStories(storyPayload.storyTypes);
  const storyIdByName = new Map<string, number>();
  for (const story of encoreStories) {
    const name = story.Name ?? story.Title;
    if (name && typeof story.Id === "number") {
      storyIdByName.set(name, story.Id);
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
    const storyIds = resolveEncoreStoryIds(quest.wikiTitle, nameZh, storyIdByName);
    if (storyIds.length === 0) {
      console.warn(`No encore story match for ${quest.wikiTitle} (${nameZh})`);
      await new Promise((resolve) => setTimeout(resolve, 150));
      continue;
    }

    const versionHalf = `${quest.version}-${quest.half}`;
    const speakerCounts = new Map<string, number>();
    for (const storyId of storyIds) {
      const detail = await fetchJson<unknown>(`${ENCORE_BASE}/${LOCALE}/story/${storyId}`);
      for (const [speaker, count] of countDialoguesBySpeaker(detail).entries()) {
        speakerCounts.set(speaker, (speakerCounts.get(speaker) ?? 0) + count);
      }
      await new Promise((resolve) => setTimeout(resolve, 80));
    }

    for (const [speaker, count] of speakerCounts.entries()) {
      const characterId = resolveSpeaker(speaker, speakerToCharacter, zhNamesByCharacter);
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
    await new Promise((resolve) => setTimeout(resolve, 120));
  }

  const rows: StoryDialogueRow[] = [...aggregate.entries()]
    .map(([key, bucket]) => {
      const [characterId, questId] = key.split("::");
      return {
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

  const snapshot: StoryDialogueSnapshot = {
    generatedAt: nowIso,
    source: {
      name: "encore.moe",
      baseUrl: ENCORE_BASE,
      locale: LOCALE,
      countMethod: "main_story_dialogue_speaker_lines",
    },
    questCount: processedQuests,
    rows,
  };

  const outPath = path.join(process.cwd(), "data", "derived", "story-dialogue-stats.json");
  await fs.writeFile(outPath, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
  console.log(
    `Story dialogue stats synced: ${rows.length} rows from ${processedQuests} quests -> ${outPath}`,
  );
}

main().catch((error: unknown) => {
  console.error("Story dialogue sync failed", error);
  process.exitCode = 1;
});
