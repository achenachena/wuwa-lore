import { promises as fs } from "node:fs";
import path from "node:path";
import { z } from "zod";

import type { SiteLocale } from "@/lib/i18n/locale";

const displayNamesSchema = z.object({
  names: z.record(
    z.string(),
    z.object({
      en: z.string(),
      zh: z.string(),
    }),
  ),
});

let cachedNames: Map<string, { en: string; zh: string }> | null = null;

async function loadDisplayNameMap(): Promise<Map<string, { en: string; zh: string }>> {
  if (cachedNames) {
    return cachedNames;
  }
  const filePath = path.join(process.cwd(), "content", "i18n", "character-display-names.json");
  const raw = JSON.parse(await fs.readFile(filePath, "utf8")) as unknown;
  const parsed = displayNamesSchema.parse(raw);
  cachedNames = new Map(Object.entries(parsed.names));
  return cachedNames;
}

export async function getCharacterDisplayName(
  characterId: string,
  fallbackEnName: string,
  locale: SiteLocale,
): Promise<string> {
  const names = await loadDisplayNameMap();
  const entry = names.get(characterId);
  if (!entry) {
    return fallbackEnName;
  }
  return locale === "zh" ? entry.zh : entry.en;
}

export async function getCharacterDisplayNameMap(
  locale: SiteLocale,
): Promise<Map<string, string>> {
  const names = await loadDisplayNameMap();
  const result = new Map<string, string>();
  for (const [id, entry] of names.entries()) {
    result.set(id, locale === "zh" ? entry.zh : entry.en);
  }
  return result;
}
