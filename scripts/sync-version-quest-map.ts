import { promises as fs } from "node:fs";
import path from "node:path";

import { fetchFandomWikitext } from "@/lib/fandom/client";
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

function parseMainQuestTitles(wikitext: string): string[] {
  const section =
    wikitext.match(/====Main Quests====([\s\S]*?)(?:\n====|\n===)/i)?.[1] ?? "";
  const titles = [...section.matchAll(/\[\[([^|\]]+)(?:\|[^\]]+)?]]/g)].map(
    (match) => match[1]!.trim(),
  );
  return [...new Set(titles)];
}

async function main() {
  const root = process.cwd();
  const versions = JSON.parse(
    await fs.readFile(
      path.join(root, "content", "versions", "versions.json"),
      "utf8",
    ),
  ) as VersionRecord[];
  const latestVersion = [...versions]
    .sort((a, b) => compareVersion(a.version, b.version))
    .at(-1)?.version;
  if (!latestVersion) {
    throw new Error("Version registry is empty");
  }

  const mapPath = path.join(root, "content", "stories", "quest-half-map.json");
  const map = JSON.parse(await fs.readFile(mapPath, "utf8")) as QuestHalfMap;
  const knownTitles = new Set(map.quests.map((quest) => quest.wikiTitle));
  const discovered = parseMainQuestTitles(
    await fetchFandomWikitext(`Version/${latestVersion}`),
  ).filter((title) => !knownTitles.has(title));

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
