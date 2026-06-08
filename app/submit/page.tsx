import Link from "next/link";
import SubmitForm from "./SubmitForm";

export default async function SubmitPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string }>;
}) {
  const params = await searchParams;
  const success = params.success === "1";
  const duplicate = params.error === "duplicate";

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
          Reiche einen neuen Wiki-Eintrag oder ein legendäres Zitat ein.
          Der Vorschlag wird danach geprüft.
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
                Weiteren Vorschlag einreichen
              </Link>
            </div>
          </div>
        )}

        {duplicate && (
          <div className="mt-8 rounded-3xl border border-red-500/20 bg-red-500/10 p-6">
            <p className="font-semibold text-red-300">
              ⚠️ Ein Eintrag mit diesem Titel existiert bereits.
            </p>
          </div>
        )}

        <SubmitForm />
      </section>
    </main>
  );
}