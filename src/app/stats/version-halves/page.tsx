import { VersionHalfStatsBrowser } from "@/components/version-half-stats-browser";
import { getVersionHalfStatsPageData } from "@/lib/data";
import { loadVersions } from "@/lib/data/loaders";

export default async function VersionHalfStatsPage() {
  const [pageData, versions] = await Promise.all([
    getVersionHalfStatsPageData({ fromVersion: "3.0", toVersion: "3.4" }),
    loadVersions(),
  ]);

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">主线段落统计</h1>
      <p className="text-zinc-600">
        按主线剧情段落（非版本上半/下半）统计每个角色的登场与台词数，并支持选定版本区间后的台词/登场比排名。
      </p>
      <VersionHalfStatsBrowser
        versions={versions.map((version) => version.version)}
        segmentOptions={pageData.storySegments.map((segment) => ({
          id: segment.id,
          labelZh: segment.nameZh,
          version: segment.version,
        }))}
        initialFromVersion={pageData.fromVersion}
        initialToVersion={pageData.toVersion}
        matrix={pageData.matrix}
      />
    </section>
  );
}
