import { cache } from "react";

import { loadCharacterImages } from "@/lib/data/loaders";
import { toVoiceDataLocale, type SiteLocale } from "@/lib/i18n/locale";
import type { ImageType, VoiceLineStatRow } from "@/types/lore";

export function filterVoiceStatsForSite(
  stats: VoiceLineStatRow[],
  siteLocale: SiteLocale,
): VoiceLineStatRow[] {
  const locale = toVoiceDataLocale(siteLocale);
  return stats.filter((row) => row.locale === locale);
}

export const getCharacterPortraitMap = cache(
  async (): Promise<Map<string, string>> => {
    const images = await loadCharacterImages();
    const priority: Record<ImageType, number> = {
      portrait: 0,
      card: 1,
      splash: 2,
      other: 3,
    };
    const map = new Map<string, { path: string; rank: number }>();

    for (const image of images) {
      const rank = priority[image.type];
      const current = map.get(image.characterId);
      if (!current || rank < current.rank) {
        map.set(image.characterId, { path: image.localPath, rank });
      }
    }

    return new Map(
      [...map.entries()].map(([characterId, value]) => [
        characterId,
        value.path,
      ]),
    );
  },
);
