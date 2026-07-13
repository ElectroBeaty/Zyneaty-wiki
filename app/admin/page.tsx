import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import TopBar from "@/components/TopBar";
import { isAdminDiscordId } from "@/lib/admin";

export const dynamic = "force-dynamic";

const adminSections = [
  {
    href: "/admin/submissions",
    label: "Submissions",
    title: "Wiki-Vorschlaege",
    text: "Neue Eintraege pruefen, freigeben oder loeschen.",
    cta: "Submissions oeffnen",
  },
  {
    href: "/admin/deck-lab",
    label: "MTG Lab",
    title: "Magic Deck Lab",
    text: "Decklisten analysieren, speichern und privat weiterbauen.",
    cta: "MTG Lab oeffnen",
  },
];

export default async function AdminHubPage() {
  const session = await getServerSession(authOptions);

  if (!isAdminDiscordId(session?.user?.id)) {
    redirect("/denied");
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_right,#ffffff1f,transparent_28%),radial-gradient(circle_at_bottom_left,rgba(251,146,60,0.1),transparent_24%),linear-gradient(135deg,#050505,#111113,#050505)] text-white">
      <TopBar />

      <section className="mx-auto max-w-5xl px-6 pt-10 pb-16">
        <Link href="/wiki" className="text-sm text-zinc-400 hover:text-white">
          Zurueck zum Wiki
        </Link>

        <div className="mt-8">
          <p className="text-sm uppercase tracking-[0.35em] text-orange-100/50">
            Privat
          </p>
          <h1 className="mt-3 text-5xl font-black tracking-tight">
            Admin Hub
          </h1>
          <p className="mt-4 max-w-3xl text-zinc-300">
            Dein interner Bereich fuer Wiki-Verwaltung und Magic-Deckbau.
          </p>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {adminSections.map((section) => (
            <Link
              key={section.href}
              href={section.href}
              className="group rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-black/20 transition hover:border-orange-200/35 hover:bg-white/[0.07]"
            >
              <span className="text-xs uppercase tracking-[0.28em] text-zinc-500">
                {section.label}
              </span>
              <h2 className="mt-3 text-2xl font-black">{section.title}</h2>
              <p className="mt-3 text-sm leading-6 text-zinc-400">
                {section.text}
              </p>
              <span className="mt-6 inline-flex rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-zinc-200 transition group-hover:border-orange-100/45 group-hover:bg-orange-300/10 group-hover:text-orange-100">
                {section.cta}
              </span>
            </Link>
          ))}
        </div>

        <section className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-zinc-500">
                Betrieb
              </p>
              <h2 className="mt-1 text-lg font-black">
                Produktionsstatus pruefen
              </h2>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-zinc-400">
                Kleiner Health-Check fuer Login, Supabase und Tabellen.
              </p>
            </div>

            <a
              href="/api/health"
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-zinc-200 transition hover:border-white/35 hover:bg-white/10"
            >
              Health oeffnen
            </a>
          </div>
        </section>
      </section>
    </main>
  );
}
