import fs from "fs/promises";
import path from "path";
import Link from "next/link";
import { approveSubmission, deleteSubmission } from "./actions";

type Submission = {
  id: string;
  title: string;
  category: string;
  people: string;
  story: string;
  whyFunny: string;
  usage: string;
  authorName: string;
  createdAt: string;
  approved: boolean;
};

async function getSubmissions(): Promise<Submission[]> {
  const filePath = path.join(process.cwd(), "data", "submissions.json");

  try {
    const raw = await fs.readFile(filePath, "utf-8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export default async function SubmissionsPage() {
  const submissions = await getSubmissions();

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_right,#ffffff1f,transparent_28%),linear-gradient(135deg,#050505,#111113,#050505)] text-white">
      <section className="mx-auto max-w-5xl px-6 pt-8 pb-16">
        <Link href="/wiki" className="text-sm text-zinc-400 hover:text-white">
          ← Zurück zum Wiki
        </Link>

        <h1 className="mt-8 text-5xl font-black tracking-tight">
          Eingereichte Vorschläge
        </h1>

        <p className="mt-4 text-zinc-300">
          Hier landen alle Insider, die von Servermitgliedern vorgeschlagen
          wurden.
        </p>

        <div className="mt-10 space-y-5">
          {submissions.length === 0 && (
            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 text-zinc-400">
              Noch keine Vorschläge vorhanden.
            </div>
          )}

          {submissions.map((submission) => (
            <article
              key={submission.id}
              className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-black/20"
            >
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-zinc-300">
                  {submission.category}
                </span>

                <span className="text-sm text-zinc-500">
                  Eingereicht von {submission.authorName}
                </span>

                <span className="text-sm text-zinc-500">
                  {new Date(submission.createdAt).toLocaleString("de-DE")}
                </span>
              </div>

              <h2 className="mt-5 text-3xl font-black">{submission.title}</h2>

              {submission.people && (
                <p className="mt-3 text-zinc-400">
                  Beteiligte: {submission.people}
                </p>
              )}

              <section className="mt-6">
                <h3 className="font-bold">Was ist passiert?</h3>
                <p className="mt-2 text-zinc-300">{submission.story}</p>
              </section>

              <section className="mt-5">
                <h3 className="font-bold">Warum ist es lustig?</h3>
                <p className="mt-2 text-zinc-300">{submission.whyFunny}</p>
              </section>

              {submission.usage && (
                <section className="mt-5">
                  <h3 className="font-bold">Typische Verwendung</h3>
                  <p className="mt-2 text-zinc-300">{submission.usage}</p>
                </section>
              )}

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <span
                  className={`rounded-full px-3 py-1 text-sm ${
                    submission.approved
                      ? "bg-green-500/20 text-green-300"
                      : "bg-yellow-500/20 text-yellow-300"
                  }`}
                >
                  {submission.approved ? "Freigegeben" : "Offen"}
                </span>

                {!submission.approved && (
                  <form
                    action={async () => {
                      "use server";
                      await approveSubmission(submission.id);
                    }}
                  >
                    <button
                      type="submit"
                      className="rounded-full border border-green-500/20 px-3 py-1 text-sm text-green-300 transition hover:bg-green-500/10"
                    >
                      Freigeben
                    </button>
                  </form>
                )}

                <form
                  action={async () => {
                    "use server";
                    await deleteSubmission(submission.id);
                  }}
                >
                  <button
                    type="submit"
                    className="rounded-full border border-red-500/20 px-3 py-1 text-sm text-red-300 transition hover:bg-red-500/10"
                  >
                    Löschen
                  </button>
                </form>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}