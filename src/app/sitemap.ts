import type { MetadataRoute } from "next";

import { loadCharacters, loadQualityReport } from "@/lib/data/loaders";
import { isRoverCharacter } from "@/lib/i18n/locale";
import { getSiteUrl } from "@/lib/site-url";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getSiteUrl();
  const [characters, quality] = await Promise.all([
    loadCharacters(),
    loadQualityReport().catch(() => null),
  ]);
  const lastModified = quality?.generatedAt
    ? new Date(quality.generatedAt)
    : new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${base}/`, changeFrequency: "daily", priority: 1, lastModified },
    {
      url: `${base}/characters`,
      changeFrequency: "daily",
      priority: 0.95,
      lastModified,
    },
    {
      url: `${base}/stats/version-halves`,
      changeFrequency: "daily",
      priority: 0.9,
      lastModified,
    },
    {
      url: `${base}/stats/optional-quests`,
      changeFrequency: "daily",
      priority: 0.9,
      lastModified,
    },
    {
      url: `${base}/stats/versions`,
      changeFrequency: "daily",
      priority: 0.85,
      lastModified,
    },
    {
      url: `${base}/methodology`,
      changeFrequency: "monthly",
      priority: 0.4,
      lastModified,
    },
  ];

  const characterRoutes = characters
    .filter((character) => !isRoverCharacter(character.id))
    .map((character) => ({
      url: `${base}/characters/${character.id}`,
      changeFrequency: "weekly" as const,
      priority: 0.75,
      lastModified,
    }));

  return [...staticRoutes, ...characterRoutes];
}
