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

function splitPeople(value: string | null) {
  if (!value) return [];

  return value
    .split(",")
    .map((person) => person.trim())
    .filter(Boolean);
}

async function getApprovedEntries() {
  const { data, error } = await supabase
    .from("submissions")
    .select("*")
    .eq("approved", true);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((entry) => ({
    id: entry.id,
    slug: createSlug(entry.title),
    title: entry.title,
    category: entry.category,
    people: splitPeople(entry.people),
    story: entry.story,
    whyFunny: entry.why_funny,
    usage: entry.usage ?? "",
  }));
}

function PeopleLinks({
  people,
  label,
}: {
  people: string[];
  label: string;
}) {
  if (people.length === 0) return null;

  return (
    <div className="mt-5">
      <div className="text-sm font-semibold text-zinc-400">{label}</div>

      <div className="mt-3 flex flex-wrap gap-2">
        {people.map((person) => (
          <Link
            key={person}
            href={`/people/${person.toLowerCase()}`}
            className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-black transition hover:scale-105 hover:bg-zinc-200"
          >
            {person}
          </Link>
        ))}
      </div>
    </div>
  );
}

export default async function WikiEntryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await getServerSession(authOptions);

  const entries = await getApprovedEntries();
  const entry = entries.find((entry) => entry.slug === slug);

  const isAdmin = session?.user?.id === process.env.ADMIN_DISCORD_ID;

  if (!entry) {
    return (
      <main className="min-h-screen bg-zinc-950 p-10 text-white">
        <h1 className="text-4xl font-bold">Nicht gefunden 😢</h1>
      </main>
    );
  }

  const isQuote = entry.category === "Zitat";

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

          {isQuote && (
            <blockquote className="mt-6 rounded-3xl border border-white/10 bg-white/[0.04] p-6 text-2xl font-semibold leading-relaxed text-zinc-100">
              “{entry.story}”
            </blockquote>
          )}

          <PeopleLinks
            people={entry.people}
            label={isQuote ? "Gesagt von" : "Beteiligte"}
          />

          {isAdmin && (
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
                  await deleteWikiEntry(entry.id);
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
        </div>

        {!isQuote && (
          <section className="mt-10 rounded-3xl border border-white/10 bg-white/[0.03] p-6">
            <h2 className="text-2xl font-bold">Was ist passiert?</h2>
            <p className="mt-3 leading-7 text-zinc-300">{entry.story}</p>
          </section>
        )}

        <section className="mt-5 rounded-3xl border border-white/10 bg-white/[0.03] p-6">
          <h2 className="text-2xl font-bold">
            {isQuote ? "Warum ist es legendär?" : "Warum ist es lustig?"}
          </h2>

          <p className="mt-3 leading-7 text-zinc-300">{entry.whyFunny}</p>
        </section>

        {entry.usage && (
          <section className="mt-5 rounded-3xl border border-white/10 bg-white/[0.03] p-6">
            <h2 className="text-2xl font-bold">
              {isQuote ? "Kontext" : "Typische Verwendung"}
            </h2>

            <p className="mt-3 leading-7 text-zinc-300">{entry.usage}</p>
          </section>
        )}
      </article>
    </main>
  );
}