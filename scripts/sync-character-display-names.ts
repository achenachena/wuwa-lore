import { promises as fs } from "node:fs";
import path from "node:path";
import { ENCORE_BASE, fetchEncoreJson } from "@/lib/encore/client";
import { encoreNameToCharacterId } from "@/lib/slugify";

type DisplayNamesFile = {
  source: string;
  generatedAt: string;
  names: Record<string, { en: string; zh: string }>;
};

async function main() {
  const charactersDir = path.join(process.cwd(), "content", "characters");
  const characterFiles = (await fs.readdir(charactersDir)).filter((file) => file.endsWith(".json"));
  const knownIds = new Set(characterFiles.map((file) => file.replace(/\.json$/, "")));

  const [enRolesPayload, zhRolesPayload] = await Promise.all([
    fetchEncoreJson<{ roleList: Array<{ Id: number; Name: string }> }>(`${ENCORE_BASE}/en/character`),
    fetchEncoreJson<{ roleList: Array<{ Id: number; Name: string }> }>(
      `${ENCORE_BASE}/zh-Hans/character`,
    ),
  ]);

  const zhById = new Map(zhRolesPayload.roleList.map((role) => [role.Id, role.Name]));
  const names: DisplayNamesFile["names"] = {};

  for (const enRole of enRolesPayload.roleList) {
    const characterId = encoreNameToCharacterId(enRole.Name);
    if (!knownIds.has(characterId)) {
      continue;
    }
    names[characterId] = {
      en: enRole.Name,
      zh: zhById.get(enRole.Id) ?? enRole.Name,
    };
  }

  const outPath = path.join(process.cwd(), "content", "i18n", "character-display-names.json");
  const payload: DisplayNamesFile = {
    source: "encore.moe",
    generatedAt: new Date().toISOString().slice(0, 10),
    names,
  };
  await fs.writeFile(outPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  console.log(`Wrote ${Object.keys(names).length} display names -> ${outPath}`);
}

main().catch((error: unknown) => {
  console.error("Display name sync failed", error);
  process.exitCode = 1;
});
