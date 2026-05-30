import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
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
  const { character, characterStats, characterImages } = await getCharacterDetailData(id);

  if (!character) {
    notFound();
  }

  const stat = characterStats[0];
  return (
    <section className="space-y-6">
      <div>
        <Link href="/characters" className="text-sm text-zinc-500">
          ← Back to characters
        </Link>
        <h1 className="mt-2 text-3xl font-semibold">{character.name}</h1>
        <p className="mt-2 max-w-3xl text-zinc-700">{character.profile}</p>
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
        <h2 className="text-lg font-semibold">Voice line stats</h2>
        {!stat ? (
          <p className="mt-2 text-zinc-600">No generated voice stats yet. Run `npm run data:generate`.</p>
        ) : (
          <>
            <p className="mt-2 text-zinc-700">
              Locale: <strong>{stat.locale}</strong> · Total lines: <strong>{stat.totalLineCount}</strong>
            </p>
            <table className="mt-4 w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-left text-zinc-500">
                  <th className="py-2">Version</th>
                  <th className="py-2">Line count</th>
                </tr>
              </thead>
              <tbody>
                {stat.perVersionLineCounts.map((item) => (
                  <tr key={item.version} className="border-b border-zinc-100">
                    <td className="py-2">{item.version}</td>
                    <td className="py-2">{item.lineCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
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
