import { loadCharacters } from "@/lib/data/loaders";
import { exportHeaders } from "@/lib/security/exports";

function escapeCsvCell(value: string | number): string {
  const text = String(value);
  if (text.includes(",") || text.includes('"') || text.includes("\n")) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export async function GET() {
  const characters = await loadCharacters();

  const headers = [
    "id",
    "name",
    "element",
    "weapon",
    "faction",
    "rarity",
    "releaseVersion",
    "profile",
    "sourceUrl",
  ];
  const rows = characters.map((character) =>
    [
      character.id,
      character.name,
      character.element,
      character.weapon,
      character.faction,
      character.rarity,
      character.releaseVersion,
      character.profile,
      character.source.sourceUrl,
    ]
      .map((cell) => escapeCsvCell(cell))
      .join(","),
  );
  const csv = `${headers.join(",")}\n${rows.join("\n")}\n`;

  return new Response(csv, {
    headers: exportHeaders("wuwa-characters.csv", "text/csv; charset=utf-8"),
  });
}
