import Link from "next/link";
import { getCharacterListData } from "@/lib/data";
import { loadGeneratedStats } from "@/lib/data/loaders";

export default async function CharactersPage() {
  const [characters, stats] = await Promise.all([getCharacterListData(), loadGeneratedStats()]);
  const totalByCharacter = new Map<string, number>();
  for (const row of stats) {
    const current = totalByCharacter.get(row.characterId) ?? 0;
    totalByCharacter.set(row.characterId, current + row.totalLineCount);
  }

  if (characters.length === 0) {
    return <p className="text-zinc-600">No characters yet. Add records under `content/characters`.</p>;
  }

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">Characters</h1>
      <p className="text-zinc-600">Archive includes debut version and key metadata.</p>
      <div className="grid gap-4 md:grid-cols-2">
        {characters.map((character) => (
          <article key={character.id} className="rounded-lg border border-zinc-200 bg-white p-4">
            <h2 className="text-lg font-semibold">{character.name}</h2>
            <p className="text-sm text-zinc-500">{character.id}</p>
            <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
              <div>
                <dt className="text-zinc-500">Element</dt>
                <dd>{character.element}</dd>
              </div>
              <div>
                <dt className="text-zinc-500">Weapon</dt>
                <dd>{character.weapon}</dd>
              </div>
              <div>
                <dt className="text-zinc-500">Faction</dt>
                <dd>{character.faction}</dd>
              </div>
              <div>
                <dt className="text-zinc-500">Debut</dt>
                <dd>{character.releaseVersion}</dd>
              </div>
              <div>
                <dt className="text-zinc-500">Voice Lines</dt>
                <dd>{totalByCharacter.get(character.id) ?? 0}</dd>
              </div>
            </dl>
            <Link href={`/characters/${character.id}`} className="mt-4 inline-block text-sm font-medium">
              View details →
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}
