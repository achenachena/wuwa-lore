import type { Metadata } from "next";

import { getVersionStatsPageData } from "@/lib/data";
import { getCharacterDisplayNameMap } from "@/lib/i18n/character-names";
import { formatLocaleDateTime } from "@/lib/i18n/game-labels";
import { getMessages, getSiteLocale } from "@/lib/i18n/server";
import { isRoverCharacter } from "@/lib/i18n/locale";
import { loadCharacters, loadOfficialVersionNotes, loadSourceDiffReport } from "@/lib/data/loaders";
import { pageMetadata } from "@/lib/seo/metadata";

export async function generateMetadata(): Promise<Metadata> {
  const [t, locale] = await Promise.all([getMessages(), getSiteLocale()]);
  return pageMetadata({
    title: t.versionStats.title,
    description: t.versionStats.description,
    path: "/stats/versions",
    locale,
    keywords: t.siteKeywords,
  });
}

export default async function VersionStatsPage() {
  const [rows, characters, official, sourceDiff, siteLocale, t] = await Promise.all([
    getVersionStatsPageData(),
    loadCharacters(),
    loadOfficialVersionNotes().catch(() => null),
    loadSourceDiffReport().catch(() => null),
    getSiteLocale(),
    getMessages(),
  ]);
  const displayNames = await getCharacterDisplayNameMap(siteLocale);
  const officialByVersion = new Map(official?.rows.map((row) => [row.version, row]) ?? []);

  if (rows.length === 0) {
    return <p className="text-zinc-600">{t.versionStats.empty}</p>;
  }

  const characterNamesByVersion = new Map<string, string[]>();
  for (const character of characters) {
    if (isRoverCharacter(character.id)) {
      continue;
    }
    const current = characterNamesByVersion.get(character.releaseVersion) ?? [];
    current.push(displayNames.get(character.id) ?? character.name);
    characterNamesByVersion.set(character.releaseVersion, current);
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
              : `${sourceDiff.summary.mismatchedDate} ${t.home.dateMismatches}`}
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
                      {formatLocaleDateTime(
                        officialByVersion.get(row.version)!.releaseDate,
                        siteLocale,
                      )}
                    </a>
                  ) : (
                    t.common.dash
                  )}
                </td>
                <td className="px-4 py-3">{row.characterCount}</td>
                <td className="px-4 py-3">{row.totalVoiceLines}</td>
                <td className="px-4 py-3 text-xs text-zinc-600">
                  {(characterNamesByVersion.get(row.version) ?? [])
                    .sort((a, b) => a.localeCompare(b, siteLocale === "zh" ? "zh-CN" : "en"))
                    .join(siteLocale === "zh" ? "、" : ", ") || t.common.dash}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
