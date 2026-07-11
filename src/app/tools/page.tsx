import { notFound } from "next/navigation";

import { getCharacterListData } from "@/lib/data";
import {
  loadChangeReport,
  loadGeneratedStats,
  loadQualityReport,
  loadSourceDiffReport,
  loadValidationReport,
} from "@/lib/data/loaders";
import { isProduction } from "@/lib/security/headers";

export default async function ToolsPage() {
  if (isProduction() && process.env.ENABLE_PUBLIC_TOOLS !== "1") {
    notFound();
  }

  const [stats, report, characters, quality, changes, sourceDiff] = await Promise.all([
    loadGeneratedStats().catch(() => []),
    loadValidationReport().catch(() => null),
    getCharacterListData().catch(() => []),
    loadQualityReport().catch(() => null),
    loadChangeReport().catch(() => null),
    loadSourceDiffReport().catch(() => null),
  ]);

  const coveredCharacterIds = new Set(stats.map((row) => row.characterId));
  const missingVoiceCharacters = characters.filter((character) => !coveredCharacterIds.has(character.id));
  const unknownReleaseCharacters = characters.filter((character) => character.releaseVersion === "unknown");
  const missingSourceRows = stats.filter((row) => row.qualityStatus === "missing_source");

  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-semibold">Data Tools</h1>
      <p className="text-zinc-600">
        Run `npm run data:generate` and `npm run data:validate` to update these artifacts.
      </p>

      <article className="rounded-lg border border-zinc-200 bg-white p-4">
        <h2 className="text-lg font-semibold">Validation Report</h2>
        {!report ? (
          <p className="mt-2 text-zinc-600">No validation report found yet.</p>
        ) : (
          <div className="mt-2 space-y-2 text-sm">
            <p>
              Status:{" "}
              <span className={report.ok ? "font-semibold text-emerald-600" : "font-semibold text-red-600"}>
                {report.ok ? "OK" : "FAILED"}
              </span>
            </p>
            <p>Generated: {report.generatedAt}</p>
            <p>Identity errors: {report.checks.identityValidation.errors.length}</p>
            <p>Stat errors: {report.checks.statValidation.errors.length}</p>
          </div>
        )}
      </article>

      <article className="rounded-lg border border-zinc-200 bg-white p-4">
        <h2 className="text-lg font-semibold">Coverage Gaps</h2>
        <div className="mt-2 space-y-1 text-sm text-zinc-700">
          <p>Missing voice stats characters: {missingVoiceCharacters.length}</p>
          <p>Unknown release version: {unknownReleaseCharacters.length}</p>
          <p>Missing source rows: {missingSourceRows.length}</p>
          <p>Quality covered: {quality ? `${quality.coveredCharacters}/${quality.totalCharacters}` : "n/a"}</p>
          <p>Change rows delta: {changes ? changes.rowCoverage.changedRows : "n/a"}</p>
          <p>Source-diff OK: {sourceDiff ? String(sourceDiff.summary.ok) : "n/a"}</p>
        </div>
      </article>
    </section>
  );
}
