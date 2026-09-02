export const FANDOM_API = "https://wutheringwaves.fandom.com/api.php";

const USER_AGENT = "wuwa-lore/1.0";
const MAX_ATTEMPTS = 4;
const wikitextCache = new Map<string, Promise<string>>();

class FandomHttpError extends Error {
  constructor(
    message: string,
    readonly retryable: boolean,
  ) {
    super(message);
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchFandomJson<T>(
  params: Record<string, string>,
): Promise<T> {
  const query = new URLSearchParams({ format: "json", ...params });
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      const response = await fetch(`${FANDOM_API}?${query}`, {
        headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
      });
      if (response.ok) {
        return (await response.json()) as T;
      }
      throw new FandomHttpError(
        `Fandom API failed: ${response.status} ${response.statusText}`,
        response.status >= 500 || response.status === 429,
      );
    } catch (error) {
      if (error instanceof FandomHttpError && !error.retryable) {
        throw error;
      }
      lastError = error;
    }

    if (attempt < MAX_ATTEMPTS) {
      await delay(attempt * 500);
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Fandom API request failed");
}

export async function fetchFandomWikitext(
  page: string,
  options: { required?: boolean } = {},
): Promise<string> {
  let request = wikitextCache.get(page);
  if (!request) {
    request = fetchFandomJson<{
      parse?: { wikitext?: { "*": string } };
    }>({ action: "parse", page, prop: "wikitext" }).then(
      (data) => data.parse?.wikitext?.["*"] ?? "",
    );
    wikitextCache.set(page, request);
    request.catch(() => wikitextCache.delete(page));
  }

  const wikitext = await request;
  if (options.required && !wikitext) {
    throw new Error(`Missing wikitext for ${page}`);
  }
  return wikitext;
}

export function fandomPageUrl(page: string): string {
  return `https://wutheringwaves.fandom.com/wiki/${encodeURIComponent(page).replace(/%20/g, "_")}`;
}
