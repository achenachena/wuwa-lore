import type { Metadata } from "next";

import type { SiteLocale } from "@/lib/i18n/locale";
import { getSiteUrl } from "@/lib/site-url";

export function absoluteUrl(path = "/"): string {
  const base = getSiteUrl();
  if (path === "/" || path === "") {
    return base;
  }
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

export function htmlLang(locale: SiteLocale): string {
  return locale === "zh" ? "zh-CN" : "en";
}

export function pageMetadata(params: {
  title: string;
  description: string;
  path: string;
  locale: SiteLocale;
  keywords?: string[];
  images?: string[];
}): Metadata {
  const url = absoluteUrl(params.path);
  const ogLocale = params.locale === "zh" ? "zh_CN" : "en_US";
  const images = (params.images ?? []).filter(Boolean).map((image) =>
    image.startsWith("http") ? image : absoluteUrl(image),
  );

  return {
    title: params.title,
    description: params.description,
    keywords: params.keywords,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title: params.title,
      description: params.description,
      url,
      type: "website",
      locale: ogLocale,
      ...(images.length > 0 ? { images } : {}),
    },
    twitter: {
      card: images.length > 0 ? "summary_large_image" : "summary",
      title: params.title,
      description: params.description,
      ...(images.length > 0 ? { images } : {}),
    },
  };
}

export function jsonLdScript(data: Record<string, unknown> | Array<Record<string, unknown>>) {
  return {
    __html: JSON.stringify(data).replace(/</g, "\\u003c"),
  };
}

export function websiteJsonLd(params: {
  name: string;
  description: string;
  locale: SiteLocale;
}) {
  const url = absoluteUrl("/");
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: params.name,
    alternateName: ["鸣潮台词库", "WuWa Dialogue Stats", "Wuthering Waves Dialogue Stats"],
    url,
    description: params.description,
    inLanguage: htmlLang(params.locale),
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${absoluteUrl("/characters")}?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

export function breadcrumbJsonLd(
  items: Array<{ name: string; path: string }>,
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

export function characterJsonLd(params: {
  name: string;
  description: string;
  path: string;
  image?: string | null;
  gameName: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name: params.name,
    description: params.description,
    url: absoluteUrl(params.path),
    ...(params.image
      ? {
          image: params.image.startsWith("http")
            ? params.image
            : absoluteUrl(params.image),
        }
      : {}),
    memberOf: {
      "@type": "Organization",
      name: params.gameName,
    },
  };
}
