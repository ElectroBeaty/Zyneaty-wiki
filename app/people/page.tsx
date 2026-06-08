import Link from "next/link";
import { supabase } from "@/lib/supabase";

function splitPeople(value: string | null) {
  if (!value) return [];

  return value
    .split(",")
    .map((person) => person.trim())
    .filter(Boolean);
}

export default async function PeoplePage() {
  const { data, error } = await supabase
    .from("submissions")
    .select("people")
    .eq("approved", true);

  if (error) {
    throw new Error(error.message);
  }

  const peopleMap = new Map<string, { name: string; count: number }>();

  for (const entry of data ?? []) {
    for (const person of splitPeople(entry.people)) {
      const key = person.toLowerCase();

      const existing = peopleMap.get(key);

      if (existing) {
        existing.count += 1;
      } else {
        peopleMap.set(key, {
          name: person,
          count: 1,
        });
      }
    }
  }

  const people = Array.from(peopleMap.values()).sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_right,#ffffff1f,transparent_28%),linear-gradient(135deg,#050505,#111113,#050505)] text-white">
      <section className="mx-auto max-w-5xl px-6 pt-8 pb-16">
        <Link href="/wiki" className="text-sm text-zinc-400 hover:text-white">
          ← Zurück zum Wiki
        </Link>

        <div className="mt-8 rounded-[2rem] border border-white/10 bg-white/[0.04] p-8 shadow-2xl shadow-black/30">
          <div className="text-5xl">👥</div>

          <h1 className="mt-6 text-5xl font-black tracking-tight">
            Personen
          </h1>

          <p className="mt-4 text-lg text-zinc-300">
            Alle Legenden, Verdächtigen und Beteiligten aus der Zyneaty Wiki.
          </p>
        </div>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {people.map((person) => (
            <Link
              key={person.name}
              href={`/people/${person.name.toLowerCase()}`}
              className="group rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-black/20 transition hover:-translate-y-1 hover:border-white/30 hover:bg-white/[0.08]"
            >
              <div className="text-4xl">👤</div>

              <h2 className="mt-4 text-2xl font-black group-hover:text-zinc-200">
                {person.name}
              </h2>

              <p className="mt-2 text-zinc-400">
                {person.count} {person.count === 1 ? "Eintrag" : "Einträge"}
              </p>

              <div className="mt-6 text-sm font-semibold text-zinc-300">
                Profil ansehen →
              </div>
            </Link>
          ))}
        </div>

        {people.length === 0 && (
          <div className="mt-10 rounded-3xl border border-white/10 bg-white/[0.04] p-6 text-zinc-400">
            Noch keine Personen vorhanden.
          </div>
        )}
      </section>
    </main>
  );
}