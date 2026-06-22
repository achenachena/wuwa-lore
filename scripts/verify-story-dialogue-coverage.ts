import { promises as fs } from "node:fs";
import path from "node:path";
import {
  buildStoryIdsByName,
  ENCORE_BASE,
  fetchEncoreJson,
  fetchEncoreStoryDetail,
  loadWikiEncoreMap,
  resolveEncoreStoryIds,
} from "@/lib/encore/client";
import { buildSpeakerResolver, countDialoguesBySpeaker } from "@/lib/encore/speakers";
import type { EncoreLocale } from "@/lib/encore/types";
import { slugify } from "@/lib/slugify";

type QuestHalfMap = { quests: Array<{ wikiTitle: string; version: string; half: string }> };

async function main() {
  const root = process.cwd();
  const map = JSON.parse(await fs.readFile(path.join(root, "content/stories/quest-half-map.json"), "utf8")) as QuestHalfMap;
  const wikiEncoreMap = await loadWikiEncoreMap();
  const derived = JSON.parse(await fs.readFile(path.join(root, "data/derived/story-dialogue-stats.json"), "utf8")) as {
    rows: Array<{ locale: EncoreLocale; characterId: string; questId: string; lineCount: number; version: string }>;
  };
  const characterFiles = (await fs.readdir(path.join(root, "content/characters"))).filter((f) =>
    f.endsWith(".json"),
  );
  const knownCharacterIds = new Set(characterFiles.map((f) => f.replace(/\.json$/, "")));

  const targetQuests = map.quests;
  const locales: EncoreLocale[] = ["zh-Hans", "en"];
  const allMismatches: Array<{
    locale: EncoreLocale;
    quest: string;
    version: string;
    characterId: string;
    expected: number;
    actual: number;
  }> = [];

  for (const locale of locales) {
    const [enRolesPayload, localeRolesPayload, storyPayload] = await Promise.all([
      fetchEncoreJson<{ roleList: Array<{ Id: number; Name: string }> }>(`${ENCORE_BASE}/en/character`),
      fetchEncoreJson<{ roleList: Array<{ Id: number; Name: string }> }>(`${ENCORE_BASE}/${locale}/character`),
      fetchEncoreJson<{ storyTypes: Array<{ Stories?: Array<{ Id?: number; Name?: string; Stories?: Array<{ Id?: number; Name?: string }> }> }> }>(
        `${ENCORE_BASE}/${locale}/story`,
      ),
    ]);

    const storyIdsByName = buildStoryIdsByName(
      storyPayload.storyTypes as Array<{ Stories?: import("@/lib/encore/types").EncoreStoryIndexItem[] }>,
    );
    const { resolveSpeaker } = buildSpeakerResolver({
      enRoles: enRolesPayload.roleList,
      localeRoles: localeRolesPayload.roleList,
      knownCharacterIds,
    });

    let checkedQuests = 0;
    for (const quest of targetQuests) {
      const questId = slugify(quest.wikiTitle);
      const storyIds = resolveEncoreStoryIds({
        locale,
        wikiTitle: quest.wikiTitle,
        storyIdsByName,
        wikiEncoreMap,
      });
      if (storyIds.length === 0) {
        continue;
      }
      checkedQuests += 1;

      const expectedByCharacter = new Map<string, number>();
      for (const storyId of storyIds) {
        const detail = await fetchEncoreStoryDetail(locale, storyId, { logFallback: false });
        if (!detail) continue;
        for (const [speaker, count] of countDialoguesBySpeaker(detail).entries()) {
          const characterId = resolveSpeaker(speaker);
          if (characterId) {
            expectedByCharacter.set(characterId, (expectedByCharacter.get(characterId) ?? 0) + count);
          }
        }
        await new Promise((r) => setTimeout(r, 35));
      }

      const actualByCharacter = new Map<string, number>();
      for (const row of derived.rows) {
        if (row.locale === locale && row.questId === questId) {
          actualByCharacter.set(row.characterId, row.lineCount);
        }
      }

      const allCharacterIds = new Set([...expectedByCharacter.keys(), ...actualByCharacter.keys()]);
      for (const characterId of allCharacterIds) {
        if (characterId.startsWith("rover")) continue;
        const expected = expectedByCharacter.get(characterId) ?? 0;
        const actual = actualByCharacter.get(characterId) ?? 0;
        if (expected !== actual) {
          allMismatches.push({ locale, quest: quest.wikiTitle, version: quest.version, characterId, expected, actual });
        }
      }
    }

    console.log(`[${locale}] checked ${checkedQuests} mapped quests`);
  }

  console.log(`Total mismatches: ${allMismatches.length}`);
  for (const m of allMismatches
    .sort((a, b) => b.expected - a.expected || a.characterId.localeCompare(b.characterId))
    .slice(0, 40)) {
    console.log(
      `[${m.locale}] ${m.version} ${m.quest} | ${m.characterId}: expected ${m.expected}, actual ${m.actual}, delta ${m.actual - m.expected}`,
    );
  }

  if (allMismatches.length > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
