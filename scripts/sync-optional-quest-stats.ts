import { promises as fs } from "node:fs";
import path from "node:path";
import { ENCORE_LOCALES } from "@/lib/encore/client";
import type { EncoreRole } from "@/lib/encore/types";
import {
  buildCharacterNameIndex,
  fetchQuestWikitext,
  parseInfoboxCharacters,
  resolveCharacterIdFromWikiName,
} from "@/lib/fandom/quest-characters";
import {
  buildOptionalQuestCatalog,
  dedupeOptionalAppearances,
  fetchEncoreStoryTypes,
  mergeOptionalDialogueRows,
  syncOptionalQuestStatsForLocale,
  type OptionalQuestAppearanceRow,
  type OptionalQuestCoverageRow,
  type UnmappedSpeakerRow,
} from "@/lib/encore/sync-optional-quests";
import type { OptionalQuestRecord, QuestCategory } from "@/types/lore";

const nowIso = new Date().toISOString();
const FANDOM_APPEARANCE_CATEGORIES = new Set<QuestCategory>(["companion", "event"]);

async function supplementAppearancesFromFandom(params: {
  quests: OptionalQuestRecord[];
  characters: Array<{ id: string; name: string; aliases: string[] }>;
}): Promise<OptionalQuestAppearanceRow[]> {
  const nameIndex = buildCharacterNameIndex(params.characters);
  const rows: OptionalQuestAppearanceRow[] = [];

  for (const quest of params.quests) {
    if (!FANDOM_APPEARANCE_CATEGORIES.has(quest.category)) {
      continue;
    }
    const wikitext = await fetchQuestWikitext(quest.nameEn);
    if (!wikitext) {
      await new Promise((resolve) => setTimeout(resolve, 80));
      continue;
    }

    for (const wikiName of parseInfoboxCharacters(wikitext)) {
      const characterId = resolveCharacterIdFromWikiName(wikiName, nameIndex);
      if (!characterId) {
        continue;
      }
      rows.push({
        category: quest.category,
        characterId,
        questId: quest.id,
        questName: quest.nameEn,
        questNameZh: quest.nameZh,
      });
    }
    await new Promise((resolve) => setTimeout(resolve, 80));
  }

  return rows;
}

async function main() {
  const root = process.cwd();
  const charactersDir = path.join(root, "content", "characters");
  const characterFiles = (await fs.readdir(charactersDir)).filter((file) => file.endsWith(".json"));
  const characters = await Promise.all(
    characterFiles.map(async (file) =>
      JSON.parse(await fs.readFile(path.join(charactersDir, file), "utf8")) as {
        id: string;
        name: string;
        aliases: string[];
      },
    ),
  );
  const knownCharacterIds = new Set(characters.map((character) => character.id));

  const [zhStoryTypes, enStoryTypes, enRolesPayload] = await Promise.all([
    fetchEncoreStoryTypes("zh-Hans"),
    fetchEncoreStoryTypes("en"),
    fetch("https://api.encore.moe/en/character", {
      headers: { "User-Agent": "wuwa-lore/1.0", Accept: "application/json" },
    }).then((response) => response.json() as Promise<{ roleList: EncoreRole[] }>),
  ]);

  const quests = buildOptionalQuestCatalog({ zhStoryTypes, enStoryTypes });
  const questCounts = {
    companion: quests.filter((quest) => quest.category === "companion").length,
    event: quests.filter((quest) => quest.category === "event").length,
    side: quests.filter((quest) => quest.category === "side").length,
  };

  const allDialogueRows = [];
  const allAppearanceRows: OptionalQuestAppearanceRow[] = [];
  let coverage: OptionalQuestCoverageRow[] | undefined;
  let unmappedSpeakers: UnmappedSpeakerRow[] | undefined;

  for (const locale of ENCORE_LOCALES) {
    const result = await syncOptionalQuestStatsForLocale({
      locale,
      quests,
      knownCharacterIds,
      enRoles: enRolesPayload.roleList,
      collectMetadata: locale === "zh-Hans",
    });
    allDialogueRows.push(...result.dialogueRows);
    allAppearanceRows.push(...result.appearanceRows);
    if (result.coverage) {
      coverage = result.coverage;
    }
    if (result.unmappedSpeakers) {
      unmappedSpeakers = result.unmappedSpeakers;
    }
    console.log(
      `[${locale}] optional quests: ${result.dialogueRows.length} dialogue rows, ${result.appearanceRows.length} dialogue appearances`,
    );
  }

  const fandomAppearances = await supplementAppearancesFromFandom({ quests, characters });
  console.log(`Fandom supplement: +${fandomAppearances.length} appearance rows (companion/event)`);

  const catalogPath = path.join(root, "content", "stories", "optional-quest-catalog.json");
  await fs.writeFile(
    catalogPath,
    `${JSON.stringify(
      {
        generatedAt: nowIso,
        source: {
          name: "encore.moe",
          categories: questCounts,
        },
        quests,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );

  const mergedAppearances = dedupeOptionalAppearances([...allAppearanceRows, ...fandomAppearances]);

  const dialogueSnapshot = {
    generatedAt: nowIso,
    source: {
      name: "encore.moe",
      countMethod: "optional_quest_dialogue_speaker_lines",
      categories: questCounts,
      coverage,
      unmappedSpeakers,
    },
    rows: mergeOptionalDialogueRows(allDialogueRows),
  };
  const appearanceSnapshot = {
    generatedAt: nowIso,
    source: {
      name: "encore.moe+fandom",
      appearanceRule: "optional_quest_dialogue_speakers_plus_fandom_infobox_companion_event",
      categories: questCounts,
      fandomAppearanceCount: fandomAppearances.length,
    },
    rows: mergedAppearances,
  };

  const derivedDir = path.join(root, "data", "derived");
  await fs.mkdir(derivedDir, { recursive: true });
  await fs.writeFile(
    path.join(derivedDir, "optional-quest-dialogue-stats.json"),
    `${JSON.stringify(dialogueSnapshot, null, 2)}\n`,
    "utf8",
  );
  await fs.writeFile(
    path.join(derivedDir, "optional-quest-appearances.json"),
    `${JSON.stringify(appearanceSnapshot, null, 2)}\n`,
    "utf8",
  );

  console.log("Coverage (zh-Hans):", coverage);
  console.log(
    `Optional quest stats synced: ${dialogueSnapshot.rows.length} dialogue rows, ${appearanceSnapshot.rows.length} appearances`,
  );
}

main().catch((error: unknown) => {
  console.error("Optional quest sync failed", error);
  process.exitCode = 1;
});
