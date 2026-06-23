import Link from "next/link";
import { getDiscordAvatar } from "@/lib/discord";
import { escapePostgrestLikePattern } from "@/lib/query-pattern";
import {
  createSummary,
  mapSubmissionToWikiEntry,
  samePerson,
  type WikiEntry,
} from "@/lib/wiki";
import { supabase } from "@/lib/supabase";

function EntryCard({ entry }: { entry: WikiEntry }) {
  return (
    <Link
      href={`/wiki/${entry.slug}`}
      className="group rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-black/20 transition hover:-translate-y-1 hover:border-white/30 hover:bg-white/[0.08]"
    >
      <div className="flex flex-wrap items-center gap-2 text-sm text-zinc-500">
        <span>{entry.category}</span>
        {entry.mediaUrl && (
          <>
            <span>·</span>
            <span>Medium</span>
          </>
        )}
      </div>

      <h2 className="mt-3 text-2xl font-bold group-hover:text-zinc-200">
        {entry.title}
      </h2>

      <p className="mt-3 text-zinc-400">{createSummary(entry.story, 100)}</p>

      <div className="mt-6 text-sm font-semibold text-zinc-300">
        Weiterlesen →
      </div>
    </Link>
  );
}

export default async function PersonPage({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  const { name } = await params;
  const decodedName = decodeURIComponent(name);
  const displayName = decodedName.toLowerCase();

  const { data, error } = await supabase
    .from("submissions")
    .select("*")
    .eq("approved", true)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const { data: profile, error: profileError } = await supabase
    .from("people_profiles")
    .select("*")
    .ilike("name", escapePostgrestLikePattern(decodedName))
    .maybeSingle();

  if (profileError) {
    throw new Error(profileError.message);
  }

  const entries = (data ?? []).map(mapSubmissionToWikiEntry);
  const relatedEntries = entries.filter((entry) =>
    entry.people.some((person) => person.toLowerCase() === displayName)
  );
  const quoteMentionEntries = relatedEntries.filter(
    (entry) => entry.category === "Zitat"
  );
  const spokenQuoteEntries = entries.filter(
    (entry) =>
      entry.category === "Zitat" && samePerson(entry.quoteSpeaker, displayName)
  );
  const mediaEntries = relatedEntries.filter((entry) => entry.mediaUrl);
  const categories = new Set(relatedEntries.map((entry) => entry.category));

  const prettyName =
    profile?.name ??
    relatedEntries[0]?.people.find(
      (person) => person.toLowerCase() === displayName
    ) ??
    decodedName;

  const avatarUrl =
    profile?.avatar_url ?? (await getDiscordAvatar(profile?.discord_id ?? null));
  const knownFor = profile?.known_for ?? null;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_right,#ffffff1f,transparent_28%),linear-gradient(135deg,#050505,#111113,#050505)] text-white">
      <section className="mx-auto max-w-6xl px-6 pt-8 pb-16">
        <Link href="/people" className="text-sm text-zinc-400 hover:text-white">
          ← Zurück zu Personen
        </Link>

        <div className="mt-8 rounded-[2rem] border border-white/10 bg-white/[0.04] p-8 shadow-2xl shadow-black/30">
          <div className="flex flex-wrap items-center gap-6">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt=""
                className="h-28 w-28 rounded-full border border-white/10 object-cover shadow-2xl shadow-black/30"
              />
            ) : (
              <div className="flex h-28 w-28 items-center justify-center rounded-full border border-white/10 bg-white/5 text-5xl font-black">
                {prettyName.slice(0, 1).toUpperCase()}
              </div>
            )}

            <div className="min-w-0">
              <h1 className="text-5xl font-black tracking-tight">
                {prettyName}
              </h1>

              <p className="mt-4 max-w-2xl text-lg text-zinc-300">
                {profile?.bio ??
                  `Alle Wiki-Einträge, bei denen ${prettyName} beteiligt ist.`}
              </p>

              {knownFor && (
                <p className="mt-3 text-sm text-zinc-400">
                  Bekannt für: {knownFor}
                </p>
              )}
            </div>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="text-3xl font-black">
                {relatedEntries.length}
              </div>
              <div className="mt-1 text-sm text-zinc-400">Einträge</div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="text-3xl font-black">
                {spokenQuoteEntries.length}
              </div>
              <div className="mt-1 text-sm text-zinc-400">Gesagte Zitate</div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="text-3xl font-black">
                {quoteMentionEntries.length}
              </div>
              <div className="mt-1 text-sm text-zinc-400">Zitat-Bezüge</div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="text-3xl font-black">{mediaEntries.length}</div>
              <div className="mt-1 text-sm text-zinc-400">Medien</div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="text-3xl font-black">{categories.size}</div>
              <div className="mt-1 text-sm text-zinc-400">Typen</div>
            </div>
          </div>
        </div>

        {spokenQuoteEntries.length > 0 && (
          <section className="mt-10 rounded-3xl border border-white/10 bg-white/[0.04] p-6">
            <h2 className="text-2xl font-bold">Gesagte Zitate</h2>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {spokenQuoteEntries.slice(0, 4).map((entry) => (
                <Link
                  key={entry.id}
                  href={`/wiki/${entry.slug}`}
                  className="rounded-2xl border border-white/10 bg-black/20 p-5 transition hover:bg-white/10"
                >
                  <blockquote className="text-lg font-semibold leading-7 text-zinc-100">
                    “{entry.story}”
                  </blockquote>
                  <div className="mt-4 text-sm text-zinc-500">
                    {entry.title}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        <div className="mt-10 grid gap-5 md:grid-cols-2">
          {relatedEntries.map((entry) => (
            <EntryCard key={entry.id} entry={entry} />
          ))}
        </div>

        {relatedEntries.length === 0 && (
          <div className="mt-10 rounded-3xl border border-white/10 bg-white/[0.04] p-6 text-zinc-400">
            Noch keine Einträge gefunden.
          </div>
        )}
      </section>
    </main>
  );
}
