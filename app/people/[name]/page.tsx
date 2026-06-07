import Link from "next/link";
import { wikiEntries } from "@/wikiData";

export default async function PersonPage({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  const { name } = await params;

  const displayName = decodeURIComponent(name);

  const relatedEntries = wikiEntries.filter((entry) =>
    entry.people.some((person) => person.toLowerCase() === displayName)
  );

  const prettyName =
    relatedEntries[0]?.people.find(
      (person) => person.toLowerCase() === displayName
    ) ?? displayName;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_right,#ffffff1f,transparent_28%),linear-gradient(135deg,#050505,#111113,#050505)] text-white">
      <section className="mx-auto max-w-5xl px-6 py-14">
        <Link href="/wiki" className="text-sm text-zinc-400 hover:text-white">
          ← Zurück zum Wiki
        </Link>

        <div className="mt-10 rounded-[2rem] border border-white/10 bg-white/[0.04] p-8 shadow-2xl shadow-black/30">
          <div className="text-5xl">☯</div>

          <h1 className="mt-6 text-5xl font-black tracking-tight">
            {prettyName}
          </h1>

          <p className="mt-4 text-lg text-zinc-300">
            Alle Wiki-Einträge, bei denen {prettyName} beteiligt ist.
          </p>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-2">
          {relatedEntries.map((entry) => (
            <Link
              key={entry.slug}
              href={`/wiki/${entry.slug}`}
              className="group rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-black/20 transition hover:-translate-y-1 hover:border-white/30 hover:bg-white/[0.08]"
            >
              <div className="text-sm text-zinc-500">{entry.category}</div>

              <h2 className="mt-3 text-2xl font-bold group-hover:text-zinc-200">
                {entry.title}
              </h2>

              <p className="mt-3 text-zinc-400">{entry.summary}</p>

              <div className="mt-6 text-sm font-semibold text-zinc-300">
                Weiterlesen →
              </div>
            </Link>
          ))}
        </div>

        {relatedEntries.length === 0 && (
          <p className="mt-10 text-zinc-400">
            Noch keine Einträge gefunden.
          </p>
        )}
      </section>
    </main>
  );
}