import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { createSummary, mapSubmissionToWikiEntry } from "@/lib/wiki";
import WikiClient from "./WikiClient";

async function getApprovedSubmissions() {
  const { data, error } = await supabase
    .from("submissions")
    .select("*")
    .eq("approved", true)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((submission) => {
    const entry = mapSubmissionToWikiEntry(submission);

    return {
      ...entry,
      summary: createSummary(entry.story, 100),
    };
  });
}

export default async function WikiPage() {
  const entries = await getApprovedSubmissions();

  const uniquePeople = new Set(entries.flatMap((entry) => entry.people));
  const quoteCount = entries.filter(
    (entry) => entry.category === "Zitat"
  ).length;
  const mediaCount = entries.filter((entry) => entry.mediaUrl).length;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_right,#ffffff1f,transparent_28%),linear-gradient(135deg,#050505,#111113,#050505)] text-white">
      <section className="mx-auto max-w-6xl px-6 pt-6 pb-14">
        <div>
          <h1 className="mt-4 text-5xl font-black tracking-tight">Wiki</h1>

          <p className="mt-4 max-w-2xl text-lg text-zinc-300">
            Alle Insider, Running Gags und Server-Legenden an einem Ort.
          </p>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-4">
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-black/20">
            <div className="text-4xl font-black">{entries.length}</div>
            <div className="mt-2 text-lg font-bold">Einträge</div>
            <p className="mt-1 text-sm text-zinc-400">gesammelte Insider</p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-black/20">
            <div className="text-4xl font-black">{quoteCount}</div>
            <div className="mt-2 text-lg font-bold">Zitate</div>
            <p className="mt-1 text-sm text-zinc-400">legendäre Aussagen</p>
          </div>

          <Link
            href="/media"
            className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-black/20 transition hover:-translate-y-1 hover:border-white/30 hover:bg-white/[0.08]"
          >
            <div className="text-4xl font-black">{mediaCount}</div>
            <div className="mt-2 text-lg font-bold">Medien</div>
            <p className="mt-1 text-sm text-zinc-400">Galerie ansehen →</p>
          </Link>

          <Link
            href="/people"
            className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-black/20 transition hover:-translate-y-1 hover:border-white/30 hover:bg-white/[0.08]"
          >
            <div className="text-4xl font-black">{uniquePeople.size}</div>
            <div className="mt-2 text-lg font-bold">Personen</div>
            <p className="mt-1 text-sm text-zinc-400">
              Beteiligte Legenden →
            </p>
          </Link>
        </div>

        <WikiClient entries={entries} />
      </section>
    </main>
  );
}
