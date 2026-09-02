import { afterEach, describe, expect, test, vi } from "vitest";

import { fetchFandomJson, fetchFandomWikitext } from "@/lib/fandom/client";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Fandom client", () => {
  test("caches wikitext requests and sends the shared request headers", async () => {
    const fetchMock = vi.fn<typeof fetch>(
      async () =>
        new Response(
          JSON.stringify({ parse: { wikitext: { "*": "cached text" } } }),
          { status: 200 },
        ),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchFandomWikitext("Client cache test")).resolves.toBe(
      "cached text",
    );
    await expect(fetchFandomWikitext("Client cache test")).resolves.toBe(
      "cached text",
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
      headers: { "User-Agent": "wuwa-lore/1.0", Accept: "application/json" },
    });
  });

  test("does not retry permanent client errors", async () => {
    const fetchMock = vi.fn<typeof fetch>(
      async () => new Response(null, { status: 404 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchFandomJson({ action: "query" })).rejects.toThrow(
      "Fandom API failed: 404",
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
