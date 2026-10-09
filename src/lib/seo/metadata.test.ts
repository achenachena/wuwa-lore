import { afterEach, describe, expect, it, vi } from "vitest";
import { languageAlternates, localizedUrl, pageMetadata } from "./metadata";
import { getSiteUrl } from "@/lib/site-url";

afterEach(() => vi.unstubAllEnvs());

describe("localized search metadata", () => {
  it("does not use a deployment hostname as the public canonical", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    vi.stubEnv("VERCEL_URL", "preview.vercel.app");
    expect(getSiteUrl()).toBe("https://wuwalore.xyz");
  });

  it("gives each language its own canonical and reciprocal alternates", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://wuwalore.xyz");
    for (const locale of ["en", "zh"] as const) {
      const metadata = pageMetadata({
        title: "Stats",
        description: "Counts",
        path: "/",
        locale,
      });
      expect(metadata.alternates).toEqual({
        canonical: `https://wuwalore.xyz/?lang=${locale}`,
        languages: languageAlternates("/"),
      });
    }
    expect(languageAlternates("/characters/yangyang")).toEqual({
      en: "https://wuwalore.xyz/characters/yangyang?lang=en",
      "zh-CN": "https://wuwalore.xyz/characters/yangyang?lang=zh",
      "x-default": "https://wuwalore.xyz/characters/yangyang",
    });
    expect(localizedUrl("/characters?q=yangyang", "en")).toContain(
      "q=yangyang&lang=en",
    );
  });
});
