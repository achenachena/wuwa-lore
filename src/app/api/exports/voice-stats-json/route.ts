import { loadGeneratedStats } from "@/lib/data/loaders";

export async function GET() {
  const rows = await loadGeneratedStats();
  return Response.json(
    {
      generatedAt: new Date().toISOString(),
      rows,
    },
    {
      headers: {
        "content-disposition": 'attachment; filename="wuwa-voice-stats.json"',
      },
    },
  );
}
