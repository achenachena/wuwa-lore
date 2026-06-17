"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type HalfOption = {
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
    versionHalf: string;
    labelZh: string;
    appearanceCount: number;
    questTitlesZh: string[];
    dialogueLineCount: number;
  }>;
};

type Props = {
  versions: string[];
  halfOptions: HalfOption[];
  initialFromVersion: string;
  initialToVersion: string;
  matrix: MatrixRow[];
};

export function VersionHalfStatsBrowser({
  versions,
  halfOptions,
  initialFromVersion,
  initialToVersion,
  matrix,
}: Props) {
  const [fromVersion, setFromVersion] = useState(initialFromVersion);
  const [toVersion, setToVersion] = useState(initialToVersion);
  const [view, setView] = useState<"ranking" | "matrix">("ranking");

  const selectedHalfIds = useMemo(() => {
    return halfOptions
      .filter((half) => {
        const [major, minor] = half.version.split(".").map(Number);
        const [fromMajor, fromMinor] = fromVersion.split(".").map(Number);
        const [toMajor, toMinor] = toVersion.split(".").map(Number);
        const value = major * 100 + minor;
        const fromValue = fromMajor * 100 + fromMinor;
        const toValue = toMajor * 100 + toMinor;
        return value >= fromValue && value <= toValue;
      })
      .map((half) => half.id);
  }, [fromVersion, halfOptions, toVersion]);

  const filteredRanking = useMemo(() => {
    const dialogueByCharacter = new Map<string, number>();
    const appearancesByCharacter = new Map<string, number>();

    for (const row of matrix) {
      let dialogueTotal = 0;
      let appearanceTotal = 0;
      for (const cell of row.cells) {
        if (!selectedHalfIds.includes(cell.versionHalf)) {
          continue;
        }
        dialogueTotal += cell.dialogueLineCount;
        appearanceTotal += cell.appearanceCount;
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
  }, [matrix, selectedHalfIds]);

  const filteredMatrix = useMemo(() => {
    return matrix
      .map((row) => ({
        ...row,
        cells: row.cells.filter((cell) => selectedHalfIds.includes(cell.versionHalf)),
      }))
      .filter((row) =>
        row.cells.some((cell) => cell.appearanceCount > 0 || cell.dialogueLineCount > 0),
      );
  }, [matrix, selectedHalfIds]);

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
            小版本明细
          </button>
        </div>
      </div>

      <p className="text-sm text-zinc-600">
        已选 {selectedHalfIds.length} 个小版本（{fromVersion}–{toVersion}）。台词数来自{" "}
        <a className="underline" href="https://encore.moe/story?lang=zh-Hans" target="_blank" rel="noreferrer">
          encore.moe
        </a>{" "}
        主线对话；登场次数来自 Fandom 任务 infobox。
      </p>

      {view === "ranking" ? (
        <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-left text-zinc-500">
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">角色</th>
                <th className="px-4 py-3">主线台词</th>
                <th className="px-4 py-3">登场次数</th>
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
                {selectedHalfIds.map((halfId) => (
                  <th key={halfId} className="px-3 py-2 whitespace-nowrap">
                    {halfOptions.find((item) => item.id === halfId)?.labelZh ?? halfId}
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
                    <td key={cell.versionHalf} className="px-3 py-2 align-top">
                      {cell.appearanceCount > 0 || cell.dialogueLineCount > 0 ? (
                        <div className="space-y-1">
                          <div>登场 {cell.appearanceCount || "—"}</div>
                          <div>台词 {cell.dialogueLineCount || "—"}</div>
                          {cell.questTitlesZh.length > 0 ? (
                            <div className="text-zinc-500">{cell.questTitlesZh.join("、")}</div>
                          ) : null}
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
