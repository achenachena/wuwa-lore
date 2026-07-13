import type { VoiceLineDetailRow, VoiceLineStatRow } from "@/types/lore";

export function flattenVoiceStatsRows(
  rows: VoiceLineStatRow[],
): Array<Array<string | number | boolean>> {
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
  return lineRows;
}

export function flattenVoiceLineRows(
  rows: VoiceLineDetailRow[],
): Array<Array<string | number | boolean>> {
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
  return lineRows;
}

export const VOICE_STATS_CSV_HEADERS = [
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
] as const;

export const VOICE_LINES_CSV_HEADERS = [
  "characterId",
  "locale",
  "sourcePageTitle",
  "sourcePageExists",
  "key",
  "sourceFieldPath",
  "text",
  "firstSeenAt",
  "firstSeenVersion",
] as const;
