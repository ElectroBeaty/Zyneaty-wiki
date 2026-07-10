/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import TopBar from "@/components/TopBar";
import { getDiscordAvatar } from "@/lib/discord";
import { getPersonHref, splitPeople } from "@/lib/wiki";
import { supabase } from "@/lib/supabase";

type PeopleSubmission = {
  people: string | null;
  quote_speaker: string | null;
  category: string;
  media_url: string | null;
};

async function getApprovedPeopleSubmissions(): Promise<PeopleSubmission[]> {
  const withSpeaker = await supabase
    .from("submissions")
    .select("people,quote_speaker,category,media_url")
    .eq("approved", true);

  if (!withSpeaker.error) {
    return withSpeaker.data ?? [];
  }

  if (!withSpeaker.error.message.includes("quote_speaker")) {
    throw new Error(withSpeaker.error.message);
  }

  const withoutSpeaker = await supabase
    .from("submissions")
    .select("people,category,media_url")
    .eq("approved", true);

  if (withoutSpeaker.error) {
    throw new Error(withoutSpeaker.error.message);
  }

  return (withoutSpeaker.data ?? []).map((entry) => ({
    ...entry,
    quote_speaker: null,
  }));
}

export default async function PeoplePage() {
  const submissions = await getApprovedPeopleSubmissions();

  const { data: profiles, error: profilesError } = await supabase
    .from("people_profiles")
    .select("*");

  if (profilesError) {
    throw new Error(profilesError.message);
  }

  const profileMap = new Map(
    (profiles ?? []).map((profile) => [profile.name.toLowerCase(), profile])
  );

  const peopleMap = new Map<
    string,
    {
      name: string;
      count: number;
      quoteCount: number;
      spokenQuoteCount: number;
      mediaCount: number;
      categories: Set<string>;
      manualAvatarUrl: string | null;
      discordId: string | null;
      knownFor: string | null;
    }
  >();

  function ensurePerson(
    person: string,
    entry: { category: string; media_url: string | null }
  ) {
    const key = person.toLowerCase();
    const profile = profileMap.get(key);
    const existing = peopleMap.get(key);

    if (existing) {
      existing.count += 1;
      existing.quoteCount += entry.category === "Zitat" ? 1 : 0;
      existing.mediaCount += entry.media_url ? 1 : 0;
      existing.categories.add(entry.category);
    } else {
      peopleMap.set(key, {
        name: profile?.name ?? person,
        count: 1,
        quoteCount: entry.category === "Zitat" ? 1 : 0,
        spokenQuoteCount: 0,
        mediaCount: entry.media_url ? 1 : 0,
        categories: new Set([entry.category]),
        manualAvatarUrl: profile?.avatar_url ?? null,
        discordId: profile?.discord_id ?? null,
        knownFor: profile?.known_for ?? null,
      });
    }
  }

  for (const entry of submissions) {
    const participants = splitPeople(entry.people);
    const quoteSpeaker = entry.quote_speaker;

    if (
      quoteSpeaker &&
      !participants.some(
        (person) => person.toLowerCase() === quoteSpeaker.toLowerCase()
      )
    ) {
      participants.push(quoteSpeaker);
    }

    for (const person of participants) {
      ensurePerson(person, entry);
    }

    if (entry.category === "Zitat" && quoteSpeaker) {
      const key = quoteSpeaker.toLowerCase();
      const existing = peopleMap.get(key);

      if (existing) {
        existing.spokenQuoteCount += 1;
      }
    }
  }

  const peopleWithoutAvatars = Array.from(peopleMap.values()).sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    return a.name.localeCompare(b.name);
  });

  const people = await Promise.all(
    peopleWithoutAvatars.map(async (person) => ({
      ...person,
      categoryCount: person.categories.size,
      avatarUrl:
        person.manualAvatarUrl ?? (await getDiscordAvatar(person.discordId)),
    }))
  );

  const spokenQuoteTotal = people.reduce(
    (total, person) => total + person.spokenQuoteCount,
    0
  );
  const mediaPeopleTotal = people.filter((person) => person.mediaCount > 0).length;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_right,#ffffff1f,transparent_28%),radial-gradient(circle_at_bottom_left,rgba(251,146,60,0.1),transparent_24%),linear-gradient(135deg,#050505,#111113,#050505)] text-white">
      <TopBar />

      <section className="mx-auto max-w-6xl px-6 pt-10 pb-16">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="text-sm uppercase tracking-[0.35em] text-orange-100/50">
              Community
            </p>

            <h1 className="mt-4 text-5xl font-black tracking-tight">
              Personen
            </h1>

            <p className="mt-4 max-w-2xl text-lg text-zinc-300">
              Profile, Beteiligungen und kleine Spuren in der Wiki-Lore.
            </p>
          </div>

          <Link
            href="/wiki"
            className="rounded-full border border-white/10 px-5 py-3 text-sm font-semibold text-zinc-200 transition hover:border-white/30 hover:bg-white/10"
          >
            Zurück zum Wiki
          </Link>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
            <div className="text-4xl font-black">{people.length}</div>
            <div className="mt-2 text-sm font-semibold uppercase tracking-[0.18em] text-zinc-500">
              Profile
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
            <div className="text-4xl font-black">{spokenQuoteTotal}</div>
            <div className="mt-2 text-sm font-semibold uppercase tracking-[0.18em] text-zinc-500">
              Gesagte Zitate
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
            <div className="text-4xl font-black">{mediaPeopleTotal}</div>
            <div className="mt-2 text-sm font-semibold uppercase tracking-[0.18em] text-zinc-500">
              Mit Medien
            </div>
          </div>
        </div>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {people.map((person, index) => (
            <Link
              key={person.name}
              href={getPersonHref(person.name)}
              className="group relative overflow-hidden rounded-[1.75rem] border border-white/10 bg-zinc-950/70 p-6 shadow-2xl shadow-black/20 transition hover:-translate-y-1 hover:border-orange-100/30 hover:bg-zinc-900/80"
            >
              <div className="absolute right-5 top-5 rounded-full border border-white/10 bg-black/25 px-3 py-1 text-xs font-black text-zinc-400">
                #{index + 1}
              </div>

              <div className="flex items-center gap-4 pr-14">
                {person.avatarUrl ? (
                  <img
                    src={person.avatarUrl}
                    alt=""
                    className="h-16 w-16 rounded-full border border-white/10 object-cover shadow-xl shadow-black/30"
                  />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-full border border-white/10 bg-white/5 text-2xl font-black">
                    {person.name.slice(0, 1).toUpperCase()}
                  </div>
                )}

                <div className="min-w-0">
                  <h2 className="truncate text-2xl font-black group-hover:text-orange-50">
                    {person.name}
                  </h2>

                  {person.discordId && (
                    <p className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-orange-100/45">
                      Discord verknüpft
                    </p>
                  )}
                </div>
              </div>

              {person.knownFor && (
                <p className="mt-5 leading-7 text-zinc-300">
                  Bekannt für: {person.knownFor}
                </p>
              )}

              <div className="mt-6 flex flex-wrap gap-2">
                <span className="rounded-full border border-white/10 bg-black/25 px-3 py-1 text-xs font-semibold text-zinc-300">
                  {person.count} Einträge
                </span>
                <span className="rounded-full border border-white/10 bg-black/25 px-3 py-1 text-xs font-semibold text-zinc-300">
                  {person.spokenQuoteCount} gesagt
                </span>
                <span className="rounded-full border border-white/10 bg-black/25 px-3 py-1 text-xs font-semibold text-zinc-300">
                  {person.mediaCount} Medien
                </span>
              </div>

              <div className="mt-6 text-sm font-semibold text-zinc-300">
                Profil ansehen -&gt;
              </div>
            </Link>
          ))}
        </div>

        {people.length === 0 && (
          <div className="mt-10 rounded-2xl border border-white/10 bg-white/[0.04] p-6 text-zinc-400">
            Noch keine Personen vorhanden.
          </div>
        )}
      </section>
    </main>
  );
}
