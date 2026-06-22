/** Maps encore.moe English role names that do not slugify cleanly. */
export const ENCORE_NAME_TO_CHARACTER_ID: Record<string, string> = {
  "Luuk Herssen": "luuk-herssen",
  Rover: "rover",
  "Rover: Spectro": "rover-spectro",
  "Rover: Havoc": "rover-havoc",
  "Rover: Aero": "rover-aero",
  Lucilla: "lucilla",
  Lucy: "lucy",
  Rebecca: "rebecca",
};

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/['".:]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function encoreNameToCharacterId(name: string): string {
  return ENCORE_NAME_TO_CHARACTER_ID[name] ?? slugify(name);
}
