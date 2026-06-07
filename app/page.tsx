import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <section className="mx-auto max-w-5xl px-6 py-16">
        <h1 className="text-5xl font-bold">Zyneaty Wiki</h1>

        <p className="mt-4 max-w-2xl text-lg text-zinc-300">
          Die private Sammlung aller Insider, Running Gags, Legenden und
          komplett unnötigen Eskalationen.
        </p>

        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          <Link
            href="/wiki"
            className="rounded-xl border border-zinc-800 bg-zinc-900 p-6 hover:bg-zinc-800"
          >
            <h2 className="text-2xl font-semibold">📚 Insider Wiki</h2>
            <p className="mt-2 text-zinc-400">
              Begriffe, Memes und legendäre Momente.
            </p>
          </Link>

          <Link
            href="/quotes"
            className="rounded-xl border border-zinc-800 bg-zinc-900 p-6 hover:bg-zinc-800"
          >
            <h2 className="text-2xl font-semibold">🎤 Zitate</h2>
            <p className="mt-2 text-zinc-400">
              Die dümmsten und besten Sätze aus dem Server.
            </p>
          </Link>
        </div>
      </section>
    </main>
  );
}