import { supabase } from "@/lib/supabase";
import WikiClient from "./WikiClient";

function createSlug(title: string) {
  return title
    .toLowerCase()
    .trim()
    .replace(/[ä]/g, "ae")
    .replace(/[ö]/g, "oe")
    .replace(/[ü]/g, "ue")
    .replace(/[ß]/g, "ss")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function getApprovedSubmissions() {
  const { data, error } = await supabase
    .from("submissions")
    .select("*")
    .eq("approved", true)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((submission) => ({
    slug: createSlug(submission.title),
    title: submission.title,
    category: submission.category,
    summary: submission.story.slice(0, 100) + "...",
    people: submission.people
      ? submission.people
          .split(",")
          .map((person: string) => person.trim())
          .filter(Boolean)
      : [],
  }));
}

export default async function WikiPage() {
  const entries = await getApprovedSubmissions();

  const uniquePeople = new Set(
    entries.flatMap((entry) => entry.people)
  );

  const uniqueCategories = new Set(
    entries.map((entry) => entry.category)
  );

  const stats = [
    {
      label: "Einträge",
      value: entries.length,
      text: "gesammelte Insider",
    },
    {
      label: "Personen",
      value: uniquePeople.size,
      text: "beteiligte Legenden",
    },
    {
      label: "Kategorien",
      value: uniqueCategories.size,
      text: "Arten von Lore",
    },
  ];

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_right,#ffffff1f,transparent_28%),linear-gradient(135deg,#050505,#111113,#050505)] text-white">
      <section className="mx-auto max-w-6xl px-6 pt-6 pb-14">
        <div>
          <h1 className="mt-4 text-5xl font-black tracking-tight">Wiki</h1>

          <p className="mt-4 max-w-2xl text-lg text-zinc-300">
            Alle Insider, Running Gags und Server-Legenden an einem Ort.
          </p>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-black/20"
            >
              <div className="text-4xl font-black">{stat.value}</div>
              <div className="mt-2 text-lg font-bold">{stat.label}</div>
              <p className="mt-1 text-sm text-zinc-400">{stat.text}</p>
            </div>
          ))}
        </div>

        <WikiClient entries={entries} />
      </section>
    </main>
  );
}