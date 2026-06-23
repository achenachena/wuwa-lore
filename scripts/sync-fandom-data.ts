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
  sourcePageTitle: string;
  sourcePageExists: boolean;
  sourceLatestRevisionAt: string | null;
  sourceRevisionCount: number;
  countMethod: "tx_key_unique_nonempty";
  qualityStatus: "verified" | "missing_source";
  currentLineCount: number;
  perVersionLineCounts: Array<{ version: string; lineCount: number }>;
  totalLineCount: number;
  sources: string[];
  generatedAt: string;
};

type VoiceLineDetailRow = {
  characterId: string;
  locale: Locale;
  sourcePageTitle: string;
  sourcePageExists: boolean;
  sourceLatestRevisionAt: string | null;
  sourceRevisionCount: number;
  generatedAt: string;
  lines: Array<{
    key: string;
    text: string;
    sourceFieldPath: string;
    firstSeenAt: string | null;
    firstSeenVersion: string | null;
  }>;
};

type ChangeReport = {
  generatedAt: string;
  rowCoverage: {
    oldRowCount: number;
    newRowCount: number;
    addedRows: number;
    removedRows: number;
    changedRows: number;
  };
  currentLineCountDelta: {
    increasedRows: number;
    decreasedRows: number;
    unchangedRows: number;
  };
  samples: {
    added: Array<{ key: string; currentLineCount: number }>;
    removed: Array<{ key: string; previousLineCount: number }>;
    changed: Array<{ key: string; previousLineCount: number; currentLineCount: number; delta: number }>;
  };
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
  const inline = wikitext.match(
    /(?:^|\n)([A-Z][^\n]{8,400}? is (?:a|an|the) [^\n]+?\.)/,
  );
  if (inline?.[1]) {
    return cleanWikiText(inline[1]);
  }
  return "Profile text unavailable from source.";
}

type ParsedVoiceLineEntry = {
  key: string;
  text: string;
  sourceFieldPath: string;
};

