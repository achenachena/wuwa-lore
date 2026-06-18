import type { MetadataRoute } from "next";
import { loadCharacters } from "@/lib/data/loaders";
import { getSiteUrl } from "@/lib/site-url";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getSiteUrl();
  const characters = await loadCharacters();
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${base}/`, changeFrequency: "daily", priority: 1 },
    { url: `${base}/characters`, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/stats/versions`, changeFrequency: "daily", priority: 0.8 },
    { url: `${base}/stats/version-halves`, changeFrequency: "daily", priority: 0.85 },
  ];
  const characterRoutes = characters.map((character) => ({
    url: `${base}/characters/${character.id}`,
    changeFrequency: "daily" as const,
    priority: 0.7,
  }));
  return [...staticRoutes, ...characterRoutes];
}
