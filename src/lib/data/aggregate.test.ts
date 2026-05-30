import { describe, expect, test } from "vitest";
import { aggregateVoiceLineStats } from "@/lib/data/aggregate";
import type { Character, VersionRecord, VoiceLineEntry } from "@/types/lore";

const characters: Character[] = [
  {
    id: "yangyang",
    name: "Yangyang",
    aliases: [],
    element: "Aero",
    weapon: "Sword",
    faction: "Jinzhou",
    rarity: 4,
    releaseVersion: "1.0",
    profile: "profile",
    locale: "en-US",
    source: {
      sourceUrl: "https://example.com",
      scrapedAt: "2026-05-30T00:00:00.000Z",
      editor: "test",
    },
  },
];

const versions: VersionRecord[] = [
  { version: "1.0", releaseDate: "2024-05-23", notes: "" },
  { version: "1.1", releaseDate: "2024-06-28", notes: "" },
];

const entries: VoiceLineEntry[] = [
  {
    id: "1",
    characterId: "yangyang",
    version: "1.0",
    locale: "en-US",
    line: "line a",
    source: { sourceUrl: "https://a.com", scrapedAt: "2026-05-30T00:00:00.000Z", editor: "test" },
  },
  {
    id: "2",
    characterId: "yangyang",
    version: "1.0",
    locale: "en-US",
    line: "line b",
    source: { sourceUrl: "https://a.com", scrapedAt: "2026-05-30T00:00:00.000Z", editor: "test" },
  },
];

describe("aggregateVoiceLineStats", () => {
  test("fills missing versions with zero and sums totals", () => {
    const rows = aggregateVoiceLineStats({
      characters,
      versions,
      entries,
      generatedAt: "2026-05-30T00:00:00.000Z",
    });

    expect(rows).toHaveLength(1);
    expect(rows[0]?.totalLineCount).toBe(2);
    expect(rows[0]?.perVersionLineCounts).toEqual([
      { version: "1.0", lineCount: 2 },
      { version: "1.1", lineCount: 0 },
    ]);
  });
});
