import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { isAdminDiscordId } from "@/lib/admin";
import { supabase } from "@/lib/supabase";
import { approveSubmission, deleteSubmission } from "./actions";

type Submission = {
  id: string;
  title: string;
  category: string;
  people: string | null;
  quote_speaker: string | null;
  quote_text: string | null;
  story: string;
  why_funny: string;
  usage: string | null;
  author_name: string;
  created_at: string;
  approved: boolean;
  media_url: string | null;
  media_type: string | null;
};

function splitPeople(value: string | null) {
  if (!value) return [];

  return value
    .split(",")
    .map((person) => person.trim())
    .filter(Boolean);
}

function getSubmissionPrimaryText(submission: Submission) {
  if (submission.category === "Zitat") {
    return submission.quote_text?.trim() || submission.story;
  }

  return submission.story;
}

function getSubmissionQuoteStory(submission: Submission) {
  if (submission.category !== "Zitat" || !submission.quote_text?.trim()) {
    return "";
  }

  return submission.story.trim();
}

function MediaPreview({
  mediaUrl,
  mediaType,
}: {
  mediaUrl: string | null;
  mediaType: string | null;
}) {
  if (!mediaUrl || !mediaType) return null;

  return (
    <section className="mt-6 rounded-3xl border border-white/10 bg-black/20 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h4 className="font-bold">Hochgeladenes Medium</h4>

        <a
          href={mediaUrl}
          target="_blank"
          className="text-sm text-zinc-400 underline transition hover:text-white"
        >
          In neuem Tab öffnen
        </a>
      </div>

      {mediaType === "image" && (
        <img
          src={mediaUrl}
          alt=""
          className="max-h-[420px] w-full rounded-2xl object-contain"
        />
      )}

      {mediaType === "video" && (
        <video src={mediaUrl} controls className="w-full rounded-2xl" />
      )}

      {mediaType === "audio" && (
        <audio src={mediaUrl} controls className="w-full" />
      )}
    </section>
  );
}

