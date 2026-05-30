import { promises as fs } from "node:fs";
import path from "node:path";

type Locale = "en-US" | "zh-CN" | "ja-JP" | "ko-KR";

type SourceTrace = {
  sourceUrl: string;
  sourceRevision?: string;
  scrapedAt: string;
  editor: string;
};

type CharacterRecord = {
  id: string;
  name: string;
  aliases: string[];
  element: string;
  weapon: string;
  faction: string;
  rarity: number;
  releaseVersion: string;
  profile: string;
  locale: Locale;
  source: SourceTrace;
};

type VersionRecord = {
  version: string;
  releaseDate: string;
  notes: string;
};

type CharacterImage = {
  id: string;
  characterId: string;
  type: "portrait" | "card" | "splash" | "other";
  title: string;
  localPath: string;
  copyright: string;
  source: SourceTrace;
};

type VoiceLineStatRow = {
  characterId: string;
  debutVersion: string;
  locale: Locale;
  perVersionLineCounts: Array<{ version: string; lineCount: number }>;
  totalLineCount: number;
  sources: string[];
  generatedAt: string;
};

const API_ROOT = "https://wutheringwaves.fandom.com/api.php";

const localePages: Array<{ locale: Locale; suffix: string }> = [
  { locale: "en-US", suffix: "/Voicelines" },
  { locale: "zh-CN", suffix: "/Voicelines/Chinese" },
  { locale: "ja-JP", suffix: "/Voicelines/Japanese" },
  { locale: "ko-KR", suffix: "/Voicelines/Korean" },
];

const nowIso = new Date().toISOString();

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/['".]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function parseWikiDate(raw: string): string {
  // Example values: "2025-06-12 11:00" or "2024-05-23"
  const normalized = raw.trim().replace(" ", "T");
  if (normalized.length === 10) {
    return normalized;
  }
  return normalized;
}

