import Image from "next/image";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import TopBar from "@/components/TopBar";
import DiscordLoginButton from "@/components/DiscordLoginButton";
import WikiEntryCard from "@/components/WikiEntryCard";
import { isAdminDiscordId } from "@/lib/admin";
import { supabase } from "@/lib/supabase";
import {
  createSummary,
  getPrimaryText,
  mapSubmissionToWikiEntry,
} from "@/lib/wiki";

async function getHomeDashboard() {
  const { data, error } = await supabase
    .from("submissions")
    .select("*")
    .eq("approved", true)
    .order("created_at", { ascending: false });

  if (error || !data || data.length === 0) {
    return null;
  }

  const entries = data.map((submission) => {
    const entry = mapSubmissionToWikiEntry(submission);

    return {
      ...entry,
      summary: createSummary(getPrimaryText(entry), 96),
    };
  });

  const randomEntry = entries[Math.floor(Math.random() * entries.length)];
  const uniquePeople = new Set(entries.flatMap((entry) => entry.people));
  const quoteCount = entries.filter((entry) => entry.category === "Zitat").length;
  const mediaCount = entries.filter((entry) => entry.mediaUrl).length;

  return {
    randomEntryHref: `/wiki/${randomEntry.slug}`,
    latestEntries: entries.slice(0, 3),
    stats: [
      { label: "Einträge", value: entries.length },
      { label: "Zitate", value: quoteCount },
      { label: "Personen", value: uniquePeople.size },
      { label: "Medien", value: mediaCount },
    ],
  };
}

export default async function Home() {
  const session = await getServerSession(authOptions);
  const dashboard = session?.user ? await getHomeDashboard() : null;
  const isAdmin = isAdminDiscordId(session?.user?.id);

  return (
    <main className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,#ffffff18,transparent_28%),radial-gradient(circle_at_bottom_right,rgba(251,146,60,0.12),transparent_26%),linear-gradient(135deg,#050505,#18181b,#050505)] text-white">
      <TopBar />

      <section className="relative isolate mx-auto flex min-h-[calc(78vh-90px)] max-w-6xl items-center overflow-hidden px-6 py-16 lg:min-h-[640px]">
        <div className="relative z-10 max-w-4xl">
          <p className="mb-5 text-sm uppercase tracking-[0.4em] text-orange-100/60">
            Private Server Lore
          </p>

          <h1 className="max-w-4xl text-6xl font-black tracking-tight md:text-8xl">
            Zyneaty Wiki
          </h1>

          <p className="mt-6 max-w-2xl text-xl leading-8 text-zinc-300">
            Die gesammelte Chronik aller Insider, Legenden, Quotes und komplett
            unnötigen Ereignisse.
          </p>

          <div className="mt-10 flex flex-wrap gap-4">
            {session?.user ? (
              <>
                <Link
                  href="/wiki"
                  className="rounded-full bg-white px-7 py-4 font-semibold text-black transition hover:scale-105 hover:bg-zinc-200"
                >
                  Wiki öffnen
                </Link>

                {dashboard?.randomEntryHref && (
                  <Link
                    href={dashboard.randomEntryHref}
                    className="rounded-full border border-white/20 px-7 py-4 font-semibold text-white transition hover:border-white hover:bg-white/10"
                  >
                    Zufälliger Eintrag
                  </Link>
                )}

                <Link
                  href="/submit"
                  className="rounded-full border border-white/20 px-7 py-4 font-semibold text-white transition hover:border-white hover:bg-white/10"
                >
                  Eintrag einreichen
                </Link>
              </>
            ) : (
              <DiscordLoginButton
                className="rounded-full bg-white px-7 py-4 font-semibold text-black transition hover:scale-105 hover:bg-zinc-200"
                loadingLabel="Weiter zu Discord..."
              >
                Mit Discord anmelden
              </DiscordLoginButton>
            )}
          </div>

          {session?.user && (
            <p className="mt-6 text-sm text-zinc-400">
              Eingeloggt als {session.user.name}
            </p>
          )}
        </div>

        <div className="pointer-events-none absolute right-[-24px] top-1/2 z-0 hidden -translate-y-1/2 lg:block">
          <div className="relative h-[clamp(420px,42vw,560px)] w-[clamp(420px,42vw,560px)] overflow-hidden rounded-full">
            <Image
              src="/koi-hero.png"
              alt="Yin Yang Koi"
              fill
              priority
              className="object-cover opacity-45 grayscale"
            />

            <div className="absolute inset-0 bg-[radial-gradient(circle,transparent_45%,#111113_78%)]" />
          </div>
        </div>
      </section>

      {dashboard && (
        <section className="mx-auto max-w-6xl px-6 pb-16">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {dashboard.stats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-2xl border border-white/10 bg-white/[0.045] p-5 shadow-2xl shadow-black/20"
              >
                <div className="text-4xl font-black">{stat.value}</div>
                <div className="mt-2 text-sm font-semibold uppercase tracking-[0.18em] text-zinc-500">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
            <section>
              <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-sm uppercase tracking-[0.3em] text-orange-100/50">
                    Aktuell
                  </p>
                  <h2 className="mt-2 text-3xl font-black tracking-tight">
                    Frisch aus der Lore
                  </h2>
                </div>

                <Link
                  href="/wiki"
                  className="text-sm font-semibold text-zinc-300 transition hover:text-white"
                >
                  Alles ansehen -&gt;
                </Link>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {dashboard.latestEntries.slice(0, 2).map((entry) => (
                  <WikiEntryCard key={entry.id} entry={entry} compact />
                ))}
              </div>
            </section>

            <aside className="rounded-[1.75rem] border border-white/10 bg-black/25 p-6 shadow-2xl shadow-black/20">
              <p className="text-sm uppercase tracking-[0.3em] text-orange-100/50">
                Schnellzugriff
              </p>

              <div className="mt-5 grid gap-3">
                <Link
                  href="/people"
                  className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 font-semibold text-zinc-200 transition hover:border-white/25 hover:bg-white/[0.08]"
                >
                  Personen ansehen
                </Link>

                <Link
                  href="/media"
                  className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 font-semibold text-zinc-200 transition hover:border-white/25 hover:bg-white/[0.08]"
                >
                  Mediengalerie öffnen
                </Link>

                <Link
                  href="/submit"
                  className="rounded-2xl border border-orange-200/20 bg-orange-300/10 px-4 py-3 font-semibold text-orange-100 transition hover:border-orange-100/40 hover:bg-orange-300/15"
                >
                  Neuen Insider einreichen
                </Link>

                {isAdmin && (
                  <Link
                    href="/admin/submissions"
                    className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 font-semibold text-zinc-200 transition hover:border-white/25 hover:bg-white/[0.08]"
                  >
                    Admin Dashboard
                  </Link>
                )}
              </div>
            </aside>
          </div>
        </section>
      )}
    </main>
  );
}
