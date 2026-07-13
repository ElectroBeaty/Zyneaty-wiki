import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import TopBar from "@/components/TopBar";
import { isAdminDiscordId } from "@/lib/admin";
import { listDeckLabDecks } from "@/lib/deck-lab";
import DeckLabClient from "./DeckLabClient";

export const dynamic = "force-dynamic";

export default async function DeckLabPage() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  if (!userId || !isAdminDiscordId(userId)) {
    redirect("/denied");
  }

  const { decks, setupError } = await listDeckLabDecks(userId);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_right,#ffffff1f,transparent_28%),radial-gradient(circle_at_bottom_left,rgba(251,146,60,0.1),transparent_24%),linear-gradient(135deg,#050505,#111113,#050505)] text-white">
      <TopBar />

      <section className="mx-auto max-w-7xl px-6 pt-10 pb-16">
        <div className="flex flex-wrap items-center gap-3 text-sm text-zinc-400">
          <Link href="/admin/submissions" className="hover:text-white">
            Admin Dashboard
          </Link>
          <span>/</span>
          <span className="text-zinc-200">Deck Lab</span>
        </div>

        <div className="mt-8 flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="text-sm uppercase tracking-[0.35em] text-orange-100/50">
              Privat
            </p>
            <h1 className="mt-3 text-5xl font-black tracking-tight">
              Deck Lab
            </h1>
            <p className="mt-4 max-w-3xl text-zinc-300">
              Dein versteckter Admin-Bereich fuer Magic-Decks: Listen
              importieren, ueber Scryfall aufloesen, grobe Rollen erkennen und
              privat speichern.
            </p>
          </div>

          <div className="rounded-2xl border border-emerald-300/20 bg-emerald-300/10 px-4 py-3 text-sm text-emerald-100">
            Nur sichtbar mit deiner Admin-Discord-ID.
          </div>
        </div>

        <div className="mt-8">
          <DeckLabClient initialDecks={decks} setupError={setupError} />
        </div>
      </section>
    </main>
  );
}
