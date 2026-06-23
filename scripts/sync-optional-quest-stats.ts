import { promises as fs } from "node:fs";
import path from "node:path";
import { ENCORE_LOCALES } from "@/lib/encore/client";
import type { EncoreRole } from "@/lib/encore/types";
import {
  buildOptionalQuestCatalog,
  dedupeOptionalAppearances,
  fetchEncoreStoryTypes,
  mergeOptionalDialogueRows,
  summarizeOptionalQuestCounts,
  syncOptionalQuestStatsForLocale,
} from "@/lib/encore/sync-optional-quests";

const nowIso = new Date().toISOString();

async function main() {
  const root = process.cwd();
  const charactersDir = path.join(root, "content", "characters");
  const characterFiles = (await fs.readdir(charactersDir)).filter((file) => file.endsWith(".json"));
  const knownCharacterIds = new Set(characterFiles.map((file) => file.replace(/\.json$/, "")));

  const [zhStoryTypes, enStoryTypes, enRolesPayload] = await Promise.all([
    fetchEncoreStoryTypes("zh-Hans"),
    fetchEncoreStoryTypes("en"),
    fetch("https://api.encore.moe/en/character", {
      headers: { "User-Agent": "wuwa-lore/1.0", Accept: "application/json" },
    }).then((response) => response.json() as Promise<{ roleList: EncoreRole[] }>),
  ]);

  const quests = buildOptionalQuestCatalog({ zhStoryTypes, enStoryTypes });
  const questCounts = summarizeOptionalQuestCounts(zhStoryTypes);

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
  console.log(
    `Optional quest catalog: companion=${questCounts.companion}, event=${questCounts.event}, side=${questCounts.side}`,
  );

  const allDialogueRows = [];
  const allAppearanceRows = [];

  for (const locale of ENCORE_LOCALES) {
    const { dialogueRows, appearanceRows } = await syncOptionalQuestStatsForLocale({
      locale,
      quests,
      knownCharacterIds,
      enRoles: enRolesPayload.roleList,
    });
    allDialogueRows.push(...dialogueRows);
    allAppearanceRows.push(...appearanceRows);
    console.log(
      `[${locale}] optional quests: ${dialogueRows.length} dialogue rows, ${appearanceRows.length} appearances`,
    );
  }

  const dialogueSnapshot = {
    generatedAt: nowIso,
    source: {
      name: "encore.moe",
      countMethod: "optional_quest_dialogue_speaker_lines",
      categories: questCounts,
    },
    rows: mergeOptionalDialogueRows(allDialogueRows),
  };
  const appearanceSnapshot = {
    generatedAt: nowIso,
    source: {
      name: "encore.moe",
      appearanceRule: "optional_quest_dialogue_speakers",
      categories: questCounts,
    },
    rows: dedupeOptionalAppearances(allAppearanceRows),
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

  console.log(
    `Optional quest stats synced: ${dialogueSnapshot.rows.length} dialogue rows, ${appearanceSnapshot.rows.length} appearances`,
  );
}

main().catch((error: unknown) => {
  console.error("Optional quest sync failed", error);
  process.exitCode = 1;
});
