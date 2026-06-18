import Link from "next/link";
import { getCharacterListData, getVersionStatsPageData } from "@/lib/data";
import { getMessages } from "@/lib/i18n/server";
import { loadGeneratedStats, loadOfficialVersionNotes, loadSourceDiffReport } from "@/lib/data/loaders";

export default async function VersionStatsPage() {
  const [rows, characters, stats, official, sourceDiff, t] = await Promise.all([
    getVersionStatsPageData(),
    getCharacterListData(),
    loadGeneratedStats(),
    loadOfficialVersionNotes().catch(() => null),
    loadSourceDiffReport().catch(() => null),
    getMessages(),
  ]);
  const officialByVersion = new Map(official?.rows.map((row) => [row.version, row]) ?? []);

  if (rows.length === 0) {
    return <p className="text-zinc-600">{t.versionStats.empty}</p>;
  }

  const locales = ["zh-CN", "en-US", "ja-JP", "ko-KR"] as const;

  const characterNamesByVersion = new Map<string, string[]>();
  for (const character of characters) {
    const current = characterNamesByVersion.get(character.releaseVersion) ?? [];
    current.push(character.name);
    characterNamesByVersion.set(character.releaseVersion, current);
  }

  const localeTotalsByVersion = new Map<string, Record<string, number>>();
  for (const row of stats) {
    for (const item of row.perVersionLineCounts) {
      const localeMap = localeTotalsByVersion.get(item.version) ?? {};
      localeMap[row.locale] = (localeMap[row.locale] ?? 0) + item.lineCount;
      localeTotalsByVersion.set(item.version, localeMap);
    }
  }

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">{t.versionStats.title}</h1>
      <p className="text-zinc-600">{t.versionStats.description}</p>
      {sourceDiff ? (
        <p className="text-sm text-zinc-600">
          {t.versionStats.dualSourceDates}:{" "}
          <span className={sourceDiff.summary.ok ? "font-medium text-emerald-700" : "font-medium text-amber-700"}>
            {sourceDiff.summary.ok
              ? `${t.home.aligned} (${sourceDiff.summary.alignedDate}/${sourceDiff.summary.fandomVersionCount})`
              : `${sourceDiff.summary.mismatchedDate} — ${t.versionStats.seeTools}`}
          </span>
        </p>
      ) : null}
      <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-zinc-200 text-left text-zinc-500">
              <th className="px-4 py-3">{t.versionStats.version}</th>
              <th className="px-4 py-3">{t.versionStats.fandomRelease}</th>
              <th className="px-4 py-3">{t.versionStats.officialRelease}</th>
              <th className="px-4 py-3">{t.versionStats.debutCharacters}</th>
              <th className="px-4 py-3">{t.versionStats.totalVoiceLines}</th>
              {locales.map((locale) => (
                <th key={locale} className="px-4 py-3">
                  {locale}
                </th>
              ))}
              <th className="px-4 py-3">{t.versionStats.debutRoster}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.version} className="border-b border-zinc-100">
                <td className="px-4 py-3 font-medium">{row.version}</td>
                <td className="px-4 py-3">{row.releaseDate}</td>
                <td className="px-4 py-3 text-xs">
                  {officialByVersion.get(row.version) ? (
                    <a
                      className="underline"
                      href={officialByVersion.get(row.version)?.noticeUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {new Date(officialByVersion.get(row.version)!.releaseDate).toLocaleString()}
                    </a>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-4 py-3">{row.characterCount}</td>
                <td className="px-4 py-3">{row.totalVoiceLines}</td>
                {locales.map((locale) => (
                  <td key={`${row.version}-${locale}`} className="px-4 py-3">
                    {localeTotalsByVersion.get(row.version)?.[locale] ?? 0}
                  </td>
                ))}
                <td className="px-4 py-3 text-xs text-zinc-600">
                  {(characterNamesByVersion.get(row.version) ?? [])
                    .sort((a, b) => a.localeCompare(b))
                    .join(", ") || "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
