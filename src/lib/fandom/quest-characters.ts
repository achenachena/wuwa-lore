import { fetchFandomWikitext } from "@/lib/fandom/client";
import { parseTemplateField } from "@/lib/fandom/wikitext";

export async function fetchQuestWikitext(
  title: string,
): Promise<string | null> {
  try {
    return (await fetchFandomWikitext(title)) || null;
  } catch {
    return null;
  }
}

export function parseInfoboxCharacters(wikitext: string): string[] {
  const raw = parseTemplateField(wikitext, "characters", { stopAtPipe: true });
  if (!raw) {
    return [];
  }
  return raw
    .split(";")
    .map((item) => item.trim().replace(/^"|"$/g, ""))
    .filter(Boolean);
}

export function buildCharacterNameIndex(
  characters: Array<{ id: string; name: string; aliases: string[] }>,
) {
  const index = new Map<string, string>();
  for (const character of characters) {
    index.set(character.name.toLowerCase(), character.id);
    for (const alias of character.aliases) {
      index.set(alias.toLowerCase(), character.id);
    }
    index.set(character.id.replace(/-/g, " ").toLowerCase(), character.id);
  }
  return index;
}

export function resolveCharacterIdFromWikiName(
  name: string,
  index: Map<string, string>,
): string | null {
  const normalized = name.trim().replace(/^"|"$/g, "");
  if (!normalized || normalized === "Rover" || normalized === "漂泊者") {
    return null;
  }
  return index.get(normalized.toLowerCase()) ?? null;
}
