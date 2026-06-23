import { promises as fs } from "node:fs";
import path from "node:path";

type CharacterImage = {
  id: string;
  characterId: string;
  type: "portrait" | "card" | "splash" | "other";
  title: string;
  localPath: string;
  copyright: string;
  source: {
    sourceUrl: string;
    scrapedAt: string;
    editor: string;
  };
};

type CharacterRecord = {
  id: string;
  name: string;
  source: { sourceUrl: string };
};

async function fetchJson<T>(params: Record<string, string>): Promise<T> {
  const url = new URL("https://wutheringwaves.fandom.com/api.php");
  url.searchParams.set("format", "json");
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Fandom API failed (${response.status})`);
  }
  return (await response.json()) as T;
}

async function fetchFileUrl(fileTitle: string): Promise<string | null> {
  type Res = {
    query: {
      pages: Record<
        string,
        {
          missing?: boolean;
          imageinfo?: Array<{ url?: string }>;
        }
      >;
    };
  };
  const data = await fetchJson<Res>({
    action: "query",
    titles: fileTitle,
    prop: "imageinfo",
    iiprop: "url",
  });
  const page = Object.values(data.query.pages)[0];
  if (page?.missing) {
    return null;
  }
  return page?.imageinfo?.[0]?.url ?? null;
}

async function fetchCharacterCard(pageTitle: string): Promise<string | null> {
  type Page = {
    original?: { source?: string };
    thumbnail?: { source?: string };
  };
  type Res = {
    query: {
      pages: Record<string, Page>;
    };
  };
  const data = await fetchJson<Res>({
    action: "query",
    titles: pageTitle,
    prop: "pageimages",
    piprop: "thumbnail|original",
    pithumbsize: "512",
  });
  const pageData = Object.values(data.query.pages)[0];
  return pageData?.original?.source ?? pageData?.thumbnail?.source ?? null;
}

function wikiPageFromSourceUrl(sourceUrl: string): string {
  const title = sourceUrl.split("/wiki/")[1] ?? "";
  return decodeURIComponent(title.replace(/_/g, " "));
}

async function main() {
  const root = process.cwd();
  const nowIso = new Date().toISOString();
  const editor = "scripts/sync-character-portraits.ts";
  const imagesPath = path.join(root, "content", "images", "images.json");
  const characterDir = path.join(root, "content", "characters");

  const [existingRaw, characterFiles] = await Promise.all([
    fs.readFile(imagesPath, "utf8"),
    fs.readdir(characterDir),
  ]);
  const images = JSON.parse(existingRaw) as CharacterImage[];
  const byId = new Map(images.map((image) => [image.id, image]));

  const characters: CharacterRecord[] = [];
  for (const file of characterFiles) {
    if (!file.endsWith(".json")) {
      continue;
    }
    characters.push(JSON.parse(await fs.readFile(path.join(characterDir, file), "utf8")) as CharacterRecord);
  }
  characters.sort((a, b) => a.id.localeCompare(b.id));

  let added = 0;
  let updated = 0;

  for (const character of characters) {
    const pageTitle = wikiPageFromSourceUrl(character.source.sourceUrl);
    const portraitCandidates = [
      `File:Resonator ${character.name}.png`,
      `File:Resonator ${pageTitle}.png`,
    ];
    let portraitUrl: string | null = null;
    for (const candidate of portraitCandidates) {
      portraitUrl = await fetchFileUrl(candidate);
      if (portraitUrl) {
        break;
      }
    }

    if (portraitUrl) {
      const id = `${character.id}-portrait`;
      const record: CharacterImage = {
        id,
        characterId: character.id,
        type: "portrait",
        title: `${character.name} Portrait`,
        localPath: portraitUrl,
        copyright: "Fandom / Kuro Games",
        source: {
          sourceUrl: character.source.sourceUrl,
          scrapedAt: nowIso,
          editor,
        },
      };
      if (byId.has(id)) {
        byId.set(id, record);
        updated += 1;
      } else {
        byId.set(id, record);
        added += 1;
      }
    }

    const hasCard = [...byId.values()].some(
      (image) => image.characterId === character.id && image.type === "card",
    );
    if (!hasCard && pageTitle) {
      const cardUrl = await fetchCharacterCard(pageTitle);
      if (cardUrl) {
        const id = `${character.id}-card`;
        byId.set(id, {
          id,
          characterId: character.id,
          type: "card",
          title: `${character.name} Card`,
          localPath: cardUrl,
          copyright: "Fandom / Kuro Games",
          source: {
            sourceUrl: character.source.sourceUrl,
            scrapedAt: nowIso,
            editor,
          },
        });
        added += 1;
      }
    }
  }

  const nextImages = [...byId.values()].sort((a, b) => a.id.localeCompare(b.id));
  await fs.writeFile(imagesPath, `${JSON.stringify(nextImages, null, 2)}\n`);
  console.log(`Portrait sync complete: ${added} added/updated entries (${updated} portrait refreshes).`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
