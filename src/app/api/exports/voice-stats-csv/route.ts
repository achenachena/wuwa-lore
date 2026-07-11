import { loadGeneratedStats } from "@/lib/data/loaders";
import { exportHeaders } from "@/lib/security/exports";

function escapeCsvCell(value: string | number | boolean): string {
  const text = String(value);
  if (text.includes(",") || text.includes('"') || text.includes("\n")) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export async function GET() {
  const rows = await loadGeneratedStats();
  const headers = [
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
  ];
  const lineRows: string[] = [];

  for (const row of rows) {
    for (const item of row.perVersionLineCounts) {
      lineRows.push(
        [
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
        ]
          .map((cell) => escapeCsvCell(cell))
          .join(","),
      );
    }
  }

  const csv = `${headers.join(",")}\n${lineRows.join("\n")}\n`;
  return new Response(csv, {
    headers: exportHeaders("wuwa-voice-stats.csv", "text/csv; charset=utf-8"),
  });
}
