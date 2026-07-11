import { loadGeneratedStats } from "@/lib/data/loaders";
import { jsonExport } from "@/lib/security/exports";

export async function GET() {
  const rows = await loadGeneratedStats();
  return jsonExport(
    {
      generatedAt: new Date().toISOString(),
      rows,
    },
    "wuwa-voice-stats.json",
  );
}
