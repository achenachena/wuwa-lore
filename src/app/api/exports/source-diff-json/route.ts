import { loadSourceDiffReport } from "@/lib/data/loaders";
import { isProduction } from "@/lib/security/headers";
import { jsonExport } from "@/lib/security/exports";

export async function GET() {
  try {
    const report = await loadSourceDiffReport();
    if (isProduction()) {
      return jsonExport(
        {
          generatedAt: report.generatedAt,
          summary: report.summary,
        },
        "wuwa-source-diff.json",
      );
    }
    return jsonExport(report, "wuwa-source-diff.json");
  } catch {
    return Response.json({ error: "Source diff report not found" }, { status: 404 });
  }
}
