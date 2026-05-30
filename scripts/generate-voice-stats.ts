import { promises as fs } from "node:fs";
import path from "node:path";

import { aggregateVoiceLineStats } from "@/lib/data/aggregate";
import { loadCharacters, loadRawVoiceEntries, loadVersions } from "@/lib/data/loaders";

async function main() {
  const [characters, versions, entries] = await Promise.all([
    loadCharacters(),
    loadVersions(),
    loadRawVoiceEntries(),
  ]);

  const generatedAt = new Date().toISOString();
  const rows = aggregateVoiceLineStats({
    characters,
    versions,
    entries,
    generatedAt,
  });

  const output = {
    generatedAt,
    rows,
  };

  const outPath = path.join(process.cwd(), "data", "derived", "voice-line-stats.json");
  await fs.writeFile(outPath, `${JSON.stringify(output, null, 2)}\n`, "utf8");
  console.log(`Generated ${rows.length} voice stat rows -> ${outPath}`);
}

main().catch((error: unknown) => {
  console.error("Failed to generate voice stats", error);
  process.exitCode = 1;
});
