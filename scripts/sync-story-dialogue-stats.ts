import { promises as fs } from "node:fs";
import path from "node:path";
import {
  buildStoryIdsByName,
  ENCORE_BASE,
  ENCORE_LOCALES,
  fetchEncoreJson,
  fetchEncoreStoryDetail,
  loadWikiEncoreMap,
  resolveEncoreStoryIds,
} from "@/lib/encore/client";
import { buildSpeakerResolver, countDialoguesBySpeaker } from "@/lib/encore/speakers";
import type { EncoreLocale, EncoreRole, EncoreStoryIndexItem } from "@/lib/encore/types";
import { mergeDialogueAppearances } from "@/lib/story/merge-dialogue-appearances";
import { slugify } from "@/lib/slugify";

type QuestHalfEntry = {
  wikiTitle: string;
  version: string;
  half: "a" | "b";
};

type QuestHalfMap = {
  quests: QuestHalfEntry[];
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

const nowIso = new Date().toISOString();

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

async function syncLocale(params: {
  locale: EncoreLocale;
  map: QuestHalfMap;
  wikiEncoreMap: Awaited<ReturnType<typeof loadWikiEncoreMap>>;
  knownCharacterIds: Set<string>;
  enRoles: EncoreRole[];
}): Promise<{ rows: StoryDialogueRow[]; processedQuests: number }> {
  const { locale, map, wikiEncoreMap, knownCharacterIds, enRoles } = params;
  const [localeRolesPayload, storyPayload] = await Promise.all([
    fetchEncoreJson<{ roleList: EncoreRole[] }>(`${ENCORE_BASE}/${locale}/character`),
    fetchEncoreJson<{ storyTypes: Array<{ Stories?: EncoreStoryIndexItem[] }> }>(
      `${ENCORE_BASE}/${locale}/story`,
    ),
  ]);

  const { resolveSpeaker } = buildSpeakerResolver({
    enRoles,
    localeRoles: localeRolesPayload.roleList,
    knownCharacterIds,
  });

  const storyIdsByName = buildStoryIdsByName(storyPayload.storyTypes);

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
    const storyIds = resolveEncoreStoryIds({
      locale,
      wikiTitle: quest.wikiTitle,
      nameZh,
      storyIdsByName,
      wikiEncoreMap,
    });
    if (storyIds.length === 0) {
      console.warn(`[${locale}] No encore story match for ${quest.wikiTitle} (${nameZh})`);
      await new Promise((resolve) => setTimeout(resolve, 120));
      continue;
    }

    const versionHalf = `${quest.version}-${quest.half}`;
    const speakerCounts = new Map<string, number>();
    for (const storyId of storyIds) {
      const detail = await fetchEncoreStoryDetail(locale, storyId);
      if (!detail) {
        continue;
      }
      for (const [speaker, count] of countDialoguesBySpeaker(detail).entries()) {
        speakerCounts.set(speaker, (speakerCounts.get(speaker) ?? 0) + count);
      }
      await new Promise((resolve) => setTimeout(resolve, 60));
    }

    for (const [speaker, count] of speakerCounts.entries()) {
      const characterId = resolveSpeaker(speaker);
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

  const enRolesPayload = await fetchEncoreJson<{ roleList: EncoreRole[] }>(
    `${ENCORE_BASE}/en/character`,
  );

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

  const added = await mergeDialogueAppearances(allRows, nowIso);
  if (added > 0) {
    console.log(`Story appearances supplemented: +${added} dialogue-derived rows`);
  }
}

main().catch((error: unknown) => {
  console.error("Story dialogue sync failed", error);
  process.exitCode = 1;
});
