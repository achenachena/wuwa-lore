import { promises as fs } from "node:fs";
import path from "node:path";

const ENCORE_BASE = "https://api.encore.moe";
const nowIso = new Date().toISOString().slice(0, 10);

const EN_NAME_TO_ID: Record<string, string> = {
  "Luuk Herssen": "luuk-herssen",
  Rover: "rover",
  "Rover: Spectro": "rover-spectro",
  "Rover: Havoc": "rover-havoc",
  "Rover: Aero": "rover-aero",
  Lucilla: "lucilla",
  Lucy: "lucy",
  Rebecca: "rebecca",
};

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/['".:]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "wuwa-lore/1.0",
      Referer: "https://encore.moe/",
      Accept: "application/json",
    },
  });
  if (!response.ok) {
    throw new Error(`Encore API failed ${response.status} for ${url}`);
  }
  return (await response.json()) as T;
}

async function main() {
  const charactersDir = path.join(process.cwd(), "content", "characters");
  const outPath = path.join(process.cwd(), "content", "i18n", "character-display-names.json");

  const [enPayload, zhPayload] = await Promise.all([
    fetchJson<{ roleList: Array<{ Id: number; Name: string }> }>(`${ENCORE_BASE}/en/character`),
    fetchJson<{ roleList: Array<{ Id: number; Name: string }> }>(`${ENCORE_BASE}/zh-Hans/character`),
  ]);

  const zhById = new Map(zhPayload.roleList.map((role) => [role.Id, role.Name]));
  const names: Record<string, { en: string; zh: string }> = {};

  for (const enRole of enPayload.roleList) {
    const characterId = EN_NAME_TO_ID[enRole.Name] ?? slugify(enRole.Name);
    const zhName = zhById.get(enRole.Id);
    if (!zhName) {
      continue;
    }
    names[characterId] = { en: enRole.Name, zh: zhName };
  }

  const characterFiles = (await fs.readdir(charactersDir)).filter((file) => file.endsWith(".json"));
  for (const file of characterFiles) {
    const filePath = path.join(charactersDir, file);
    const character = JSON.parse(await fs.readFile(filePath, "utf8")) as {
      id: string;
      aliases: string[];
    };
    const entry = names[character.id];
    if (!entry) {
      continue;
    }
    const aliases = new Set(character.aliases ?? []);
    if (entry.zh && entry.zh !== entry.en) {
      aliases.add(entry.zh);
    }
    character.aliases = [...aliases].sort((a, b) => a.localeCompare(b, "zh-CN"));
    await fs.writeFile(filePath, `${JSON.stringify(character, null, 2)}\n`, "utf8");
  }

  await fs.writeFile(
    outPath,
    `${JSON.stringify({ source: "encore.moe", generatedAt: nowIso, names }, null, 2)}\n`,
    "utf8",
  );
  console.log(`Character display names synced: ${Object.keys(names).length} entries -> ${outPath}`);
}

main().catch((error: unknown) => {
  console.error("Character display name sync failed", error);
  process.exitCode = 1;
});
