import { CharactersBrowser } from "@/components/characters-browser";
import { getCharacterListData } from "@/lib/data";
import { getMessages } from "@/lib/i18n/server";
import { loadGeneratedStats } from "@/lib/data/loaders";

export default async function CharactersPage() {
  const [characters, stats, t] = await Promise.all([
    getCharacterListData(),
    loadGeneratedStats(),
    getMessages(),
  ]);
  const totalByCharacter = new Map<string, number>();
  for (const row of stats) {
    const current = totalByCharacter.get(row.characterId) ?? 0;
    totalByCharacter.set(row.characterId, current + row.totalLineCount);
  }

  if (characters.length === 0) {
    return <p className="text-zinc-600">{t.characters.empty}</p>;
  }

  const listItems = characters.map((character) => {
    const rows = stats.filter((row) => row.characterId === character.id);
    return {
      id: character.id,
      name: character.name,
      element: character.element,
      weapon: character.weapon,
      faction: character.faction,
      rarity: character.rarity,
      releaseVersion: character.releaseVersion,
      voiceLineTotal: totalByCharacter.get(character.id) ?? 0,
      hasVoiceStats: rows.length > 0,
    };
  });

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">{t.characters.title}</h1>
      <p className="text-zinc-600">{t.characters.description}</p>
      <CharactersBrowser items={listItems} labels={t.characters} common={t.common} />
    </section>
  );
}
