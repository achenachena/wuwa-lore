export default function MethodologyPage() {
  return (
    <section className="space-y-6">
      <h1 className="text-3xl font-semibold">Data Methodology</h1>
      <p className="max-w-4xl text-zinc-700">
        This page documents exactly how voiceline numbers are produced, what is directly sourced, and
        what is estimated. The goal is auditability for lore-focused players.
      </p>

      <article className="rounded-lg border border-zinc-200 bg-white p-4">
        <h2 className="text-lg font-semibold">Primary Sources</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-zinc-700">
          <li>Character metadata: playable resonator pages on Wuthering Waves Fandom.</li>
          <li>Version metadata: pages under `Version/x.y` on Wuthering Waves Fandom.</li>
          <li>Voiceline metadata: locale pages such as `Character/Voicelines/...` and their revisions.</li>
        </ul>
      </article>

      <article className="rounded-lg border border-zinc-200 bg-white p-4">
        <h2 className="text-lg font-semibold">Counting Rule</h2>
        <p className="mt-2 text-sm text-zinc-700">
          A voiceline is counted as one unique, non-empty text key matching the source pattern
          <code className="ml-1">*_tx</code> (including localized suffixes such as
          <code className="ml-1">*_tx_s</code> and <code className="ml-1">*_tx_t</code>, deduplicated by base key).
        </p>
      </article>

      <article className="rounded-lg border border-zinc-200 bg-white p-4">
        <h2 className="text-lg font-semibold">Version Attribution</h2>
        <p className="mt-2 text-sm text-zinc-700">
          Per-version counts are estimated by comparing source page revision snapshots at version
          release boundaries. Because source wikis may be edited after release windows, per-version
          values should be treated as best-effort historical estimates, while total counts represent
          current source state.
        </p>
      </article>

      <article className="rounded-lg border border-zinc-200 bg-white p-4">
        <h2 className="text-lg font-semibold">Reliability Status</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-zinc-700">
          <li>
            <strong>verified</strong>: source locale page exists and was parsed from revision history.
          </li>
          <li>
            <strong>missing_source</strong>: source locale page does not currently exist; row is present
            for completeness but counts remain zero.
          </li>
        </ul>
      </article>
    </section>
  );
}
