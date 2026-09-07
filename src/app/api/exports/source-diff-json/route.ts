import { loadSourceDiffReport } from "@/lib/data/loaders";
import { isProduction } from "@/lib/security/headers";
import { jsonExport } from "@/lib/security/exports";

export async function GET() {
  try {
    const report = await loadSourceDiffReport();
    const body = isProduction()
      ? { generatedAt: report.generatedAt, summary: report.summary }
      : report;
    return jsonExport(body, "wuwa-source-diff.json");
  } catch {
    return Response.json(
      { error: "Source diff report not found" },
      { status: 404 },
    );
  }
}
