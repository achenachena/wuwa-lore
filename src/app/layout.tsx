import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { LanguageSwitcher } from "@/components/language-switcher";
import { SiteNav } from "@/components/site-nav";
import { getMessages, getSiteLocale } from "@/lib/i18n/server";
import { getSiteUrl } from "@/lib/site-url";
import "./globals.css";

const siteUrl = getSiteUrl();

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const [t, locale] = await Promise.all([getMessages(), getSiteLocale()]);
  return {
    title: {
      default: t.siteTitle,
      template: `%s | ${t.siteTitle}`,
    },
    description: t.siteTagline,
    keywords: t.siteKeywords,
    metadataBase: new URL(siteUrl),
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true },
    },
    openGraph: {
      title: t.siteTitle,
      description: t.siteTagline,
      type: "website",
      url: siteUrl,
      locale: locale === "zh" ? "zh_CN" : "en_US",
      siteName: t.siteTitle,
    },
    twitter: {
      card: "summary_large_image",
      title: t.siteTitle,
      description: t.siteTagline,
    },
    alternates: {
      canonical: siteUrl,
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [locale, t] = await Promise.all([getSiteLocale(), getMessages()]);

  return (
    <html
      lang={locale}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-zinc-50 text-zinc-900">
        <header className="border-b border-zinc-200 bg-white">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-4">
            <div>
              <p className="text-lg font-semibold">{t.siteTitle}</p>
              <p className="text-xs text-zinc-500">{t.siteTagline}</p>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <LanguageSwitcher current={locale} labels={t.language} />
              <SiteNav labels={t.nav} />
            </div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">{children}</main>
      </body>
    </html>
  );
}
