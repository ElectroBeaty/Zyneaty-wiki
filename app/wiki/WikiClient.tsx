"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

type WikiEntry = {
  slug: string;
  title: string;
  category: string;
  summary: string;
  people: string[];
  mediaUrl: string | null;
  mediaType: string | null;
  commentCount: number;
  reactionCount: number;
  topReactions: Array<{
    label: string;
    count: number;
  }>;
};

function getMediaLabel(mediaType: string | null) {
  if (mediaType === "image") return "Bild";
  if (mediaType === "video") return "Video";
  if (mediaType === "audio") return "Audio";
  return "Medium";
}

function MediaPreview({ entry }: { entry: WikiEntry }) {
  if (!entry.mediaUrl || !entry.mediaType) return null;

  if (entry.mediaType === "image") {
    return (
      <img
        src={entry.mediaUrl}
        alt=""
        className="absolute inset-0 h-full w-full object-cover opacity-55 transition duration-300 group-hover:scale-105 group-hover:opacity-70"
      />
    );
  }

  if (entry.mediaType === "video") {
    return (
      <video
        src={entry.mediaUrl}
        muted
        playsInline
        preload="metadata"
        className="absolute inset-0 h-full w-full object-cover opacity-45 transition duration-300 group-hover:scale-105 group-hover:opacity-60"
      />
    );
  }

  return (
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,#ffffff20,transparent_32%),linear-gradient(135deg,#161616,#050505)] opacity-95">
      <div className="absolute right-6 top-6 flex h-20 items-end gap-1.5 opacity-50">
        {[32, 52, 38, 68, 44, 58, 28].map((height, index) => (
          <span
            key={`${height}-${index}`}
            className="w-2 rounded-full bg-white"
            style={{ height }}
          />
        ))}
      </div>
    </div>
  );
}

function MediaPill({ mediaType }: { mediaType: string | null }) {
  if (mediaType === "audio") {
    return (
      <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold text-zinc-300 backdrop-blur">
        <span className="h-2 w-2 rounded-full bg-white" />
        Audio vorhanden
      </div>
    );
  }

  if (mediaType === "video") {
    return (
      <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold text-zinc-300 backdrop-blur">
        <span className="h-0 w-0 border-y-[5px] border-l-[8px] border-y-transparent border-l-white" />
        Video vorhanden
      </div>
    );
  }

  return null;
}

export default function WikiClient({ entries }: { entries: WikiEntry[] }) {
  const router = useRouter();
  const [activeCategory, setActiveCategory] = useState("Alle");
  const [search, setSearch] = useState("");

  const categories = useMemo(
    () => ["Alle", ...new Set(entries.map((entry) => entry.category))],
    [entries]
  );

  const filteredEntries = useMemo(() => {
    const result =
      activeCategory === "Alle"
        ? entries
        : entries.filter((entry) => entry.category === activeCategory);

    if (!search.trim()) return result;

    const query = search.toLowerCase();

    return result.filter(
      (entry) =>
        entry.title.toLowerCase().includes(query) ||
        entry.summary.toLowerCase().includes(query) ||
        entry.people.some((person) => person.toLowerCase().includes(query))
    );
  }, [activeCategory, search, entries]);

  function openRandomEntry() {
    if (entries.length === 0) return;

    const randomEntry = entries[Math.floor(Math.random() * entries.length)];
    router.push(`/wiki/${randomEntry.slug}`);
  }

  return (
    <>
      <div className="mt-10 flex flex-col gap-3 sm:flex-row">
        <input
          type="text"
          placeholder="Suche nach Insidern..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-white outline-none transition placeholder:text-zinc-500 focus:border-white/30"
        />

        <button
          type="button"
          onClick={openRandomEntry}
          disabled={entries.length === 0}
          className="rounded-2xl border border-white/10 bg-white px-5 py-4 font-semibold text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Zufälliger Eintrag
        </button>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {categories.map((category) => {
          const isActive = activeCategory === category;

          return (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`rounded-full border px-4 py-2 text-sm transition ${
                isActive
                  ? "border-white bg-white text-black"
                  : "border-white/10 bg-white/5 text-zinc-300 hover:border-white/30 hover:bg-white/10"
              }`}
            >
              {category}
            </button>
          );
        })}
      </div>

      <div className="mt-10 grid gap-5 md:grid-cols-2">
        {filteredEntries.map((entry) => (
          <Link
            key={entry.slug}
            href={`/wiki/${entry.slug}`}
            className="group relative flex min-h-[300px] overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] shadow-2xl shadow-black/20 transition hover:-translate-y-1 hover:border-white/30 hover:bg-white/[0.08]"
          >
            <MediaPreview entry={entry} />

            <div
              className={`absolute inset-0 ${
                entry.mediaUrl
                  ? "bg-gradient-to-t from-black via-black/75 to-black/15"
                  : "bg-gradient-to-br from-white/[0.06] via-transparent to-transparent"
              }`}
            />

            <div className="relative z-10 flex min-h-[300px] w-full flex-col justify-between p-6">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-zinc-500">
                  {entry.category}
                </span>

                {entry.mediaUrl && (
                  <span className="rounded-full border border-white/10 bg-white/10 px-2 py-1 text-xs font-semibold text-zinc-300 backdrop-blur">
                    {getMediaLabel(entry.mediaType)}
                  </span>
                )}

                {entry.commentCount > 0 && (
                  <span className="rounded-full border border-white/10 bg-white/10 px-2 py-1 text-xs text-zinc-300 backdrop-blur">
                    {entry.commentCount} Kommentare
                  </span>
                )}
              </div>

              <div>
                <MediaPill mediaType={entry.mediaType} />

                <h2 className="text-2xl font-bold group-hover:text-zinc-200">
                  {entry.title}
                </h2>

                <p className="mt-3 max-w-2xl text-zinc-300">
                  {entry.summary}
                </p>

                {(entry.reactionCount > 0 || entry.commentCount > 0) && (
                  <div className="mt-5 flex flex-wrap gap-2">
                    {entry.topReactions.map((reaction) => (
                      <span
                        key={reaction.label}
                        className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs font-semibold text-zinc-300"
                      >
                        {reaction.label} · {reaction.count}
                      </span>
                    ))}

                    {entry.reactionCount > 0 &&
                      entry.topReactions.length === 0 && (
                        <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs font-semibold text-zinc-300">
                          🔥 Fire · {entry.reactionCount}
                        </span>
                      )}
                  </div>
                )}

                <div className="mt-6 text-sm font-semibold text-zinc-300">
                  Weiterlesen →
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {filteredEntries.length === 0 && (
        <p className="mt-10 text-zinc-400">Keine Einträge gefunden.</p>
      )}
    </>
  );
}
