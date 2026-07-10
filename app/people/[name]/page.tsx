/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import WikiEntryCard from "@/components/WikiEntryCard";
import { getDiscordAvatar } from "@/lib/discord";
import { escapePostgrestLikePattern } from "@/lib/query-pattern";
import {
  createSummary,
  getPrimaryText,
  mapSubmissionToWikiEntry,
  samePerson,
} from "@/lib/wiki";
import { supabase } from "@/lib/supabase";

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
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_right,#ffffff1f,transparent_28%),radial-gradient(circle_at_bottom_left,rgba(251,146,60,0.1),transparent_24%),linear-gradient(135deg,#050505,#111113,#050505)] text-white">
      <section className="mx-auto max-w-6xl px-6 pt-10 pb-16">
        <Link href="/people" className="text-sm text-zinc-400 hover:text-white">
          &lt;- Zurück zu Personen
        </Link>

        <header className="mt-8 flex flex-wrap items-center gap-6">
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
            <p className="text-sm uppercase tracking-[0.35em] text-orange-100/50">
              Profil
            </p>

            <h1 className="mt-3 text-5xl font-black tracking-tight">
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
        </header>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
            <div className="text-4xl font-black">{relatedEntries.length}</div>
            <div className="mt-2 text-sm font-semibold uppercase tracking-[0.18em] text-zinc-500">
              Einträge
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
            <div className="text-4xl font-black">
              {spokenQuoteEntries.length}
            </div>
            <div className="mt-2 text-sm font-semibold uppercase tracking-[0.18em] text-zinc-500">
              Gesagte Zitate
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
            <div className="text-4xl font-black">
              {quoteMentionEntries.length}
            </div>
            <div className="mt-2 text-sm font-semibold uppercase tracking-[0.18em] text-zinc-500">
              Zitat-Bezüge
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
            <div className="text-4xl font-black">{mediaEntries.length}</div>
            <div className="mt-2 text-sm font-semibold uppercase tracking-[0.18em] text-zinc-500">
              Medien
            </div>
          </div>
        </div>

        {spokenQuoteEntries.length > 0 && (
          <section className="mt-10 rounded-[1.75rem] border border-orange-200/15 bg-orange-300/10 p-6">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-sm uppercase tracking-[0.3em] text-orange-100/50">
                  Originalton
                </p>
                <h2 className="mt-2 text-2xl font-black">Gesagte Zitate</h2>
              </div>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {spokenQuoteEntries.slice(0, 4).map((entry) => (
                <Link
                  key={entry.id}
                  href={`/wiki/${entry.slug}`}
                  className="rounded-2xl border border-white/10 bg-black/25 p-5 transition hover:border-orange-100/30 hover:bg-black/35"
                >
                  <blockquote className="text-lg font-semibold leading-7 text-zinc-100">
                    “{getPrimaryText(entry)}”
                  </blockquote>
                  <div className="mt-4 text-sm text-zinc-500">
                    {entry.title}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        <div className="mt-10">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-orange-100/50">
                Beteiligungen
              </p>
              <h2 className="mt-2 text-3xl font-black tracking-tight">
                Einträge mit {prettyName}
              </h2>
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            {relatedEntries.map((entry) => (
              <WikiEntryCard
                key={entry.id}
                compact
                entry={{
                  ...entry,
                  summary: createSummary(getPrimaryText(entry), 100),
                }}
              />
            ))}
          </div>
        </div>

        {relatedEntries.length === 0 && (
          <div className="mt-10 rounded-2xl border border-white/10 bg-white/[0.04] p-6 text-zinc-400">
            Noch keine Einträge gefunden.
          </div>
        )}
      </section>
    </main>
  );
}
