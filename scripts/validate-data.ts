import { promises as fs } from "node:fs";
import path from "node:path";

import {
  loadCharacters,
  loadGeneratedStats,
  loadVersions,
} from "@/lib/data/loaders";
import { validateCharactersAndVersions, validateVoiceLineStats } from "@/lib/data/validate";

async function main() {
  const [characters, versions, rows] = await Promise.all([
    loadCharacters(),
    loadVersions(),
    loadGeneratedStats(),
  ]);

  const identityValidation = validateCharactersAndVersions(characters, versions);
  const statValidation = validateVoiceLineStats(rows);

  const report = {
    generatedAt: new Date().toISOString(),
    checks: {
      identityValidation,
      statValidation,
    },
    ok: identityValidation.ok && statValidation.ok,
  };

  const reportPath = path.join(process.cwd(), "data", "derived", "validation-report.json");
  await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  if (!report.ok) {
    console.error("Data validation failed");
    for (const error of [...identityValidation.errors, ...statValidation.errors]) {
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
