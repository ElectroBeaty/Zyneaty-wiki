import Link from "next/link";
import { createSubmission } from "./actions";

export default async function SubmitPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string }>;
}) {
  const params = await searchParams;
  const success = params.success === "1";

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
          Community Vorschlag
        </p>

        <h1 className="mt-5 text-5xl font-black tracking-tight">
          Insider einreichen
        </h1>

        <p className="mt-4 text-zinc-300">
          Schick einen neuen Insider, eine Legende oder ein komplett unnötiges
          Ereignis ein. Der Vorschlag wird danach geprüft.
        </p>

        {success && (
          <div className="mt-8 rounded-3xl border border-green-500/20 bg-green-500/10 p-6">
            <p className="font-semibold text-green-300">
              ✅ Vorschlag erfolgreich eingereicht
            </p>

            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                href="/wiki"
                className="rounded-full bg-white px-5 py-2 font-semibold text-black transition hover:bg-zinc-200"
              >
                Zurück zum Wiki
              </Link>

              <Link
                href="/submit"
                className="rounded-full border border-white/10 px-5 py-2 font-semibold text-white transition hover:bg-white/10"
              >
                Weiteren Insider einreichen
              </Link>
            </div>
          </div>
        )}

        <form
          action={createSubmission}
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
                placeholder="z.B. Der Marek-Incident"
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
                placeholder="z.B. Marek, Amoun, Dave"
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
                placeholder="Erzähl die Story..."
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
                placeholder="Warum ist das hängen geblieben?"
                className="mt-2 min-h-28 w-full rounded-2xl border border-white/10 bg-white/5 p-4 text-white placeholder:text-zinc-500 outline-none transition focus:border-white/30"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-zinc-300">
                Typische Verwendung / Zitat
              </label>

              <textarea
                name="usage"
                placeholder="z.B. Wird gesagt, wenn jemand wieder komplett lost ist."
                className="mt-2 min-h-24 w-full rounded-2xl border border-white/10 bg-white/5 p-4 text-white placeholder:text-zinc-500 outline-none transition focus:border-white/30"
              />
            </div>
          </div>

          <button
            type="submit"
            className="mt-8 rounded-full bg-white px-8 py-4 font-semibold text-black transition hover:scale-105 hover:bg-zinc-200"
          >
            Vorschlag einreichen
          </button>
        </form>
      </section>
    </main>
  );
}