import {
  collectEncoreStoriesByTypeIds,
  ENCORE_BASE,
  fetchEncoreJson,
  fetchEncoreStoryDetail,
} from "@/lib/encore/client";
import { buildSpeakerResolver, countDialoguesBySpeaker } from "@/lib/encore/speakers";
import type { EncoreLocale, EncoreRole, EncoreStoryType } from "@/lib/encore/types";
import { ENCORE_OPTIONAL_QUEST_TYPE_IDS } from "@/lib/encore/types";
import { QUEST_CATEGORIES } from "@/lib/data/quest-categories";
import type {
  OptionalQuestAppearanceRow,
  OptionalQuestCoverageRow,
  OptionalQuestDialogueRow,
  OptionalQuestRecord,
  QuestCategory,
  UnmappedSpeakerRow,
} from "@/types/lore";

export type {
  OptionalQuestAppearanceRow,
  OptionalQuestCoverageRow,
  OptionalQuestDialogueRow,
  UnmappedSpeakerRow,
};

const CATEGORY_PRIORITY = Object.fromEntries(
  QUEST_CATEGORIES.map((category, index) => [category, index]),
) as Record<QuestCategory, number>;

const UNMAPPED_SPEAKER_SKIP = /^(Speaker_\d+|Speaker_undefined|Narrator|问卷反馈)$/i;

function questIdFor(category: QuestCategory, encoreStoryId: number): string {
  return `${category}-${encoreStoryId}`;
}

function storyName(story: { Name?: string; Title?: string }): string {
  return (story.Name ?? story.Title ?? "").trim();
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function createCoverageBuckets() {
  const byCategory = new Map<
    QuestCategory,
    {
      questCount: number;
      questsWithDialogue: number;
      questsWithPlayableDialogue: number;
      totalRawLines: number;
      playableCharacterLines: number;
      playableCharacters: Set<string>;
      unmappedSpeakers: Map<string, number>;
    }
  >();
  for (const category of QUEST_CATEGORIES) {
    byCategory.set(category, {
      questCount: 0,
      questsWithDialogue: 0,
      questsWithPlayableDialogue: 0,
      totalRawLines: 0,
      playableCharacterLines: 0,
      playableCharacters: new Set(),
      unmappedSpeakers: new Map(),
    });
  }
  return byCategory;
}

function finalizeCoverage(
  byCategory: Map<
    QuestCategory,
    {
      questCount: number;
      questsWithDialogue: number;
      questsWithPlayableDialogue: number;
      totalRawLines: number;
      playableCharacterLines: number;
      playableCharacters: Set<string>;
      unmappedSpeakers: Map<string, number>;
    }
  >,
): { coverage: OptionalQuestCoverageRow[]; unmappedSpeakers: UnmappedSpeakerRow[] } {
  const coverage = QUEST_CATEGORIES.map((category) => {
    const bucket = byCategory.get(category)!;
    return {
      category,
      questCount: bucket.questCount,
      questsWithDialogue: bucket.questsWithDialogue,
      questsWithPlayableDialogue: bucket.questsWithPlayableDialogue,
      totalRawLines: bucket.totalRawLines,
      playableCharacterLines: bucket.playableCharacterLines,
      unmappedLines: bucket.totalRawLines - bucket.playableCharacterLines,
      playableCharacterCount: bucket.playableCharacters.size,
    };
  });

  const unmappedSpeakers: UnmappedSpeakerRow[] = [];
  for (const category of QUEST_CATEGORIES) {
    const bucket = byCategory.get(category)!;
    for (const [name, lineCount] of [...bucket.unmappedSpeakers.entries()]
      .filter(([speaker]) => speaker.trim() && !UNMAPPED_SPEAKER_SKIP.test(speaker))
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)) {
      unmappedSpeakers.push({ category, name, lineCount });
    }
  }

  return { coverage, unmappedSpeakers };
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

  const claimed = new Map<number, QuestCategory>();
  const quests: OptionalQuestRecord[] = [];

  for (const category of QUEST_CATEGORIES) {
    for (const story of collectEncoreStoriesByTypeIds(
      params.zhStoryTypes,
      ENCORE_OPTIONAL_QUEST_TYPE_IDS[category],
    )) {
      const existing = claimed.get(story.Id);
      if (existing && CATEGORY_PRIORITY[existing] <= CATEGORY_PRIORITY[category]) {
        continue;
      }
      claimed.set(story.Id, category);
      const nameZh = storyName(story);
      const nameEn = enNameById.get(story.Id) ?? nameZh;
      const record: OptionalQuestRecord = {
        id: questIdFor(category, story.Id),
        category,
        encoreStoryId: story.Id,
        nameZh,
        nameEn,
      };
      const index = quests.findIndex((quest) => quest.encoreStoryId === story.Id);
      if (index >= 0) {
        quests[index] = record;
      } else {
        quests.push(record);
      }
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
  collectMetadata?: boolean;
}): Promise<{
  dialogueRows: OptionalQuestDialogueRow[];
  appearanceRows: OptionalQuestAppearanceRow[];
  coverage?: OptionalQuestCoverageRow[];
  unmappedSpeakers?: UnmappedSpeakerRow[];
}> {
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
  const coverageBuckets = params.collectMetadata ? createCoverageBuckets() : null;

  for (const quest of params.quests) {
    if (coverageBuckets) {
      coverageBuckets.get(quest.category)!.questCount += 1;
    }

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

    let questRaw = 0;
    let questPlayable = 0;

    for (const [speaker, count] of speakerCounts.entries()) {
      if (count <= 0) {
        continue;
      }
      questRaw += count;

      const characterId = resolveSpeaker(speaker);
      if (characterId) {
        questPlayable += count;
        if (coverageBuckets && params.locale === "zh-Hans") {
          coverageBuckets.get(quest.category)!.playableCharacters.add(characterId);
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
        continue;
      }

      if (coverageBuckets && params.locale === "zh-Hans") {
        const bucket = coverageBuckets.get(quest.category)!;
        bucket.unmappedSpeakers.set(speaker, (bucket.unmappedSpeakers.get(speaker) ?? 0) + count);
      }
    }

    if (coverageBuckets && params.locale === "zh-Hans") {
      const bucket = coverageBuckets.get(quest.category)!;
      bucket.totalRawLines += questRaw;
      bucket.playableCharacterLines += questPlayable;
      if (questRaw > 0) {
        bucket.questsWithDialogue += 1;
      }
      if (questPlayable > 0) {
        bucket.questsWithPlayableDialogue += 1;
      }
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

  if (!coverageBuckets) {
    return { dialogueRows, appearanceRows };
  }

  const { coverage, unmappedSpeakers } = finalizeCoverage(coverageBuckets);
  return { dialogueRows, appearanceRows, coverage, unmappedSpeakers };
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
