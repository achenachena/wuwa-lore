import { loadCharacters } from "@/lib/data/loaders";
import { csvExport } from "@/lib/security/exports";

export async function GET() {
  const characters = await loadCharacters();

  return csvExport(
    [
      "id",
      "name",
      "element",
      "weapon",
      "faction",
      "rarity",
      "releaseVersion",
      "profile",
      "sourceUrl",
    ],
    characters.map((character) => [
      character.id,
      character.name,
      character.element,
      character.weapon,
      character.faction,
      character.rarity,
      character.releaseVersion,
      character.profile,
      character.source.sourceUrl,
    ]),
    "wuwa-characters.csv",
  );
}
