import { promises as fs } from "node:fs";
import path from "node:path";
import { z } from "zod";

import type {
  Character,
  CharacterImage,
  StoryAppearanceRow,
  VersionHalfRecord,
  VersionHalfVoiceRow,
  VersionRecord,
  VoiceLineDetailRow,
  VoiceLineEntry,
  VoiceLineStatRow,
} from "@/types/lore";
import {
  characterSchema,
  characterImageSchema,
  generatedStatsSchema,
  rawVoiceSnapshotSchema,
  storyAppearanceRowSchema,
  versionHalfRecordSchema,
  versionHalfVoiceRowSchema,
  versionSchema,
  voiceLineDetailRowSchema,
} from "@/lib/data/schemas";

const root = process.cwd();

async function readJsonFile<T>(filePath: string): Promise<T> {
  const text = await fs.readFile(filePath, "utf8");
  return JSON.parse(text) as T;
}

export async function loadCharacters(): Promise<Character[]> {
  const dir = path.join(root, "content", "characters");
  const files = (await fs.readdir(dir)).filter((name) => name.endsWith(".json"));
  const characters = await Promise.all(
    files.map(async (file) => {
      const data = await readJsonFile<unknown>(path.join(dir, file));
      return characterSchema.parse(data);
    }),
  );
  return characters.sort((a, b) => a.id.localeCompare(b.id));
}

export async function loadVersions(): Promise<VersionRecord[]> {
  const filePath = path.join(root, "content", "versions", "versions.json");
  const raw = await readJsonFile<unknown>(filePath);
  const parsed = versionSchema.array().parse(raw);
  return parsed.sort((a, b) => a.version.localeCompare(b.version, "en"));
}

export async function loadCharacterImages(): Promise<CharacterImage[]> {
  const filePath = path.join(root, "content", "images", "images.json");
  const raw = await readJsonFile<unknown>(filePath);
  const parsed = characterImageSchema.array().parse(raw);
  return parsed.sort((a, b) => a.id.localeCompare(b.id));
}

export async function loadRawVoiceEntries(): Promise<VoiceLineEntry[]> {
  const dir = path.join(root, "data", "raw");
  const files = (await fs.readdir(dir)).filter((name) => name.endsWith(".json"));
  const snapshots = await Promise.all(
    files.map(async (file) => {
      const raw = await readJsonFile<unknown>(path.join(dir, file));
      return rawVoiceSnapshotSchema.parse(raw);
    }),
  );

  return snapshots.flatMap((snapshot) => snapshot.entries);
}

export async function loadGeneratedStats(): Promise<VoiceLineStatRow[]> {
  const filePath = path.join(root, "data", "derived", "voice-line-stats.json");
  const raw = await readJsonFile<unknown>(filePath);
  const parsed = generatedStatsSchema.parse(raw);
  return parsed.rows;
}

export async function loadVoiceLineDetails(): Promise<VoiceLineDetailRow[]> {
  const filePath = path.join(root, "data", "derived", "voice-line-details.json");
  const raw = await readJsonFile<unknown>(filePath);
  const parsed = z.object({ rows: z.array(voiceLineDetailRowSchema) }).parse(raw);
  return parsed.rows;
}

export async function loadValidationReport() {
  const filePath = path.join(root, "data", "derived", "validation-report.json");
  return readJsonFile<{
    generatedAt: string;
    ok: boolean;
    checks: {
      identityValidation: {
        ok: boolean;
        errors: string[];
      };
      statValidation: {
        ok: boolean;
        errors: string[];
      };
      officialValidation?: {
        ok: boolean;
        errors: string[];
      };
    };
  }>(filePath);
}

export async function loadQualityReport() {
  const filePath = path.join(root, "data", "derived", "quality-report.json");
  return readJsonFile<{
    generatedAt: string;
    totalCharacters: number;
    expectedRows: number;
    actualRows: number;
    coveredCharacters: number;
    rowsWithContent: number;
    rowsWithoutContent: number;
    verifiedRows: number;
    missingSourceRows: number;
  }>(filePath);
}

export async function loadChangeReport() {
  const filePath = path.join(root, "data", "derived", "change-report.json");
  return readJsonFile<{
    generatedAt: string;
    rowCoverage: {
      oldRowCount: number;
      newRowCount: number;
      addedRows: number;
      removedRows: number;
      changedRows: number;
    };
    currentLineCountDelta: {
      increasedRows: number;
      decreasedRows: number;
      unchangedRows: number;
    };
    samples: {
      added: Array<{ key: string; currentLineCount: number }>;
      removed: Array<{ key: string; previousLineCount: number }>;
      changed: Array<{ key: string; previousLineCount: number; currentLineCount: number; delta: number }>;
    };
  }>(filePath);
}

export async function loadOfficialVersionNotes() {
  const filePath = path.join(root, "content", "official", "version-notes.json");
  return readJsonFile<{
    sourceName: string;
    sourceUrl: string;
    scrapedAt: string;
    editor: string;
    rows: Array<{
      version: string;
      releaseDate: string;
      noticeUrl: string;
      title: string;
      articleId: number | null;
      matchMethod: string;
    }>;
  }>(filePath);
}

export async function loadVersionHalves(): Promise<VersionHalfRecord[]> {
  const filePath = path.join(root, "content", "versions", "version-halves.json");
  const raw = await readJsonFile<unknown>(filePath);
  const parsed = z.object({ halves: z.array(versionHalfRecordSchema) }).parse(raw);
  return parsed.halves;
}

export async function loadStoryAppearances(): Promise<StoryAppearanceRow[]> {
  const filePath = path.join(root, "data", "derived", "story-appearances.json");
  const raw = await readJsonFile<unknown>(filePath);
  const parsed = z.object({ rows: z.array(storyAppearanceRowSchema) }).parse(raw);
  return parsed.rows;
}

export async function loadVersionHalfVoiceStats(): Promise<VersionHalfVoiceRow[]> {
  const filePath = path.join(root, "data", "derived", "version-half-voice-stats.json");
  const raw = await readJsonFile<unknown>(filePath);
  const parsed = z.object({ rows: z.array(versionHalfVoiceRowSchema) }).parse(raw);
  return parsed.rows;
}

export async function loadSourceDiffReport() {
  const filePath = path.join(root, "data", "derived", "source-diff-report.json");
  return readJsonFile<{
    generatedAt: string;
    toleranceMinutes?: number;
    sources: {
      fandomVersionsFile: string;
      officialVersionsFile: string;
      officialSourceUrl: string;
      officialSourceName?: string;
    };
    summary: {
      fandomVersionCount: number;
      officialVersionCount: number;
      missingInOfficial: number;
      missingInFandom: number;
      alignedDate?: number;
      mismatchedDate: number;
      ok: boolean;
    };
    missingInOfficial: string[];
    missingInFandom: string[];
    alignedDate?: string[];
    mismatchedDate: Array<{
      version: string;
      fandomReleaseDate: string;
      officialReleaseDate: string;
      deltaMinutes: number;
      noticeUrl: string;
      officialMatchMethod?: string | null;
    }>;
  }>(filePath);
}
