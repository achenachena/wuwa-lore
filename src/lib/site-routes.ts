import type { Messages } from "@/lib/i18n/messages";

type NavKey = keyof Messages["nav"];

export type SiteRoute = {
  path: string;
  navKey?: NavKey;
  changeFrequency: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority: number;
};

/**
 * Canonical public routes — keep nav, sitemap, and SEO paths in sync from here.
 */
export const SITE_ROUTES = [
  { path: "/", navKey: "home", changeFrequency: "daily", priority: 1 },
  { path: "/characters", navKey: "characters", changeFrequency: "daily", priority: 0.95 },
  {
    path: "/stats/version-halves",
    navKey: "storySegments",
    changeFrequency: "daily",
    priority: 0.9,
  },
  {
    path: "/stats/optional-quests",
    navKey: "optionalQuests",
    changeFrequency: "daily",
    priority: 0.9,
  },
  { path: "/stats/versions", navKey: "versionStats", changeFrequency: "daily", priority: 0.85 },
  { path: "/methodology", changeFrequency: "monthly", priority: 0.4 },
] as const satisfies readonly SiteRoute[];

export function navRoutes(): Array<{ path: string; navKey: NavKey }> {
  const routes: Array<{ path: string; navKey: NavKey }> = [];
  for (const route of SITE_ROUTES) {
    if ("navKey" in route && route.navKey) {
      routes.push({ path: route.path, navKey: route.navKey });
    }
  }
  return routes;
}
