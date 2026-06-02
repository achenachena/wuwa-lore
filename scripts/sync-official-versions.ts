import { promises as fs } from "node:fs";
import path from "node:path";

type Article = {
  articleId: number;
  articleTitle: string;
  startTime: string;
};

type OfficialVersionRow = {
  version: string;
  releaseDate: string;
  noticeUrl: string;
  title: string;
  articleId: number | null;
  matchMethod: "patch_notes" | "preview_scheduled" | "maintenance_notice" | "fandom_fallback";
};

type OfficialVersionSource = {
  sourceName: string;
  sourceUrl: string;
  scrapedAt: string;
  editor: string;
  rows: OfficialVersionRow[];
};

const MAIN_MENU_EN_URL =
  "https://hw-media-cdn-mingchao.kurogame.com/akiwebsite/website2.0/json/G152/en/MainMenu.json";
const NOTICE_URL_PREFIX = "https://wutheringwaves.kurogames.com/en/main/news/detail/";
const VERSION_IN_TITLE = /Version\s*(\d+\.\d+)/i;

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

function scoreArticle(title: string): number {
  const normalized = title.toLowerCase();
  if (normalized.includes("patch notes")) {
    return 100;
  }
  if (
    normalized.includes("scheduled for release") ||
    normalized.includes("planned for release") ||
    normalized.includes("version preview")
  ) {
    return 90;
  }
  if (normalized.includes("maintenance notice") && normalized.includes("update")) {
    return 50;
  }
  return 0;
}

function parseOfficialDate(value: string): string {
  const normalized = value.trim().replace(" ", "T");
  const withTime = normalized.includes("T") ? normalized : `${normalized}T00:00:00`;
  const date = new Date(`${withTime}+08:00`);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid date: ${value}`);
  }
  return date.toISOString();
}

function parseScheduledDateFromTitle(title: string, fallbackYear: number): string | null {
  const monthNames: Record<string, number> = {
    january: 0,
    february: 1,
    march: 2,
    april: 3,
    may: 4,
    june: 5,
    july: 6,
    august: 7,
    september: 8,
    october: 9,
    november: 10,
    december: 11,
  };
  const match = title.match(
    /(?:scheduled for release|planned for release|release)\s+on\s+([A-Za-z]+)\s+(\d{1,2})/i,
  );
  if (!match) {
    return null;
  }
  const month = monthNames[match[1]?.toLowerCase() ?? ""];
  const day = Number(match[2]);
  if (month === undefined || Number.isNaN(day)) {
    return null;
  }
  const monthText = String(month + 1).padStart(2, "0");
  const dayText = String(day).padStart(2, "0");
  return new Date(`${fallbackYear}-${monthText}-${dayText}T10:00:00+08:00`).toISOString();
}

function resolveReleaseDate(article: Article): string {
  const scheduled = parseScheduledDateFromTitle(
    article.articleTitle,
    Number(article.startTime.slice(0, 4)),
  );
  if (scheduled) {
    return scheduled;
  }
  return parseOfficialDate(article.startTime);
}

function pickBestArticleByVersion(articles: Article[]): Map<string, Article> {
  const best = new Map<string, Article>();
  for (const article of articles) {
    const versionMatch = article.articleTitle.match(VERSION_IN_TITLE);
    if (!versionMatch) {
      continue;
    }
    const version = versionMatch[1];
    const score = scoreArticle(article.articleTitle);
    if (score === 0) {
      continue;
    }
    const existing = best.get(version);
    if (!existing) {
      best.set(version, article);
      continue;
    }
    const existingScore = scoreArticle(existing.articleTitle);
    if (score > existingScore) {
      best.set(version, article);
      continue;
    }
    if (score === existingScore && article.startTime > existing.startTime) {
      best.set(version, article);
    }
  }
  return best;
}

function matchMethodFromTitle(title: string): OfficialVersionRow["matchMethod"] {
  const normalized = title.toLowerCase();
  if (normalized.includes("patch notes")) {
    return "patch_notes";
  }
  if (normalized.includes("scheduled for release") || normalized.includes("planned for release")) {
    return "preview_scheduled";
  }
  return "maintenance_notice";
}

async function readJson<T>(filePath: string): Promise<T> {
  const text = await fs.readFile(filePath, "utf8");
  return JSON.parse(text) as T;
}

async function main() {
  const root = process.cwd();
  const scrapedAt = new Date().toISOString();
  const response = await fetch(MAIN_MENU_EN_URL);
  if (!response.ok) {
    throw new Error(`Failed to fetch official menu JSON: ${response.status} ${response.statusText}`);
  }
  const payload = (await response.json()) as { article?: Article[] };
  const articles = payload.article ?? [];
  const selected = pickBestArticleByVersion(articles);
  const rows: OfficialVersionRow[] = [];

  for (const version of [...selected.keys()].sort(compareVersion)) {
    const article = selected.get(version);
    if (!article) {
      continue;
    }
    rows.push({
      version,
      releaseDate: resolveReleaseDate(article),
      noticeUrl: `${NOTICE_URL_PREFIX}${article.articleId}`,
      title: article.articleTitle,
      articleId: article.articleId,
      matchMethod: matchMethodFromTitle(article.articleTitle),
    });
  }

  const fandomVersions = await readJson<Array<{ version: string; releaseDate: string }>>(
    path.join(root, "content", "versions", "versions.json"),
  );
  const rowVersions = new Set(rows.map((row) => row.version));
  for (const fandomVersion of fandomVersions) {
    if (rowVersions.has(fandomVersion.version)) {
      continue;
    }
    rows.push({
      version: fandomVersion.version,
      releaseDate: parseOfficialDate(fandomVersion.releaseDate.replace("T", " ").slice(0, 16)),
      noticeUrl: `https://wutheringwaves.fandom.com/wiki/Version/${fandomVersion.version}`,
      title: `Fandom fallback for Version ${fandomVersion.version}`,
      articleId: null,
      matchMethod: "fandom_fallback",
    });
  }

  rows.sort((a, b) => compareVersion(a.version, b.version));

  const output: OfficialVersionSource = {
    sourceName: "kuro-official-mainmenu-en",
    sourceUrl: "https://wutheringwaves.kurogames.com/en/main/news",
    scrapedAt,
    editor: "scripts/sync-official-versions.ts",
    rows,
  };

  const outDir = path.join(root, "content", "official");
  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(
    path.join(outDir, "version-notes.json"),
    `${JSON.stringify(output, null, 2)}\n`,
    "utf8",
  );

  console.log(`Synced ${rows.length} official version rows (${rows.filter((r) => r.matchMethod !== "fandom_fallback").length} from Kuro CDN).`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
