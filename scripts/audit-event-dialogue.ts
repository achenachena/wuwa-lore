import { promises as fs } from "node:fs";
import path from "node:path";
import { ENCORE_BASE, fetchEncoreJson, fetchEncoreStoryDetail } from "@/lib/encore/client";
import { buildSpeakerResolver, countDialoguesBySpeaker } from "@/lib/encore/speakers";
import type { OptionalQuestRecord } from "@/types/lore";

async function main() {
  const root = process.cwd();
  const catalog = JSON.parse(
    await fs.readFile(path.join(root, "content/stories/optional-quest-catalog.json"), "utf8"),
  ) as { quests: OptionalQuestRecord[] };

  const characterFiles = (await fs.readdir(path.join(root, "content/characters"))).filter((f) =>
    f.endsWith(".json"),
  );
  const knownCharacterIds = new Set(characterFiles.map((f) => f.replace(/\.json$/, "")));

  const [enRolesPayload, zhRolesPayload] = await Promise.all([
    fetchEncoreJson<{ roleList: Array<{ Id: number; Name: string }> }>(`${ENCORE_BASE}/en/character`),
    fetchEncoreJson<{ roleList: Array<{ Id: number; Name: string }> }>(
      `${ENCORE_BASE}/zh-Hans/character`,
    ),
  ]);
  const { resolveSpeaker } = buildSpeakerResolver({
    enRoles: enRolesPayload.roleList,
    localeRoles: zhRolesPayload.roleList,
    knownCharacterIds,
  });

  const eventQuests = catalog.quests.filter((quest) => quest.category === "event");
  let totalRaw = 0;
  let totalResolved = 0;
  const unresolvedSpeakers = new Map<string, number>();
  const questsNoDetail: string[] = [];
  const questsAllUnresolved: string[] = [];

  for (const quest of eventQuests) {
    const detail = await fetchEncoreStoryDetail("zh-Hans", quest.encoreStoryId, { logFallback: true });
    if (!detail) {
      questsNoDetail.push(`${quest.encoreStoryId} ${quest.nameZh}`);
      continue;
    }
    const counts = countDialoguesBySpeaker(detail);
    let questRaw = 0;
    let questResolved = 0;
    for (const [speaker, count] of counts) {
      questRaw += count;
      const characterId = resolveSpeaker(speaker);
      if (characterId) {
        questResolved += count;
      } else {
        unresolvedSpeakers.set(speaker, (unresolvedSpeakers.get(speaker) ?? 0) + count);
      }
    }
    totalRaw += questRaw;
    totalResolved += questResolved;
    if (questRaw > 0 && questResolved === 0) {
      questsAllUnresolved.push(`${quest.encoreStoryId} ${quest.nameZh} (${questRaw} lines)`);
    }
    await new Promise((r) => setTimeout(r, 30));
  }

  console.log(`Event quests: ${eventQuests.length}`);
  console.log(`Total raw dialogue lines: ${totalRaw}`);
  console.log(`Resolved to playable characters: ${totalResolved}`);
  console.log(`Unresolved: ${totalRaw - totalResolved}`);
  console.log(`Quests with no encore detail: ${questsNoDetail.length}`);
  if (questsNoDetail.length) {
    console.log(questsNoDetail.join("\n"));
  }
  console.log(`\nQuests with dialogue but 0 resolved chars: ${questsAllUnresolved.length}`);
  console.log(questsAllUnresolved.slice(0, 15).join("\n"));
  console.log("\nTop unresolved speakers:");
  console.log(
    [...unresolvedSpeakers.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 25)
      .map(([name, count]) => `  ${count}\t${name}`)
      .join("\n"),
  );
}

main().catch(console.error);
