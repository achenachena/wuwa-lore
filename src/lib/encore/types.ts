import type { EncoreLocale } from "@/lib/i18n/locale";

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

export type WikiEncoreMapFile = {
  mappings: Record<string, Partial<Record<EncoreLocale, string[]>>>;
};
