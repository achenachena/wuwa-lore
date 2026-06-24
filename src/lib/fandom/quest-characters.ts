const FANDOM_API = "https://wutheringwaves.fandom.com/api.php";

function cleanWikiText(value: string): string {
  return value
    .replace(/<ref[^>]*>[\s\S]*?<\/ref>/g, "")
    .replace(/{{[^{}]*}}/g, "")
    .replace(/\[\[([^|\]]*\|)?([^\]]+)\]\]/g, "$2")
    .replace(/'''?/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function parseTemplateField(wikitext: string, key: string): string | undefined {
  const match = wikitext.match(new RegExp(`\\|\\s*${key}\\s*=\\s*([^\\n|]+)`));
  if (!match) {
    return undefined;
  }
  return cleanWikiText(match[1] ?? "");
}

async function fetchJson<T>(params: Record<string, string>): Promise<T> {
  const query = new URLSearchParams({ format: "json", ...params }).toString();
  const response = await fetch(`${FANDOM_API}?${query}`, {
    headers: { "User-Agent": "wuwa-lore/1.0" },
  });
  if (!response.ok) {
    throw new Error(`Fandom API failed: ${response.status}`);
  }
  return (await response.json()) as T;
}

export async function fetchQuestWikitext(title: string): Promise<string | null> {
  type Res = { parse?: { wikitext?: { "*": string } } };
  try {
    const data = await fetchJson<Res>({
      action: "parse",
      page: title,
      prop: "wikitext",
    });
    return data.parse?.wikitext?.["*"] ?? null;
  } catch {
    return null;
  }
}

export function parseInfoboxCharacters(wikitext: string): string[] {
  const raw = parseTemplateField(wikitext, "characters");
  if (!raw) {
    return [];
  }
  return raw
    .split(";")
    .map((item) => item.trim().replace(/^"|"$/g, ""))
    .filter(Boolean);
}

export function buildCharacterNameIndex(characters: Array<{ id: string; name: string; aliases: string[] }>) {
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

export function resolveCharacterIdFromWikiName(name: string, index: Map<string, string>): string | null {
  const normalized = name.trim().replace(/^"|"$/g, "");
  if (!normalized || normalized === "Rover" || normalized === "漂泊者") {
    return null;
  }
  return index.get(normalized.toLowerCase()) ?? null;
}
