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
import {
  buildSpeakerResolver,
  countDialoguesBySpeaker,
  storyLineCountAdjustments,
} from "@/lib/encore/speakers";
import type {
  EncoreLocale,
  EncoreRole,
  EncoreStoryIndexItem,
} from "@/lib/encore/types";
import { fandomPageUrl, fetchFandomWikitext } from "@/lib/fandom/client";
import { parseTemplateField } from "@/lib/fandom/wikitext";
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
  source: "encore" | "fandom-fallback";
  sourceUrls: string[];
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

function countFandomVoicedDialogue(wikitext: string): Map<string, number> {
  const counts = new Map<string, number>();
  for (const line of wikitext.split("\n")) {
    if (!/{{\s*A\s*\|/i.test(line)) {
      continue;
    }
    const speaker = line.match(/'''\s*([^']+?)\s*[:：]\s*'''/)?.[1]?.trim();
    if (speaker && !/^(?:Rover|\(Rover\))$/i.test(speaker)) {
      counts.set(speaker, (counts.get(speaker) ?? 0) + 1);
    }
  }
  return counts;
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
    fetchEncoreJson<{ roleList: EncoreRole[] }>(
      `${ENCORE_BASE}/${locale}/character`,
    ),
    fetchEncoreJson<{
      storyTypes: Array<{ Stories?: EncoreStoryIndexItem[] }>;
    }>(`${ENCORE_BASE}/${locale}/story`),
  ]);

  const { resolveSpeakers } = buildSpeakerResolver({
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
      source: "encore" | "fandom-fallback";
      sourceUrls: Set<string>;
    }
  >();

  let processedQuests = 0;
  for (const quest of map.quests) {
    const questId = slugify(quest.wikiTitle);
    const wikitext = await fetchFandomWikitext(quest.wikiTitle);
    const nameZh =
      parseTemplateField(wikitext, "zhs", { stopAtPipe: true }) ??
      quest.wikiTitle;
    const storyIds = resolveEncoreStoryIds({
      locale,
      wikiTitle: quest.wikiTitle,
      nameZh,
      storyIdsByName,
      wikiEncoreMap,
    });
    const versionHalf = `${quest.version}-${quest.half}`;
    const speakerCounts = new Map<string, number>();
    const adjustments = new Map<string, number>();
    let source: "encore" | "fandom-fallback" = "encore";
    const sourceUrls = new Set<string>();
    if (storyIds.length === 0) {
      source = "fandom-fallback";
      sourceUrls.add(fandomPageUrl(quest.wikiTitle));
      for (const [speaker, count] of countFandomVoicedDialogue(wikitext)) {
        speakerCounts.set(speaker, (speakerCounts.get(speaker) ?? 0) + count);
      }
      console.warn(
        `[${locale}] Using Fandom voiced-dialogue fallback for ${quest.wikiTitle} (${nameZh})`,
      );
    } else {
      for (const storyId of storyIds) {
        const detail = await fetchEncoreStoryDetail(locale, storyId);
        if (!detail) {
          continue;
        }
        sourceUrls.add(`${ENCORE_BASE}/${locale}/story/${storyId}`);
        for (const [speaker, count] of countDialoguesBySpeaker(
          detail,
        ).entries()) {
          speakerCounts.set(speaker, (speakerCounts.get(speaker) ?? 0) + count);
        }
        for (const [characterId, count] of storyLineCountAdjustments({
          locale,
          storyId,
        })) {
          adjustments.set(
            characterId,
            (adjustments.get(characterId) ?? 0) + count,
          );
        }
        await new Promise((resolve) => setTimeout(resolve, 60));
      }
    }

    for (const [speaker, count] of speakerCounts.entries()) {
      for (const characterId of resolveSpeakers(speaker)) {
        adjustments.set(
          characterId,
          (adjustments.get(characterId) ?? 0) + count,
        );
      }
    }

    for (const [characterId, count] of adjustments) {
      const key = `${characterId}::${questId}`;
      const bucket = aggregate.get(key) ?? {
        lineCount: 0,
        encoreStoryIds: new Set<number>(),
        nameZh,
        wikiTitle: quest.wikiTitle,
        version: quest.version,
        half: quest.half,
        versionHalf,
        source,
        sourceUrls: new Set<string>(),
      };
      bucket.lineCount += count;
      storyIds.forEach((storyId) => bucket.encoreStoryIds.add(storyId));
      sourceUrls.forEach((sourceUrl) => bucket.sourceUrls.add(sourceUrl));
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
        source: bucket.source,
        sourceUrls: [...bucket.sourceUrls].sort(),
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
  const mapPath = path.join(
    process.cwd(),
    "content",
    "stories",
    "quest-half-map.json",
  );
  const charactersDir = path.join(process.cwd(), "content", "characters");
  const map = JSON.parse(await fs.readFile(mapPath, "utf8")) as QuestHalfMap;
  const wikiEncoreMap = await loadWikiEncoreMap();

  const characterFiles = (await fs.readdir(charactersDir)).filter((file) =>
    file.endsWith(".json"),
  );
  const knownCharacterIds = new Set(
    characterFiles.map((file) => file.replace(/\.json$/, "")),
  );

  const enRolesPayload = await fetchEncoreJson<{ roleList: EncoreRole[] }>(
    `${ENCORE_BASE}/en/character`,
  );

  const allRows: StoryDialogueRow[] = [];
  const questCountByLocale: Record<EncoreLocale, number> = {
    en: 0,
    "zh-Hans": 0,
  };

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
    console.log(
      `[${locale}] synced ${rows.length} dialogue rows from ${processedQuests} quests`,
    );
  }

  const snapshot: StoryDialogueSnapshot = {
    generatedAt: nowIso,
    source: {
      name: "encore.moe+wutheringwaves.fandom.com",
      baseUrl: ENCORE_BASE,
      locales: ENCORE_LOCALES,
      countMethod:
        "main_story_dialogue_speaker_lines_with_fandom_audio_fallback",
    },
    questCountByLocale,
    rows: allRows,
  };

  const outPath = path.join(
    process.cwd(),
    "data",
    "derived",
    "story-dialogue-stats.json",
  );
  await fs.writeFile(outPath, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
  console.log(
    `Story dialogue stats synced: ${allRows.length} total rows -> ${outPath}`,
  );

  const added = await mergeDialogueAppearances(allRows, nowIso);
  if (added > 0) {
    console.log(
      `Story appearances supplemented: +${added} dialogue-derived rows`,
    );
  }
}

main().catch((error: unknown) => {
  console.error("Story dialogue sync failed", error);
  process.exitCode = 1;
});
