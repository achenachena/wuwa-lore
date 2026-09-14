import Link from "next/link";

import {
  CharacterRankingTable,
  type CharacterRankingRow,
} from "@/components/character-ranking-table";
import { toggleTabClassName } from "@/components/toggle-tab";
import { QUEST_CATEGORIES } from "@/lib/data/quest-categories";
import type { Messages } from "@/lib/i18n/messages";
import type { QuestCategory } from "@/types/lore";

type Props = {
  initialCategory: QuestCategory;
  questCounts: Record<QuestCategory, number>;
  ranking: CharacterRankingRow[];
  characterPortraits: Record<string, string>;
  labels: Messages["optionalQuests"];
};

export function OptionalQuestsBrowser({
  initialCategory,
  questCounts,
  ranking,
  characterPortraits,
  labels,
}: Props) {
  const category = initialCategory;
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {QUEST_CATEGORIES.map((id) => (
          <Link
            key={id}
            href={`/stats/optional-quests?category=${id}`}
            className={toggleTabClassName(category === id)}
          >
            {labels[id]} ({questCounts[id]})
          </Link>
        ))}
      </div>

      <p className="text-sm text-zinc-600">
        {labels.trackedQuests}: <strong>{questCounts[category]}</strong> ·{" "}
        {labels.rankedCharacters}: <strong>{ranking.length}</strong>
      </p>

      <CharacterRankingTable
        rows={ranking}
        characterPortraits={characterPortraits}
        labels={{
          rank: labels.rank,
          character: labels.character,
          lines: labels.lines,
          appearances: labels.appearances,
          linesPerAppearance: labels.linesPerAppearance,
        }}
      />
    </div>
  );
}
