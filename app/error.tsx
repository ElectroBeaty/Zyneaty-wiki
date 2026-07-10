"use client";

import Link from "next/link";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,#ffffff1f,transparent_30%),linear-gradient(135deg,#050505,#111113,#050505)] px-6 text-white">
      <section className="w-full max-w-xl rounded-[2rem] border border-white/10 bg-white/[0.04] p-8 shadow-2xl shadow-black/30">
        <p className="text-sm uppercase tracking-[0.35em] text-zinc-500">
          Zyneaty Wiki
        </p>

        <h1 className="mt-5 text-4xl font-black tracking-tight">
          Die Seite konnte nicht geladen werden.
        </h1>

        <p className="mt-4 leading-7 text-zinc-300">
          Das Wiki ist gerade nicht erreichbar. Meist liegt das an Supabase,
          Vercel oder einer fehlenden Environment Variable.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={reset}
            className="rounded-full bg-white px-5 py-3 font-semibold text-black transition hover:bg-zinc-200"
          >
            Nochmal versuchen
          </button>

          <Link
            href="/"
            className="rounded-full border border-white/20 px-5 py-3 font-semibold text-white transition hover:border-white hover:bg-white/10"
          >
            Zur Startseite
          </Link>
        </div>
      </section>
    </main>
  );
}