function cleanWikiText(value: string): string {
  return value
    .replace(/<ref[^>]*>[\s\S]*?<\/ref>/g, "")
    .replace(/{{[^{}]*}}/g, "")
    .replace(/\[\[([^|\]]*\|)?([^\]]+)\]\]/g, "$2")
    .replace(/\[[^\s\]]+\s([^\]]+)\]/g, "$1")
    .replace(/'''?/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseTemplateField(wikitext: string, key: string): string | undefined {
  const re = new RegExp(`\\|\\s*${key}\\s*=\\s*([^\\n]+)`);
  const match = wikitext.match(re);
  if (!match) {
    return undefined;
  }
  return cleanWikiText(match[1] ?? "");
}

function parseChangeHistoryVersion(wikitext: string): string | undefined {
  const match = wikitext.match(/{{\s*Change History\|([\d.]+)/i);
  return match?.[1];
}

function parseFirstDescriptionLine(wikitext: string): string {
  const lines = wikitext
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  for (const line of lines) {
    if (line.startsWith("{{") || line.startsWith("==") || line.startsWith("|")) {
      continue;
    }
    if (line.includes(" is ") || line.includes(" are ")) {
      return cleanWikiText(line);
    }
  }
  return "Profile text unavailable from source.";
}

function parseVoiceLineCount(wikitext: string): number {
  const matches = wikitext.match(/\|vo_[^=\n]+_title\s*=/g);
  return matches?.length ?? 0;
}

function compareVersion(a: string, b: string): number {
  const pa = a.split(".").map((x) => Number(x));
  const pb = b.split(".").map((x) => Number(x));
  for (let i = 0; i < Math.max(pa.length, pb.length); i += 1) {
    const da = pa[i] ?? 0;
    const db = pb[i] ?? 0;
    if (da !== db) {
      return da - db;
    }
  }
  return 0;
}

function findVersionForReleaseDate(
  releaseDate: string | undefined,
  versions: VersionRecord[],
): string | undefined {
  if (!releaseDate) {
    return undefined;
  }
  const date = new Date(releaseDate);
  if (Number.isNaN(date.getTime())) {
    return undefined;
  }
  let picked: string | undefined;
  for (const version of versions) {
    const versionDate = new Date(version.releaseDate);
    if (Number.isNaN(versionDate.getTime())) {
      continue;
    }
    if (versionDate.getTime() <= date.getTime()) {
      picked = version.version;
    } else {
      break;
    }
  }
  return picked;
}

async function fetchJson<T>(params: Record<string, string>): Promise<T> {
  const query = new URLSearchParams({
    format: "json",
    ...params,
  }).toString();
  const response = await fetch(`${API_ROOT}?${query}`);
  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`);
  }
  return (await response.json()) as T;
}

async function fetchPlayableCharacters(): Promise<string[]> {
  type Res = {
    query: {
      categorymembers: Array<{ title: string }>;
    };
  };
  const data = await fetchJson<Res>({
    action: "query",
    list: "categorymembers",
    cmtitle: "Category:Playable_Resonators",
    cmlimit: "500",
  });
  return data.query.categorymembers
    .map((item) => item.title)
    .filter((title) => !title.includes("/"))
    .sort((a, b) => a.localeCompare(b));
}

async function fetchVersionPages(): Promise<string[]> {
  type Res = {
    query: {
      allpages: Array<{ title: string }>;
    };
  };
  const data = await fetchJson<Res>({
    action: "query",
    list: "allpages",
    apprefix: "Version/",
    aplimit: "200",
  });
  return data.query.allpages
    .map((item) => item.title)
    .filter((title) => /^Version\/\d+\.\d+$/.test(title))
    .sort((a, b) => compareVersion(a.replace("Version/", ""), b.replace("Version/", "")));
}

async function fetchWikitext(page: string): Promise<string> {
  type Res = {
    parse?: {
      wikitext: { "*": string };
    };
  };
  const data = await fetchJson<Res>({
    action: "parse",
    page,
    prop: "wikitext",
  });
  return data.parse?.wikitext["*"] ?? "";
}

async function fetchCharacterImage(page: string): Promise<string | null> {
  type Page = {
    title: string;
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
    titles: page,
    prop: "pageimages",
    piprop: "thumbnail|original",
    pithumbsize: "512",
  });
  const pageData = Object.values(data.query.pages)[0];
  return pageData?.original?.source ?? pageData?.thumbnail?.source ?? null;
}

async function fetchAllRevisions(page: string): Promise<Array<{ timestamp: string; content: string }>> {
  type Revision = {
    timestamp: string;
    slots?: { main?: { content?: string; "*"?: string } };
    content?: string;
    "*"?: string;
  };
  type Page = { revisions?: Revision[]; missing?: boolean };
  type Res = {
    query: { pages: Record<string, Page> };
    continue?: { rvcontinue?: string; continue?: string };
  };
  const revisions: Array<{ timestamp: string; content: string }> = [];
  let rvcontinue: string | undefined;

  do {
    const data = await fetchJson<Res>({
      action: "query",
      prop: "revisions",
      titles: page,
      rvlimit: "max",
      rvprop: "timestamp|content",
      rvslots: "main",
      rvdir: "older",
      ...(rvcontinue ? { rvcontinue } : {}),
    });
    const pageData = Object.values(data.query.pages)[0];
    if (pageData?.missing) {
      return [];
    }
    for (const revision of pageData?.revisions ?? []) {
      const content =
        revision.content ??
        revision.slots?.main?.content ??
        revision.slots?.main?.["*"] ??
        revision["*"] ??
        "";
      revisions.push({
        timestamp: revision.timestamp,
        content,
      });
    }
    rvcontinue = data.continue?.rvcontinue;
  } while (rvcontinue);

  return revisions.sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );
}

function pickCountAtTimestamp(
  revisions: Array<{ timestamp: string; count: number }>,
  endTimestamp: Date,
): number {
  let picked = 0;
  for (const revision of revisions) {
    if (new Date(revision.timestamp).getTime() <= endTimestamp.getTime()) {
      picked = revision.count;
    } else {
      break;
    }
  }
  return picked;
}

async function main() {
  const root = process.cwd();
  const [characterNames, versionPages] = await Promise.all([
    fetchPlayableCharacters(),
    fetchVersionPages(),
  ]);

  const versions: VersionRecord[] = [];
  for (const page of versionPages) {
    const wikitext = await fetchWikitext(page);
    const version = parseTemplateField(wikitext, "version");
    const date = parseTemplateField(wikitext, "date");
    const title = parseTemplateField(wikitext, "title");
    if (!version || !date) {
      continue;
    }
    versions.push({
      version,
      releaseDate: parseWikiDate(date),
      notes: title ? `Version ${version}: ${title}` : `Version ${version}`,
    });
  }

  versions.sort((a, b) => compareVersion(a.version, b.version));

  const characters: CharacterRecord[] = [];
  const imageRecords: CharacterImage[] = [];
  const allVoiceRows: VoiceLineStatRow[] = [];

  for (const name of characterNames) {
    const pageUrl = `https://wutheringwaves.fandom.com/wiki/${encodeURIComponent(name).replace(/%20/g, "_")}`;
    const [wikitext, imageUrl] = await Promise.all([fetchWikitext(name), fetchCharacterImage(name)]);

    const id = slugify(name);
    const rarity = Number(parseTemplateField(wikitext, "rarity") ?? 0);
    const releaseDateRaw = parseTemplateField(wikitext, "releaseDate");
    const releaseVersion =
      parseChangeHistoryVersion(wikitext) ??
      findVersionForReleaseDate(releaseDateRaw, versions) ??
      "unknown";
    const element = parseTemplateField(wikitext, "attribute") ?? "Unknown";
    const weapon = parseTemplateField(wikitext, "weapon") ?? "Unknown";
    const faction =
      parseTemplateField(wikitext, "affiliation") ??
      parseTemplateField(wikitext, "nation") ??
      "Unknown";
    const profile = parseFirstDescriptionLine(wikitext);

    characters.push({
      id,
      name,
      aliases: [],
      element,
      weapon,
      faction,
      rarity: Number.isFinite(rarity) ? rarity : 0,
      releaseVersion,
      profile,
      locale: "en-US",
      source: {
        sourceUrl: pageUrl,
        scrapedAt: nowIso,
        editor: "scripts/sync-fandom-data.ts",
      },
    });

    if (imageUrl) {
      imageRecords.push({
        id: `${id}-card`,
        characterId: id,
        type: "card",
        title: `${name} Card`,
        localPath: imageUrl,
        copyright: "Fandom / Kuro Games",
        source: {
          sourceUrl: pageUrl,
          scrapedAt: nowIso,
          editor: "scripts/sync-fandom-data.ts",
        },
      });
    }

    for (const localeDef of localePages) {
      const voicePage = `${name}${localeDef.suffix}`;
      const revisions = await fetchAllRevisions(voicePage);
      if (revisions.length === 0) {
        continue;
      }
      const revisionCounts = revisions.map((revision) => ({
        timestamp: revision.timestamp,
        count: parseVoiceLineCount(revision.content),
      }));

      const perVersionLineCounts = versions.map((version, index) => {
        const nextVersion = versions[index + 1];
        const endTime = nextVersion
          ? new Date(nextVersion.releaseDate)
          : new Date();
        return {
          version: version.version,
          lineCount: 0,
          endTime,
        };
      });

      let previous = 0;
      const finalized = perVersionLineCounts.map((item) => {
        const snapshot = pickCountAtTimestamp(revisionCounts, item.endTime);
        const delta = Math.max(0, snapshot - previous);
        previous = snapshot;
        return {
          version: item.version,
          lineCount: delta,
        };
      });

      allVoiceRows.push({
        characterId: id,
        debutVersion: releaseVersion,
        locale: localeDef.locale,
        perVersionLineCounts: finalized,
        totalLineCount: finalized.reduce((sum, entry) => sum + entry.lineCount, 0),
        sources: [`https://wutheringwaves.fandom.com/wiki/${encodeURIComponent(voicePage).replace(/%20/g, "_")}`],
        generatedAt: nowIso,
      });
    }
  }

  characters.sort((a, b) => a.id.localeCompare(b.id));
  imageRecords.sort((a, b) => a.id.localeCompare(b.id));
  allVoiceRows.sort((a, b) => {
    const byCharacter = a.characterId.localeCompare(b.characterId);
    if (byCharacter !== 0) {
      return byCharacter;
    }
    return a.locale.localeCompare(b.locale);
  });

  await fs.mkdir(path.join(root, "content", "characters"), { recursive: true });
  await fs.mkdir(path.join(root, "content", "versions"), { recursive: true });
  await fs.mkdir(path.join(root, "content", "images"), { recursive: true });
  await fs.mkdir(path.join(root, "data", "raw"), { recursive: true });
  await fs.mkdir(path.join(root, "data", "derived"), { recursive: true });

  const existingCharacterFiles = await fs.readdir(path.join(root, "content", "characters"));
  await Promise.all(
    existingCharacterFiles
      .filter((file) => file.endsWith(".json"))
      .map((file) => fs.unlink(path.join(root, "content", "characters", file))),
  );

  for (const character of characters) {
    await fs.writeFile(
      path.join(root, "content", "characters", `${character.id}.json`),
      `${JSON.stringify(character, null, 2)}\n`,
      "utf8",
    );
  }

  await fs.writeFile(
    path.join(root, "content", "versions", "versions.json"),
    `${JSON.stringify(versions, null, 2)}\n`,
    "utf8",
  );
  await fs.writeFile(
    path.join(root, "content", "images", "images.json"),
    `${JSON.stringify(imageRecords, null, 2)}\n`,
    "utf8",
  );

  const rawSnapshot = {
    snapshotId: `fandom-voicelines-${nowIso}`,
    characterCount: characters.length,
    rows: allVoiceRows,
  };
  await fs.writeFile(
    path.join(root, "data", "raw", "fandom-voice-lines-current.json"),
    `${JSON.stringify(rawSnapshot, null, 2)}\n`,
    "utf8",
  );

  await fs.writeFile(
    path.join(root, "data", "derived", "voice-line-stats.json"),
    `${JSON.stringify({ generatedAt: nowIso, rows: allVoiceRows }, null, 2)}\n`,
    "utf8",
  );

  console.log(
    `Synced ${characters.length} characters, ${versions.length} versions, ${allVoiceRows.length} voice-stat rows.`,
  );
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
