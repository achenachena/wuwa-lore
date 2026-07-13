import { loadGeneratedStats } from "@/lib/data/loaders";
import { csvExport } from "@/lib/security/exports";

export async function GET() {
  const rows = await loadGeneratedStats();
  const lineRows: Array<Array<string | number | boolean>> = [];

  for (const row of rows) {
    for (const item of row.perVersionLineCounts) {
      lineRows.push([
        row.characterId,
        row.debutVersion,
        row.locale,
        row.qualityStatus,
        row.sourcePageTitle,
        row.sourcePageExists,
        row.sourceLatestRevisionAt ?? "",
        row.sourceRevisionCount,
        row.countMethod,
        row.currentLineCount,
        item.version,
        item.lineCount,
        row.totalLineCount,
      ]);
    }
  }

  return csvExport(
    [
      "characterId",
      "debutVersion",
      "locale",
      "qualityStatus",
      "sourcePageTitle",
      "sourcePageExists",
      "sourceLatestRevisionAt",
      "sourceRevisionCount",
      "countMethod",
      "currentLineCount",
      "version",
      "lineCount",
      "totalLineCount",
    ],
    lineRows,
    "wuwa-voice-stats.csv",
  );
}
