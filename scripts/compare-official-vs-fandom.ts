import { promises as fs } from "node:fs";
import path from "node:path";

type VersionRecord = {
  version: string;
  releaseDate: string;
  notes: string;
};

type OfficialVersionRow = {
  version: string;
  releaseDate: string;
  noticeUrl: string;
  matchMethod?: string;
};

type OfficialVersionSource = {
  sourceName: string;
  sourceUrl: string;
  rows: OfficialVersionRow[];
};

const DATE_TOLERANCE_MINUTES = 180;

function parseAsUtc8Timestamp(value: string): number | null {
  const normalized = value.trim().replace(" ", "T");
  const hasZone = normalized.endsWith("Z") || /[+-]\d{2}:\d{2}$/.test(normalized);
  const ts = new Date(hasZone ? normalized : `${normalized}+08:00`).getTime();
  return Number.isNaN(ts) ? null : ts;
}

function utc8CalendarDay(ts: number): string {
  const shifted = new Date(ts + 8 * 60 * 60_000);
  const y = shifted.getUTCFullYear();
  const m = String(shifted.getUTCMonth() + 1).padStart(2, "0");
  const d = String(shifted.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function datesWithinTolerance(fandomDate: string, officialDate: string): boolean {
  const fandomTs = parseAsUtc8Timestamp(fandomDate);
  const officialTs = parseAsUtc8Timestamp(officialDate);
  if (fandomTs === null || officialTs === null) {
    return false;
  }
  if (Math.abs(fandomTs - officialTs) <= DATE_TOLERANCE_MINUTES * 60_000) {
    return true;
  }
  return utc8CalendarDay(fandomTs) === utc8CalendarDay(officialTs);
}

async function readJson<T>(filePath: string): Promise<T> {
  const text = await fs.readFile(filePath, "utf8");
  return JSON.parse(text) as T;
}

async function main() {
  const root = process.cwd();
  const fandomVersions = await readJson<VersionRecord[]>(
    path.join(root, "content", "versions", "versions.json"),
  );
  const official = await readJson<OfficialVersionSource>(
    path.join(root, "content", "official", "version-notes.json"),
  );
  const generatedAt = new Date().toISOString();

  const officialMap = new Map(official.rows.map((row) => [row.version, row]));
  const fandomMap = new Map(fandomVersions.map((row) => [row.version, row]));

  const missingInOfficial: string[] = [];
  const missingInFandom: string[] = [];
  const mismatchedDate: Array<{
    version: string;
    fandomReleaseDate: string;
    officialReleaseDate: string;
    deltaMinutes: number;
    noticeUrl: string;
    officialMatchMethod: string | null;
  }> = [];
  const alignedDate: string[] = [];

  for (const fandomRow of fandomVersions) {
    const officialRow = officialMap.get(fandomRow.version);
    if (!officialRow) {
      missingInOfficial.push(fandomRow.version);
      continue;
    }
    const fandomTs = parseAsUtc8Timestamp(fandomRow.releaseDate);
    const officialTs = parseAsUtc8Timestamp(officialRow.releaseDate);
    if (fandomTs === null || officialTs === null) {
      continue;
    }
    if (datesWithinTolerance(fandomRow.releaseDate, officialRow.releaseDate)) {
      alignedDate.push(fandomRow.version);
      continue;
    }
    mismatchedDate.push({
      version: fandomRow.version,
      fandomReleaseDate: fandomRow.releaseDate,
      officialReleaseDate: officialRow.releaseDate,
      deltaMinutes: Math.round((fandomTs - officialTs) / 60000),
      noticeUrl: officialRow.noticeUrl,
      officialMatchMethod: officialRow.matchMethod ?? null,
    });
  }

  for (const officialRow of official.rows) {
    if (!fandomMap.has(officialRow.version)) {
      missingInFandom.push(officialRow.version);
    }
  }

  const report = {
    generatedAt,
    toleranceMinutes: DATE_TOLERANCE_MINUTES,
    sources: {
      fandomVersionsFile: "content/versions/versions.json",
      officialVersionsFile: "content/official/version-notes.json",
      officialSourceUrl: official.sourceUrl,
      officialSourceName: official.sourceName,
    },
    summary: {
      fandomVersionCount: fandomVersions.length,
      officialVersionCount: official.rows.length,
      missingInOfficial: missingInOfficial.length,
      missingInFandom: missingInFandom.length,
      alignedDate: alignedDate.length,
      mismatchedDate: mismatchedDate.length,
      ok:
        missingInOfficial.length === 0 &&
        missingInFandom.length === 0 &&
        mismatchedDate.length === 0,
    },
    missingInOfficial,
    missingInFandom,
    alignedDate,
    mismatchedDate,
  };

  await fs.mkdir(path.join(root, "data", "derived"), { recursive: true });
  await fs.writeFile(
    path.join(root, "data", "derived", "source-diff-report.json"),
    `${JSON.stringify(report, null, 2)}\n`,
    "utf8",
  );

  console.log(
    `Compared versions (fandom=${fandomVersions.length}, official=${official.rows.length}, aligned=${alignedDate.length}, mismatched=${mismatchedDate.length}) -> ${report.summary.ok ? "OK" : "DIFF_FOUND"}`,
  );
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
