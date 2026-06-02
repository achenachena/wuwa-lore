import Link from "next/link";

export default function NotFound() {
  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <p className="text-zinc-600">The page you requested does not exist in this dataset site.</p>
      <div className="flex flex-wrap gap-3">
        <Link className="rounded-md bg-zinc-900 px-4 py-2 text-white" href="/">
          Home
        </Link>
        <Link className="rounded-md border border-zinc-300 bg-white px-4 py-2" href="/characters">
          Characters
        </Link>
      </div>
    </section>
  );
}
