"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { wikiEntries } from "@/wikiData";

const categories = ["Alle", ...new Set(wikiEntries.map((entry) => entry.category))];

export default function WikiPage() {
  const [activeCategory, setActiveCategory] = useState("Alle");
  const [search, setSearch] = useState("");

  const filteredEntries = useMemo(() => {
    let entries =
      activeCategory === "Alle"
        ? wikiEntries
        : wikiEntries.filter((entry) => entry.category === activeCategory);

    if (!search.trim()) return entries;

    const query = search.toLowerCase();

    return entries.filter(
      (entry) =>
        entry.title.toLowerCase().includes(query) ||
        entry.summary.toLowerCase().includes(query) ||
        entry.people.some((person) => person.toLowerCase().includes(query))
    );
  }, [activeCategory, search]);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_right,#ffffff1f,transparent_28%),linear-gradient(135deg,#050505,#111113,#050505)] text-white">
      <section className="mx-auto max-w-6xl px-6 py-14">
        <Link href="/" className="text-sm text-zinc-400 hover:text-white">
          ← Zurück zur Startseite
        </Link>

        <div className="mt-10">
          <div className="text-5xl">☯</div>
          <h1 className="mt-4 text-5xl font-black tracking-tight">Wiki</h1>
          <p className="mt-4 max-w-2xl text-lg text-zinc-300">
            Alle Insider, Running Gags und Server-Legenden an einem Ort.
          </p>
        </div>

        <div className="mt-8">
          <input
            type="text"
            placeholder="Suche nach Insidern..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-white outline-none transition placeholder:text-zinc-500 focus:border-white/30"
          />
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
              className="group rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-black/20 transition hover:-translate-y-1 hover:border-white/30 hover:bg-white/[0.08]"
            >
              <div className="text-sm text-zinc-500">{entry.category}</div>
              <h2 className="mt-3 text-2xl font-bold group-hover:text-zinc-200">
                {entry.title}
              </h2>
              <p className="mt-3 text-zinc-400">{entry.summary}</p>
              <div className="mt-6 text-sm font-semibold text-zinc-300">
                Weiterlesen →
              </div>
            </Link>
          ))}
        </div>

        {filteredEntries.length === 0 && (
          <p className="mt-10 text-zinc-400">
            Keine Einträge gefunden.
          </p>
        )}
      </section>
    </main>
  );
}