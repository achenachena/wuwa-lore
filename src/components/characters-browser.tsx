"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { CharacterAvatar } from "@/components/character-avatar";
import type { Messages } from "@/lib/i18n/messages";

export interface CharacterListItem {
  id: string;
  name: string;
  appearanceVersion: string;
  voiceLineTotal: number;
  hasVoiceStats: boolean;
  avatarUrl?: string | null;
}

interface CharactersBrowserProps {
  items: CharacterListItem[];
  labels: Messages["characters"];
  common: Messages["common"];
  showCharacterId?: boolean;
  initialSearch?: string;
}

type SortKey = "name" | "voice" | "appearance";

export function CharactersBrowser({
  items,
  labels,
  common,
  showCharacterId = true,
  initialSearch = "",
}: CharactersBrowserProps) {
  const [search, setSearch] = useState(initialSearch);
  const [appearanceVersion, setAppearanceVersion] = useState("all");
  const [sortBy, setSortBy] = useState<SortKey>("name");

  const versionOptions = useMemo(
    () => [
      "all",
      ...new Set(
        items
          .map((item) => item.appearanceVersion)
          .filter((version) => version !== common.dash)
          .sort((a, b) => a.localeCompare(b, "en")),
      ),
    ],
    [common.dash, items],
  );

  const filteredItems = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    return items
      .filter((item) => {
        if (
          appearanceVersion !== "all" &&
          item.appearanceVersion !== appearanceVersion
        ) {
          return false;
        }
        if (!normalized) {
          return true;
        }
        return (
          item.name.toLowerCase().includes(normalized) ||
          item.id.includes(normalized)
        );
      })
      .sort((a, b) => {
        if (sortBy === "voice") {
          return (
            b.voiceLineTotal - a.voiceLineTotal || a.name.localeCompare(b.name)
          );
        }
        if (sortBy === "appearance") {
          return (
            a.appearanceVersion.localeCompare(b.appearanceVersion, "en", {
              numeric: true,
            }) || a.name.localeCompare(b.name)
          );
        }
        return a.name.localeCompare(b.name);
      });
  }, [appearanceVersion, items, search, sortBy]);

  return (
    <section className="space-y-4">
      <div className="rounded-lg border border-zinc-200 bg-white p-4">
        <div className="grid gap-3 md:grid-cols-[2fr_1fr_1fr]">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-zinc-500">{labels.search}</span>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={labels.searchPlaceholder}
              className="rounded-md border border-zinc-300 px-3 py-2"
            />
          </label>
          <FilterSelect
            label={labels.appearanceVersion}
            allLabel={common.all}
            value={appearanceVersion}
            onChange={setAppearanceVersion}
            options={versionOptions}
          />
          <FilterSelect
            label={labels.sort}
            allLabel={common.all}
            value={sortBy}
            onChange={(value) => setSortBy(value as SortKey)}
            options={[
              { value: "name", label: labels.sortName },
              { value: "voice", label: labels.sortVoice },
              { value: "appearance", label: labels.sortAppearance },
            ]}
          />
        </div>
        <p className="mt-3 text-sm text-zinc-600">
          {labels.showing} <strong>{filteredItems.length}</strong> {labels.of}{" "}
          {items.length} {labels.characters}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filteredItems.map((character) => (
          <article
            key={character.id}
            className="rounded-lg border border-zinc-200 bg-white p-4"
          >
            <div className="flex items-start gap-3">
              <CharacterAvatar
                name={character.name}
                src={character.avatarUrl}
                size={56}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h2 className="truncate text-lg font-semibold">
                      {character.name}
                    </h2>
                    {showCharacterId ? (
                      <p className="truncate text-sm text-zinc-500">
                        {character.id}
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>

            <dl className="mt-4 grid grid-cols-2 gap-2 text-sm">
              <div>
                <dt className="text-zinc-500">{labels.appearance}</dt>
                <dd>{character.appearanceVersion}</dd>
              </div>
              <div>
                <dt className="text-zinc-500">{labels.voiceLines}</dt>
                <dd className="font-medium">{character.voiceLineTotal}</dd>
              </div>
            </dl>

            {!character.hasVoiceStats ? (
              <p className="mt-2 text-xs text-amber-700">
                {labels.noVoiceStats}
              </p>
            ) : null}

            <Link
              href={`/characters/${character.id}`}
              className="mt-4 inline-block text-sm font-medium"
            >
              {common.viewDetails}
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}

interface FilterSelectProps {
  label: string;
  allLabel: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<string> | Array<{ value: string; label: string }>;
}

function FilterSelect({
  label,
  allLabel,
  value,
  onChange,
  options,
}: FilterSelectProps) {
  const normalized = options.map((option) =>
    typeof option === "string"
      ? { value: option, label: option === "all" ? allLabel : option }
      : option,
  );
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-zinc-500">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-md border border-zinc-300 bg-white px-2 py-2"
      >
        {normalized.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
