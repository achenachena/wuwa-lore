import {
  loadCharacters,
  loadGeneratedStats,
  loadVersions,
  loadStorySegments,
  loadStoryAppearances,
  loadAllStoryDialogueStats,
} from "@/lib/data/loaders";
import {
  validateCharactersAndVersions,
  validateVoiceLineStats,
} from "@/lib/data/validate";

async function main() {
  const [characters, versions, rows, segments, appearances, dialogue] =
    await Promise.all([
      loadCharacters(),
      loadVersions(),
      loadGeneratedStats(),
      loadStorySegments(),
      loadStoryAppearances(),
      loadAllStoryDialogueStats(),
    ]);
  const errors = [
    ...validateCharactersAndVersions(characters, versions).errors,
    ...validateVoiceLineStats(rows).errors,
  ];
  if (!characters.length || !segments.length || !appearances.length)
    errors.push("Missing character or main-story data");
  for (const locale of ["zh-Hans", "en"]) {
    if (!dialogue.some((row) => row.locale === locale))
      errors.push(`Missing ${locale} story dialogue`);
  }
  if (errors.length) throw new Error(errors.join("\n"));
  console.log(
    `Data valid: ${characters.length} characters, ${dialogue.length} story dialogue rows`,
  );
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
