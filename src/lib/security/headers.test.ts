import { describe, expect, it } from "vitest";

import { isSameOriginRequest } from "@/lib/security/headers";

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

  it("rejects requests without origin", () => {
    const request = new Request("https://wuwalore.xyz/api/locale", {
      headers: {
        host: "wuwalore.xyz",
      },
    });
    expect(isSameOriginRequest(request)).toBe(false);
  });
});
