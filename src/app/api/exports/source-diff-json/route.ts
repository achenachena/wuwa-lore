import { loadSourceDiffReport } from "@/lib/data/loaders";
import { trimSourceDiffForProduction } from "@/lib/exports/reports";
import { jsonExport } from "@/lib/security/exports";

export async function GET() {
  try {
    const report = await loadSourceDiffReport();
    return jsonExport(trimSourceDiffForProduction(report), "wuwa-source-diff.json");
  } catch {
    return Response.json({ error: "Source diff report not found" }, { status: 404 });
  }
}
