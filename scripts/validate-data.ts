import { promises as fs } from "node:fs";
import path from "node:path";

import {
  loadCharacters,
  loadGeneratedStats,
  loadOfficialVersionNotes,
  loadStoryAppearances,
  loadStoryDialogueStats,
  loadVersionHalfVoiceStats,
  loadVersions,
} from "@/lib/data/loaders";
import { validateCharactersAndVersions, validateVoiceLineStats } from "@/lib/data/validate";

async function main() {
  const [characters, versions, rows, official, storyAppearances, storyDialogueStats, versionHalfVoiceStats] =
    await Promise.all([
    loadCharacters(),
    loadVersions(),
    loadGeneratedStats(),
    loadOfficialVersionNotes(),
    loadStoryAppearances().catch(() => []),
    loadStoryDialogueStats().catch(() => []),
    loadVersionHalfVoiceStats().catch(() => []),
  ]);

  const identityValidation = validateCharactersAndVersions(characters, versions);
  const statValidation = validateVoiceLineStats(rows);
  const officialVersions = new Set(official.rows.map((row) => row.version));
  const missingOfficialVersions = versions
    .map((version) => version.version)
    .filter((version) => !officialVersions.has(version));
  const officialValidation = {
    ok: missingOfficialVersions.length === 0,
    errors: missingOfficialVersions.map(
      (version) => `Missing official baseline for version ${version}`,
    ),
  };

  const storyValidation = {
    ok:
      storyAppearances.length > 0 &&
      storyDialogueStats.length > 0 &&
      versionHalfVoiceStats.length > 0,
    errors: [
      ...(storyAppearances.length === 0 ? ["Missing story appearance rows"] : []),
      ...(storyDialogueStats.length === 0 ? ["Missing story dialogue stats rows"] : []),
      ...(versionHalfVoiceStats.length === 0 ? ["Missing version-half voice stats rows"] : []),
    ],
  };

  const report = {
    generatedAt: new Date().toISOString(),
    checks: {
      identityValidation,
      statValidation,
      officialValidation,
      storyValidation,
    },
    ok:
      identityValidation.ok &&
      statValidation.ok &&
      officialValidation.ok &&
      storyValidation.ok,
  };

  const reportPath = path.join(process.cwd(), "data", "derived", "validation-report.json");
  await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  if (!report.ok) {
    console.error("Data validation failed");
    for (const error of [
      ...identityValidation.errors,
      ...statValidation.errors,
      ...officialValidation.errors,
      ...storyValidation.errors,
    ]) {
      console.error(`- ${error}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log(`Data validation passed -> ${reportPath}`);
}

main().catch((error: unknown) => {
  console.error("Validation script crashed", error);
  process.exitCode = 1;
});
