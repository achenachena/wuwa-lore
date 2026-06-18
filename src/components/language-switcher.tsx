"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import type { SiteLocale } from "@/lib/i18n/locale";

type Props = {
  current: SiteLocale;
  labels: {
    en: string;
    zh: string;
  };
};

export function LanguageSwitcher({ current, labels }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function setLocale(locale: SiteLocale) {
    if (locale === current || pending) {
      return;
    }
    startTransition(async () => {
      await fetch("/api/locale", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale }),
      });
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-1 rounded-md border border-zinc-300 p-0.5 text-xs">
      {(["en", "zh"] as const).map((locale) => (
        <button
          key={locale}
          type="button"
          disabled={pending}
          onClick={() => setLocale(locale)}
          className={`rounded px-2 py-1 ${
            current === locale ? "bg-zinc-900 text-white" : "text-zinc-600 hover:bg-zinc-100"
          }`}
        >
          {labels[locale]}
        </button>
      ))}
    </div>
  );
}
