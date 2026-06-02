import { loadVoiceLineDetails } from "@/lib/data/loaders";

export async function GET() {
  const rows = await loadVoiceLineDetails();
  return Response.json(
    {
      generatedAt: new Date().toISOString(),
      rows,
    },
    {
      headers: {
        "content-disposition": 'attachment; filename="wuwa-voice-lines.json"',
      },
    },
  );
}
