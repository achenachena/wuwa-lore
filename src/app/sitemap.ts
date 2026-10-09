import type { MetadataRoute } from "next";

import { loadCharacters } from "@/lib/data/loaders";
import { isRoverCharacter } from "@/lib/i18n/locale";
import { SITE_ROUTES } from "@/lib/site-routes";
import { getSiteUrl } from "@/lib/site-url";
import { languageAlternates, localizedUrl } from "@/lib/seo/metadata";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getSiteUrl();
  const characters = await loadCharacters();

  const staticRoutes: MetadataRoute.Sitemap = SITE_ROUTES.map((route) => ({
    url: `${base}${route.path === "/" ? "/" : route.path}`,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));

  const characterRoutes = characters
    .filter((character) => !isRoverCharacter(character.id))
    .map((character) => ({
      url: `${base}/characters/${character.id}`,
      changeFrequency: "weekly" as const,
      priority: 0.75,
    }));

  return [...staticRoutes, ...characterRoutes].flatMap((route) => {
    const path = new URL(route.url).pathname;
    return (["zh", "en"] as const).map((locale) => ({
      ...route,
      url: localizedUrl(path, locale),
      alternates: { languages: languageAlternates(path) },
    }));
  });
}
