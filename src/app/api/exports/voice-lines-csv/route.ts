import { loadVoiceLineDetails } from "@/lib/data/loaders";

function escapeCsvCell(value: string | number | boolean): string {
  const text = String(value);
  if (text.includes(",") || text.includes('"') || text.includes("\n")) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export async function GET() {
  const rows = await loadVoiceLineDetails();
  const headers = [
    "characterId",
    "locale",
    "sourcePageTitle",
    "sourcePageExists",
    "key",
    "sourceFieldPath",
    "text",
    "firstSeenAt",
    "firstSeenVersion",
  ];
  const lineRows: string[] = [];

  for (const row of rows) {
    for (const line of row.lines) {
      lineRows.push(
        [
          row.characterId,
          row.locale,
          row.sourcePageTitle,
          row.sourcePageExists,
          line.key,
          line.sourceFieldPath,
          line.text,
          line.firstSeenAt ?? "",
          line.firstSeenVersion ?? "",
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
      "content-disposition": 'attachment; filename="wuwa-voice-lines.csv"',
    },
  });
}
