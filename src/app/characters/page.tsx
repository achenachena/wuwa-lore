import { CharactersBrowser } from "@/components/characters-browser";
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

  const listItems = characters.map((character) => ({
    id: character.id,
    name: character.name,
    element: character.element,
    weapon: character.weapon,
    faction: character.faction,
    rarity: character.rarity,
    releaseVersion: character.releaseVersion,
    voiceLineTotal: totalByCharacter.get(character.id) ?? 0,
    hasVoiceStats: stats.some((row) => row.characterId === character.id),
  }));

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">Characters</h1>
      <p className="text-zinc-600">
        Search and filter all archived resonators by element, weapon, rarity, debut version, and
        voice-line totals.
      </p>
      <CharactersBrowser items={listItems} />
    </section>
  );
}
