import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "./proxy";

describe("explicit language URLs", () => {
  it("overrides conflicting language preferences and remembers the choice", () => {
    const response = proxy(
      new NextRequest("https://wuwalore.xyz/?lang=en", {
        headers: {
          cookie: "wuwa-lore-locale=zh",
          "accept-language": "zh-CN",
          "x-site-locale": "zh",
        },
      }),
    );
    expect(response.headers.get("x-middleware-request-x-site-locale")).toBe(
      "en",
    );
    expect(response.cookies.get("wuwa-lore-locale")?.value).toBe("en");
  });
  it("ignores invalid locales and client-supplied override headers", () => {
    const response = proxy(
      new NextRequest("https://wuwalore.xyz/?lang=fr", {
        headers: { "x-site-locale": "en" },
      }),
    );
    expect(
      response.headers.get("x-middleware-request-x-site-locale"),
    ).toBeNull();
    expect(response.cookies.get("wuwa-lore-locale")).toBeUndefined();
  });
});
