import Link from "next/link";

import { CharacterAvatar } from "@/components/character-avatar";
import { MetricBar } from "@/components/metric-bar";

export type CharacterRankingRow = {
  characterId: string;
  characterName: string;
  voiceLineCount: number;
  appearanceCount: number;
  linesPerAppearance: number | null;
};

type Labels = {
  rank: string;
  character: string;
  lines: string;
  appearances: string;
  linesPerAppearance: string;
};

type Props = {
  rows: CharacterRankingRow[];
  characterPortraits: Record<string, string>;
  labels: Labels;
  lineColorClass?: string;
  appearanceColorClass?: string;
  ratioColorClass?: string;
  onSortLines?: () => void;
  onSortAppearances?: () => void;
  onSortRatio?: () => void;
  sortIndicator?: (key: "voiceLineCount" | "appearanceCount" | "linesPerAppearance") => string;
};

export function CharacterRankingTable({
  rows,
  characterPortraits,
  labels,
  lineColorClass = "bg-amber-500",
  appearanceColorClass = "bg-emerald-500",
  ratioColorClass = "bg-violet-500",
  onSortLines,
  onSortAppearances,
  onSortRatio,
  sortIndicator,
}: Props) {
  const max = {
    lines: Math.max(...rows.map((row) => row.voiceLineCount), 1),
    appearances: Math.max(...rows.map((row) => row.appearanceCount), 1),
    ratio: Math.max(...rows.map((row) => row.linesPerAppearance ?? 0), 1),
  };

  function header(label: string, onClick?: () => void, indicator = "") {
    if (!onClick) {
      return label;
    }
    return (
      <button type="button" className="hover:text-zinc-900" onClick={onClick}>
        {label}
        {indicator}
      </button>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white">
      <table className="w-full min-w-[720px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-zinc-200 text-left text-zinc-500">
            <th className="px-4 py-3">{labels.rank}</th>
            <th className="px-4 py-3">{labels.character}</th>
            <th className="px-4 py-3">
              {header(labels.lines, onSortLines, sortIndicator?.("voiceLineCount") ?? "")}
            </th>
            <th className="px-4 py-3">
              {header(
                labels.appearances,
                onSortAppearances,
                sortIndicator?.("appearanceCount") ?? "",
              )}
            </th>
            <th className="px-4 py-3">
              {header(
                labels.linesPerAppearance,
                onSortRatio,
                sortIndicator?.("linesPerAppearance") ?? "",
              )}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
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
                <MetricBar value={row.voiceLineCount} max={max.lines} colorClass={lineColorClass} />
              </td>
              <td className="px-4 py-3">
                <MetricBar
                  value={row.appearanceCount}
                  max={max.appearances}
                  colorClass={appearanceColorClass}
                />
              </td>
              <td className="px-4 py-3">
                {row.linesPerAppearance !== null ? (
                  <MetricBar
                    value={row.linesPerAppearance}
                    max={max.ratio}
                    colorClass={ratioColorClass}
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
  );
}
