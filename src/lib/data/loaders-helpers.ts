import { promises as fs } from "node:fs";
import path from "node:path";
import { cache } from "react";

const root = /* turbopackIgnore: true */ process.cwd();
const cacheForever = process.env.NODE_ENV === "production";
const processCache = new Map<string, Promise<unknown>>();

export async function readJsonFile<T>(filePath: string): Promise<T> {
  const text = await fs.readFile(filePath, "utf8");
  return JSON.parse(text) as T;
}

export function memoize<T>(key: string, loader: () => Promise<T>): Promise<T> {
  if (!cacheForever) {
    return loader();
  }
  const existing = processCache.get(key);
  if (existing) {
    return existing as Promise<T>;
  }
  const promise = loader().catch((error: unknown) => {
    processCache.delete(key);
    throw error;
  });
  processCache.set(key, promise);
  return promise;
}

/** React-request + production process memo for a data loader. */
export function defineLoader<T>(key: string, load: () => Promise<T>) {
  return cache((): Promise<T> => memoize(key, load));
}

/** Load + parse a JSON file under the project root. */
export function defineParsedJsonLoader<T>(
  key: string,
  relativePath: string,
  parse: (raw: unknown) => T,
) {
  return defineLoader(key, async () => {
    const raw = await readJsonFile<unknown>(path.join(root, relativePath));
    return parse(raw);
  });
}

export function dataPath(...parts: string[]): string {
  return path.join(root, ...parts);
}
