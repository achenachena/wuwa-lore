import { promises as fs } from "node:fs";
import path from "node:path";
import type {
  EncoreLocale,
  EncoreStoryIndexItem,
  EncoreStoryType,
  WikiEncoreMapFile,
} from "@/lib/encore/types";

export const ENCORE_BASE = "https://api.encore.moe";
export const ENCORE_V2_BASE = "https://api-v2.encore.moe/api";
export const ENCORE_LOCALES: EncoreLocale[] = ["zh-Hans", "en"];

export async function fetchEncoreJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "wuwa-lore/1.0",
      Referer: "https://encore.moe/",
      Accept: "application/json",
    },
  });
  if (!response.ok) {
    throw new Error(`Encore API failed ${response.status} for ${url}`);
  }
  return (await response.json()) as T;
}

export async function fetchEncoreStoryDetail(
  locale: EncoreLocale,
  storyId: number,
  options?: { logFallback?: boolean },
): Promise<unknown | null> {
  const logFallback = options?.logFallback ?? true;
  const primaryUrl = `${ENCORE_BASE}/${locale}/story/${storyId}`;
  try {
    return await fetchEncoreJson<unknown>(primaryUrl);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.includes("403")) {
      throw error;
    }
  }

  const fallbackUrl = `${ENCORE_V2_BASE}/${locale}/story/${storyId}`;
  try {
    if (logFallback) {
      console.warn(`[${locale}] Encore v1 locked story ${storyId}; using api-v2 fallback`);
    }
    return await fetchEncoreJson<unknown>(fallbackUrl);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (logFallback) {
      console.warn(`[${locale}] Encore story ${storyId} unavailable (${message})`);
    }
    return null;
  }
}

export function flattenEncoreStories(
  storyTypes: Array<{ Stories?: EncoreStoryIndexItem[] }>,
): EncoreStoryIndexItem[] {
  const items: EncoreStoryIndexItem[] = [];
  for (const type of storyTypes) {
    for (const group of type.Stories ?? []) {
      if (typeof group.Id === "number") {
        items.push(group);
      }
      for (const nested of (group as { Stories?: EncoreStoryIndexItem[] }).Stories ?? []) {
        items.push(nested);
      }
    }
  }
  return items;
}

export function buildStoryIdsByName(
  storyTypes: Array<{ Stories?: EncoreStoryIndexItem[] }>,
): Map<string, number[]> {
  const storyIdsByName = new Map<string, number[]>();
  for (const story of flattenEncoreStories(storyTypes)) {
    const name = story.Name ?? story.Title;
    if (name && typeof story.Id === "number") {
      const list = storyIdsByName.get(name) ?? [];
      list.push(story.Id);
      storyIdsByName.set(name, list);
    }
  }
  return storyIdsByName;
}

export function storyTypeIdKey(typeId: number | string): string {
  return String(typeId);
}

export function collectEncoreStoriesByTypeIds(
  storyTypes: EncoreStoryType[],
  typeIds: Array<number | string>,
): EncoreStoryIndexItem[] {
  const allowed = new Set(typeIds.map(storyTypeIdKey));
  const items: EncoreStoryIndexItem[] = [];
  for (const type of storyTypes) {
    if (!allowed.has(storyTypeIdKey(type.TypeId))) {
      continue;
    }
    for (const story of flattenEncoreStories([type])) {
      if (typeof story.Id === "number") {
        items.push(story);
      }
    }
  }
  return items.sort((a, b) => a.Id - b.Id);
}

export function buildStoryIdsByNameForTypeIds(
  storyTypes: EncoreStoryType[],
  typeIds: Array<number | string>,
): Map<string, number[]> {
  const storyIdsByName = new Map<string, number[]>();
  for (const story of collectEncoreStoriesByTypeIds(storyTypes, typeIds)) {
    const name = story.Name ?? story.Title;
    if (name && typeof story.Id === "number") {
      const list = storyIdsByName.get(name) ?? [];
      list.push(story.Id);
      storyIdsByName.set(name, list);
    }
  }
  return storyIdsByName;
}

export async function loadWikiEncoreMap(): Promise<WikiEncoreMapFile> {
  const mapPath = path.join(process.cwd(), "content", "stories", "wiki-encore-map.json");
  return JSON.parse(await fs.readFile(mapPath, "utf8")) as WikiEncoreMapFile;
}

export function resolveEncoreStoryIds(params: {
  locale: EncoreLocale;
  wikiTitle: string;
  nameZh?: string;
  storyIdsByName: Map<string, number[]>;
  wikiEncoreMap: WikiEncoreMapFile;
}): number[] {
  const { locale, wikiTitle, nameZh, storyIdsByName, wikiEncoreMap } = params;
  const namesToTry: string[] = [];
  const mapped = wikiEncoreMap.mappings[wikiTitle]?.[locale];
  if (mapped?.length) {
    namesToTry.push(...mapped);
  } else if (locale === "en") {
    namesToTry.push(wikiTitle);
  } else if (nameZh) {
    namesToTry.push(nameZh);
  }

  const ids = new Set<number>();
  for (const name of namesToTry) {
    for (const id of storyIdsByName.get(name) ?? []) {
      ids.add(id);
    }
  }
  return [...ids];
}
