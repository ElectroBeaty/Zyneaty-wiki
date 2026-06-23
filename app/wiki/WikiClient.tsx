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
          onChange={(e) => setSearch(e.target.value)}
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
            className="group relative flex min-h-72 overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] shadow-2xl shadow-black/20 transition hover:-translate-y-1 hover:border-white/30 hover:bg-white/[0.08]"
          >
            {entry.mediaUrl && entry.mediaType === "image" && (
              <img
                src={entry.mediaUrl}
                alt=""
                className="absolute inset-0 h-full w-full object-cover opacity-50 transition duration-300 group-hover:scale-105 group-hover:opacity-65"
              />
            )}

            {entry.mediaUrl && entry.mediaType === "video" && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/45 text-sm font-semibold uppercase tracking-[0.2em] text-zinc-400 transition group-hover:bg-black/35">
                Video
              </div>
            )}

            {entry.mediaUrl && entry.mediaType === "audio" && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/45 text-sm font-semibold uppercase tracking-[0.2em] text-zinc-400 transition group-hover:bg-black/35">
                Audio
              </div>
            )}

            <div
              className={`absolute inset-0 ${
                entry.mediaUrl
                  ? "bg-gradient-to-t from-black via-black/75 to-black/10"
                  : "bg-gradient-to-br from-white/[0.06] via-transparent to-transparent"
              }`}
            />

            <div className="relative z-10 mt-auto p-6">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-zinc-500">
                  {entry.category}
                </span>

                {entry.mediaUrl && (
                  <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-xs text-zinc-400">
                    Medium
                  </span>
                )}

                {entry.commentCount > 0 && (
                  <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-xs text-zinc-400">
                    {entry.commentCount} Kommentare
                  </span>
                )}
              </div>

              <h2 className="mt-3 text-2xl font-bold group-hover:text-zinc-200">
                {entry.title}
              </h2>

              <p className="mt-3 text-zinc-300">{entry.summary}</p>

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

                  {entry.reactionCount > 0 && entry.topReactions.length === 0 && (
                    <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs font-semibold text-zinc-300">
                      {entry.reactionCount} Reaktionen
                    </span>
                  )}
                </div>
              )}

              <div className="mt-6 text-sm font-semibold text-zinc-300">
                Weiterlesen →
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
