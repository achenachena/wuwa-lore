"use client";

import { useMemo, useState } from "react";

interface LineItem {
  key: string;
  text: string;
  firstSeenVersion: string | null;
}

interface VoiceLocaleBlock {
  locale: string;
  sourcePageExists: boolean;
  sourcePageTitle: string;
  lines: LineItem[];
}

interface VoiceLineExplorerProps {
  items: VoiceLocaleBlock[];
}

export function VoiceLineExplorer({ items }: VoiceLineExplorerProps) {
  const [search, setSearch] = useState("");
  const [locale, setLocale] = useState("all");

  const localeOptions = useMemo(
    () => ["all", ...new Set(items.map((item) => item.locale).sort((a, b) => a.localeCompare(b)))],
    [items],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items
      .filter((item) => locale === "all" || item.locale === locale)
      .map((item) => ({
        ...item,
        lines: item.lines.filter((line) => {
          if (!q) {
            return true;
          }
          return line.text.toLowerCase().includes(q) || line.key.toLowerCase().includes(q);
        }),
      }));
  }, [items, locale, search]);

  return (
    <section className="space-y-4">
      <div className="rounded border border-zinc-200 p-3">
        <div className="grid gap-3 md:grid-cols-[1fr_220px]">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-zinc-500">Search line text or key</span>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="rounded border border-zinc-300 px-3 py-2"
              placeholder="e.g. birthday, resskill_1"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-zinc-500">Locale</span>
            <select
              value={locale}
              onChange={(event) => setLocale(event.target.value)}
              className="rounded border border-zinc-300 bg-white px-3 py-2"
            >
              {localeOptions.map((option) => (
                <option key={option} value={option}>
                  {option === "all" ? "All" : option}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {filtered.map((block) => (
        <article key={block.locale} className="rounded border border-zinc-200 p-3">
          <p className="text-sm">
            <strong>{block.locale}</strong> · {block.lines.length} line(s)
          </p>
          {!block.sourcePageExists ? (
            <p className="mt-1 text-xs text-amber-700">Source page missing for this locale.</p>
          ) : null}
          <div className="mt-3 max-h-96 space-y-2 overflow-auto pr-1">
            {block.lines.map((line) => (
              <div key={`${block.locale}-${line.key}`} className="rounded bg-zinc-50 p-2 text-sm">
                <p className="font-mono text-xs text-zinc-500">
                  {line.key}
                  {line.firstSeenVersion ? ` · first seen ${line.firstSeenVersion}` : ""}
                </p>
                <p className="mt-1 whitespace-pre-wrap">{line.text}</p>
              </div>
            ))}
          </div>
        </article>
      ))}
    </section>
  );
}
