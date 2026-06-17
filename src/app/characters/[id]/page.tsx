import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { VoiceLineExplorer } from "@/components/voice-line-explorer";
import { getCharacterDetailData } from "@/lib/data";

type CharacterDetailProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: CharacterDetailProps): Promise<Metadata> {
  const { id } = await params;
  const { character } = await getCharacterDetailData(id);
  if (!character) {
    return {
      title: "Character Not Found",
    };
  }
  return {
    title: `${character.name} | Wuwa Lore`,
    description: `${character.name} profile and voice line analytics`,
  };
}

export default async function CharacterDetailPage({ params }: CharacterDetailProps) {
  const { id } = await params;
  const { character, characterStats, characterImages, characterVoiceDetails, storyDialogueByVersion } =
    await getCharacterDetailData(id);

  if (!character) {
    notFound();
  }

  const storyDialogueRows = [...storyDialogueByVersion.entries()]
    .map(([version, count]) => ({ version, count }))
    .filter((row) => row.count > 0)
    .sort((a, b) => a.version.localeCompare(b.version, "en"));
  const maxStoryDialogue = storyDialogueRows.reduce((max, row) => Math.max(max, row.count), 1);

  const trendByVersion = new Map<string, number>();
  for (const stat of characterStats) {
    for (const item of stat.perVersionLineCounts) {
      const current = trendByVersion.get(item.version) ?? 0;
      trendByVersion.set(item.version, current + item.lineCount);
    }
  }
  const trendRows = [...trendByVersion.entries()]
    .map(([version, count]) => ({ version, count }))
    .sort((a, b) => a.version.localeCompare(b.version, "en"));
  const maxTrend = trendRows.reduce((max, row) => Math.max(max, row.count), 1);

  return (
    <section className="space-y-6">
      <div>
        <Link href="/characters" className="text-sm text-zinc-500">
          ← Back to characters
        </Link>
        <h1 className="mt-2 text-3xl font-semibold">{character.name}</h1>
        <p className="mt-2 max-w-3xl text-zinc-700">{character.profile}</p>
        <p className="mt-2 text-xs text-zinc-500">
          Source:{" "}
          <a
            href={character.source.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="underline"
          >
            {character.source.sourceUrl}
          </a>
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <article className="rounded-lg border border-zinc-200 bg-white p-4">
          <p className="text-sm text-zinc-500">Element</p>
          <p className="mt-1 font-medium">{character.element}</p>
        </article>
        <article className="rounded-lg border border-zinc-200 bg-white p-4">
          <p className="text-sm text-zinc-500">Weapon</p>
          <p className="mt-1 font-medium">{character.weapon}</p>
        </article>
        <article className="rounded-lg border border-zinc-200 bg-white p-4">
          <p className="text-sm text-zinc-500">Faction</p>
          <p className="mt-1 font-medium">{character.faction}</p>
        </article>
        <article className="rounded-lg border border-zinc-200 bg-white p-4">
          <p className="text-sm text-zinc-500">Debut Version</p>
          <p className="mt-1 font-medium">{character.releaseVersion}</p>
        </article>
      </div>

      <article className="rounded-lg border border-zinc-200 bg-white p-4">
        <h2 className="text-lg font-semibold">Main story dialogue by version</h2>
        <p className="mt-1 text-sm text-zinc-600">
          Speaker lines in main-story quests, sourced from{" "}
          <a className="underline" href="https://encore.moe/story?lang=zh-Hans" target="_blank" rel="noreferrer">
            encore.moe
          </a>{" "}
          (zh-Hans). This reflects in-game story dialogue, not profile voicelines.
        </p>
        {storyDialogueRows.length === 0 ? (
          <p className="mt-2 text-zinc-600">No main-story dialogue recorded for this character yet.</p>
        ) : (
          <div className="mt-4 space-y-2">
            {storyDialogueRows.map((row) => (
              <div key={row.version} className="grid grid-cols-[72px_1fr_56px] items-center gap-3 text-sm">
                <span className="text-zinc-600">{row.version}</span>
                <div className="h-3 rounded bg-zinc-100">
                  <div
                    className="h-3 rounded bg-emerald-700"
                    style={{ width: `${Math.max(2, (row.count / maxStoryDialogue) * 100)}%` }}
                  />
                </div>
                <span className="text-right font-medium">{row.count}</span>
              </div>
            ))}
          </div>
        )}
      </article>

      <article className="rounded-lg border border-zinc-200 bg-white p-4">
        <h2 className="text-lg font-semibold">Profile voiceline stats (Fandom)</h2>
        <p className="mt-1 text-sm text-zinc-600">
          Resonator profile voicelines from Fandom wiki. Per-version counts reflect when lines first
          appeared on the wiki, not when story dialogue was added in-game.
        </p>
        {characterStats.length === 0 ? (
          <p className="mt-2 text-zinc-600">No generated voice stats yet. Run `npm run data:generate`.</p>
        ) : (
          <div className="space-y-6">
            {characterStats.map((stat) => (
              <div key={stat.locale} className="rounded border border-zinc-200 p-3">
                <p className="text-zinc-700">
                  Locale: <strong>{stat.locale}</strong> · Total lines:{" "}
                  <strong>{stat.totalLineCount}</strong>
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  Source status:{" "}
                  <strong>{stat.qualityStatus === "verified" ? "verified" : "source page missing"}</strong> ·
                  Method: <code>{stat.countMethod}</code> · Revisions: {stat.sourceRevisionCount}
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  Source page:{" "}
                  <a href={stat.sources[0]} target="_blank" rel="noreferrer" className="underline">
                    {stat.sourcePageTitle}
                  </a>
                  {stat.sourceLatestRevisionAt ? (
                    <> · Latest revision: {new Date(stat.sourceLatestRevisionAt).toLocaleString()}</>
                  ) : null}
                </p>
                <table className="mt-3 w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-zinc-200 text-left text-zinc-500">
                      <th className="py-2">Version</th>
                      <th className="py-2">Line count</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stat.perVersionLineCounts.map((item) => (
                      <tr key={`${stat.locale}-${item.version}`} className="border-b border-zinc-100">
                        <td className="py-2">{item.version}</td>
                        <td className="py-2">{item.lineCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        )}
      </article>

      <article className="rounded-lg border border-zinc-200 bg-white p-4">
        <h2 className="text-lg font-semibold">Profile voiceline trend (Fandom, all locales)</h2>
        {trendRows.length === 0 ? (
          <p className="mt-2 text-zinc-600">No trend data available.</p>
        ) : (
          <div className="mt-4 space-y-2">
            {trendRows.map((row) => (
              <div key={row.version} className="grid grid-cols-[72px_1fr_56px] items-center gap-3 text-sm">
                <span className="text-zinc-600">{row.version}</span>
                <div className="h-3 rounded bg-zinc-100">
                  <div
                    className="h-3 rounded bg-zinc-700"
                    style={{ width: `${Math.max(2, (row.count / maxTrend) * 100)}%` }}
                  />
                </div>
                <span className="text-right font-medium">{row.count}</span>
              </div>
            ))}
          </div>
        )}
      </article>

      <article className="rounded-lg border border-zinc-200 bg-white p-4">
        <h2 className="text-lg font-semibold">Voice Lines (Text)</h2>
        <p className="mt-1 text-sm text-zinc-600">
          Extracted from source `*_tx` fields. Use search and locale filters for direct auditing.
        </p>
        <div className="mt-4">
          <VoiceLineExplorer
            items={characterVoiceDetails.map((row) => ({
              locale: row.locale,
              sourcePageExists: row.sourcePageExists,
              sourcePageTitle: row.sourcePageTitle,
              sourcePageUrl: `https://wutheringwaves.fandom.com/wiki/${encodeURIComponent(row.sourcePageTitle).replace(/%20/g, "_")}`,
              lines: row.lines.map((line) => ({
                key: line.key,
                text: line.text,
                sourceFieldPath: line.sourceFieldPath ?? `${line.key}_tx`,
                firstSeenVersion: line.firstSeenVersion,
              })),
            }))}
          />
        </div>
      </article>

      <article className="rounded-lg border border-zinc-200 bg-white p-4">
        <h2 className="text-lg font-semibold">Image metadata</h2>
        {characterImages.length === 0 ? (
          <p className="mt-2 text-zinc-600">No images registered for this character.</p>
        ) : (
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {characterImages.map((image) => (
              <figure key={image.id} className="rounded border border-zinc-200 p-3">
                <Image
                  src={image.localPath}
                  alt={image.title}
                  width={480}
                  height={270}
                  className="h-auto w-full rounded"
                />
                <figcaption className="mt-2 text-xs text-zinc-600">
                  {image.title} ({image.type}) · Source: {image.source.sourceUrl}
                </figcaption>
              </figure>
            ))}
          </div>
        )}
      </article>
    </section>
  );
}
