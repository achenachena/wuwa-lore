import { promises as fs } from "node:fs";
import path from "node:path";
import { cache } from "react";

const cacheForever = process.env.NODE_ENV === "production";

export async function readJsonFile<T>(filePath: string): Promise<T> {
  const text = await fs.readFile(filePath, "utf8");
  return JSON.parse(text) as T;
}

/** Data is bundled per deployment; failed reads can be retried. */
export function defineLoader<T>(load: () => Promise<T>) {
  let pending: Promise<T> | undefined;
  return cache(() => {
    if (!cacheForever) return load();
    pending ??= load().catch((error: unknown) => {
      pending = undefined;
      throw error;
    });
    return pending;
  });
}

/** Load + parse a JSON file under the project root. */
export function defineParsedJsonLoader<T>(
  relativePath: string,
  parse: (raw: unknown) => T,
) {
  return defineLoader(async () => {
    const raw = await readJsonFile<unknown>(dataPath(relativePath));
    return parse(raw);
  });
}

export function dataPath(...parts: string[]): string {
  return path.join(/* turbopackIgnore: true */ process.cwd(), ...parts);
}
