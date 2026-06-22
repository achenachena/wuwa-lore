/** Compare semver-like version tags (e.g. `1.0`, `3.4`). */
export function compareVersion(a: string, b: string): number {
  const pa = a.split(".").map((x) => Number(x));
  const pb = b.split(".").map((x) => Number(x));
  for (let i = 0; i < Math.max(pa.length, pb.length); i += 1) {
    const da = pa[i] ?? 0;
    const db = pb[i] ?? 0;
    if (da !== db) {
      return da - db;
    }
  }
  return 0;
}
