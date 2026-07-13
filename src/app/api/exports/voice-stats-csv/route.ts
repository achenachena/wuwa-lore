import { loadGeneratedStats } from "@/lib/data/loaders";
import {
  flattenVoiceStatsRows,
  VOICE_STATS_CSV_HEADERS,
} from "@/lib/exports/datasets";
import { csvExport } from "@/lib/security/exports";

export async function GET() {
  const rows = await loadGeneratedStats();
  return csvExport([...VOICE_STATS_CSV_HEADERS], flattenVoiceStatsRows(rows), "wuwa-voice-stats.csv");
}
