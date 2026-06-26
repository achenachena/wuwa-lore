"use client";

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
  "text-violet-700",
  "text-blue-700",
  "text-emerald-700",
  "text-amber-700",
  "text-rose-700",
  "text-cyan-700",
  "text-indigo-700",
  "text-teal-700",
];

export function CharacterWordCloud({ terms, lineCount, labels }: Props) {
  if (terms.length === 0) {
    return <p className="mt-2 text-sm text-zinc-500">{labels.empty}</p>;
  }

  const maxCount = terms[0]?.count ?? 1;

  return (
    <div className="space-y-3">
      <p className="text-sm text-zinc-600">{labels.description}</p>
      <p className="text-xs text-zinc-500">
        {labels.lineCount.replace("{count}", String(lineCount))} ·{" "}
        {labels.termCount.replace("{count}", String(terms.length))}
      </p>
      <div
        className="flex flex-wrap items-end justify-center gap-x-3 gap-y-2 rounded-lg border border-zinc-100 bg-zinc-50/80 px-4 py-6"
        role="img"
        aria-label={labels.title}
      >
        {terms.map((item, index) => {
          const ratio = item.count / maxCount;
          const fontSize = 0.8 + ratio * 1.4;
          return (
            <span
              key={item.term}
              className={`cursor-default leading-none transition-opacity hover:opacity-70 ${COLORS[index % COLORS.length]}`}
              style={{ fontSize: `${fontSize}rem` }}
              title={`${item.term}: ${item.count}`}
            >
              {item.term}
            </span>
          );
        })}
      </div>
    </div>
  );
}
