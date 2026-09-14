import {
  loadCharacters,
  loadStorySegments,
  loadAllStoryDialogueStats,
} from "@/lib/data/loaders";

export async function GET() {
  try {
    const [characters, segments, dialogue] = await Promise.all([
      loadCharacters(),
      loadStorySegments(),
      loadAllStoryDialogueStats(),
    ]);
    const ok =
      characters.length > 0 &&
      segments.length > 0 &&
      ["zh-Hans", "en"].every((locale) =>
        dialogue.some((row) => row.locale === locale),
      );
    return Response.json({ ok }, { status: ok ? 200 : 503 });
  } catch {
    return Response.json({ ok: false }, { status: 503 });
  }
}
