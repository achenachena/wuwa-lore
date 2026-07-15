import type { Metadata } from "next";

import { VersionHalfStatsBrowser } from "@/components/version-half-stats-browser";
import { getVersionHalfStatsPageData } from "@/lib/data";
import { formatStorySegmentLabel } from "@/lib/i18n/locale";
import { getMessages, getSiteLocale } from "@/lib/i18n/server";
import { loadVersions } from "@/lib/data/loaders";
import { pageMetadata } from "@/lib/seo/metadata";

export async function generateMetadata(): Promise<Metadata> {
  const [t, locale] = await Promise.all([getMessages(), getSiteLocale()]);
  return pageMetadata({
    title: t.storySegments.title,
    description: t.storySegments.description,
    path: "/stats/version-halves",
    locale,
    keywords: t.siteKeywords,
  });
}

export default async function VersionHalfStatsPage() {
  const [pageData, versions, locale, t] = await Promise.all([
    getVersionHalfStatsPageData(),
    loadVersions(),
    getSiteLocale(),
    getMessages(),
  ]);

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">{t.storySegments.title}</h1>
      <p className="text-zinc-600">{t.storySegments.description}</p>
      <VersionHalfStatsBrowser
        versions={versions.map((version) => version.version)}
        segmentOptions={pageData.storySegments.map((segment) => ({
          id: segment.id,
          label: formatStorySegmentLabel(segment, locale),
          version: segment.version,
          versionHalf: segment.versionHalf,
        }))}
        initialFromVersion={pageData.fromVersion}
        initialToVersion={pageData.toVersion}
        matrix={pageData.matrix}
        characterPortraits={pageData.characterPortraits}
        labels={t.storySegments}
      />
    </section>
  );
}
