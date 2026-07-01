import { describe, expect, it } from "vitest";

import { isProbePath, isSameOriginRequest } from "@/lib/security/headers";

describe("isProbePath", () => {
  it("blocks common scanner paths", () => {
    expect(isProbePath("/.env")).toBe(true);
    expect(isProbePath("/wp-admin/login")).toBe(true);
    expect(isProbePath("/characters/yangyang")).toBe(false);
  });
});

describe("isSameOriginRequest", () => {
  it("accepts matching origin and host", () => {
    const request = new Request("https://wuwalore.xyz/api/locale", {
      headers: {
        origin: "https://wuwalore.xyz",
        host: "wuwalore.xyz",
      },
    });
    expect(isSameOriginRequest(request)).toBe(true);
  });

  it("rejects cross-origin posts", () => {
    const request = new Request("https://wuwalore.xyz/api/locale", {
      headers: {
        origin: "https://evil.example",
        host: "wuwalore.xyz",
      },
    });
    expect(isSameOriginRequest(request)).toBe(false);
  });
});
