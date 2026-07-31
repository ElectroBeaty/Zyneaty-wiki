import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import TopBar from "@/components/TopBar";
import { isAdminDiscordId } from "@/lib/admin";
import { AnnouncementClient } from "./AnnouncementClient";
import { getAnnouncementChannels } from "./channels";

export const dynamic = "force-dynamic";

export default async function AnnouncementsPage() {
  const session = await getServerSession(authOptions);

  if (!isAdminDiscordId(session?.user?.id)) {
    redirect("/denied");
  }

  const channelResult = await getAnnouncementChannels();

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_right,#ffffff1f,transparent_28%),radial-gradient(circle_at_bottom_left,rgba(251,146,60,0.1),transparent_24%),linear-gradient(135deg,#050505,#111113,#050505)] text-white">
      <TopBar />

      <section className="mx-auto max-w-7xl px-6 pt-10 pb-16">
        <div className="flex flex-wrap items-center gap-3 text-sm text-zinc-400">
          <Link href="/admin" className="hover:text-white">
            Admin Hub
          </Link>
          <span>/</span>
          <span className="text-zinc-200">Embed Sender</span>
        </div>

        <div className="mt-8 flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="text-sm uppercase tracking-[0.35em] text-orange-100/50">
              Privat
            </p>
            <h1 className="mt-3 text-5xl font-black tracking-tight">
              Embed Sender
            </h1>
            <p className="mt-4 max-w-3xl text-zinc-300">
              Einmalige Discord-Embeds mit dem Zyneaty-Bot vorbereiten, senden
              und optional direkt mit Reactions ausstatten.
            </p>
          </div>

          <div className="rounded-2xl border border-emerald-300/20 bg-emerald-300/10 px-4 py-3 text-sm text-emerald-100">
            Nur sichtbar mit deiner Admin-Discord-ID.
          </div>
        </div>

        <div className="mt-8">
          <AnnouncementClient
            channels={channelResult.channels}
            channelLoadError={channelResult.error}
            defaultChannelId={channelResult.defaultChannelId}
          />
        </div>
      </section>
    </main>
  );
}
