import Image from "next/image";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import TopBar from "@/components/TopBar";
import DiscordLoginButton from "@/components/DiscordLoginButton";
import { supabase } from "@/lib/supabase";
import { mapSubmissionToWikiEntry } from "@/lib/wiki";

async function getRandomEntryHref() {
  const { data, error } = await supabase
    .from("submissions")
    .select("*")
    .eq("approved", true);

  if (error || !data || data.length === 0) {
    return null;
  }

  const entries = data.map(mapSubmissionToWikiEntry);
  const entry = entries[Math.floor(Math.random() * entries.length)];

  return `/wiki/${entry.slug}`;
}

export default async function Home() {
  const session = await getServerSession(authOptions);
  const randomEntryHref = session?.user ? await getRandomEntryHref() : null;

  return (
    <main className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,#ffffff18,transparent_28%),linear-gradient(135deg,#050505,#18181b,#050505)] text-white">
      <TopBar />

      <section className="relative mx-auto flex min-h-[calc(100vh-90px)] max-w-6xl items-center px-6 py-20">
        <div className="relative z-10 max-w-4xl">
          <p className="mb-5 text-sm uppercase tracking-[0.4em] text-zinc-400">
            Private Server Lore
          </p>

          <h1 className="text-6xl font-black tracking-tight md:text-8xl">
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

                {randomEntryHref && (
                  <Link
                    href={randomEntryHref}
                    className="rounded-full border border-white/20 px-7 py-4 font-semibold text-white transition hover:border-white hover:bg-white/10"
                  >
                    Zufälliger Eintrag
                  </Link>
                )}

                <Link
                  href="/api/auth/signout"
                  className="rounded-full border border-white/20 px-7 py-4 font-semibold text-white transition hover:border-white hover:bg-white/10"
                >
                  Abmelden
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

        <div className="pointer-events-none absolute right-[-80px] top-1/2 hidden -translate-y-1/2 lg:block">
          <div className="relative h-[620px] w-[620px] overflow-hidden rounded-full">
            <Image
              src="/koi-hero.png"
              alt="Yin Yang Koi"
              fill
              priority
              className="object-cover opacity-55 grayscale"
            />

            <div className="absolute inset-0 bg-[radial-gradient(circle,transparent_45%,#111113_78%)]" />
          </div>
        </div>
      </section>
    </main>
  );
}
