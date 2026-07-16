import type { MetadataRoute } from "next";

import { loadCharacters, loadQualityReport } from "@/lib/data/loaders";
import { isRoverCharacter } from "@/lib/i18n/locale";
import { SITE_ROUTES } from "@/lib/site-routes";
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

  const staticRoutes: MetadataRoute.Sitemap = SITE_ROUTES.map((route) => ({
    url: `${base}${route.path === "/" ? "/" : route.path}`,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
    lastModified,
  }));

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
