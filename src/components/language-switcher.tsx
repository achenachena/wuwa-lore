"use client";

import { usePathname, useSearchParams } from "next/navigation";

import { SITE_LOCALES, type SiteLocale } from "@/lib/i18n/locale";

type Props = {
  current: SiteLocale;
  labels: {
    en: string;
    zh: string;
  };
};

export function LanguageSwitcher({ current, labels }: Props) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return (
    <nav
      aria-label="Language"
      className="flex items-center gap-1 rounded-md border border-zinc-300 p-0.5 text-xs"
    >
      {SITE_LOCALES.map((locale) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set("lang", locale);
        return (
          <a
            key={locale}
            href={`${pathname}?${params}`}
            hrefLang={locale === "zh" ? "zh-CN" : "en"}
            lang={locale === "zh" ? "zh-CN" : "en"}
            aria-current={current === locale ? "true" : undefined}
            className={`rounded px-2 py-1 ${
              current === locale
                ? "bg-zinc-900 text-white"
                : "text-zinc-600 hover:bg-zinc-100"
            }`}
          >
            {labels[locale]}
          </a>
        );
      })}
    </nav>
  );
}
