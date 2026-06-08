import { wikiEntries } from "@/wikiData";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { deleteWikiEntry } from "./actions";

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
    .eq("approved", true);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((submission) => ({
    id: submission.id,
    source: "supabase" as const,
    slug: createSlug(submission.title),
    title: submission.title,
    category: submission.category,
    summary: submission.story.slice(0, 100) + "...",
    people: submission.people
      ? submission.people.split(",").map((person: string) => person.trim())
      : [],
    story: submission.story,
    whyFunny: submission.why_funny,
    usage: submission.usage ?? "",
    quote: "",
  }));
}

export default async function WikiEntryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await getServerSession(authOptions);

  const approvedEntries = await getApprovedSubmissions();

  const staticEntries = wikiEntries.map((entry) => ({
    ...entry,
    id: null,
    source: "static" as const,
  }));

  const allEntries = [...approvedEntries, ...staticEntries];

  const entry = allEntries.find((entry) => entry.slug === slug);

  const isAdmin = session?.user?.id === process.env.ADMIN_DISCORD_ID;

  if (!entry) {
    return (
      <main className="min-h-screen bg-zinc-950 p-10 text-white">
        <h1 className="text-4xl font-bold">Nicht gefunden 😢</h1>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#ffffff1f,transparent_30%),linear-gradient(135deg,#050505,#111113,#050505)] text-white">
      <article className="mx-auto max-w-4xl px-6 pt-8 pb-14">
        <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-8 shadow-2xl shadow-black/30">
          <div>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-zinc-300">
              {entry.category}
            </span>
          </div>

          <h1 className="mt-6 text-5xl font-black tracking-tight">
            {entry.title}
          </h1>

          {isAdmin && entry.source === "supabase" && entry.id && (
  <div className="mt-8 flex flex-wrap gap-3">
    <Link
      href={`/admin/wiki/${entry.id}/edit`}
      className="rounded-full border border-white/20 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
    >
      Eintrag bearbeiten
    </Link>

    <form
      action={async () => {
        "use server";
        await deleteWikiEntry(entry.id!);
      }}
    >
      <button
        type="submit"
        className="rounded-full border border-red-500/20 px-4 py-2 text-sm font-semibold text-red-300 transition hover:bg-red-500/10"
      >
        Eintrag löschen
      </button>
    </form>
  </div>
)}

          {isAdmin && entry.source === "static" && (
            <p className="mt-6 text-sm text-zinc-500">
              Dieser Eintrag ist noch fest im Code gespeichert und kann hier
              nicht gelöscht werden.
            </p>
          )}
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