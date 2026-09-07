import { afterEach, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

it("shares production reads without mixing separate loaders", async () => {
  vi.stubEnv("NODE_ENV", "production");
  const { defineLoader } = await import("./loaders-helpers");
  const read = vi.fn().mockResolvedValue(["jingran"]);
  const load = defineLoader(read);
  const other = defineLoader(async () => ["yangyang"]);

  expect(await Promise.all([load(), load(), other()])).toEqual([
    ["jingran"],
    ["jingran"],
    ["yangyang"],
  ]);
  await load();
  expect(read).toHaveBeenCalledTimes(1);
});

it("retries a failed production read", async () => {
  vi.stubEnv("NODE_ENV", "production");
  const { defineLoader } = await import("./loaders-helpers");
  const read = vi
    .fn()
    .mockRejectedValueOnce(new Error("unavailable"))
    .mockResolvedValue(22);
  const load = defineLoader(read);

  await expect(load()).rejects.toThrow("unavailable");
  await expect(load()).resolves.toBe(22);
  expect(read).toHaveBeenCalledTimes(2);
});

it("rereads local data during development", async () => {
  vi.stubEnv("NODE_ENV", "development");
  const { defineLoader } = await import("./loaders-helpers");
  const read = vi.fn().mockResolvedValueOnce(22).mockResolvedValueOnce(23);
  const load = defineLoader(read);

  await expect(load()).resolves.toBe(22);
  await expect(load()).resolves.toBe(23);
});
