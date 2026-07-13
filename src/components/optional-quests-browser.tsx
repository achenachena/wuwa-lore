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
  coverage: Array<{
    category: QuestCategory;
    questCount: number;
    questsWithDialogue: number;
    playableCharacterLines: number;
    unmappedLines: number;
    playableCharacterCount: number;
  }> | null;
  unmappedSpeakers: Array<{
    category: QuestCategory;
    name: string;
    lineCount: number;
  }> | null;
  labels: Messages["optionalQuests"];
};

export function OptionalQuestsBrowser({
  initialCategory,
  questCounts,
  ranking,
  characterPortraits,
  coverage,
  unmappedSpeakers,
  labels,
}: Props) {
  const category = initialCategory;
  const categoryCoverage = coverage?.find((row) => row.category === category);
  const categoryUnmappedSpeakers =
    unmappedSpeakers?.filter((row) => row.category === category) ?? [];

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
        {labels.trackedQuests}: <strong>{questCounts[category]}</strong> · {labels.rankedCharacters}:{" "}
        <strong>{ranking.length}</strong>
      </p>

      {categoryCoverage && categoryCoverage.unmappedLines > 0 ? (
        <p className="text-xs text-zinc-500">
          {labels.coverageNote
            .replace("{playableChars}", String(categoryCoverage.playableCharacterCount))
            .replace("{playableLines}", String(categoryCoverage.playableCharacterLines))
            .replace("{unmappedLines}", String(categoryCoverage.unmappedLines))
            .replace("{questsWithDialogue}", String(categoryCoverage.questsWithDialogue))
            .replace("{questCount}", String(categoryCoverage.questCount))}
        </p>
      ) : null}

      {categoryUnmappedSpeakers.length > 0 ? (
        <details className="text-xs text-zinc-500">
          <summary className="cursor-pointer select-none">{labels.unmappedSpeakersHint}</summary>
          <ul className="mt-2 space-y-1 pl-4">
            {categoryUnmappedSpeakers.map((speaker) => (
              <li key={speaker.name}>
                {speaker.name} ({speaker.lineCount} {labels.lines})
              </li>
            ))}
          </ul>
        </details>
      ) : null}

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
