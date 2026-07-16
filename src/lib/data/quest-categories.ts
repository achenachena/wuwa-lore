import type { QuestCategory } from "@/lib/domain/catalog";
import { QUEST_CATEGORIES } from "@/lib/domain/catalog";

export { QUEST_CATEGORIES };
export type { QuestCategory };

/**
 * Optional-quest category helpers.
 * Add a category in `domain/catalog` (+ i18n + Encore type IDs), then helpers stay in sync.
 */

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
