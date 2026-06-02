import { loadSourceDiffReport } from "@/lib/data/loaders";

export async function GET() {
  try {
    const report = await loadSourceDiffReport();
    return Response.json(report);
  } catch {
    return Response.json({ error: "Source diff report not found" }, { status: 404 });
  }
}
