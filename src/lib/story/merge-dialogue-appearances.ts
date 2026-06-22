import { promises as fs } from "node:fs";
import path from "node:path";
import type { StoryAppearanceRow, StoryDialogueRow } from "@/types/lore";

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

const APPEARANCE_RULE =
  "main_quest_infobox_characters_plus_encore_dialogue_when_wiki_missing";

export async function mergeDialogueAppearances(
  dialogueRows: StoryDialogueRow[],
  generatedAt: string = new Date().toISOString(),
): Promise<number> {
  const appearancesPath = path.join(process.cwd(), "data", "derived", "story-appearances.json");
  const snapshot = JSON.parse(await fs.readFile(appearancesPath, "utf8")) as StoryAppearanceSnapshot;
  const existing = new Set(snapshot.rows.map((row) => `${row.characterId}::${row.questId}`));
  let added = 0;

  for (const row of dialogueRows) {
    if (row.lineCount <= 0) {
      continue;
    }
    const key = `${row.characterId}::${row.questId}`;
    if (existing.has(key)) {
      continue;
    }
    existing.add(key);
    snapshot.rows.push({
      characterId: row.characterId,
      questId: row.questId,
      wikiTitle: row.wikiTitle,
      nameZh: row.nameZh,
      version: row.version,
      half: row.half,
      versionHalf: row.versionHalf,
    });
    added += 1;
  }

  if (added > 0) {
    snapshot.generatedAt = generatedAt;
    snapshot.source.appearanceRule = APPEARANCE_RULE;
    snapshot.rows.sort((a, b) => {
      const byCharacter = a.characterId.localeCompare(b.characterId);
      if (byCharacter !== 0) {
        return byCharacter;
      }
      return a.questId.localeCompare(b.questId);
    });
    await fs.writeFile(appearancesPath, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
  }

  return added;
}
