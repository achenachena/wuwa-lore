import { isRoverCharacter, type SiteLocale } from "@/lib/i18n/locale";

const ELEMENT_LABELS: Record<string, { en: string; zh: string }> = {
  Aero: { en: "Aero", zh: "气动" },
  Electro: { en: "Electro", zh: "导电" },
  Fusion: { en: "Fusion", zh: "热熔" },
  Glacio: { en: "Glacio", zh: "冷凝" },
  Havoc: { en: "Havoc", zh: "湮灭" },
  Spectro: { en: "Spectro", zh: "衍射" },
  Multiple: { en: "Multiple", zh: "多属性" },
};

const WEAPON_LABELS: Record<string, { en: string; zh: string }> = {
  Broadblade: { en: "Broadblade", zh: "长刃" },
  Gauntlets: { en: "Gauntlets", zh: "臂铠" },
  Pistols: { en: "Pistols", zh: "配枪" },
  Rectifier: { en: "Rectifier", zh: "音感仪" },
  Sword: { en: "Sword", zh: "迅刀" },
  Unknown: { en: "Unknown", zh: "未知" },
};

const FACTION_LABELS: Record<string, { en: string; zh: string }> = {
  "Black Shores": { en: "Black Shores", zh: "黑海岸" },
  Chongzhou: { en: "Chongzhou", zh: "乘霄" },
  "Fisalia Family": { en: "Fisalia Family", zh: "菲萨里家族" },
  Fractsidus: { en: "Fractsidus", zh: "残星会" },
  "Ghost Hounds": { en: "Ghost Hounds", zh: "幽灵猎犬" },
  Jinzhou: { en: "Jinzhou", zh: "今州" },
  "Miko of Flaming Sakura": { en: "Miko of Flaming Sakura", zh: "浮火樱巫女" },
  Mingting: { en: "Mingting", zh: "明庭" },
  Ragunna: { en: "Ragunna", zh: "拉古那" },
  "Roya Tribe": { en: "Roya Tribe", zh: "罗亚部落" },
  Septimont: { en: "Septimont", zh: "七丘" },
  "Spacetrek Collective": { en: "Spacetrek Collective", zh: "星旅会" },
  "Startorch Academy": { en: "Startorch Academy", zh: "星炬学院" },
  "Troupe of Fools": { en: "Troupe of Fools", zh: "愚者剧团" },
  Unknown: { en: "Unknown", zh: "未知" },
  Yuezhou: { en: "Yuezhou", zh: "月相" },
};

export function localizeGameLabel(
  value: string,
  kind: "element" | "weapon" | "faction",
  locale: SiteLocale,
): string {
  const table =
    kind === "element" ? ELEMENT_LABELS : kind === "weapon" ? WEAPON_LABELS : FACTION_LABELS;
  const entry = table[value];
  if (!entry) {
    return value;
  }
  return locale === "zh" ? entry.zh : entry.en;
}

export function formatLocaleDateTime(value: string | Date, locale: SiteLocale): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return date.toLocaleString(locale === "zh" ? "zh-CN" : "en-US");
}
