import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { supabase } from "@/lib/supabase";
import { updateWikiEntry } from "./actions";

export default async function EditWikiEntryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.id !== process.env.ADMIN_DISCORD_ID) {
    redirect("/denied");
  }

  const { id } = await params;

  const { data: entry, error } = await supabase
    .from("submissions")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !entry) {
    redirect("/wiki");
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_right,#ffffff1f,transparent_28%),linear-gradient(135deg,#050505,#111113,#050505)] text-white">
      <section className="mx-auto max-w-3xl px-6 pt-8 pb-16">
        <Link
          href="/wiki"
          className="text-sm text-zinc-400 transition hover:text-white"
        >
          ← Zurück zum Wiki
        </Link>

        <p className="mt-6 text-sm uppercase tracking-[0.35em] text-zinc-400">
          Admin Bereich
        </p>

        <h1 className="mt-5 text-5xl font-black tracking-tight">
          Eintrag bearbeiten
        </h1>

        <p className="mt-4 text-zinc-300">
          Bearbeite den Wiki-Eintrag. Änderungen werden direkt gespeichert.
        </p>

        <form
          action={async (formData) => {
            "use server";
            await updateWikiEntry(id, formData);
          }}
          className="mt-10 rounded-[2rem] border border-white/10 bg-white/[0.04] p-8 shadow-2xl shadow-black/30"
        >
          <div className="space-y-6">
            <div>
              <label className="text-sm font-semibold text-zinc-300">
                Titel
              </label>

              <input
                name="title"
                required
                defaultValue={entry.title}
                className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 p-4 text-white placeholder:text-zinc-500 outline-none transition focus:border-white/30"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-zinc-300">
                Kategorie
              </label>

              <select
                name="category"
                required
                defaultValue={entry.category}
                className="mt-2 w-full rounded-2xl border border-white/10 bg-zinc-900 p-4 text-white outline-none transition focus:border-white/30"
              >
                <option value="Insider">Insider</option>
                <option value="Lore">Lore</option>
                <option value="Zitat">Zitat</option>
                <option value="Event">Event</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-semibold text-zinc-300">
                Beteiligte
              </label>

              <input
                name="people"
                defaultValue={entry.people ?? ""}
                className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 p-4 text-white placeholder:text-zinc-500 outline-none transition focus:border-white/30"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-zinc-300">
                Was ist passiert?
              </label>

              <textarea
                name="story"
                required
                defaultValue={entry.story}
                className="mt-2 min-h-32 w-full rounded-2xl border border-white/10 bg-white/5 p-4 text-white placeholder:text-zinc-500 outline-none transition focus:border-white/30"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-zinc-300">
                Warum ist es lustig?
              </label>

              <textarea
                name="whyFunny"
                required
                defaultValue={entry.why_funny}
                className="mt-2 min-h-28 w-full rounded-2xl border border-white/10 bg-white/5 p-4 text-white placeholder:text-zinc-500 outline-none transition focus:border-white/30"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-zinc-300">
                Typische Verwendung / Zitat
              </label>

              <textarea
                name="usage"
                defaultValue={entry.usage ?? ""}
                className="mt-2 min-h-24 w-full rounded-2xl border border-white/10 bg-white/5 p-4 text-white placeholder:text-zinc-500 outline-none transition focus:border-white/30"
              />
            </div>
          </div>

          <button
            type="submit"
            className="mt-8 rounded-full bg-white px-8 py-4 font-semibold text-black transition hover:scale-105 hover:bg-zinc-200"
          >
            Änderungen speichern
          </button>
        </form>
      </section>
    </main>
  );
}