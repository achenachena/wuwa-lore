"use client";

import Link from "next/link";
import { useMemo } from "react";

import { CharacterAvatar } from "@/components/character-avatar";
import { MetricBar } from "@/components/metric-bar";
import type { Messages } from "@/lib/i18n/messages";
import type { QuestCategory } from "@/types/lore";

type RankingRow = {
  characterId: string;
  characterName: string;
  voiceLineCount: number;
  appearanceCount: number;
  linesPerAppearance: number | null;
};

type Props = {
  initialCategory: QuestCategory;
  questCounts: Record<QuestCategory, number>;
  ranking: RankingRow[];
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

  const max = useMemo(
    () => ({
      lines: Math.max(...ranking.map((row) => row.voiceLineCount), 1),
      appearances: Math.max(...ranking.map((row) => row.appearanceCount), 1),
      ratio: Math.max(...ranking.map((row) => row.linesPerAppearance ?? 0), 1),
    }),
    [ranking],
  );

  const categories: Array<{ id: QuestCategory; label: string; count: number }> = [
    { id: "companion", label: labels.companion, count: questCounts.companion },
    { id: "event", label: labels.event, count: questCounts.event },
    { id: "side", label: labels.side, count: questCounts.side },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {categories.map((item) => (
          <Link
            key={item.id}
            href={`/stats/optional-quests?category=${item.id}`}
            className={`rounded-md px-3 py-2 text-sm ${
              category === item.id ? "bg-zinc-900 text-white" : "border border-zinc-300 bg-white"
            }`}
          >
            {item.label} ({item.count})
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

      <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white">
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-zinc-200 text-left text-zinc-500">
              <th className="px-4 py-3">{labels.rank}</th>
              <th className="px-4 py-3">{labels.character}</th>
              <th className="px-4 py-3">{labels.lines}</th>
              <th className="px-4 py-3">{labels.appearances}</th>
              <th className="px-4 py-3">{labels.linesPerAppearance}</th>
            </tr>
          </thead>
          <tbody>
            {ranking.map((row, index) => (
              <tr key={row.characterId} className="border-b border-zinc-100">
                <td className="px-4 py-3 text-zinc-500">{index + 1}</td>
                <td className="px-4 py-3 font-medium">
                  <Link
                    className="flex items-center gap-3 hover:underline"
                    href={`/characters/${row.characterId}`}
                  >
                    <CharacterAvatar
                      name={row.characterName}
                      src={characterPortraits[row.characterId]}
                      size={36}
                    />
                    <span>{row.characterName}</span>
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <MetricBar value={row.voiceLineCount} max={max.lines} colorClass="bg-amber-500" />
                </td>
                <td className="px-4 py-3">
                  <MetricBar
                    value={row.appearanceCount}
                    max={max.appearances}
                    colorClass="bg-emerald-500"
                  />
                </td>
                <td className="px-4 py-3">
                  {row.linesPerAppearance !== null ? (
                    <MetricBar
                      value={row.linesPerAppearance}
                      max={max.ratio}
                      colorClass="bg-violet-500"
                    />
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
