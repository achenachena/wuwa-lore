import { getVersionStatsPageData } from "@/lib/data";

export default async function VersionStatsPage() {
  const rows = await getVersionStatsPageData();

  if (rows.length === 0) {
    return <p className="text-zinc-600">No version stats available yet.</p>;
  }

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">Version Stats</h1>
      <p className="text-zinc-600">Total debut characters and accumulated voice lines per version.</p>
      <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-zinc-200 text-left text-zinc-500">
              <th className="px-4 py-3">Version</th>
              <th className="px-4 py-3">Release Date</th>
              <th className="px-4 py-3">Debut Characters</th>
              <th className="px-4 py-3">Voice Lines</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.version} className="border-b border-zinc-100">
                <td className="px-4 py-3 font-medium">{row.version}</td>
                <td className="px-4 py-3">{row.releaseDate}</td>
                <td className="px-4 py-3">{row.characterCount}</td>
                <td className="px-4 py-3">{row.totalVoiceLines}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
