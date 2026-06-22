import { CharactersBrowser } from "@/components/characters-browser";
import { getCharacterListData, getCharacterLineTotalsForSite, getCharacterPortraitMap } from "@/lib/data";
import { getCharacterDisplayNameMap } from "@/lib/i18n/character-names";
import { localizeGameLabel } from "@/lib/i18n/game-labels";
import { getMessages, getSiteLocale } from "@/lib/i18n/server";
import { isRoverCharacter } from "@/lib/i18n/locale";

export default async function CharactersPage() {
  const [characters, lineTotals, portraits, siteLocale, t] = await Promise.all([
    getCharacterListData(),
    getCharacterLineTotalsForSite(),
    getCharacterPortraitMap(),
    getSiteLocale(),
    getMessages(),
  ]);
  const displayNames = await getCharacterDisplayNameMap(siteLocale);

  if (characters.length === 0) {
    return <p className="text-zinc-600">{t.characters.empty}</p>;
  }

  const listItems = characters.map((character) => {
    const totals = lineTotals.get(character.id);
    const totalLines = isRoverCharacter(character.id) ? 0 : (totals?.totalLines ?? 0);
    return {
      id: character.id,
      name: displayNames.get(character.id) ?? character.name,
      element: localizeGameLabel(character.element, "element", siteLocale),
      weapon: localizeGameLabel(character.weapon, "weapon", siteLocale),
      faction: localizeGameLabel(character.faction, "faction", siteLocale),
      rarity: character.rarity,
      releaseVersion: character.releaseVersion,
      voiceLineTotal: totalLines,
      hasVoiceStats: totalLines > 0,
      avatarUrl: portraits.get(character.id) ?? null,
    };
  });

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">{t.characters.title}</h1>
      <p className="text-zinc-600">{t.characters.description}</p>
      <CharactersBrowser items={listItems} labels={t.characters} common={t.common} showCharacterId={siteLocale === "en"} />
    </section>
  );
}
