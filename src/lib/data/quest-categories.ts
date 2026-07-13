import type { QuestCategory } from "@/types/lore";

/**
 * Single registry for optional-quest categories.
 * Add a category here (+ i18n + Encore type IDs) instead of hunting hardcoded triples.
 */
export const QUEST_CATEGORIES = ["companion", "event", "side"] as const satisfies readonly QuestCategory[];

export type RegisteredQuestCategory = (typeof QUEST_CATEGORIES)[number];

export function isQuestCategory(value: string | undefined): value is QuestCategory {
  return QUEST_CATEGORIES.includes(value as QuestCategory);
}

export function emptyQuestCategoryCounts(): Record<QuestCategory, number> {
  return Object.fromEntries(QUEST_CATEGORIES.map((category) => [category, 0])) as Record<
    QuestCategory,
    number
  >;
}

export function countQuestsByCategory<T extends { category: QuestCategory }>(
  quests: T[],
): Record<QuestCategory, number> {
  const counts = emptyQuestCategoryCounts();
  for (const quest of quests) {
    counts[quest.category] += 1;
  }
  return counts;
}
