import Link from "next/link";
import { getDiscordAvatar } from "@/lib/discord";
import { getPersonHref, splitPeople } from "@/lib/wiki";
import { supabase } from "@/lib/supabase";

export default async function PeoplePage() {
  const { data: submissions, error: submissionsError } = await supabase
    .from("submissions")
    .select("people,quote_speaker,category,media_url")
    .eq("approved", true);

  if (submissionsError) {
    throw new Error(submissionsError.message);
  }

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

  for (const entry of submissions ?? []) {
    const participants = splitPeople(entry.people);

    if (
      entry.quote_speaker &&
      !participants.some(
        (person) => person.toLowerCase() === entry.quote_speaker.toLowerCase()
      )
    ) {
      participants.push(entry.quote_speaker);
    }

    for (const person of participants) {
      ensurePerson(person, entry);
    }

    if (entry.category === "Zitat" && entry.quote_speaker) {
      const key = entry.quote_speaker.toLowerCase();
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

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_right,#ffffff1f,transparent_28%),linear-gradient(135deg,#050505,#111113,#050505)] text-white">
      <section className="mx-auto max-w-6xl px-6 pt-8 pb-16">
        <Link href="/wiki" className="text-sm text-zinc-400 hover:text-white">
          ← Zurück zum Wiki
        </Link>

        <div className="mt-8 rounded-[2rem] border border-white/10 bg-white/[0.04] p-8 shadow-2xl shadow-black/30">
          <p className="text-sm uppercase tracking-[0.35em] text-zinc-400">
            Community
          </p>

          <h1 className="mt-5 text-5xl font-black tracking-tight">
            Personen
          </h1>

          <p className="mt-4 max-w-2xl text-lg text-zinc-300">
            Profile, Beteiligungen und kleine Spuren in der Wiki-Lore.
          </p>
        </div>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {people.map((person, index) => (
            <Link
              key={person.name}
              href={getPersonHref(person.name)}
              className="group rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-black/20 transition hover:-translate-y-1 hover:border-white/30 hover:bg-white/[0.08]"
            >
              <div className="flex items-center gap-4">
                {person.avatarUrl ? (
                  <img
                    src={person.avatarUrl}
                    alt=""
                    className="h-16 w-16 rounded-full border border-white/10 object-cover"
                  />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-full border border-white/10 bg-white/5 text-2xl font-black">
                    {person.name.slice(0, 1).toUpperCase()}
                  </div>
                )}

                <div className="min-w-0">
                  <div className="text-sm text-zinc-500">#{index + 1}</div>

                  <h2 className="truncate text-2xl font-black group-hover:text-zinc-200">
                    {person.name}
                  </h2>

                  {person.discordId && (
                    <p className="mt-1 text-xs text-zinc-500">
                      Discord verknüpft
                    </p>
                  )}
                </div>
              </div>

              {person.knownFor && (
                <p className="mt-5 text-sm text-zinc-300">
                  Bekannt für: {person.knownFor}
                </p>
              )}

              <div className="mt-5 grid grid-cols-4 gap-2 text-center">
                <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                  <div className="font-black">{person.count}</div>
                  <div className="mt-1 text-xs text-zinc-500">Einträge</div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                  <div className="font-black">{person.spokenQuoteCount}</div>
                  <div className="mt-1 text-xs text-zinc-500">
                    Gesagt
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                  <div className="font-black">{person.quoteCount}</div>
                  <div className="mt-1 text-xs text-zinc-500">
                    Bezüge
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                  <div className="font-black">{person.mediaCount}</div>
                  <div className="mt-1 text-xs text-zinc-500">Medien</div>
                </div>
              </div>

              <div className="mt-6 text-sm font-semibold text-zinc-300">
                Profil ansehen →
              </div>
            </Link>
          ))}
        </div>

        {people.length === 0 && (
          <div className="mt-10 rounded-3xl border border-white/10 bg-white/[0.04] p-6 text-zinc-400">
            Noch keine Personen vorhanden.
          </div>
        )}
      </section>
    </main>
  );
}
