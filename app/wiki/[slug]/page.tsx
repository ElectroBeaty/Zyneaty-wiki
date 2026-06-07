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
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#ffffff1f,transparent_30%),linear-gradient(135deg,#050505,#111113,#050505)] text-white">
      <article className="mx-auto max-w-4xl px-6 py-14">
        <Link href="/wiki" className="text-sm text-zinc-400 hover:text-white">
          ← Zurück zum Wiki
        </Link>

        <div className="mt-10 rounded-[2rem] border border-white/10 bg-white/[0.04] p-8 shadow-2xl shadow-black/30">
          <div className="text-5xl">☯</div>

          <div className="mt-6">
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-zinc-300">
              {entry.category}
            </span>
          </div>

          <h1 className="mt-6 text-5xl font-black tracking-tight">
            {entry.title}
          </h1>

          <p className="mt-4 text-lg text-zinc-300">{entry.summary}</p>
        </div>

        <section className="mt-10 rounded-3xl border border-white/10 bg-white/[0.03] p-6">
          <h2 className="text-2xl font-bold">Was ist passiert?</h2>
          <p className="mt-3 leading-7 text-zinc-300">{entry.story}</p>
        </section>

        <section className="mt-5 rounded-3xl border border-white/10 bg-white/[0.03] p-6">
          <h2 className="text-2xl font-bold">Warum ist es lustig?</h2>
          <p className="mt-3 leading-7 text-zinc-300">{entry.whyFunny}</p>
        </section>

        <section className="mt-5 rounded-3xl border border-white/10 bg-white/[0.03] p-6">
          <h2 className="text-2xl font-bold">Typische Verwendung</h2>
          <p className="mt-3 leading-7 text-zinc-300">{entry.usage}</p>
        </section>

        {entry.people.length > 0 && (
          <section className="mt-5 rounded-3xl border border-white/10 bg-white/[0.03] p-6">
            <h2 className="text-2xl font-bold">Beteiligte</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {entry.people.map((person) => (
  <Link
    key={person}
    href={`/people/${person.toLowerCase()}`}
    className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-black transition hover:scale-105 hover:bg-zinc-200"
  >
    {person}
  </Link>
))}
            </div>
          </section>
        )}

        {entry.quote && (
          <section className="mt-5 rounded-3xl border border-white/10 bg-white/[0.03] p-6">
            <h2 className="text-2xl font-bold">Legendäres Zitat</h2>
            <blockquote className="mt-4 border-l-4 border-white/40 pl-4 text-lg italic text-zinc-300">
              “{entry.quote}”
            </blockquote>
          </section>
        )}
      </article>
    </main>
  );
}