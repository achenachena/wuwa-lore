import { loadVoiceLineDetails } from "@/lib/data/loaders";
import { jsonExport } from "@/lib/security/exports";

export async function GET() {
  const rows = await loadVoiceLineDetails();
  return jsonExport(
    {
      generatedAt: new Date().toISOString(),
      rows,
    },
    "wuwa-voice-lines.json",
  );
}
