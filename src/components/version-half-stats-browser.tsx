"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type SegmentOption = {
  id: string;
  labelZh: string;
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
    appeared: boolean;
    dialogueLineCount: number;
  }>;
};

type Props = {
  versions: string[];
  segmentOptions: SegmentOption[];
  initialFromVersion: string;
  initialToVersion: string;
  matrix: MatrixRow[];
};

export function VersionHalfStatsBrowser({
  versions,
  segmentOptions,
  initialFromVersion,
  initialToVersion,
  matrix,
}: Props) {
  const [fromVersion, setFromVersion] = useState(initialFromVersion);
  const [toVersion, setToVersion] = useState(initialToVersion);
  const [view, setView] = useState<"ranking" | "matrix">("ranking");

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
      let appearanceTotal = 0;
      for (const cell of row.cells) {
        if (!selectedSegmentIds.includes(cell.segmentId)) {
          continue;
        }
        dialogueTotal += cell.dialogueLineCount;
        if (cell.appeared) {
          appearanceTotal += 1;
        }
      }
      if (dialogueTotal > 0) {
        dialogueByCharacter.set(row.character.id, dialogueTotal);
      }
      if (appearanceTotal > 0) {
        appearancesByCharacter.set(row.character.id, appearanceTotal);
      }
    }

    const ids = new Set([...dialogueByCharacter.keys(), ...appearancesByCharacter.keys()]);
    return [...ids]
      .map((characterId) => {
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
      })
      .sort((a, b) => {
        const aScore = a.linesPerAppearance ?? -1;
        const bScore = b.linesPerAppearance ?? -1;
        if (bScore !== aScore) {
          return bScore - aScore;
        }
        return b.voiceLineCount - a.voiceLineCount;
      });
  }, [matrix, selectedSegmentIds]);

  const filteredMatrix = useMemo(() => {
    return matrix
      .map((row) => ({
        ...row,
        cells: row.cells.filter((cell) => selectedSegmentIds.includes(cell.segmentId)),
      }))
      .filter((row) => row.cells.some((cell) => cell.appeared || cell.dialogueLineCount > 0));
  }, [matrix, selectedSegmentIds]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-4 rounded-lg border border-zinc-200 bg-white p-4">
        <label className="space-y-1 text-sm">
          <span className="text-zinc-600">起始版本</span>
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
          <span className="text-zinc-600">结束版本</span>
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
            台词/登场排名
          </button>
          <button
            type="button"
            className={`rounded-md px-3 py-2 text-sm ${view === "matrix" ? "bg-zinc-900 text-white" : "border border-zinc-300"}`}
            onClick={() => setView("matrix")}
          >
            主线段落明细
          </button>
        </div>
      </div>

      <p className="text-sm text-zinc-600">
        已选 {selectedSegmentIds.length} 个主线段落（{fromVersion}–{toVersion}）。列标题为主线剧情名；台词数来自{" "}
        <a className="underline" href="https://encore.moe/story?lang=zh-Hans" target="_blank" rel="noreferrer">
          encore.moe
        </a>
        ，登场来自 Fandom 任务 infobox。
      </p>

      {view === "ranking" ? (
        <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-left text-zinc-500">
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">角色</th>
                <th className="px-4 py-3">主线台词</th>
                <th className="px-4 py-3">登场段落数</th>
                <th className="px-4 py-3">台词/登场</th>
              </tr>
            </thead>
            <tbody>
              {filteredRanking.map((row, index) => (
                <tr key={row.characterId} className="border-b border-zinc-100">
                  <td className="px-4 py-3">{index + 1}</td>
                  <td className="px-4 py-3 font-medium">
                    <Link className="underline" href={`/characters/${row.characterId}`}>
                      {row.characterName}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{row.voiceLineCount}</td>
                  <td className="px-4 py-3">{row.appearanceCount}</td>
                  <td className="px-4 py-3">{row.linesPerAppearance ?? "—"}</td>
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
                <th className="sticky left-0 bg-white px-3 py-2">角色</th>
                {selectedSegmentIds.map((segmentId) => (
                  <th key={segmentId} className="px-3 py-2 whitespace-nowrap">
                    {segmentOptions.find((item) => item.id === segmentId)?.labelZh ?? segmentId}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredMatrix.map((row) => (
                <tr key={row.character.id} className="border-b border-zinc-100">
                  <td className="sticky left-0 bg-white px-3 py-2 font-medium whitespace-nowrap">
                    <Link className="underline" href={`/characters/${row.character.id}`}>
                      {row.character.name}
                    </Link>
                  </td>
                  {row.cells.map((cell) => (
                    <td key={cell.segmentId} className="px-3 py-2 align-top">
                      {cell.appeared || cell.dialogueLineCount > 0 ? (
                        <div className="space-y-1">
                          <div>{cell.appeared ? "登场" : "—"}</div>
                          <div>{cell.dialogueLineCount > 0 ? `${cell.dialogueLineCount} 句` : "—"}</div>
                        </div>
                      ) : (
                        "—"
                      )}
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