async function getSubmissions(): Promise<Submission[]> {
  const { data, error } = await supabase
    .from("submissions")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

export default async function SubmissionsPage() {
  const session = await getServerSession(authOptions);

  if (!isAdminDiscordId(session?.user?.id)) {
    redirect("/denied");
  }

  const submissions = await getSubmissions();

  const openSubmissions = submissions.filter((item) => !item.approved);
  const approvedSubmissions = submissions.filter((item) => item.approved);

  const people = new Set(
    approvedSubmissions.flatMap((item) => splitPeople(item.people))
  );

  const mediaCount = submissions.filter((item) => item.media_url).length;

  const stats = [
    {
      label: "Offen",
      value: openSubmissions.length,
      text: "wartende Vorschläge",
    },
    {
      label: "Freigegeben",
      value: approvedSubmissions.length,
      text: "sichtbare Wiki-Einträge",
    },
    {
      label: "Personen",
      value: people.size,
      text: "beteiligte Namen",
    },
    {
      label: "Medien",
      value: mediaCount,
      text: "Uploads insgesamt",
    },
  ];

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_right,#ffffff1f,transparent_28%),linear-gradient(135deg,#050505,#111113,#050505)] text-white">
      <section className="mx-auto max-w-5xl px-6 pt-8 pb-16">
        <Link href="/wiki" className="text-sm text-zinc-400 hover:text-white">
          ← Zurück zum Wiki
        </Link>

        <h1 className="mt-8 text-5xl font-black tracking-tight">
          Admin Dashboard
        </h1>

        <p className="mt-4 text-zinc-300">
          Hier prüfst du Vorschläge, gibst Einträge frei und behältst den
          Überblick über die Zyneaty Wiki.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/20"
            >
              <div className="text-4xl font-black">{stat.value}</div>
              <div className="mt-2 text-lg font-bold">{stat.label}</div>
              <p className="mt-1 text-sm text-zinc-400">{stat.text}</p>
            </div>
          ))}
        </div>

        <div className="mt-12">
          <h2 className="text-3xl font-black tracking-tight">
            Offene Vorschläge
          </h2>

          <div className="mt-6 space-y-5">
            {openSubmissions.length === 0 && (
              <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 text-zinc-400">
                Keine offenen Vorschläge.
              </div>
            )}

            {openSubmissions.map((submission) => (
              <article
                key={submission.id}
                className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-black/20"
              >
                <div className="flex flex-wrap items-center gap-3">
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-zinc-300">
                    {submission.category}
                  </span>

                  {submission.media_url && (
                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-zinc-300">
                      {submission.media_type === "image" && "📷 Bild"}
                      {submission.media_type === "video" && "🎬 Video"}
                      {submission.media_type === "audio" && "🎵 Audio"}
                    </span>
                  )}

                  <span className="text-sm text-zinc-500">
                    Eingereicht von {submission.author_name}
                  </span>

                  <span className="text-sm text-zinc-500">
                    {new Date(submission.created_at).toLocaleString("de-DE")}
                  </span>
                </div>

                <h3 className="mt-5 text-3xl font-black">
                  {submission.title}
                </h3>

                {submission.people && (
                  <p className="mt-3 text-zinc-400">
                    Beteiligte: {submission.people}
                  </p>
                )}

                {submission.category === "Zitat" &&
                  submission.quote_speaker && (
                    <p className="mt-2 text-zinc-400">
                      Gesagt von: {submission.quote_speaker}
                    </p>
                  )}

                <MediaPreview
                  mediaUrl={submission.media_url}
                  mediaType={submission.media_type}
                />

                <section className="mt-6">
                  <h4 className="font-bold">
                    {submission.category === "Zitat"
                      ? "Zitat"
                      : "Was ist passiert?"}
                  </h4>
                  <p className="mt-2 whitespace-pre-wrap text-zinc-300">
                    {getSubmissionPrimaryText(submission)}
                  </p>
                </section>

                {getSubmissionQuoteStory(submission) && (
                  <section className="mt-5">
                    <h4 className="font-bold">Story</h4>
                    <p className="mt-2 whitespace-pre-wrap text-zinc-300">
                      {getSubmissionQuoteStory(submission)}
                    </p>
                  </section>
                )}

                <section className="mt-5">
                  <h4 className="font-bold">
                    {submission.category === "Zitat"
                      ? "Warum ist es legendär?"
                      : "Warum ist es lustig?"}
                  </h4>
                  <p className="mt-2 text-zinc-300">
                    {submission.why_funny}
                  </p>
                </section>

                {submission.usage && (
                  <section className="mt-5">
                    <h4 className="font-bold">
                      {submission.category === "Zitat"
                        ? "Kontext"
                        : "Typische Verwendung"}
                    </h4>
                    <p className="mt-2 text-zinc-300">{submission.usage}</p>
                  </section>
                )}

                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <span className="rounded-full bg-yellow-500/20 px-3 py-1 text-sm text-yellow-300">
                    Offen
                  </span>

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
        </div>

        <div className="mt-14">
          <h2 className="text-3xl font-black tracking-tight">
            Freigegebene Einträge
          </h2>

          <div className="mt-6 space-y-4">
            {approvedSubmissions.length === 0 && (
              <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 text-zinc-400">
                Noch keine freigegebenen Einträge.
              </div>
            )}

            {approvedSubmissions.map((submission) => (
              <div
                key={submission.id}
                className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-white/10 bg-white/[0.04] p-5"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="rounded-full bg-green-500/20 px-3 py-1 text-sm text-green-300">
                      Freigegeben
                    </span>

                    <span className="text-sm text-zinc-500">
                      {submission.category}
                    </span>

                    {submission.media_url && (
                      <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-xs text-zinc-400">
                        Medium
                      </span>
                    )}
                  </div>

                  <h3 className="mt-3 text-xl font-bold">
                    {submission.title}
                  </h3>

                  {submission.people && (
                    <p className="mt-1 text-sm text-zinc-400">
                      Beteiligte: {submission.people}
                    </p>
                  )}

                  {submission.category === "Zitat" &&
                    submission.quote_speaker && (
                      <p className="mt-1 text-sm text-zinc-400">
                        Gesagt von: {submission.quote_speaker}
                      </p>
                    )}
                </div>

                <div className="flex flex-wrap gap-3">
                  {submission.media_url && (
                    <a
                      href={submission.media_url}
                      target="_blank"
                      className="rounded-full border border-white/10 px-3 py-1 text-sm text-zinc-300 transition hover:bg-white/10"
                    >
                      Medium ansehen
                    </a>
                  )}

                  <Link
                    href="/wiki"
                    className="rounded-full border border-white/10 px-3 py-1 text-sm text-zinc-300 transition hover:bg-white/10"
                  >
                    Im Wiki ansehen
                  </Link>

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
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
