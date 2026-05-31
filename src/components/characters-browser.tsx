"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

export interface CharacterListItem {
  id: string;
  name: string;
  element: string;
  weapon: string;
  faction: string;
  rarity: number;
  releaseVersion: string;
  voiceLineTotal: number;
  hasVoiceStats: boolean;
}

interface CharactersBrowserProps {
  items: CharacterListItem[];
}

type SortKey = "name" | "voice" | "release";

export function CharactersBrowser({ items }: CharactersBrowserProps) {
  const [search, setSearch] = useState("");
  const [element, setElement] = useState("all");
  const [weapon, setWeapon] = useState("all");
  const [rarity, setRarity] = useState("all");
  const [releaseVersion, setReleaseVersion] = useState("all");
  const [sortBy, setSortBy] = useState<SortKey>("name");

  const elementOptions = useMemo(
    () => ["all", ...new Set(items.map((item) => item.element).sort((a, b) => a.localeCompare(b)))],
    [items],
  );
  const weaponOptions = useMemo(
    () => ["all", ...new Set(items.map((item) => item.weapon).sort((a, b) => a.localeCompare(b)))],
    [items],
  );
  const rarityOptions = useMemo(
    () => ["all", ...new Set(items.map((item) => String(item.rarity)).sort((a, b) => Number(a) - Number(b)))],
    [items],
  );
  const versionOptions = useMemo(
    () =>
      ["all", ...new Set(items.map((item) => item.releaseVersion).sort((a, b) => a.localeCompare(b, "en")))],
    [items],
  );

  const filteredItems = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    return items
      .filter((item) => {
        if (element !== "all" && item.element !== element) {
          return false;
        }
        if (weapon !== "all" && item.weapon !== weapon) {
          return false;
        }
        if (rarity !== "all" && String(item.rarity) !== rarity) {
          return false;
        }
        if (releaseVersion !== "all" && item.releaseVersion !== releaseVersion) {
          return false;
        }
        if (!normalized) {
          return true;
        }
        return item.name.toLowerCase().includes(normalized) || item.id.includes(normalized);
      })
      .sort((a, b) => {
        if (sortBy === "voice") {
          return b.voiceLineTotal - a.voiceLineTotal || a.name.localeCompare(b.name);
        }
        if (sortBy === "release") {
          return a.releaseVersion.localeCompare(b.releaseVersion, "en") || a.name.localeCompare(b.name);
        }
        return a.name.localeCompare(b.name);
      });
  }, [items, search, element, weapon, rarity, releaseVersion, sortBy]);

  return (
    <section className="space-y-4">
      <div className="rounded-lg border border-zinc-200 bg-white p-4">
        <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-6">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-zinc-500">Search</span>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="name or id"
              className="rounded-md border border-zinc-300 px-3 py-2"
            />
          </label>
          <FilterSelect label="Element" value={element} onChange={setElement} options={elementOptions} />
          <FilterSelect label="Weapon" value={weapon} onChange={setWeapon} options={weaponOptions} />
          <FilterSelect label="Rarity" value={rarity} onChange={setRarity} options={rarityOptions} />
          <FilterSelect
            label="Debut Version"
            value={releaseVersion}
            onChange={setReleaseVersion}
            options={versionOptions}
          />
          <FilterSelect
            label="Sort"
            value={sortBy}
            onChange={(value) => setSortBy(value as SortKey)}
            options={[
              { value: "name", label: "Name" },
              { value: "voice", label: "Voice Lines" },
              { value: "release", label: "Debut Version" },
            ]}
          />
        </div>
        <p className="mt-3 text-sm text-zinc-600">
          Showing <strong>{filteredItems.length}</strong> / {items.length} characters.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filteredItems.map((character) => (
          <article key={character.id} className="rounded-lg border border-zinc-200 bg-white p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="text-lg font-semibold">{character.name}</h2>
                <p className="text-sm text-zinc-500">{character.id}</p>
              </div>
              <span className="rounded bg-zinc-100 px-2 py-1 text-xs">{character.rarity}★</span>
            </div>

            <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
              <div>
                <dt className="text-zinc-500">Element</dt>
                <dd>{character.element}</dd>
              </div>
              <div>
                <dt className="text-zinc-500">Weapon</dt>
                <dd>{character.weapon}</dd>
              </div>
              <div>
                <dt className="text-zinc-500">Debut</dt>
                <dd>{character.releaseVersion}</dd>
              </div>
              <div>
                <dt className="text-zinc-500">Voice Lines</dt>
                <dd>{character.voiceLineTotal}</dd>
              </div>
            </dl>

            {!character.hasVoiceStats ? (
              <p className="mt-2 text-xs text-amber-700">Voice statistics missing for this character.</p>
            ) : null}

            <Link href={`/characters/${character.id}`} className="mt-4 inline-block text-sm font-medium">
              View details →
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}

interface FilterSelectProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<string> | Array<{ value: string; label: string }>;
}

function FilterSelect({ label, value, onChange, options }: FilterSelectProps) {
  const normalized = options.map((option) =>
    typeof option === "string"
      ? { value: option, label: option === "all" ? "All" : option }
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
