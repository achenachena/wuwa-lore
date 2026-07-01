export type WordCloudInput = {
  term: string;
  count: number;
};

export type PlacedWordCloudTerm = WordCloudInput & {
  x: number;
  y: number;
  rotate: number;
  fontSize: number;
  fontWeight: number;
  color: string;
};

const COLORS = [
  "#ca8a04",
  "#0d9488",
  "#4f46e5",
  "#7c3aed",
  "#0891b2",
  "#059669",
  "#be185d",
  "#1d4ed8",
  "#c2410c",
  "#0f766e",
];

const MIN_FONT_PX = 14;
const MAX_FONT_PX = 72;

export function hashString(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}

export function scaleWordCloudFontSize(count: number, minCount: number, maxCount: number): number {
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

export function colorForWord(term: string, rank: number): string {
  if (rank === 0) {
    return "#ca8a04";
  }
  return COLORS[(hashString(term) + rank) % COLORS.length];
}

export function prepareWordCloudWords(terms: WordCloudInput[], maxWords = 42): Array<{
  text: string;
  count: number;
  size: number;
  ratio: number;
}> {
  const sorted = [...terms].sort((left, right) => right.count - left.count).slice(0, maxWords);
  const maxCount = sorted[0]?.count ?? 1;
  const minCount = sorted[sorted.length - 1]?.count ?? 1;

  return sorted.map((item, index) => {
    const ratio = maxCount === minCount ? 1 : (item.count - minCount) / (maxCount - minCount);
    return {
      text: item.term,
      count: item.count,
      size: scaleWordCloudFontSize(item.count, minCount, maxCount),
      ratio: index === 0 ? 1 : ratio,
    };
  });
}

export function decoratePlacedWords(
  words: Array<{
    text?: string;
    count?: number;
    size?: number;
    ratio?: number;
    x?: number;
    y?: number;
    rotate?: number;
  }>,
): PlacedWordCloudTerm[] {
  return words
    .filter(
      (word): word is Required<Pick<typeof word, "text" | "x" | "y">> & typeof word =>
        Boolean(word.text && word.x !== undefined && word.y !== undefined),
    )
    .map((word, index) => ({
      term: word.text!,
      count: word.count ?? 0,
      x: word.x!,
      y: word.y!,
      rotate: word.rotate ?? 0,
      fontSize: word.size ?? MIN_FONT_PX,
      fontWeight: fontWeightForRatio(word.ratio ?? 0),
      color: colorForWord(word.text!, index),
    }));
}
