import { wikiEntries } from "@/wikiData";
import Link from "next/link";

export default async function WikiEntryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const entry = wikiEntries.find((e) => e.slug === slug);

  if (!entry) {
    return (
      <main className="min-h-screen bg-zinc-950 p-10 text-white">
        <h1 className="text-4xl font-bold">Nicht gefunden 😢</h1>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <article className="mx-auto max-w-4xl px-6 py-16">
        <Link href="/wiki" className="text-sm text-zinc-400 hover:text-white">
          ← Zurück zum Wiki
        </Link>

        <h1 className="mt-8 text-5xl font-bold">{entry.title}</h1>

        <p className="mt-3 text-zinc-400">{entry.summary}</p>

        <div className="mt-8">
          <span className="rounded bg-zinc-800 px-3 py-1 text-sm">
            {entry.category}
          </span>
        </div>

        <section className="mt-10">
          <h2 className="text-2xl font-semibold">Was ist passiert?</h2>
          <p className="mt-3 text-zinc-300">{entry.story}</p>
        </section>

        <section className="mt-10">
          <h2 className="text-2xl font-semibold">
            Warum ist es lustig?
          </h2>
          <p className="mt-3 text-zinc-300">{entry.whyFunny}</p>
        </section>

        <section className="mt-10">
          <h2 className="text-2xl font-semibold">
            Typische Verwendung
          </h2>
          <p className="mt-3 text-zinc-300">{entry.usage}</p>
        </section>

        {entry.people.length > 0 && (
          <section className="mt-10">
            <h2 className="text-2xl font-semibold">Beteiligte</h2>

            <div className="mt-4 flex flex-wrap gap-2">
              {entry.people.map((person) => (
                <span
                  key={person}
                  className="rounded bg-zinc-800 px-3 py-1"
                >
                  {person}
                </span>
              ))}
            </div>
          </section>
        )}

        {entry.quote && (
          <section className="mt-10">
            <h2 className="text-2xl font-semibold">Legendäres Zitat</h2>

            <blockquote className="mt-4 border-l-4 border-zinc-700 pl-4 text-zinc-300 italic">
              "{entry.quote}"
            </blockquote>
          </section>
        )}
      </article>
    </main>
  );
}