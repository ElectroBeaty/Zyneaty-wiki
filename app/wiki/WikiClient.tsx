"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import WikiEntryCard from "@/components/WikiEntryCard";

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
          <WikiEntryCard key={entry.slug} entry={entry} />
        ))}
      </div>

      {filteredEntries.length === 0 && (
        <p className="mt-10 text-zinc-400">Keine Einträge gefunden.</p>
      )}
    </>
  );
}
