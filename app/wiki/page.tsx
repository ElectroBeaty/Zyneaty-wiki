import Link from "next/link";
import { wikiEntries } from "@/wikiData";

export default function WikiPage() {
  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <section className="mx-auto max-w-5xl px-6 py-16">
        <Link href="/" className="text-sm text-zinc-400 hover:text-white">
          ← Zurück zur Startseite
        </Link>

        <h1 className="mt-8 text-4xl font-bold">Wiki</h1>

        <p className="mt-3 max-w-2xl text-zinc-300">
          Alle Insider, Running Gags und Server-Legenden an einem Ort.
        </p>

        <div className="mt-10 grid gap-4">
          {wikiEntries.map((entry) => (
            <Link
              key={entry.slug}
              href={`/wiki/${entry.slug}`}
              className="rounded-xl border border-zinc-800 bg-zinc-900 p-6 hover:bg-zinc-800"
            >
              <div className="text-sm text-zinc-500">{entry.category}</div>
              <h2 className="mt-2 text-2xl font-semibold">{entry.title}</h2>
              <p className="mt-2 text-zinc-400">{entry.summary}</p>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}