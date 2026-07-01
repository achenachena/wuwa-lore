"use client";

import { useMemo } from "react";

type WordCloudTerm = {
  term: string;
  count: number;
};

type Props = {
  terms: WordCloudTerm[];
  lineCount: number;
  labels: {
    title: string;
    description: string;
    lineCount: string;
    empty: string;
    termCount: string;
  };
};

const COLORS = [
  "#6d28d9",
  "#1d4ed8",
  "#047857",
  "#b45309",
  "#be123c",
  "#0e7490",
  "#4338ca",
  "#0f766e",
  "#c2410c",
  "#7c3aed",
];

const MIN_FONT_PX = 13;
const MAX_FONT_PX = 56;

function hashString(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function scaleFontSize(count: number, minCount: number, maxCount: number): number {
  if (maxCount <= minCount) {
    return (MIN_FONT_PX + MAX_FONT_PX) / 2;
  }
  const normalized =
    (Math.log(count) - Math.log(minCount)) / (Math.log(maxCount) - Math.log(minCount));
  const clamped = Math.max(0, Math.min(1, normalized));
  return MIN_FONT_PX + clamped * (MAX_FONT_PX - MIN_FONT_PX);
}

function fontWeightForRatio(ratio: number): number {
  if (ratio >= 0.82) {
    return 800;
  }
  if (ratio >= 0.62) {
    return 700;
  }
  if (ratio >= 0.42) {
    return 600;
  }
  if (ratio >= 0.24) {
    return 500;
  }
  return 400;
}

export function CharacterWordCloud({ terms, lineCount, labels }: Props) {
  const layout = useMemo(() => {
    if (terms.length === 0) {
      return [];
    }

    const maxCount = terms[0]?.count ?? 1;
    const minCount = terms[terms.length - 1]?.count ?? 1;

    return [...terms]
      .map((item) => {
        const ratio = maxCount === minCount ? 1 : (item.count - minCount) / (maxCount - minCount);
        const fontSizePx = scaleFontSize(item.count, minCount, maxCount);
        return {
          ...item,
          ratio,
          fontSizePx,
          fontWeight: fontWeightForRatio(ratio),
          color: COLORS[hashString(item.term) % COLORS.length],
          order: hashString(item.term),
        };
      })
      .sort((left, right) => left.order - right.order);
  }, [terms]);

  if (terms.length === 0) {
    return <p className="mt-2 text-sm text-zinc-500">{labels.empty}</p>;
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-zinc-600">{labels.description}</p>
      <p className="text-xs text-zinc-500">
        {labels.lineCount.replace("{count}", String(lineCount))} ·{" "}
        {labels.termCount.replace("{count}", String(terms.length))}
      </p>
      <div
        className="relative min-h-[220px] overflow-hidden rounded-xl border border-zinc-200 bg-gradient-to-br from-zinc-50 via-white to-zinc-100 px-4 py-8"
        role="img"
        aria-label={labels.title}
      >
        <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-center leading-none">
          {layout.map((item) => (
            <span
              key={item.term}
              className="inline-block cursor-default select-none whitespace-nowrap transition-transform duration-150 hover:scale-105"
              style={{
                fontSize: `${item.fontSizePx}px`,
                fontWeight: item.fontWeight,
                color: item.color,
                lineHeight: 1.05,
                padding: `${Math.max(2, item.fontSizePx * 0.08)}px ${Math.max(3, item.fontSizePx * 0.12)}px`,
              }}
              title={`${item.term}: ${item.count}`}
            >
              {item.term}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
