import { promises as fs } from "node:fs";
import path from "node:path";

import { generatedStatsSchema, voiceLineStatRowSchema } from "@/lib/data/schemas";

async function main() {
  const generatedAt = new Date().toISOString();
  const rawPath = path.join(process.cwd(), "data", "raw", "fandom-voice-lines-current.json");
  const rawText = await fs.readFile(rawPath, "utf8");
  const rawData = JSON.parse(rawText) as { rows: unknown[] };
  const rows = (rawData.rows ?? []).map((row) => voiceLineStatRowSchema.parse(row));

  const output = {
    generatedAt,
    rows,
  };
  generatedStatsSchema.parse(output);

  const outPath = path.join(process.cwd(), "data", "derived", "voice-line-stats.json");
  await fs.writeFile(outPath, `${JSON.stringify(output, null, 2)}\n`, "utf8");
  console.log(`Generated ${rows.length} voice stat rows -> ${outPath}`);
}

main().catch((error: unknown) => {
  console.error("Failed to generate voice stats", error);
  process.exitCode = 1;
});
