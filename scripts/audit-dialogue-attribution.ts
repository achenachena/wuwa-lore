import { promises as fs } from "node:fs";
import path from "node:path";

import type { StoryDialogueRow } from "@/types/lore";

const EXPECTED = [
  ["jingran", "Xuanling Sings, Storm Quelled", 22],
  ["jingran", "Song of the Heart Sword", 77],
  ["jingran", "The Nethermancer's Requiem", 34],
  ["cartethyia", "The Maiden, The Defier, The Death Crier", 353],
  ["galbrena", "Dawn Breaks on Dark Tides", 320],
  ["jinhsi", "Grand Warstorm", 26],
] as const;

const FANDOM_FALLBACK_QUESTS = [
  "Beyond the Shore's End",
  "The Flaming Red from Tomorrow",
];

async function main() {
  const file = path.join(
    process.cwd(),
    "data",
    "derived",
    "story-dialogue-stats.json",
  );
  const snapshot = JSON.parse(await fs.readFile(file, "utf8")) as {
    rows: StoryDialogueRow[];
  };
  const failures: string[] = [];

  for (const locale of ["en", "zh-Hans"] as const) {
    for (const [characterId, wikiTitle, expected] of EXPECTED) {
      const actual = snapshot.rows
        .filter(
          (row) =>
            row.locale === locale &&
            row.characterId === characterId &&
            row.wikiTitle === wikiTitle,
        )
        .reduce((sum, row) => sum + row.lineCount, 0);
      if (actual !== expected) {
        failures.push(
          `[${locale}] ${characterId} / ${wikiTitle}: expected ${expected}, got ${actual}`,
        );
      }
    }

    for (const wikiTitle of FANDOM_FALLBACK_QUESTS) {
      const rows = snapshot.rows.filter(
        (row) => row.locale === locale && row.wikiTitle === wikiTitle,
      );
      if (
        rows.length === 0 ||
        rows.some((row) => row.source !== "fandom-fallback")
      ) {
        failures.push(
          `[${locale}] ${wikiTitle}: missing attributed Fandom fallback rows`,
        );
      }
    }
  }

  for (const row of snapshot.rows) {
    if (!row.source || !row.sourceUrls?.length) {
      failures.push(
        `[${row.locale}] ${row.characterId} / ${row.wikiTitle}: missing source trace`,
      );
    }
  }

  if (failures.length > 0) {
    throw new Error(
      `Dialogue attribution audit failed:\n${failures.join("\n")}`,
    );
  }
  console.log(
    `Dialogue attribution audit passed: ${snapshot.rows.length} rows checked`,
  );
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
