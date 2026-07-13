import { loadVoiceLineDetails } from "@/lib/data/loaders";
import {
  flattenVoiceLineRows,
  VOICE_LINES_CSV_HEADERS,
} from "@/lib/exports/datasets";
import { csvExport } from "@/lib/security/exports";

export async function GET() {
  const rows = await loadVoiceLineDetails();
  return csvExport([...VOICE_LINES_CSV_HEADERS], flattenVoiceLineRows(rows), "wuwa-voice-lines.csv");
}
