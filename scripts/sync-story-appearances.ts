import { promises as fs } from "node:fs";
import path from "node:path";
import { fetchFandomWikitext, FANDOM_API } from "@/lib/fandom/client";
import { buildCharacterNameIndex } from "@/lib/fandom/quest-characters";
import { parseTemplateField } from "@/lib/fandom/wikitext";
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

const nowIso = new Date().toISOString();

function parseInfoboxCharacters(wikitext: string): string[] {
  const raw = parseTemplateField(wikitext, "characters", { stopAtPipe: true });
  if (!raw) {
    return [];
  }
  return raw
    .split(";")
    .map((item) => item.trim().replace(/^"|"$/g, ""))
    .filter(Boolean);
}

function resolveCharacterId(
  name: string,
  index: Map<string, string>,
): string | null {
  const normalized = name.trim().replace(/^"|"$/g, "");
  if (!normalized || normalized === "Rover") {
    return "rover";
  }
  return index.get(normalized.toLowerCase()) ?? null;
}

async function loadCharacters(): Promise<CharacterRecord[]> {
  const dir = path.join(process.cwd(), "content", "characters");
  const files = (await fs.readdir(dir)).filter((name) =>
    name.endsWith(".json"),
  );
  const characters = await Promise.all(
    files.map(async (file) => {
      const raw = JSON.parse(
        await fs.readFile(path.join(dir, file), "utf8"),
      ) as CharacterRecord;
      return raw;
    }),
  );
  return characters.sort((a, b) => a.id.localeCompare(b.id));
}

async function main() {
  const mapPath = path.join(
    process.cwd(),
    "content",
    "stories",
    "quest-half-map.json",
  );
  const map = JSON.parse(await fs.readFile(mapPath, "utf8")) as QuestHalfMap;
  const characters = await loadCharacters();
  const nameIndex = buildCharacterNameIndex(characters);

  const segments: StorySegment[] = [];
  const rows: StoryAppearanceRow[] = [];

  let processed = 0;
  for (const [sortOrder, quest] of map.quests.entries()) {
    const wikitext = await fetchFandomWikitext(quest.wikiTitle, {
      required: true,
    });
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

  const segmentsPath = path.join(
    process.cwd(),
    "content",
    "stories",
    "story-segments.json",
  );
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
      fandomApi: FANDOM_API,
      appearanceRule: "main_quest_infobox_characters_only",
    },
    questCount: processed,
    rows,
  };

  const outPath = path.join(
    process.cwd(),
    "data",
    "derived",
    "story-appearances.json",
  );
  await fs.writeFile(outPath, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
  console.log(
    `Story appearances synced: ${rows.length} rows, ${segments.length} segments from ${processed} quests`,
  );
}

main().catch((error: unknown) => {
  console.error("Story appearance sync failed", error);
  process.exitCode = 1;
});
