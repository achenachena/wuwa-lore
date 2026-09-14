import type { Messages } from "@/lib/i18n/messages";

export const SITE_ROUTES = [
  { path: "/", navKey: "home", changeFrequency: "weekly", priority: 1 },
  {
    path: "/characters",
    navKey: "characters",
    changeFrequency: "weekly",
    priority: 0.9,
  },
  {
    path: "/stats/optional-quests",
    navKey: "optionalQuests",
    changeFrequency: "weekly",
    priority: 0.8,
  },
  { path: "/methodology", changeFrequency: "monthly", priority: 0.3 },
] as const;

export function navRoutes(): Array<{
  path: string;
  navKey: keyof Messages["nav"];
}> {
  return SITE_ROUTES.flatMap((route) =>
    "navKey" in route ? [{ path: route.path, navKey: route.navKey }] : [],
  );
}
