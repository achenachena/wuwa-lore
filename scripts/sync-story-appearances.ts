import { promises as fs } from "node:fs";
import path from "node:path";
import { slugify } from "@/lib/slugify";

type CharacterRecord = {
  id: string;
  name: string;
  aliases: string[];
};

type QuestHalfEntry = {
  wikiTitle: string;
  version: string;
  half: "a" | "b";
};

type QuestHalfMap = {
  sourceUrl: string;
  editor: string;
  notes: string;
  quests: QuestHalfEntry[];
};

type StorySegment = {
  id: string;
  wikiTitle: string;
  nameZh: string;
  version: string;
  half: "a" | "b";
  versionHalf: string;
  sortOrder: number;
};

type StoryAppearanceRow = {
  characterId: string;
  questId: string;
  wikiTitle: string;
  nameZh: string;
  version: string;
  half: "a" | "b";
  versionHalf: string;
};

type StoryAppearanceSnapshot = {
  generatedAt: string;
  source: {
    questMapFile: string;
    fandomApi: string;
    appearanceRule: string;
  };
  questCount: number;
  rows: StoryAppearanceRow[];
};

const API_ROOT = "https://wutheringwaves.fandom.com/api.php";
const nowIso = new Date().toISOString();

function cleanWikiText(value: string): string {
  return value
    .replace(/<ref[^>]*>[\s\S]*?<\/ref>/g, "")
    .replace(/{{[^{}]*}}/g, "")
    .replace(/\[\[([^|\]]*\|)?([^\]]+)\]\]/g, "$2")
    .replace(/'''?/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function parseTemplateField(wikitext: string, key: string): string | undefined {
  const match = wikitext.match(new RegExp(`\\|\\s*${key}\\s*=\\s*([^\\n|]+)`));
  if (!match) {
    return undefined;
  }
  return cleanWikiText(match[1] ?? "");
}

async function fetchJson<T>(params: Record<string, string>): Promise<T> {
  const query = new URLSearchParams({ format: "json", ...params }).toString();
  const response = await fetch(`${API_ROOT}?${query}`, {
    headers: { "User-Agent": "wuwa-lore/1.0" },
  });
  if (!response.ok) {
    throw new Error(`Fandom API failed: ${response.status} ${response.statusText}`);
  }
  return (await response.json()) as T;
}

async function fetchQuestWikitext(title: string): Promise<string> {
  type Res = { parse?: { wikitext?: { "*": string } } };
  const data = await fetchJson<Res>({
    action: "parse",
    page: title,
    prop: "wikitext",
  });
  const wikitext = data.parse?.wikitext?.["*"];
  if (!wikitext) {
    throw new Error(`Missing wikitext for quest ${title}`);
  }
  return wikitext;
}

function parseInfoboxCharacters(wikitext: string): string[] {
  const raw = parseTemplateField(wikitext, "characters");
  if (!raw) {
    return [];
  }
  return raw
    .split(";")
    .map((item) => item.trim().replace(/^"|"$/g, ""))
    .filter(Boolean);
}

function buildCharacterNameIndex(characters: CharacterRecord[]): Map<string, string> {
  const index = new Map<string, string>();
  for (const character of characters) {
    index.set(character.name.toLowerCase(), character.id);
    for (const alias of character.aliases) {
      index.set(alias.toLowerCase(), character.id);
    }
    index.set(character.id.replace(/-/g, " ").toLowerCase(), character.id);
  }
  index.set("rover", "rover");
  return index;
}

function resolveCharacterId(name: string, index: Map<string, string>): string | null {
  const normalized = name.trim().replace(/^"|"$/g, "");
  if (!normalized || normalized === "Rover") {
    return "rover";
  }
  return index.get(normalized.toLowerCase()) ?? null;
}

async function loadCharacters(): Promise<CharacterRecord[]> {
  const dir = path.join(process.cwd(), "content", "characters");
  const files = (await fs.readdir(dir)).filter((name) => name.endsWith(".json"));
  const characters = await Promise.all(
    files.map(async (file) => {
      const raw = JSON.parse(await fs.readFile(path.join(dir, file), "utf8")) as CharacterRecord;
      return raw;
    }),
  );
  return characters.sort((a, b) => a.id.localeCompare(b.id));
}

async function main() {
  const mapPath = path.join(process.cwd(), "content", "stories", "quest-half-map.json");
  const map = JSON.parse(await fs.readFile(mapPath, "utf8")) as QuestHalfMap;
  const characters = await loadCharacters();
  const nameIndex = buildCharacterNameIndex(characters);

  const segments: StorySegment[] = [];
  const rows: StoryAppearanceRow[] = [];

  let processed = 0;
  for (const [sortOrder, quest] of map.quests.entries()) {
    const wikitext = await fetchQuestWikitext(quest.wikiTitle);
    const questId = slugify(quest.wikiTitle);
    const nameZh = parseTemplateField(wikitext, "zhs") ?? quest.wikiTitle;
    const versionHalf = `${quest.version}-${quest.half}`;
    segments.push({
      id: questId,
      wikiTitle: quest.wikiTitle,
      nameZh,
      version: quest.version,
      half: quest.half,
      versionHalf,
      sortOrder,
    });

    const appeared = parseInfoboxCharacters(wikitext);
    for (const wikiName of appeared) {
      const characterId = resolveCharacterId(wikiName, nameIndex);
      if (!characterId) {
        continue;
      }
      rows.push({
        characterId,
        questId,
        wikiTitle: quest.wikiTitle,
        nameZh,
        version: quest.version,
        half: quest.half,
        versionHalf,
      });
    }

    processed += 1;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  rows.sort((a, b) => {
    const byCharacter = a.characterId.localeCompare(b.characterId);
    if (byCharacter !== 0) {
      return byCharacter;
    }
    const segmentA = segments.find((segment) => segment.id === a.questId);
    const segmentB = segments.find((segment) => segment.id === b.questId);
    return (segmentA?.sortOrder ?? 0) - (segmentB?.sortOrder ?? 0);
  });

  const segmentsPath = path.join(process.cwd(), "content", "stories", "story-segments.json");
  await fs.writeFile(
    segmentsPath,
    `${JSON.stringify(
      {
        sourceUrl: map.sourceUrl,
        editor: "scripts/sync-story-appearances.ts",
        generatedAt: nowIso,
        segments,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );

  const snapshot: StoryAppearanceSnapshot = {
    generatedAt: nowIso,
    source: {
      questMapFile: "content/stories/quest-half-map.json",
      fandomApi: API_ROOT,
      appearanceRule: "main_quest_infobox_characters_only",
    },
    questCount: processed,
    rows,
  };

  const outPath = path.join(process.cwd(), "data", "derived", "story-appearances.json");
  await fs.writeFile(outPath, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
  console.log(
    `Story appearances synced: ${rows.length} rows, ${segments.length} segments from ${processed} quests`,
  );
}

main().catch((error: unknown) => {
  console.error("Story appearance sync failed", error);
  process.exitCode = 1;
});
