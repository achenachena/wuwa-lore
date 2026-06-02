import { getCharacterListData } from "@/lib/data";
import {
  loadChangeReport,
  loadGeneratedStats,
  loadQualityReport,
  loadSourceDiffReport,
  loadValidationReport,
} from "@/lib/data/loaders";

export default async function ToolsPage() {
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
                {report.ok ? "PASS" : "FAIL"}
              </span>
            </p>
            <p>Generated At: {report.generatedAt}</p>
            <p>Identity Errors: {report.checks.identityValidation.errors.length}</p>
            <p>Stat Errors: {report.checks.statValidation.errors.length}</p>
            <p>
              Official Baseline Errors:{" "}
              {report.checks.officialValidation?.errors.length ?? "N/A"}
            </p>
          </div>
        )}
      </article>

      <article className="rounded-lg border border-zinc-200 bg-white p-4">
        <h2 className="text-lg font-semibold">Generated Voice Rows</h2>
        <p className="mt-2 text-sm text-zinc-600">Rows currently generated: {stats.length}</p>
        <p className="mt-1 text-sm text-zinc-600">
          Characters covered by voice stats: {coveredCharacterIds.size} / {characters.length}
        </p>
        {quality ? (
          <div className="mt-1 space-y-1 text-sm text-zinc-600">
            <p>Rows with non-zero content: {quality.rowsWithContent} / {quality.actualRows}</p>
            <p>Verified source pages: {quality.verifiedRows} / {quality.actualRows}</p>
            <p>Missing source pages: {quality.missingSourceRows} / {quality.actualRows}</p>
          </div>
        ) : null}
      </article>

      <article className="rounded-lg border border-zinc-200 bg-white p-4">
        <h2 className="text-lg font-semibold">Data Gaps</h2>
        <div className="mt-2 space-y-3 text-sm">
          <div>
            <p className="font-medium text-zinc-800">
              Missing voice stats ({missingVoiceCharacters.length})
            </p>
            <p className="text-zinc-600">
              {missingVoiceCharacters.map((character) => character.name).join(", ") || "None"}
            </p>
          </div>
          <div>
            <p className="font-medium text-zinc-800">
              Unknown release version ({unknownReleaseCharacters.length})
            </p>
            <p className="text-zinc-600">
              {unknownReleaseCharacters.map((character) => character.name).join(", ") || "None"}
            </p>
          </div>
          <div>
            <p className="font-medium text-zinc-800">
              Missing source rows ({missingSourceRows.length})
            </p>
            <p className="text-zinc-600">
              {missingSourceRows
                .slice(0, 20)
                .map((row) => `${row.characterId}:${row.locale}`)
                .join(", ") || "None"}
              {missingSourceRows.length > 20 ? " …" : ""}
            </p>
          </div>
        </div>
      </article>

      <article className="rounded-lg border border-zinc-200 bg-white p-4">
        <h2 className="text-lg font-semibold">Data Methodology</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-zinc-700">
          <li>Source: Wuthering Waves Fandom MediaWiki pages and revision history.</li>
          <li>Count method: unique non-empty `*_tx` text keys per locale page.</li>
          <li>Per-version values: estimated by revision snapshots at version release boundaries.</li>
          <li>Rows marked as missing_source mean the locale page does not currently exist on source wiki.</li>
        </ul>
        <p className="mt-2 text-sm text-zinc-600">
          For full details and caveats, see the <a className="underline" href="/methodology">Methodology</a> page.
        </p>
      </article>

      <article className="rounded-lg border border-zinc-200 bg-white p-4">
        <h2 className="text-lg font-semibold">Sync Change Report</h2>
        {!changes ? (
          <p className="mt-2 text-sm text-zinc-600">No change report found yet.</p>
        ) : (
          <div className="mt-2 space-y-2 text-sm text-zinc-700">
            <p>Generated: {new Date(changes.generatedAt).toLocaleString()}</p>
            <p>
              Rows old→new: {changes.rowCoverage.oldRowCount} → {changes.rowCoverage.newRowCount}
              {" · "}added {changes.rowCoverage.addedRows}, removed {changes.rowCoverage.removedRows},
              changed {changes.rowCoverage.changedRows}
            </p>
            <p>
              Current line delta: +{changes.currentLineCountDelta.increasedRows} / -
              {changes.currentLineCountDelta.decreasedRows} / ={changes.currentLineCountDelta.unchangedRows}
            </p>
          </div>
        )}
      </article>

      <article className="rounded-lg border border-zinc-200 bg-white p-4">
        <h2 className="text-lg font-semibold">Dual-source Version Diff</h2>
        {!sourceDiff ? (
          <p className="mt-2 text-sm text-zinc-600">
            No source diff report found. Run `npm run data:compare`.
          </p>
        ) : (
          <div className="mt-2 space-y-2 text-sm text-zinc-700">
            <p>
              Status:{" "}
              <span className={sourceDiff.summary.ok ? "font-semibold text-emerald-600" : "font-semibold text-amber-700"}>
                {sourceDiff.summary.ok ? "IN SYNC" : "DIFF FOUND"}
              </span>
            </p>
            <p>
              Coverage: fandom {sourceDiff.summary.fandomVersionCount}, official{" "}
              {sourceDiff.summary.officialVersionCount}
            </p>
            <p>
              Aligned dates (±{sourceDiff.toleranceMinutes ?? 180} min): {sourceDiff.summary.alignedDate ?? 0};
              mismatches: {sourceDiff.summary.mismatchedDate}
            </p>
            <p>
              Missing in official: {sourceDiff.summary.missingInOfficial}; missing in fandom:{" "}
              {sourceDiff.summary.missingInFandom}
            </p>
            {sourceDiff.mismatchedDate.length > 0 ? (
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-zinc-200 text-zinc-500">
                      <th className="py-2 pr-3">Version</th>
                      <th className="py-2 pr-3">Fandom</th>
                      <th className="py-2 pr-3">Official</th>
                      <th className="py-2 pr-3">Δ min</th>
                      <th className="py-2">Notice</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sourceDiff.mismatchedDate.map((row) => (
                      <tr key={row.version} className="border-b border-zinc-100">
                        <td className="py-2 pr-3 font-medium">{row.version}</td>
                        <td className="py-2 pr-3">{row.fandomReleaseDate}</td>
                        <td className="py-2 pr-3">{row.officialReleaseDate}</td>
                        <td className="py-2 pr-3">{row.deltaMinutes}</td>
                        <td className="py-2">
                          <a className="underline" href={row.noticeUrl} target="_blank" rel="noreferrer">
                            source
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
            {sourceDiff.missingInOfficial.length > 0 ? (
              <p className="text-amber-700">Missing in official: {sourceDiff.missingInOfficial.join(", ")}</p>
            ) : null}
          </div>
        )}
      </article>

      <article className="rounded-lg border border-zinc-200 bg-white p-4">
        <h2 className="text-lg font-semibold">Exports</h2>
        <p className="mt-2 text-sm text-zinc-600">
          Download normalized snapshots for external analysis or BI tools.
        </p>
        <div className="mt-3 flex flex-wrap gap-3 text-sm">
          <a
            className="rounded border border-zinc-300 px-3 py-2 hover:bg-zinc-50"
            href="/api/exports/characters"
          >
            Download Characters CSV
          </a>
          <a
            className="rounded border border-zinc-300 px-3 py-2 hover:bg-zinc-50"
            href="/api/exports/voice-stats-csv"
          >
            Download Voice Stats CSV
          </a>
          <a
            className="rounded border border-zinc-300 px-3 py-2 hover:bg-zinc-50"
            href="/api/exports/voice-stats-json"
          >
            Download Voice Stats JSON
          </a>
          <a
            className="rounded border border-zinc-300 px-3 py-2 hover:bg-zinc-50"
            href="/api/exports/voice-lines-json"
          >
            Download Voice Lines JSON
          </a>
          <a
            className="rounded border border-zinc-300 px-3 py-2 hover:bg-zinc-50"
            href="/api/exports/voice-lines-csv"
          >
            Download Voice Lines CSV
          </a>
          <a
            className="rounded border border-zinc-300 px-3 py-2 hover:bg-zinc-50"
            href="/api/exports/source-diff-json"
          >
            Source Diff JSON
          </a>
          <a
            className="rounded border border-zinc-300 px-3 py-2 hover:bg-zinc-50"
            href="/api/health/data-quality"
          >
            Data Quality Health JSON
          </a>
        </div>
      </article>
    </section>
  );
}
