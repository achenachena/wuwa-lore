"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import {
  decoratePlacedWords,
  hashString,
  prepareWordCloudWords,
  type PlacedWordCloudTerm,
  type WordCloudInput,
} from "@/lib/text/word-cloud-layout";

type Props = {
  terms: WordCloudInput[];
  lineCount: number;
  labels: {
    title: string;
    description: string;
    lineCount: string;
    empty: string;
    termCount: string;
  };
};

type CloudDimensions = {
  width: number;
  height: number;
};

const FONT_FAMILY =
  'system-ui, -apple-system, "PingFang SC", "Hiragino Sans GB", "Noto Sans SC", sans-serif';

export function CharacterWordCloud({ terms, lineCount, labels }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState<CloudDimensions>({
    width: 640,
    height: 380,
  });
  const [placedWords, setPlacedWords] = useState<PlacedWordCloudTerm[]>([]);

  const preparedWords = useMemo(() => prepareWordCloudWords(terms), [terms]);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) {
      return;
    }

    const updateSize = () => {
      const width = Math.max(300, Math.floor(element.clientWidth));
      setDimensions({
        width,
        height: Math.max(300, Math.min(420, Math.round(width * 0.62))),
      });
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (preparedWords.length === 0) {
      return;
    }

    let cancelled = false;

    void import("d3-cloud").then(({ default: cloud }) => {
      const layout = cloud<{
        text: string;
        count: number;
        size: number;
        ratio: number;
      }>()
        .size([dimensions.width, dimensions.height])
        .words(preparedWords)
        .padding(5)
        .spiral("archimedean")
        .rotate((word, index) => {
          if (index === 0) {
            return 0;
          }
          return hashString(word.text) % 9 === 0 ? 90 : 0;
        })
        .font(FONT_FAMILY)
        .fontSize((word) => word.size)
        .on("end", (words) => {
          if (!cancelled) {
            setPlacedWords(decoratePlacedWords(words));
          }
        });

      layout.start();
    });

    return () => {
      cancelled = true;
    };
  }, [preparedWords, dimensions]);

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
        ref={containerRef}
        className="overflow-hidden rounded-xl border border-zinc-200 bg-white"
        role="img"
        aria-label={labels.title}
      >
        <svg
          width={dimensions.width}
          height={dimensions.height}
          viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
          className="mx-auto block"
        >
          <rect width="100%" height="100%" fill="#ffffff" />
          <g
            transform={`translate(${dimensions.width / 2}, ${dimensions.height / 2})`}
          >
            {placedWords.map((word) => (
              <text
                key={word.term}
                transform={`translate(${word.x}, ${word.y}) rotate(${word.rotate})`}
                textAnchor="middle"
                dominantBaseline="middle"
                fontFamily={FONT_FAMILY}
                fontSize={word.fontSize}
                fontWeight={word.fontWeight}
                fill={word.color}
                className="cursor-default select-none"
              >
                <title>{`${word.term}: ${word.count}`}</title>
                {word.term}
              </text>
            ))}
          </g>
        </svg>
      </div>
    </div>
  );
}
