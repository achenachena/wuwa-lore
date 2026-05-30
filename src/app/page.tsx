import Link from "next/link";
import { getCharacterListData, getVersionStatsPageData } from "@/lib/data";

export default async function Home() {
  const [characters, versionStats] = await Promise.all([
    getCharacterListData(),
    getVersionStatsPageData(),
  ]);
  const totalLines = versionStats.reduce((sum, item) => sum + item.totalVoiceLines, 0);
  return (
    <section className="space-y-6">
      <h1 className="text-3xl font-semibold">Wuthering Waves Character Intelligence Hub</h1>
      <p className="max-w-3xl text-zinc-700">
        This site tracks character archives, image metadata, debut versions, per-version voice line
        counts, and total voice lines with deterministic data generation.
      </p>
      <div className="grid gap-4 md:grid-cols-3">
        <article className="rounded-lg border border-zinc-200 bg-white p-4">
          <h2 className="text-sm font-medium text-zinc-500">Tracked Characters</h2>
          <p className="mt-2 text-2xl font-semibold">{characters.length}</p>
        </article>
        <article className="rounded-lg border border-zinc-200 bg-white p-4">
          <h2 className="text-sm font-medium text-zinc-500">Tracked Versions</h2>
          <p className="mt-2 text-2xl font-semibold">{versionStats.length}</p>
        </article>
        <article className="rounded-lg border border-zinc-200 bg-white p-4">
          <h2 className="text-sm font-medium text-zinc-500">Total Voice Lines</h2>
          <p className="mt-2 text-2xl font-semibold">{totalLines}</p>
        </article>
      </div>
      <div className="flex flex-wrap gap-3">
        <Link className="rounded-md bg-zinc-900 px-4 py-2 text-white" href="/characters">
          Browse Characters
        </Link>
        <Link className="rounded-md border border-zinc-300 bg-white px-4 py-2" href="/stats/versions">
          View Version Analytics
        </Link>
      </div>
    </section>
  );
}
