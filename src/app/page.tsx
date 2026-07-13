import Link from "next/link";
import { getHomeSummary, loadSiteHealthReports } from "@/lib/data";
import { formatLocaleDateTime } from "@/lib/i18n/game-labels";
import { getMessages, getSiteLocale } from "@/lib/i18n/server";

export default async function Home() {
  const [summary, { quality, validation, sourceDiff }, siteLocale, t] = await Promise.all([
    getHomeSummary(),
    loadSiteHealthReports(),
    getSiteLocale(),
    getMessages(),
  ]);

  return (
    <section className="space-y-6">
      <h1 className="text-3xl font-semibold">{t.home.title}</h1>
      <p className="max-w-3xl text-zinc-700">{t.home.description}</p>
      <div className="flex flex-wrap gap-2 text-sm">
        <span className="rounded-full border border-zinc-300 bg-white px-3 py-1">
          {t.home.quality}:{" "}
          <strong>
            {quality
              ? `${quality.coveredCharacters}/${quality.totalCharacters} ${t.home.charactersCovered}`
              : t.common.notAvailable}
          </strong>
        </span>
        <span
          className={`rounded-full border px-3 py-1 ${
            validation?.ok
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-amber-200 bg-amber-50 text-amber-700"
          }`}
        >
          {t.home.validation}: <strong>{validation?.ok ? t.home.pass : t.home.checkRequired}</strong>
        </span>
        {quality ? (
          <span className="rounded-full border border-zinc-300 bg-white px-3 py-1">
            {t.common.updated}:{" "}
            <strong>{formatLocaleDateTime(quality.generatedAt, siteLocale)}</strong>
          </span>
        ) : null}
        {sourceDiff ? (
          <span
            className={`rounded-full border px-3 py-1 ${
              sourceDiff.summary.ok
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-amber-200 bg-amber-50 text-amber-700"
            }`}
          >
            {t.home.dualSource}:{" "}
            <strong>
              {sourceDiff.summary.ok
                ? `${t.home.aligned} (${sourceDiff.summary.alignedDate}/${sourceDiff.summary.fandomVersionCount})`
                : `${sourceDiff.summary.mismatchedDate} ${t.home.dateMismatches}`}
            </strong>
          </span>
        ) : null}
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <article className="rounded-lg border border-zinc-200 bg-white p-4">
          <h2 className="text-sm font-medium text-zinc-500">{t.home.trackedCharacters}</h2>
          <p className="mt-2 text-2xl font-semibold">{summary.characterCount}</p>
        </article>
        <article className="rounded-lg border border-zinc-200 bg-white p-4">
          <h2 className="text-sm font-medium text-zinc-500">{t.home.trackedVersions}</h2>
          <p className="mt-2 text-2xl font-semibold">{summary.versionCount}</p>
        </article>
        <article className="rounded-lg border border-zinc-200 bg-white p-4">
          <h2 className="text-sm font-medium text-zinc-500">{t.home.totalVoiceLines}</h2>
          <p className="mt-2 text-2xl font-semibold">{summary.totalLines}</p>
        </article>
      </div>
      <div className="flex flex-wrap gap-3">
        <Link className="rounded-md bg-zinc-900 px-4 py-2 text-white" href="/characters">
          {t.home.browseCharacters}
        </Link>
        <Link className="rounded-md border border-zinc-300 bg-white px-4 py-2" href="/stats/versions">
          {t.home.viewVersionAnalytics}
        </Link>
      </div>
    </section>
  );
}
