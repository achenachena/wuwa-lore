import type { EncoreLocale } from "@/lib/i18n/locale";
import type { QuestCategory } from "@/types/lore";

export type { EncoreLocale };

export type EncoreRole = {
  Id: number;
  Name: string;
};

export type EncoreStoryIndexItem = {
  Id: number;
  Name?: string;
  Title?: string;
};

export type EncoreStoryType = {
  TypeId: number | string;
  TypeDescription?: string;
  Stories?: EncoreStoryIndexItem[];
};

export const ENCORE_OPTIONAL_QUEST_TYPE_IDS: Record<QuestCategory, Array<number | string>> = {
  companion: [2],
  event: [10, "reigns"],
  side: [4, "4"],
};

export type WikiEncoreMapFile = {
  mappings: Record<string, Partial<Record<EncoreLocale, string[]>>>;
};
