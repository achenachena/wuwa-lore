"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { CharacterAvatar } from "@/components/character-avatar";
import { CharacterRankingTable } from "@/components/character-ranking-table";
import { ToggleTab } from "@/components/toggle-tab";
import type { Messages } from "@/lib/i18n/messages";
import { isVersionInRange } from "@/lib/version/compare";

type SegmentOption = {
  id: string;
  label: string;
  version: string;
  versionHalf: string;
};

type MatrixRow = {
  character: {
    id: string;
    name: string;
    releaseVersion: string;
  };
  cells: Array<{
    segmentId: string;
    appeared: boolean;
    dialogueLineCount: number;
  }>;
};

type SortKey = "voiceLineCount" | "appearanceCount" | "linesPerAppearance";
type SortDirection = "asc" | "desc";

type Props = {
  versions: string[];
  segmentOptions: SegmentOption[];
  initialFromVersion: string;
  initialToVersion: string;
  matrix: MatrixRow[];
  characterPortraits: Record<string, string>;
  labels: Messages["storySegments"];
};

export function VersionHalfStatsBrowser({
  versions,
  segmentOptions,
  initialFromVersion,
  initialToVersion,
  matrix,
  characterPortraits,
  labels,
}: Props) {
  const [fromVersion, setFromVersion] = useState(initialFromVersion);
  const [toVersion, setToVersion] = useState(initialToVersion);
  const [view, setView] = useState<"ranking" | "matrix">("ranking");
  const [sortKey, setSortKey] = useState<SortKey>("linesPerAppearance");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [matrixSortDirection, setMatrixSortDirection] =
    useState<SortDirection>("desc");

  const segmentOptionById = useMemo(
    () => new Map(segmentOptions.map((segment) => [segment.id, segment])),
    [segmentOptions],
  );

  const selectedSegmentIdSet = useMemo(() => {
    const ids = new Set<string>();
    for (const segment of segmentOptions) {
      if (isVersionInRange(segment.version, fromVersion, toVersion)) {
        ids.add(segment.id);
      }
    }
    return ids;
  }, [fromVersion, segmentOptions, toVersion]);

  const filteredRanking = useMemo(() => {
    const rows = matrix.flatMap((row) => {
      let dialogueTotal = 0;
      const appearedHalves = new Set<string>();
      for (const cell of row.cells) {
        if (!selectedSegmentIdSet.has(cell.segmentId)) {
          continue;
        }
        dialogueTotal += cell.dialogueLineCount;
        if (cell.appeared) {
          const versionHalf = segmentOptionById.get(
            cell.segmentId,
          )?.versionHalf;
          if (versionHalf) {
            appearedHalves.add(versionHalf);
          }
        }
      }
      const appearanceTotal = appearedHalves.size;
      if (dialogueTotal <= 0 && appearanceTotal <= 0) {
        return [];
      }

      return [
        {
          characterId: row.character.id,
          characterName: row.character.name,
          voiceLineCount: dialogueTotal,
          appearanceCount: appearanceTotal,
          linesPerAppearance:
            appearanceTotal > 0
              ? Number((dialogueTotal / appearanceTotal).toFixed(2))
              : null,
        },
      ];
    });

    return rows.sort((a, b) => {
      const direction = sortDirection === "asc" ? 1 : -1;
      const aValue =
        sortKey === "linesPerAppearance"
          ? (a.linesPerAppearance ?? -1)
          : a[sortKey];
      const bValue =
        sortKey === "linesPerAppearance"
          ? (b.linesPerAppearance ?? -1)
          : b[sortKey];
      if (aValue !== bValue) {
        return (aValue - bValue) * direction;
      }
      return a.characterName.localeCompare(b.characterName);
    });
  }, [matrix, segmentOptionById, selectedSegmentIdSet, sortDirection, sortKey]);

  const selectedSegmentIds = useMemo(
    () => [...selectedSegmentIdSet],
    [selectedSegmentIdSet],
  );

  const filteredMatrix = useMemo(() => {
    const rows = matrix
      .map((row) => {
        const cellsBySegmentId = new Map(
          row.cells.map((cell) => [cell.segmentId, cell]),
        );
        const cells = selectedSegmentIds.map(
          (segmentId) =>
            cellsBySegmentId.get(segmentId) ?? {
              segmentId,
              appeared: false,
              dialogueLineCount: 0,
            },
        );
        const totalLines = cells.reduce(
          (sum, cell) => sum + cell.dialogueLineCount,
          0,
        );
        return { ...row, cells, totalLines };
      })
      .filter((row) =>
        row.cells.some((cell) => cell.appeared || cell.dialogueLineCount > 0),
      );

    const direction = matrixSortDirection === "asc" ? 1 : -1;
    return rows.sort((left, right) => {
      if (left.totalLines !== right.totalLines) {
        return (left.totalLines - right.totalLines) * direction;
      }
      return left.character.name.localeCompare(right.character.name);
    });
  }, [matrix, matrixSortDirection, selectedSegmentIds]);

  const matrixMaxLines = useMemo(() => {
    let max = 1;
    for (const row of filteredMatrix) {
      for (const cell of row.cells) {
        if (cell.dialogueLineCount > max) {
          max = cell.dialogueLineCount;
        }
      }
    }
    return max;
  }, [filteredMatrix]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDirection("desc");
  }

  function sortIndicator(key: SortKey) {
    if (sortKey !== key) {
      return "";
    }
    return sortDirection === "asc" ? " ↑" : " ↓";
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-4 rounded-lg border border-zinc-200 bg-white p-4">
        <label className="space-y-1 text-sm">
          <span className="text-zinc-600">{labels.fromVersion}</span>
          <select
            className="block rounded-md border border-zinc-300 px-3 py-2"
            value={fromVersion}
            onChange={(event) => setFromVersion(event.target.value)}
          >
            {versions.map((version) => (
              <option key={version} value={version}>
                {version}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-zinc-600">{labels.toVersion}</span>
          <select
            className="block rounded-md border border-zinc-300 px-3 py-2"
            value={toVersion}
            onChange={(event) => setToVersion(event.target.value)}
          >
            {versions.map((version) => (
              <option key={version} value={version}>
                {version}
              </option>
            ))}
          </select>
        </label>
        <div className="flex gap-2">
          <ToggleTab active={view === "ranking"} onClick={() => setView("ranking")}>
            {labels.rankingTab}
          </ToggleTab>
          <ToggleTab active={view === "matrix"} onClick={() => setView("matrix")}>
            {labels.matrixTab}
          </ToggleTab>
        </div>
      </div>

      <p className="text-sm text-zinc-600">
        {labels.selectedSegments} {selectedSegmentIds.length} {labels.segments}{" "}
        ({fromVersion}–{toVersion})
      </p>

      {view === "ranking" ? (
        <CharacterRankingTable
          rows={filteredRanking}
          characterPortraits={characterPortraits}
          labels={{
            rank: labels.rank,
            character: labels.character,
            lines: labels.storyLines,
            appearances: labels.versionAppearances,
            linesPerAppearance: labels.linesPerAppearance,
          }}
          lineColorClass="bg-sky-500"
          appearanceColorClass="bg-violet-500"
          ratioColorClass="bg-amber-500"
          onSortLines={() => toggleSort("voiceLineCount")}
          onSortAppearances={() => toggleSort("appearanceCount")}
          onSortRatio={() => toggleSort("linesPerAppearance")}
          sortIndicator={sortIndicator}
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white">
          <table className="w-full min-w-[960px] border-collapse text-xs">
            <thead>
              <tr className="border-b border-zinc-200 text-left text-zinc-500">
                <th className="sticky left-0 z-10 bg-white px-3 py-2">
                  {labels.rank}
                </th>
                <th className="sticky left-8 z-10 bg-white px-3 py-2">
                  {labels.character}
                </th>
                <th className="px-3 py-2 whitespace-nowrap">
                  <button
                    type="button"
                    className="hover:text-zinc-900"
                    onClick={() =>
                      setMatrixSortDirection((current) =>
                        current === "asc" ? "desc" : "asc",
                      )
                    }
                    title={labels.sortByLines}
                  >
                    {labels.totalLines}
                    {matrixSortDirection === "asc" ? " ↑" : " ↓"}
                  </button>
                </th>
                {selectedSegmentIds.map((segmentId) => (
                  <th key={segmentId} className="px-3 py-2 whitespace-nowrap">
                    {segmentOptionById.get(segmentId)?.label ?? segmentId}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredMatrix.map((row, index) => (
                <tr key={row.character.id} className="border-b border-zinc-100">
                  <td className="sticky left-0 z-10 bg-white px-3 py-2 text-zinc-500">
                    {index + 1}
                  </td>
                  <td className="sticky left-8 z-10 bg-white px-3 py-2 font-medium whitespace-nowrap">
                    <Link
                      className="flex items-center gap-2 hover:underline"
                      href={`/characters/${row.character.id}`}
                    >
                      <CharacterAvatar
                        name={row.character.name}
                        src={characterPortraits[row.character.id]}
                        size={28}
                      />
                      <span>{row.character.name}</span>
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-sm font-semibold text-zinc-800">
                    {row.totalLines}
                  </td>
                  {row.cells.map((cell) => (
                    <td key={cell.segmentId} className="px-2 py-2 align-middle">
                      <SegmentCell
                        cell={cell}
                        labels={labels}
                        maxLines={matrixMaxLines}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function SegmentCell({
  cell,
  labels,
  maxLines,
}: {
  cell: MatrixRow["cells"][number];
  labels: Messages["storySegments"];
  maxLines: number;
}) {
  if (!cell.appeared && cell.dialogueLineCount <= 0) {
    return <span className="text-zinc-300">—</span>;
  }

  const lineIntensity =
    cell.dialogueLineCount > 0
      ? 0.18 + (cell.dialogueLineCount / maxLines) * 0.62
      : 0;
  const backgroundColor =
    cell.dialogueLineCount > 0
      ? `rgba(14, 165, 233, ${lineIntensity})`
      : cell.appeared
        ? "rgba(16, 185, 129, 0.14)"
        : undefined;

  return (
    <div
      className="flex min-h-12 flex-col items-center justify-center gap-1 rounded-md border border-zinc-100 px-1 py-2 text-center"
      style={{ backgroundColor }}
      title={
        cell.dialogueLineCount > 0
          ? `${cell.dialogueLineCount} ${labels.lines}`
          : cell.appeared
            ? labels.appeared
            : undefined
      }
    >
      {cell.appeared ? (
        <span
          className="inline-block h-2 w-2 rounded-full bg-emerald-500"
          aria-label={labels.appeared}
        />
      ) : null}
      {cell.dialogueLineCount > 0 ? (
        <span className="text-sm font-semibold text-zinc-800">
          {cell.dialogueLineCount}
        </span>
      ) : cell.appeared ? (
        <span className="text-[10px] text-emerald-700">{labels.appeared}</span>
      ) : null}
    </div>
  );
}
