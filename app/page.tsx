import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,#ffffff22,transparent_30%),linear-gradient(135deg,#050505,#18181b,#050505)] text-white">
      <section className="mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-6 py-16">
        <div className="mb-8 text-7xl">☯</div>

        <p className="mb-3 text-sm uppercase tracking-[0.4em] text-zinc-400">
          Private Server Lore
        </p>

        <h1 className="max-w-3xl text-6xl font-black tracking-tight md:text-8xl">
          Zyneaty Wiki
        </h1>

        <p className="mt-6 max-w-2xl text-xl leading-8 text-zinc-300">
          Die gesammelte Chronik aller Insider, Legenden, Quotes und komplett
          unnötigen Ereignisse.
        </p>

        <div className="mt-10 flex flex-wrap gap-4">
          <Link
            href="/wiki"
            className="rounded-full bg-white px-6 py-3 font-semibold text-black transition hover:scale-105 hover:bg-zinc-200"
          >
            Wiki öffnen
          </Link>

          <Link
            href="/wiki/marek-incident"
            className="rounded-full border border-white/20 px-6 py-3 font-semibold text-white transition hover:border-white hover:bg-white/10"
          >
            Erster Insider
          </Link>
        </div>
      </section>
    </main>
  );
}