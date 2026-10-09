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
    description:
      locale === "zh"
        ? "查询鸣潮角色的主线台词数量和出场次数，按版本区间对比角色排名，查看每个角色的剧情记录。玩家制作的鸣潮剧情统计站。"
        : "Compare Wuthering Waves (WuWa) character dialogue counts and story appearances by patch. Browse character rankings and quest-by-quest breakdowns on this fan-made stats site.",
    path: "/",
    locale,
    keywords: t.siteKeywords,
  });
}

export default async function Home() {
  const [pageData, versions, locale, t] = await Promise.all([
    getVersionHalfStatsPageData(),
    loadVersions(),
    getSiteLocale(),
    getMessages(),
  ]);

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
        {t.storySegments.title}
      </h1>
      <p className="text-zinc-600">{t.storySegments.description}</p>
      <details className="text-sm text-zinc-500">
        <summary className="w-fit cursor-pointer hover:text-zinc-900">
          {t.storySegments.countingNotes}
        </summary>
        <p className="mt-2 max-w-2xl leading-relaxed">
          {t.storySegments.countingDescription}
        </p>
      </details>
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
