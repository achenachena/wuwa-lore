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
      <h1 className="text-2xl font-semibold">小版本统计</h1>
      <p className="text-zinc-600">
        按版本上半/下半统计每个角色的主线登场次数与新增台词数，并支持选定版本区间后的台词/登场比排名。
      </p>
      <VersionHalfStatsBrowser
        versions={versions.map((version) => version.version)}
        halfOptions={pageData.versionHalves.map((half) => ({
          id: half.id,
          labelZh: half.labelZh,
          version: half.version,
        }))}
        initialFromVersion={pageData.fromVersion}
        initialToVersion={pageData.toVersion}
        matrix={pageData.matrix}
      />
    </section>
  );
}
