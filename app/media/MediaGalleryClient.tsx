"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type MediaEntry = {
  id: string;
  slug: string;
  title: string;
  category: string;
  story: string;
  mediaUrl: string | null;
  mediaType: string | null;
  summary: string;
};

const filters = [
  { key: "all", label: "Alle" },
  { key: "image", label: "Bilder" },
  { key: "video", label: "Videos" },
  { key: "audio", label: "Audio" },
] as const;

export default function MediaGalleryClient({
  entries,
}: {
  entries: MediaEntry[];
}) {
  const [activeFilter, setActiveFilter] = useState<(typeof filters)[number]["key"]>(
    "all"
  );

  const filteredEntries = useMemo(() => {
    if (activeFilter === "all") return entries;
    return entries.filter((entry) => entry.mediaType === activeFilter);
  }, [activeFilter, entries]);

  return (
    <>
      <div className="mt-8 flex flex-wrap gap-2">
        {filters.map((filter) => {
          const isActive = filter.key === activeFilter;

          return (
            <button
              key={filter.key}
              type="button"
              onClick={() => setActiveFilter(filter.key)}
              className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                isActive
                  ? "border-white bg-white text-black"
                  : "border-white/10 bg-white/5 text-zinc-300 hover:border-white/30 hover:bg-white/10"
              }`}
            >
              {filter.label}
            </button>
          );
        })}
      </div>

      <div className="mt-8 grid gap-5 md:grid-cols-2">
        {filteredEntries.map((entry) => (
          <article
            key={entry.id}
            className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] shadow-2xl shadow-black/20"
          >
            {entry.mediaUrl && entry.mediaType === "image" && (
              <img
                src={entry.mediaUrl}
                alt=""
                className="max-h-[460px] w-full object-cover"
              />
            )}

            {entry.mediaUrl && entry.mediaType === "video" && (
              <video src={entry.mediaUrl} controls className="w-full bg-black" />
            )}

            {entry.mediaUrl && entry.mediaType === "audio" && (
              <div className="bg-black/30 p-6">
                <audio src={entry.mediaUrl} controls className="w-full" />
              </div>
            )}

            <div className="p-6">
              <div className="flex flex-wrap items-center gap-2 text-sm text-zinc-500">
                <span>{entry.category}</span>
                <span>·</span>
                <span>{entry.mediaType}</span>
              </div>

              <h2 className="mt-3 text-2xl font-bold">{entry.title}</h2>

              <p className="mt-3 text-zinc-400">{entry.summary}</p>

              <Link
                href={`/wiki/${entry.slug}`}
                className="mt-6 inline-flex rounded-full border border-white/10 px-4 py-2 text-sm font-semibold text-zinc-300 transition hover:bg-white/10 hover:text-white"
              >
                Eintrag ansehen →
              </Link>
            </div>
          </article>
        ))}
      </div>

      {filteredEntries.length === 0 && (
        <div className="mt-10 rounded-3xl border border-white/10 bg-white/[0.04] p-6 text-zinc-400">
          {entries.length === 0
            ? "Noch keine Medien vorhanden."
            : "Keine Medien in diesem Filter."}
        </div>
      )}
    </>
  );
}
