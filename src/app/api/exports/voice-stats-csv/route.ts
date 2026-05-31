import { loadGeneratedStats } from "@/lib/data/loaders";

function escapeCsvCell(value: string | number): string {
  const text = String(value);
  if (text.includes(",") || text.includes('"') || text.includes("\n")) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export async function GET() {
  const rows = await loadGeneratedStats();
  const headers = ["characterId", "debutVersion", "locale", "version", "lineCount", "totalLineCount"];
  const lineRows: string[] = [];

  for (const row of rows) {
    for (const item of row.perVersionLineCounts) {
      lineRows.push(
        [
          row.characterId,
          row.debutVersion,
          row.locale,
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
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": 'attachment; filename="wuwa-voice-stats.csv"',
    },
  });
}