function extractVoiceLineEntries(wikitext: string): Map<string, ParsedVoiceLineEntry> {
  const entries = new Map<string, ParsedVoiceLineEntry>();
  for (const match of wikitext.matchAll(/\|([a-z0-9_]+?_tx(?:_[a-z]+)?)\s*=\s*([^\n]*)/gi)) {
    const sourceFieldPath = match[1]?.trim() ?? "";
    const key = sourceFieldPath.replace(/_tx(?:_[a-z]+)?$/i, "");
    const rawValue = match[2]?.trim() ?? "";
    const value = cleanWikiText(rawValue);
    if (!key || !value || !sourceFieldPath) {
      continue;
    }
    if (!entries.has(key)) {
      entries.set(key, { key, text: value, sourceFieldPath });
    }
  }
  return entries;
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

async function readJsonIfExists<T>(filePath: string): Promise<T | null> {
  try {
    const text = await fs.readFile(filePath, "utf8");
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
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

function buildZeroPerVersionCounts(versions: VersionRecord[]) {
  return versions.map((version) => ({
    version: version.version,
    lineCount: 0,
  }));
}

function findVersionForTimestamp(timestamp: string, versions: VersionRecord[]): string | null {
  const target = new Date(timestamp).getTime();
  if (Number.isNaN(target) || versions.length === 0) {
    return null;
  }
  let picked: string | null = versions[0]?.version ?? null;
  for (const version of versions) {
    const release = new Date(version.releaseDate).getTime();
    if (Number.isNaN(release)) {
      continue;
    }
    if (release <= target) {
      picked = version.version;
    } else {
      break;
    }
  }
  return picked;
}

async function main() {
  const root = process.cwd();
  const prevStatsPath = path.join(root, "data", "derived", "voice-line-stats.json");
  const previousStats = await readJsonIfExists<{ rows?: VoiceLineStatRow[] }>(prevStatsPath);
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
  const allVoiceDetailRows: VoiceLineDetailRow[] = [];

  for (const name of characterNames) {
    const pageUrl = `https://wutheringwaves.fandom.com/wiki/${encodeURIComponent(name).replace(/%20/g, "_")}`;
    const [wikitext, imageUrl, portraitUrl] = await Promise.all([
      fetchWikitext(name),
      fetchCharacterImage(name),
      fetchFileUrl(`File:Resonator ${name}.png`),
    ]);

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

    if (portraitUrl) {
      imageRecords.push({
        id: `${id}-portrait`,
        characterId: id,
        type: "portrait",
        title: `${name} Portrait`,
        localPath: portraitUrl,
        copyright: "Fandom / Kuro Games",
        source: {
          sourceUrl: pageUrl,
          scrapedAt: nowIso,
          editor: "scripts/sync-fandom-data.ts",
        },
      });
    }

    const voiceBaseName = /^Rover(?:-|$)/.test(name) ? "Rover" : name;
    for (const localeDef of localePages) {
      const voicePage = `${voiceBaseName}${localeDef.suffix}`;
      const voicePageUrl = `https://wutheringwaves.fandom.com/wiki/${encodeURIComponent(voicePage).replace(/%20/g, "_")}`;
      const revisions = await fetchAllRevisions(voicePage);
      let finalized = buildZeroPerVersionCounts(versions);
      let currentLineCount = 0;
      const firstSeenAtByKey = new Map<string, string>();
      let latestEntries = new Map<string, ParsedVoiceLineEntry>();
      if (revisions.length > 0) {
        for (const revision of revisions) {
          const entries = extractVoiceLineEntries(revision.content);
          for (const key of entries.keys()) {
            if (!firstSeenAtByKey.has(key)) {
              firstSeenAtByKey.set(key, revision.timestamp);
            }
          }
          latestEntries = entries;
        }

        const firstSeenCountByVersion = new Map<string, number>();
        for (const timestamp of firstSeenAtByKey.values()) {
          const version = findVersionForTimestamp(timestamp, versions);
          if (!version) {
            continue;
          }
          firstSeenCountByVersion.set(version, (firstSeenCountByVersion.get(version) ?? 0) + 1);
        }
        finalized = versions.map((version) => ({
          version: version.version,
          lineCount: firstSeenCountByVersion.get(version.version) ?? 0,
        }));
        currentLineCount = latestEntries.size;
      }

      const detailLines = [...latestEntries.values()]
        .map((entry) => ({
          key: entry.key,
          text: entry.text,
          sourceFieldPath: entry.sourceFieldPath,
          firstSeenAt: firstSeenAtByKey.get(entry.key) ?? null,
          firstSeenVersion: firstSeenAtByKey.get(entry.key)
            ? findVersionForTimestamp(firstSeenAtByKey.get(entry.key)!, versions)
            : null,
        }))
        .sort((a, b) => a.key.localeCompare(b.key));

      allVoiceRows.push({
        characterId: id,
        debutVersion: releaseVersion,
        locale: localeDef.locale,
        sourcePageTitle: voicePage,
        sourcePageExists: revisions.length > 0,
        sourceLatestRevisionAt: revisions.length > 0 ? revisions[revisions.length - 1]?.timestamp ?? null : null,
        sourceRevisionCount: revisions.length,
        countMethod: "tx_key_unique_nonempty",
        qualityStatus: revisions.length > 0 ? "verified" : "missing_source",
        currentLineCount,
        perVersionLineCounts: finalized,
        totalLineCount: finalized.reduce((sum, entry) => sum + entry.lineCount, 0),
        sources: [voicePageUrl],
        generatedAt: nowIso,
      });

      allVoiceDetailRows.push({
        characterId: id,
        locale: localeDef.locale,
        sourcePageTitle: voicePage,
        sourcePageExists: revisions.length > 0,
        sourceLatestRevisionAt: revisions.length > 0 ? revisions[revisions.length - 1]?.timestamp ?? null : null,
        sourceRevisionCount: revisions.length,
        generatedAt: nowIso,
        lines: detailLines,
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
  await fs.writeFile(
    path.join(root, "data", "derived", "voice-line-details.json"),
    `${JSON.stringify({ generatedAt: nowIso, rows: allVoiceDetailRows }, null, 2)}\n`,
    "utf8",
  );

  const coveredCharacterIds = new Set(allVoiceRows.map((row) => row.characterId));
  const rowsWithContent = allVoiceRows.filter((row) => row.totalLineCount > 0).length;
  const qualityReport = {
    generatedAt: nowIso,
    totalCharacters: characters.length,
    expectedRows: characters.length * localePages.length,
    actualRows: allVoiceRows.length,
    coveredCharacters: coveredCharacterIds.size,
    rowsWithContent,
    rowsWithoutContent: allVoiceRows.length - rowsWithContent,
    verifiedRows: allVoiceRows.filter((row) => row.qualityStatus === "verified").length,
    missingSourceRows: allVoiceRows.filter((row) => row.qualityStatus === "missing_source").length,
  };
  await fs.writeFile(
    path.join(root, "data", "derived", "quality-report.json"),
    `${JSON.stringify(qualityReport, null, 2)}\n`,
    "utf8",
  );

  const previousRows = previousStats?.rows ?? [];
  const oldMap = new Map(
    previousRows.map((row) => [
      `${row.characterId}::${row.locale}`,
      row.currentLineCount ?? row.totalLineCount,
    ]),
  );
  const newMap = new Map(
    allVoiceRows.map((row) => [`${row.characterId}::${row.locale}`, row.currentLineCount]),
  );

  const added: Array<{ key: string; currentLineCount: number }> = [];
  const removed: Array<{ key: string; previousLineCount: number }> = [];
  const changed: Array<{ key: string; previousLineCount: number; currentLineCount: number; delta: number }> = [];
  let increasedRows = 0;
  let decreasedRows = 0;
  let unchangedRows = 0;

  for (const [key, currentLineCount] of newMap.entries()) {
    const prev = oldMap.get(key);
    if (prev === undefined) {
      added.push({ key, currentLineCount });
      continue;
    }
    const delta = currentLineCount - prev;
    if (delta > 0) {
      increasedRows += 1;
      changed.push({ key, previousLineCount: prev, currentLineCount, delta });
    } else if (delta < 0) {
      decreasedRows += 1;
      changed.push({ key, previousLineCount: prev, currentLineCount, delta });
    } else {
      unchangedRows += 1;
    }
  }
  for (const [key, previousLineCount] of oldMap.entries()) {
    if (!newMap.has(key)) {
      removed.push({ key, previousLineCount });
    }
  }

  const changeReport: ChangeReport = {
    generatedAt: nowIso,
    rowCoverage: {
      oldRowCount: oldMap.size,
      newRowCount: newMap.size,
      addedRows: added.length,
      removedRows: removed.length,
      changedRows: changed.length,
    },
    currentLineCountDelta: {
      increasedRows,
      decreasedRows,
      unchangedRows,
    },
    samples: {
      added: added.slice(0, 25),
      removed: removed.slice(0, 25),
      changed: changed
        .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
        .slice(0, 50),
    },
  };
  await fs.writeFile(
    path.join(root, "data", "derived", "change-report.json"),
    `${JSON.stringify(changeReport, null, 2)}\n`,
    "utf8",
  );

  console.log(
    `Synced ${characters.length} characters, ${versions.length} versions, ${allVoiceRows.length} voice-stat rows (${rowsWithContent} with content).`,
  );
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
