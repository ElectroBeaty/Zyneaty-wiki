import Link from "next/link";
import { supabase } from "@/lib/supabase";

type DiscordUser = {
  id: string;
  username: string;
  global_name?: string | null;
  avatar?: string | null;
};

function splitPeople(value: string | null) {
  if (!value) return [];

  return value
    .split(",")
    .map((person) => person.trim())
    .filter(Boolean);
}

function getDefaultDiscordAvatar(discordId: string) {
  const index = BigInt(discordId) >> BigInt(22);
  return `https://cdn.discordapp.com/embed/avatars/${Number(index % BigInt(6))}.png`;
}

async function getDiscordAvatar(discordId: string | null) {
  if (!discordId) return null;

  const token = process.env.DISCORD_BOT_TOKEN;

  if (!token) return null;

  const res = await fetch(`https://discord.com/api/v10/users/${discordId}`, {
    headers: {
      Authorization: `Bot ${token}`,
    },
    next: {
      revalidate: 60 * 60,
    },
  });

  if (!res.ok) return null;

  const user = (await res.json()) as DiscordUser;

  if (!user.avatar) {
    return getDefaultDiscordAvatar(discordId);
  }

  const extension = user.avatar.startsWith("a_") ? "gif" : "png";

  return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.${extension}?size=128`;
}

export default async function PeoplePage() {
  const { data: submissions, error: submissionsError } = await supabase
    .from("submissions")
    .select("people")
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
    (profiles ?? []).map((profile) => [
      profile.name.toLowerCase(),
      profile,
    ])
  );

  const peopleMap = new Map<
    string,
    {
      name: string;
      count: number;
      manualAvatarUrl: string | null;
      discordId: string | null;
    }
  >();

  for (const entry of submissions ?? []) {
    for (const person of splitPeople(entry.people)) {
      const key = person.toLowerCase();
      const profile = profileMap.get(key);
      const existing = peopleMap.get(key);

      if (existing) {
        existing.count += 1;
      } else {
        peopleMap.set(key, {
          name: profile?.name ?? person,
          count: 1,
          manualAvatarUrl: profile?.avatar_url ?? null,
          discordId: profile?.discord_id ?? null,
        });
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
      avatarUrl:
        person.manualAvatarUrl ?? (await getDiscordAvatar(person.discordId)),
    }))
  );

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_right,#ffffff1f,transparent_28%),linear-gradient(135deg,#050505,#111113,#050505)] text-white">
      <section className="mx-auto max-w-5xl px-6 pt-8 pb-16">
        <Link href="/wiki" className="text-sm text-zinc-400 hover:text-white">
          ← Zurück zum Wiki
        </Link>

        <div className="mt-8 rounded-[2rem] border border-white/10 bg-white/[0.04] p-8 shadow-2xl shadow-black/30">
          <div className="text-5xl">👥</div>

          <h1 className="mt-6 text-5xl font-black tracking-tight">
            Personen
          </h1>

          <p className="mt-4 text-lg text-zinc-300">
            Sortiert nach Anzahl der Wiki-Einträge.
          </p>
        </div>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {people.map((person, index) => (
            <Link
              key={person.name}
              href={`/people/${person.name.toLowerCase()}`}
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
                  <div className="flex h-16 w-16 items-center justify-center rounded-full border border-white/10 bg-white/5 text-3xl">
                    👤
                  </div>
                )}

                <div>
                  <div className="text-sm text-zinc-500">#{index + 1}</div>

                  <h2 className="text-2xl font-black group-hover:text-zinc-200">
                    {person.name}
                  </h2>

                  {person.discordId && (
                    <p className="mt-1 text-xs text-zinc-500">
                      Discord verknüpft
                    </p>
                  )}
                </div>
              </div>

              <p className="mt-5 text-zinc-400">
                {person.count} {person.count === 1 ? "Eintrag" : "Einträge"}
              </p>

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