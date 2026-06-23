import {
  collectEncoreStoriesByTypeIds,
  ENCORE_BASE,
  fetchEncoreJson,
  fetchEncoreStoryDetail,
} from "@/lib/encore/client";
import { buildSpeakerResolver, countDialoguesBySpeaker } from "@/lib/encore/speakers";
import type { EncoreLocale, EncoreRole, EncoreStoryType } from "@/lib/encore/types";
import { ENCORE_OPTIONAL_QUEST_TYPE_IDS } from "@/lib/encore/types";
import type { OptionalQuestRecord, QuestCategory } from "@/types/lore";

export type OptionalQuestDialogueRow = {
  locale: EncoreLocale;
  category: QuestCategory;
  characterId: string;
  questId: string;
  questName: string;
  questNameZh: string;
  lineCount: number;
  encoreStoryIds: number[];
};

export type OptionalQuestAppearanceRow = {
  category: QuestCategory;
  characterId: string;
  questId: string;
  questName: string;
  questNameZh: string;
};

function questIdFor(category: QuestCategory, encoreStoryId: number): string {
  return `${category}-${encoreStoryId}`;
}

function storyName(story: { Name?: string; Title?: string }): string {
  return (story.Name ?? story.Title ?? "").trim();
}

export function buildOptionalQuestCatalog(params: {
  zhStoryTypes: EncoreStoryType[];
  enStoryTypes: EncoreStoryType[];
}): OptionalQuestRecord[] {
  const enNameById = new Map<number, string>();
  for (const category of Object.keys(ENCORE_OPTIONAL_QUEST_TYPE_IDS) as QuestCategory[]) {
    for (const story of collectEncoreStoriesByTypeIds(params.enStoryTypes, ENCORE_OPTIONAL_QUEST_TYPE_IDS[category])) {
      enNameById.set(story.Id, storyName(story));
    }
  }

  const quests: OptionalQuestRecord[] = [];
  for (const category of Object.keys(ENCORE_OPTIONAL_QUEST_TYPE_IDS) as QuestCategory[]) {
    for (const story of collectEncoreStoriesByTypeIds(
      params.zhStoryTypes,
      ENCORE_OPTIONAL_QUEST_TYPE_IDS[category],
    )) {
      const nameZh = storyName(story);
      const nameEn = enNameById.get(story.Id) ?? nameZh;
      quests.push({
        id: questIdFor(category, story.Id),
        category,
        encoreStoryId: story.Id,
        nameZh,
        nameEn,
      });
    }
  }

  return quests.sort((a, b) => {
    const byCategory = a.category.localeCompare(b.category);
    if (byCategory !== 0) {
      return byCategory;
    }
    return a.encoreStoryId - b.encoreStoryId;
  });
}

export async function syncOptionalQuestStatsForLocale(params: {
  locale: EncoreLocale;
  quests: OptionalQuestRecord[];
  knownCharacterIds: Set<string>;
  enRoles: EncoreRole[];
}): Promise<{ dialogueRows: OptionalQuestDialogueRow[]; appearanceRows: OptionalQuestAppearanceRow[] }> {
  const localeRolesPayload = await fetchEncoreJson<{ roleList: EncoreRole[] }>(
    `${ENCORE_BASE}/${params.locale}/character`,
  );
  const { resolveSpeaker } = buildSpeakerResolver({
    enRoles: params.enRoles,
    localeRoles: localeRolesPayload.roleList,
    knownCharacterIds: params.knownCharacterIds,
  });

  const dialogueRows: OptionalQuestDialogueRow[] = [];
  const appearanceKeys = new Set<string>();

  for (const quest of params.quests) {
    const detail = await fetchEncoreStoryDetail(params.locale, quest.encoreStoryId, {
      logFallback: false,
    });
    if (!detail) {
      await delay(40);
      continue;
    }

    const speakerCounts = countDialoguesBySpeaker(detail);
    const questName = params.locale === "en" ? quest.nameEn : quest.nameZh;
    const questNameZh = quest.nameZh;

    for (const [speaker, count] of speakerCounts.entries()) {
      const characterId = resolveSpeaker(speaker);
      if (!characterId || count <= 0) {
        continue;
      }
      dialogueRows.push({
        locale: params.locale,
        category: quest.category,
        characterId,
        questId: quest.id,
        questName,
        questNameZh,
        lineCount: count,
        encoreStoryIds: [quest.encoreStoryId],
      });
      appearanceKeys.add(`${quest.category}::${characterId}::${quest.id}`);
    }

    await delay(50);
  }

  const appearanceRows: OptionalQuestAppearanceRow[] = [...appearanceKeys].map((key) => {
    const [category, characterId, questId] = key.split("::") as [QuestCategory, string, string];
    const quest = params.quests.find((item) => item.id === questId);
    return {
      category,
      characterId,
      questId,
      questName: quest?.nameEn ?? questId,
      questNameZh: quest?.nameZh ?? questId,
    };
  });

  return { dialogueRows, appearanceRows };
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function mergeOptionalDialogueRows(rows: OptionalQuestDialogueRow[]): OptionalQuestDialogueRow[] {
  const merged = new Map<string, OptionalQuestDialogueRow>();
  for (const row of rows) {
    const key = `${row.locale}::${row.characterId}::${row.questId}`;
    const current = merged.get(key);
    if (!current) {
      merged.set(key, { ...row, encoreStoryIds: [...row.encoreStoryIds] });
      continue;
    }
    current.lineCount += row.lineCount;
    for (const id of row.encoreStoryIds) {
      if (!current.encoreStoryIds.includes(id)) {
        current.encoreStoryIds.push(id);
      }
    }
  }
  return [...merged.values()].sort((a, b) => {
    const byCharacter = a.characterId.localeCompare(b.characterId);
    if (byCharacter !== 0) {
      return byCharacter;
    }
    return a.questId.localeCompare(b.questId);
  });
}

export function dedupeOptionalAppearances(rows: OptionalQuestAppearanceRow[]): OptionalQuestAppearanceRow[] {
  const map = new Map<string, OptionalQuestAppearanceRow>();
  for (const row of rows) {
    map.set(`${row.category}::${row.characterId}::${row.questId}`, row);
  }
  return [...map.values()].sort((a, b) => {
    const byCharacter = a.characterId.localeCompare(b.characterId);
    if (byCharacter !== 0) {
      return byCharacter;
    }
    return a.questId.localeCompare(b.questId);
  });
}

export async function fetchEncoreStoryTypes(locale: EncoreLocale): Promise<EncoreStoryType[]> {
  const payload = await fetchEncoreJson<{ storyTypes: EncoreStoryType[] }>(`${ENCORE_BASE}/${locale}/story`);
  return payload.storyTypes;
}

export function summarizeOptionalQuestCounts(storyTypes: EncoreStoryType[]): Record<QuestCategory, number> {
  return {
    companion: collectEncoreStoriesByTypeIds(storyTypes, ENCORE_OPTIONAL_QUEST_TYPE_IDS.companion).length,
    event: collectEncoreStoriesByTypeIds(storyTypes, ENCORE_OPTIONAL_QUEST_TYPE_IDS.event).length,
    side: collectEncoreStoriesByTypeIds(storyTypes, ENCORE_OPTIONAL_QUEST_TYPE_IDS.side).length,
  };
}
