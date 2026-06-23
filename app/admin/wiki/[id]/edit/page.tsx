import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { isAdminDiscordId } from "@/lib/admin";
import { supabase } from "@/lib/supabase";
import EditWikiEntryForm from "./EditWikiEntryForm";

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
            ? "Eintrag wurde gespeichert. Einzelne Zitat-Felder warten noch auf die Supabase-Migration."
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
  const hasQuoteSpeakerColumn = Object.prototype.hasOwnProperty.call(
    entry,
    "quote_speaker"
  );
  const hasQuoteTextColumn = Object.prototype.hasOwnProperty.call(
    entry,
    "quote_text"
  );
  const quoteTextDefault =
    entry.quote_text?.trim() || (isQuote ? entry.story ?? "" : "");
  const storyDefault =
    isQuote && !entry.quote_text?.trim() ? "" : entry.story ?? "";
  const editableEntry = {
    id,
    title: entry.title,
    category: isQuote ? "Zitat" : "Eintrag",
    people: entry.people ?? "",
    quoteSpeaker: entry.quote_speaker ?? "",
    quoteText: quoteTextDefault,
    story: storyDefault,
    whyFunny: entry.why_funny ?? "",
    usage: entry.usage ?? "",
    mediaUrl: entry.media_url ?? null,
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_right,#ffffff1f,transparent_28%),linear-gradient(135deg,#050505,#111113,#050505)] text-white">
      <section className="mx-auto max-w-3xl px-6 pt-8 pb-16">
        <Link
          href="/wiki"
          className="text-sm text-zinc-400 transition hover:text-white"
        >
          &larr; Zur&uuml;ck zum Wiki
        </Link>

        <p className="mt-6 text-sm uppercase tracking-[0.35em] text-zinc-400">
          Admin Bereich
        </p>

        <h1 className="mt-5 text-5xl font-black tracking-tight">
          Eintrag bearbeiten
        </h1>

        <p className="mt-4 text-zinc-300">
          Bearbeite den Wiki-Eintrag. &Auml;nderungen werden direkt
          gespeichert.
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

        <EditWikiEntryForm
          entry={editableEntry}
          hasQuoteSpeakerColumn={hasQuoteSpeakerColumn}
          hasQuoteTextColumn={hasQuoteTextColumn}
        />
      </section>
    </main>
  );
}
