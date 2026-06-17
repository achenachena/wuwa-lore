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

      <article className="rounded-lg border border-zinc-200 bg-white p-4">
        <h2 className="text-lg font-semibold">Dual-source Validation</h2>
        <p className="mt-2 text-sm text-zinc-700">
          Version dates are cross-checked against Kuro&apos;s official news feed (MainMenu JSON CDN)
          via <code className="mx-1">npm run data:sync-official</code>, stored in
          <code className="ml-1">content/official/version-notes.json</code>, and compared with Fandom
          using a ±180 minute tolerance in <code className="mx-1">npm run data:compare</code>.
        </p>
        <p className="mt-2 text-sm text-zinc-700">
          Each voiceline row stores the exact wiki field path (for example
          <code className="mx-1">resskill_1_tx_s</code>) so text can be traced back to source wikitext.
        </p>
      </article>

      <article className="rounded-lg border border-zinc-200 bg-white p-4">
        <h2 className="text-lg font-semibold">Version-half Story Appearances</h2>
        <p className="mt-2 text-sm text-zinc-700">
          Main-story appearance counts are derived from Fandom quest infobox
          <code className="mx-1">characters</code> fields only (no dialogue mentions). Quest-to-half
          mapping lives in <code className="mx-1">content/stories/quest-half-map.json</code> and follows
          official content release waves: first story wave in a patch = 上半, second wave = 下半.
          Episodic/联动 quests are excluded.
        </p>
        <p className="mt-2 text-sm text-zinc-700">
          Regenerate with <code className="mx-1">npm run data:sync-stories</code>.
        </p>
      </article>

      <article className="rounded-lg border border-zinc-200 bg-white p-4">
        <h2 className="text-lg font-semibold">Version-half Voice Lines</h2>
        <p className="mt-2 text-sm text-zinc-700">
          Per-half voiceline counts map each line&apos;s first-seen timestamp to the calendar midpoint
          between adjacent version release dates. Regenerate with{" "}
          <code className="mx-1">npm run data:generate-half-stats</code>.
        </p>
      </article>
    </section>
  );
}
