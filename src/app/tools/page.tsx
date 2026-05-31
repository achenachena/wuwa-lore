import { getCharacterListData } from "@/lib/data";
import { loadGeneratedStats, loadQualityReport, loadValidationReport } from "@/lib/data/loaders";

export default async function ToolsPage() {
  const [stats, report, characters, quality] = await Promise.all([
    loadGeneratedStats().catch(() => []),
    loadValidationReport().catch(() => null),
    getCharacterListData().catch(() => []),
    loadQualityReport().catch(() => null),
  ]);

  const coveredCharacterIds = new Set(stats.map((row) => row.characterId));
  const missingVoiceCharacters = characters.filter((character) => !coveredCharacterIds.has(character.id));
  const unknownReleaseCharacters = characters.filter((character) => character.releaseVersion === "unknown");

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
          <p className="mt-1 text-sm text-zinc-600">
            Rows with non-zero content: {quality.rowsWithContent} / {quality.actualRows}
          </p>
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
        </div>
      </article>
    </section>
  );
}
