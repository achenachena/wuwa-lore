import { promises as fs } from "node:fs";
import path from "node:path";

import type { Locale, VersionRecord, VoiceLineDetailRow } from "../src/types/lore";

type VersionHalfRecord = {
  id: string;
  version: string;
  half: "a" | "b";
  label: string;
  labelZh: string;
  startDate: string;
  endDate: string;
};

type VersionHalfVoiceRow = {
  characterId: string;
  locale: Locale;
  versionHalf: string;
  version: string;
  half: "a" | "b";
  lineCount: number;
};

type VersionHalfStatsSnapshot = {
  generatedAt: string;
  localeDefault: Locale;
  halfCount: number;
  rows: VersionHalfVoiceRow[];
};

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

function buildVersionHalves(versions: VersionRecord[]): VersionHalfRecord[] {
  const sorted = [...versions].sort((a, b) => compareVersion(a.version, b.version));
  const halves: VersionHalfRecord[] = [];

  for (let i = 0; i < sorted.length; i += 1) {
    const current = sorted[i];
    const next = sorted[i + 1];
    const start = new Date(current.releaseDate);
    const end = next ? new Date(next.releaseDate) : new Date(start.getTime() + 42 * 24 * 60 * 60 * 1000);
    const mid = new Date(start.getTime() + (end.getTime() - start.getTime()) / 2);

    halves.push({
      id: `${current.version}-a`,
      version: current.version,
      half: "a",
      label: `${current.version} upper`,
      labelZh: `${current.version} 上半`,
      startDate: start.toISOString(),
      endDate: mid.toISOString(),
    });
    halves.push({
      id: `${current.version}-b`,
      version: current.version,
      half: "b",
      label: `${current.version} lower`,
      labelZh: `${current.version} 下半`,
      startDate: mid.toISOString(),
      endDate: end.toISOString(),
    });
  }

  return halves;
}

function findVersionHalf(timestamp: string | null, halves: VersionHalfRecord[]): VersionHalfRecord | null {
  if (!timestamp) {
    return null;
  }
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  for (const half of halves) {
    const start = new Date(half.startDate);
    const end = new Date(half.endDate);
    if (date >= start && date < end) {
      return half;
    }
  }
  return null;
}

async function main() {
  const versionsPath = path.join(process.cwd(), "content", "versions", "versions.json");
  const detailsPath = path.join(process.cwd(), "data", "derived", "voice-line-details.json");
  const halvesPath = path.join(process.cwd(), "content", "versions", "version-halves.json");
  const outPath = path.join(process.cwd(), "data", "derived", "version-half-voice-stats.json");

  const versions = JSON.parse(await fs.readFile(versionsPath, "utf8")) as VersionRecord[];
  const detailsFile = JSON.parse(await fs.readFile(detailsPath, "utf8")) as { rows: VoiceLineDetailRow[] };
  const halves = buildVersionHalves(versions);

  await fs.writeFile(
    halvesPath,
    `${JSON.stringify({ generatedAt: new Date().toISOString(), halves }, null, 2)}\n`,
    "utf8",
  );

  const counts = new Map<string, number>();
  for (const row of detailsFile.rows) {
    for (const line of row.lines) {
      const half = findVersionHalf(line.firstSeenAt, halves);
      if (!half) {
        continue;
      }
      const key = `${row.characterId}::${row.locale}::${half.id}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }

  const rows: VersionHalfVoiceRow[] = [];
  for (const [key, lineCount] of counts.entries()) {
    const [characterId, locale, versionHalf] = key.split("::") as [string, Locale, string];
    const halfRecord = halves.find((item) => item.id === versionHalf);
    if (!halfRecord) {
      continue;
    }
    rows.push({
      characterId,
      locale,
      versionHalf,
      version: halfRecord.version,
      half: halfRecord.half,
      lineCount,
    });
  }

  rows.sort((a, b) => {
    const byCharacter = a.characterId.localeCompare(b.characterId);
    if (byCharacter !== 0) {
      return byCharacter;
    }
    const byLocale = a.locale.localeCompare(b.locale);
    if (byLocale !== 0) {
      return byLocale;
    }
    return a.versionHalf.localeCompare(b.versionHalf, "en");
  });

  const snapshot: VersionHalfStatsSnapshot = {
    generatedAt: new Date().toISOString(),
    localeDefault: "zh-CN",
    halfCount: halves.length,
    rows,
  };

  await fs.writeFile(outPath, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
  console.log(`Version-half voice stats: ${rows.length} rows, ${halves.length} halves -> ${outPath}`);
}

main().catch((error: unknown) => {
  console.error("Version-half stats generation failed", error);
  process.exitCode = 1;
});
