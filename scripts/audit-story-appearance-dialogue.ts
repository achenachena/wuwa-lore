import { buildCharacterStorySegmentRows } from "@/lib/data/aggregate";
import {
  loadAllStoryDialogueStats,
  loadStoryAppearances,
  loadStorySegments,
} from "@/lib/data/loaders";
import { isRoverCharacter } from "@/lib/i18n/locale";

async function main() {
  const [segments, appearances, allDialogue] = await Promise.all([
    loadStorySegments(),
    loadStoryAppearances(),
    loadAllStoryDialogueStats(),
  ]);
  const dialogueRows = allDialogue.filter((row) => row.locale === "zh-Hans");

  const appearanceKeys = new Set(appearances.map((row) => `${row.characterId}::${row.questId}`));
  const dialogueKeys = new Set(
    dialogueRows.filter((row) => row.lineCount > 0).map((row) => `${row.characterId}::${row.questId}`),
  );

  const missingAppearanceRows = [...dialogueKeys].filter((key) => !appearanceKeys.has(key));

  const characterIds = [
    ...new Set([...appearances.map((row) => row.characterId), ...dialogueRows.map((row) => row.characterId)]),
  ]
    .filter((id) => !isRoverCharacter(id))
    .sort();

  const uiBugs: string[] = [];
  for (const characterId of characterIds) {
    const rows = buildCharacterStorySegmentRows({
      characterId,
      segments,
      storyAppearances: appearances,
      storyDialogueStats: dialogueRows,
    });
    for (const row of rows) {
      if (row.lineCount > 0 && !row.appeared) {
        uiBugs.push(`${characterId} :: ${row.segment.wikiTitle} :: lines=${row.lineCount}`);
      }
    }
  }

  console.log(`Dialogue rows missing appearance record: ${missingAppearanceRows.length}`);
  for (const key of missingAppearanceRows.sort()) {
    console.log(`  ${key}`);
  }
  console.log(`UI rows with lines but appeared=false: ${uiBugs.length}`);
  for (const bug of uiBugs) {
    console.log(`  ${bug}`);
  }

  if (missingAppearanceRows.length > 0 || uiBugs.length > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
