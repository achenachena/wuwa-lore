import { promises as fs } from "node:fs";
import path from "node:path";

import { compareVersion } from "@/lib/version/compare";

type VersionRecord = {
  version: string;
};

type QuestHalfEntry = {
  wikiTitle: string;
  version: string;
  half: "a" | "b";
};

type QuestHalfMap = {
  sourceUrl: string;
  editor: string;
  notes: string;
  quests: QuestHalfEntry[];
};

const API_ROOT = "https://wutheringwaves.fandom.com/api.php";

async function fetchVersionWikitext(version: string): Promise<string> {
  const query = new URLSearchParams({
    format: "json",
    action: "parse",
    page: `Version/${version}`,
    prop: "wikitext",
  });
  const response = await fetch(`${API_ROOT}?${query}`, {
    headers: { "User-Agent": "wuwa-lore/1.0" },
  });
  if (!response.ok) {
    throw new Error(`Fandom API failed: ${response.status} ${response.statusText}`);
  }
  const payload = (await response.json()) as {
    parse?: { wikitext?: { "*": string } };
  };
  return payload.parse?.wikitext?.["*"] ?? "";
}

function parseMainQuestTitles(wikitext: string): string[] {
  const section = wikitext.match(/====Main Quests====([\s\S]*?)(?:\n====|\n===)/i)?.[1] ?? "";
  const titles = [...section.matchAll(/\[\[([^|\]]+)(?:\|[^\]]+)?]]/g)].map((match) =>
    match[1]!.trim(),
  );
  return [...new Set(titles)];
}

async function main() {
  const root = process.cwd();
  const versions = JSON.parse(
    await fs.readFile(path.join(root, "content", "versions", "versions.json"), "utf8"),
  ) as VersionRecord[];
  const latestVersion = [...versions].sort((a, b) => compareVersion(a.version, b.version)).at(-1)
    ?.version;
  if (!latestVersion) {
    throw new Error("Version registry is empty");
  }

  const mapPath = path.join(root, "content", "stories", "quest-half-map.json");
  const map = JSON.parse(await fs.readFile(mapPath, "utf8")) as QuestHalfMap;
  const knownTitles = new Set(map.quests.map((quest) => quest.wikiTitle));
  const discovered = parseMainQuestTitles(await fetchVersionWikitext(latestVersion)).filter(
    (title) => !knownTitles.has(title),
  );

  for (const wikiTitle of discovered) {
    map.quests.push({ wikiTitle, version: latestVersion, half: "a" });
  }
  if (discovered.length > 0) {
    await fs.writeFile(mapPath, `${JSON.stringify(map, null, 2)}\n`, "utf8");
  }

  console.log(
    discovered.length > 0
      ? `Discovered ${discovered.length} Version ${latestVersion} main quests: ${discovered.join(", ")}`
      : `No new Version ${latestVersion} main quests discovered`,
  );
}

main().catch((error: unknown) => {
  console.error("Version quest discovery failed", error);
  process.exitCode = 1;
});
