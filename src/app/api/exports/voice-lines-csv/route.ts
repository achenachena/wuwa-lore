import { loadVoiceLineDetails } from "@/lib/data/loaders";
import { csvExport } from "@/lib/security/exports";

export async function GET() {
  const rows = await loadVoiceLineDetails();
  const lineRows: Array<Array<string | number | boolean>> = [];

  for (const row of rows) {
    for (const line of row.lines) {
      lineRows.push([
        row.characterId,
        row.locale,
        row.sourcePageTitle,
        row.sourcePageExists,
        line.key,
        line.sourceFieldPath,
        line.text,
        line.firstSeenAt ?? "",
        line.firstSeenVersion ?? "",
      ]);
    }
  }

  return csvExport(
    [
      "characterId",
      "locale",
      "sourcePageTitle",
      "sourcePageExists",
      "key",
      "sourceFieldPath",
      "text",
      "firstSeenAt",
      "firstSeenVersion",
    ],
    lineRows,
    "wuwa-voice-lines.csv",
  );
}
