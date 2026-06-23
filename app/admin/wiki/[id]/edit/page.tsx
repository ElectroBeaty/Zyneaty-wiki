import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { isAdminDiscordId } from "@/lib/admin";
import { supabase } from "@/lib/supabase";
import MediaUploadField from "@/components/MediaUploadField";
import { attachUploadedMedia, updateWikiEntry } from "./actions";

export default async function EditWikiEntryPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ status?: string }>;
}) {
  const session = await getServerSession(authOptions);

  if (!isAdminDiscordId(session?.user?.id)) {
    redirect("/denied");
  }

  const { id } = await params;
  const { status } = await searchParams;
  const statusMessage =
    status === "media-updated"
      ? "Medium wurde aktualisiert."
      : status === "media-removed"
        ? "Medium wurde entfernt."
        : status === "saved"
          ? "Eintrag wurde gespeichert."
          : status === "schema-missing"
            ? "Eintrag wurde gespeichert, aber Zitat/Zitat-Sprecher brauchen noch die neue Supabase-Migration."
          : null;
  const isWarningStatus = status === "schema-missing";

  const { data: entry, error } = await supabase
    .from("submissions")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !entry) {
    redirect("/wiki");
  }

  const isQuote = entry.category === "Zitat";
  const quoteTextDefault =
    entry.quote_text?.trim() || (isQuote ? entry.story ?? "" : "");
  const storyDefault =
    isQuote && !entry.quote_text?.trim() ? "" : entry.story ?? "";

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

        {statusMessage && (
          <div
            className={`mt-6 rounded-2xl border p-4 text-sm font-semibold ${
              isWarningStatus
                ? "border-amber-400/20 bg-amber-400/10 text-amber-200"
                : "border-emerald-400/20 bg-emerald-400/10 text-emerald-200"
            }`}
          >
            {statusMessage}
          </div>
        )}

        <form
          action={async (formData) => {
            "use server";
            await updateWikiEntry(id, formData);
          }}
          encType="multipart/form-data"
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
                Typ
              </label>

              <select
                name="category"
                required
                defaultValue={entry.category}
                className="mt-2 w-full rounded-2xl border border-white/10 bg-zinc-900 p-4 text-white outline-none transition focus:border-white/30"
              >
                <option value="Eintrag">Eintrag</option>
                <option value="Zitat">Zitat</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-semibold text-zinc-300">
                Beteiligte
              </label>

              <input
                name="people"
                defaultValue={entry.people ?? ""}
                placeholder="z.B. Marek Tom Dave"
                className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 p-4 text-white placeholder:text-zinc-500 outline-none transition focus:border-white/30"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-zinc-300">
                Zitat-Sprecher optional
              </label>

              <input
                name="quoteSpeaker"
                defaultValue={entry.quote_speaker ?? ""}
                placeholder="z.B. Marek"
                className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 p-4 text-white placeholder:text-zinc-500 outline-none transition focus:border-white/30"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-zinc-300">
                Zitat
              </label>

              <textarea
                name="quoteText"
                defaultValue={quoteTextDefault}
                placeholder='Nur bei Zitaten, z.B. "Achtung, ich kotze gleich!"'
                className="mt-2 min-h-24 w-full rounded-2xl border border-white/10 bg-white/5 p-4 text-white placeholder:text-zinc-500 outline-none transition focus:border-white/30"
              />

              <p className="mt-2 text-sm text-zinc-500">
                Wird nur verwendet, wenn der Typ auf Zitat steht.
              </p>
            </div>

            <div>
              <label className="text-sm font-semibold text-zinc-300">
                {isQuote ? "Story / Was ist passiert?" : "Was ist passiert?"}
              </label>

              <textarea
                name="story"
                required={!isQuote}
                defaultValue={storyDefault}
                className="mt-2 min-h-32 w-full rounded-2xl border border-white/10 bg-white/5 p-4 text-white placeholder:text-zinc-500 outline-none transition focus:border-white/30"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-zinc-300">
                Warum ist es lustig / legendär?
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
                Kontext / Verwendung
              </label>

              <textarea
                name="usage"
                defaultValue={entry.usage ?? ""}
                className="mt-2 min-h-24 w-full rounded-2xl border border-white/10 bg-white/5 p-4 text-white placeholder:text-zinc-500 outline-none transition focus:border-white/30"
              />
            </div>

            <MediaUploadField
              label="Neues Bild, Video oder Audio optional"
              note="Wenn du eine neue Datei auswählst, ersetzt sie das aktuelle Medium. Warte kurz, bis der Upload fertig ist."
              onUploaded={attachUploadedMedia.bind(null, id)}
            />

            <div className="hidden">
              <label className="text-sm font-semibold text-zinc-300">
                Neues Bild, Video oder Audio optional
              </label>

              <input
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/webm,audio/mpeg,audio/mp4,audio/ogg,audio/wav,audio/webm"
                className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-zinc-300 file:mr-4 file:rounded-full file:border-0 file:bg-white file:px-4 file:py-2 file:font-semibold file:text-black hover:file:bg-zinc-200"
              />

              <p className="mt-2 text-sm text-zinc-500">
                Wenn du eine neue Datei auswählst, ersetzt sie das aktuelle Medium.
              </p>
            </div>

            {entry.media_url && (
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-sm font-semibold text-zinc-300">
                  Aktuelles Medium vorhanden
                </p>

                <a
                  href={entry.media_url}
                  target="_blank"
                  className="mt-2 block text-sm text-zinc-400 underline hover:text-white"
                >
                  Medium öffnen
                </a>

                <label className="mt-4 flex items-center gap-2 text-sm text-red-300">
                  <input type="checkbox" name="removeMedia" />
                  Medium entfernen
                </label>
              </div>
            )}
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
