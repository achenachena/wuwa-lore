import Link from "next/link";
import { getMessages } from "@/lib/i18n/server";

export default async function NotFound() {
  const t = await getMessages();

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">{t.notFound.title}</h1>
      <p className="text-zinc-600">{t.notFound.description}</p>
      <Link href="/" className="text-sm underline">
        {t.notFound.backHome}
      </Link>
    </section>
  );
}
