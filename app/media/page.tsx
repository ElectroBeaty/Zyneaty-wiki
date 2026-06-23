import Link from "next/link";
import { supabase } from "@/lib/supabase";
import {
  createSummary,
  getPrimaryText,
  mapSubmissionToWikiEntry,
} from "@/lib/wiki";
import MediaGalleryClient from "./MediaGalleryClient";

export const dynamic = "force-dynamic";

async function getMediaEntries() {
  const { data, error } = await supabase
    .from("submissions")
    .select("*")
    .eq("approved", true)
    .not("media_url", "is", null)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => {
    const entry = mapSubmissionToWikiEntry(row);

    return {
      ...entry,
      summary: createSummary(getPrimaryText(entry), 120),
    };
  });
}

export default async function MediaPage() {
  const entries = await getMediaEntries();
  const imageCount = entries.filter((entry) => entry.mediaType === "image").length;
  const videoCount = entries.filter((entry) => entry.mediaType === "video").length;
  const audioCount = entries.filter((entry) => entry.mediaType === "audio").length;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_right,#ffffff1f,transparent_28%),linear-gradient(135deg,#050505,#111113,#050505)] text-white">
      <section className="mx-auto max-w-6xl px-6 pt-8 pb-16">
        <Link href="/wiki" className="text-sm text-zinc-400 hover:text-white">
          ← Zurück zum Wiki
        </Link>

        <div className="mt-8 rounded-[2rem] border border-white/10 bg-white/[0.04] p-8 shadow-2xl shadow-black/30">
          <p className="text-sm uppercase tracking-[0.35em] text-zinc-400">
            Uploads
          </p>

          <h1 className="mt-5 text-5xl font-black tracking-tight">
            Mediengalerie
          </h1>

          <p className="mt-4 max-w-2xl text-lg text-zinc-300">
            Alle Bilder, Videos und Audios aus freigegebenen Wiki-Einträgen.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="text-3xl font-black">{imageCount}</div>
              <div className="mt-1 text-sm text-zinc-400">Bilder</div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="text-3xl font-black">{videoCount}</div>
              <div className="mt-1 text-sm text-zinc-400">Videos</div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="text-3xl font-black">{audioCount}</div>
              <div className="mt-1 text-sm text-zinc-400">Audios</div>
            </div>
          </div>
        </div>

        <MediaGalleryClient entries={entries} />
      </section>
    </main>
  );
}
