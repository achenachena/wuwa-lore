"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { CharacterAvatar } from "@/components/character-avatar";
import { MetricBar } from "@/components/metric-bar";
import type { Messages } from "@/lib/i18n/messages";

type SegmentOption = {
  id: string;
  label: string;
  version: string;
};

type MatrixRow = {
  character: {
    id: string;
    name: string;
    releaseVersion: string;
  };
  cells: Array<{
    segmentId: string;
    labelZh: string;
    version: string;
    versionHalf: string;
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

  const selectedSegmentIds = useMemo(() => {
    return segmentOptions
      .filter((segment) => {
        const [major, minor] = segment.version.split(".").map(Number);
        const [fromMajor, fromMinor] = fromVersion.split(".").map(Number);
        const [toMajor, toMinor] = toVersion.split(".").map(Number);
        const value = major * 100 + minor;
        const fromValue = fromMajor * 100 + fromMinor;
        const toValue = toMajor * 100 + toMinor;
        return value >= fromValue && value <= toValue;
      })
      .map((segment) => segment.id);
  }, [fromVersion, segmentOptions, toVersion]);

  const filteredRanking = useMemo(() => {
    const dialogueByCharacter = new Map<string, number>();
    const appearancesByCharacter = new Map<string, number>();

    for (const row of matrix) {
      let dialogueTotal = 0;
      const appearedHalves = new Set<string>();
      for (const cell of row.cells) {
        if (!selectedSegmentIds.includes(cell.segmentId)) {
          continue;
        }
        dialogueTotal += cell.dialogueLineCount;
        if (cell.appeared) {
          appearedHalves.add(cell.versionHalf);
        }
      }
      const appearanceTotal = appearedHalves.size;
      if (dialogueTotal > 0 || appearanceTotal > 0) {
        dialogueByCharacter.set(row.character.id, dialogueTotal);
        appearancesByCharacter.set(row.character.id, appearanceTotal);
      }
    }

    const ids = new Set([...dialogueByCharacter.keys(), ...appearancesByCharacter.keys()]);
    const rows = [...ids].map((characterId) => {
      const source = matrix.find((row) => row.character.id === characterId);
      const voiceLineCount = dialogueByCharacter.get(characterId) ?? 0;
      const appearanceCount = appearancesByCharacter.get(characterId) ?? 0;
      return {
        characterId,
        characterName: source?.character.name ?? characterId,
        voiceLineCount,
        appearanceCount,
        linesPerAppearance:
          appearanceCount > 0 ? Number((voiceLineCount / appearanceCount).toFixed(2)) : null,
      };
    });

    return rows.sort((a, b) => {
      const direction = sortDirection === "asc" ? 1 : -1;
      const aValue =
        sortKey === "linesPerAppearance" ? (a.linesPerAppearance ?? -1) : a[sortKey];
      const bValue =
        sortKey === "linesPerAppearance" ? (b.linesPerAppearance ?? -1) : b[sortKey];
      if (aValue !== bValue) {
        return (aValue - bValue) * direction;
      }
      return a.characterName.localeCompare(b.characterName);
    });
  }, [matrix, selectedSegmentIds, sortDirection, sortKey]);

  const rankingMax = useMemo(() => {
    return {
      lines: Math.max(...filteredRanking.map((row) => row.voiceLineCount), 1),
      appearances: Math.max(...filteredRanking.map((row) => row.appearanceCount), 1),
      ratio: Math.max(...filteredRanking.map((row) => row.linesPerAppearance ?? 0), 1),
    };
  }, [filteredRanking]);

  const filteredMatrix = useMemo(() => {
    return matrix
      .map((row) => ({
        ...row,
        cells: row.cells.filter((cell) => selectedSegmentIds.includes(cell.segmentId)),
      }))
      .filter((row) => row.cells.some((cell) => cell.appeared || cell.dialogueLineCount > 0));
  }, [matrix, selectedSegmentIds]);

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
          <button
            type="button"
            className={`rounded-md px-3 py-2 text-sm ${view === "ranking" ? "bg-zinc-900 text-white" : "border border-zinc-300"}`}
            onClick={() => setView("ranking")}
          >
            {labels.rankingTab}
          </button>
          <button
            type="button"
            className={`rounded-md px-3 py-2 text-sm ${view === "matrix" ? "bg-zinc-900 text-white" : "border border-zinc-300"}`}
            onClick={() => setView("matrix")}
          >
            {labels.matrixTab}
          </button>
        </div>
      </div>

      <p className="text-sm text-zinc-600">
        {labels.selectedSegments} {selectedSegmentIds.length} {labels.segments} ({fromVersion}–{toVersion})
      </p>

      {view === "ranking" ? (
        <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white">
          <table className="w-full min-w-[760px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-left text-zinc-500">
                <th className="px-4 py-3">{labels.rank}</th>
                <th className="px-4 py-3">{labels.character}</th>
                <th className="px-4 py-3">
                  <button type="button" className="hover:text-zinc-900" onClick={() => toggleSort("voiceLineCount")}>
                    {labels.storyLines}
                    {sortIndicator("voiceLineCount")}
                  </button>
                </th>
                <th className="px-4 py-3">
                  <button type="button" className="hover:text-zinc-900" onClick={() => toggleSort("appearanceCount")}>
                    {labels.versionAppearances}
                    {sortIndicator("appearanceCount")}
                  </button>
                </th>
                <th className="px-4 py-3">
                  <button
                    type="button"
                    className="hover:text-zinc-900"
                    onClick={() => toggleSort("linesPerAppearance")}
                  >
                    {labels.linesPerAppearance}
                    {sortIndicator("linesPerAppearance")}
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredRanking.map((row, index) => (
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
                    <MetricBar
                      value={row.voiceLineCount}
                      max={rankingMax.lines}
                      colorClass="bg-sky-500"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <MetricBar
                      value={row.appearanceCount}
                      max={rankingMax.appearances}
                      colorClass="bg-violet-500"
                    />
                  </td>
                  <td className="px-4 py-3">
                    {row.linesPerAppearance !== null ? (
                      <MetricBar
                        value={row.linesPerAppearance}
                        max={rankingMax.ratio}
                        colorClass="bg-amber-500"
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
      ) : (
        <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white">
          <table className="w-full min-w-[960px] border-collapse text-xs">
            <thead>
              <tr className="border-b border-zinc-200 text-left text-zinc-500">
                <th className="sticky left-0 z-10 bg-white px-3 py-2">{labels.character}</th>
                {selectedSegmentIds.map((segmentId) => (
                  <th key={segmentId} className="px-3 py-2 whitespace-nowrap">
                    {segmentOptions.find((item) => item.id === segmentId)?.label ?? segmentId}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredMatrix.map((row) => (
                <tr key={row.character.id} className="border-b border-zinc-100">
                  <td className="sticky left-0 z-10 bg-white px-3 py-2 font-medium whitespace-nowrap">
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
                  {row.cells.map((cell) => (
                    <td key={cell.segmentId} className="px-2 py-2 align-middle">
                      <SegmentCell cell={cell} labels={labels} maxLines={matrixMaxLines} />
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
    cell.dialogueLineCount > 0 ? 0.18 + (cell.dialogueLineCount / maxLines) * 0.62 : 0;
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
        <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" aria-label={labels.appeared} />
      ) : null}
      {cell.dialogueLineCount > 0 ? (
        <span className="text-sm font-semibold text-zinc-800">{cell.dialogueLineCount}</span>
      ) : cell.appeared ? (
        <span className="text-[10px] text-emerald-700">{labels.appeared}</span>
      ) : null}
    </div>
  );
}
