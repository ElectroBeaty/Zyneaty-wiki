"use client";

import Image from "next/image";
import { useMemo, useState, useTransition } from "react";
import { analyzeDeckList, deleteDeck, saveDeck } from "./actions";

type DeckLabCard = {
  id: string;
  name: string;
  quantity: number;
  section: "main" | "commander" | "sideboard";
  manaCost: string;
  manaValue: number;
  colors: string[];
  colorIdentity: string[];
  typeLine: string;
  oracleText: string;
  imageUrl: string | null;
  rarity: string;
  setName: string;
  priceUsd: string | null;
  priceEur: string | null;
  scryfallUrl: string | null;
  roles: string[];
  isLand: boolean;
};

type DeckLabStats = {
  totalCards: number;
  mainCards: number;
  commanderCards: number;
  landCount: number;
  nonLandCount: number;
  averageManaValue: number;
  manaCurve: Array<{ label: string; count: number }>;
  typeCounts: Record<string, number>;
  roleCounts: Record<string, number>;
  colorCounts: Record<string, number>;
};

type DeckLabAnalysis = {
  cards: DeckLabCard[];
  missing: string[];
  warnings: string[];
  stats: DeckLabStats;
  commanderName: string | null;
};

type DeckLabDeck = {
  id: string;
  name: string;
  format: string;
  commanderName: string | null;
  rawList: string;
  notes: string | null;
  analysis: DeckLabAnalysis;
  createdAt: string;
  updatedAt: string;
};

const starterCommander = "Muldrotha, the Gravetide";

const starterList = `Deck
1 Sol Ring
1 Arcane Signet
1 Sakura-Tribe Elder
1 Beast Within
1 Counterspell
1 Cultivate
1 Rhystic Study
1 Command Tower
1 Forest
1 Island
1 Swamp`;

function formatDate(value: string) {
  return new Date(value).toLocaleString("de-DE", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function getRecordEntries(record: Record<string, number>) {
  return Object.entries(record)
    .filter(([, value]) => value > 0)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

function Metric({
  label,
  value,
  text,
}: {
  label: string;
  value: string | number;
  text: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <div className="text-3xl font-black">{value}</div>
      <div className="mt-1 text-sm font-bold text-zinc-200">{label}</div>
      <p className="mt-1 text-xs leading-5 text-zinc-500">{text}</p>
    </div>
  );
}

function AnalysisPanel({ analysis }: { analysis: DeckLabAnalysis | null }) {
  if (!analysis) {
    return (
      <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 text-zinc-400">
        Fuege eine Deckliste ein und starte die Analyse.
      </section>
    );
  }

  const maxCurve = Math.max(...analysis.stats.manaCurve.map((item) => item.count), 1);
  const commanderCard =
    analysis.cards.find((card) => card.section === "commander") ?? null;

  return (
    <section className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          label="Karten"
          value={analysis.stats.totalCards}
          text={`${analysis.stats.mainCards} Main, ${analysis.stats.commanderCards} Commander`}
        />
        <Metric
          label="Laender"
          value={analysis.stats.landCount}
          text={`${analysis.stats.nonLandCount} Nonlands im Deck`}
        />
        <Metric
          label="Average MV"
          value={analysis.stats.averageManaValue}
          text="ohne Laender gerechnet"
        />
        <Metric
          label="Nicht gefunden"
          value={analysis.missing.length}
          text="Namen, die Scryfall nicht aufloesen konnte"
        />
      </div>

      {analysis.warnings.length > 0 && (
        <div className="rounded-3xl border border-amber-300/20 bg-amber-300/10 p-5">
          <h3 className="text-lg font-black text-amber-100">Hinweise</h3>
          <ul className="mt-3 space-y-2 text-sm leading-6 text-amber-50/85">
            {analysis.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      )}

      {commanderCard && (
        <section className="rounded-3xl border border-emerald-300/20 bg-emerald-300/10 p-5">
          <div className="grid gap-5 md:grid-cols-[160px_1fr]">
            {commanderCard.imageUrl && (
              <a
                href={commanderCard.scryfallUrl ?? undefined}
                target="_blank"
                rel="noreferrer"
                className="block w-fit"
              >
                <Image
                  src={commanderCard.imageUrl}
                  alt=""
                  width={160}
                  height={224}
                  className="rounded-xl border border-white/10 object-cover shadow-2xl shadow-black/30"
                />
              </a>
            )}

            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-emerald-100/60">
                Commander
              </p>
              <h3 className="mt-2 text-2xl font-black">
                {commanderCard.name}
              </h3>
              <p className="mt-2 text-sm text-emerald-50/75">
                {commanderCard.typeLine}
              </p>
              <p className="mt-4 max-h-44 overflow-auto whitespace-pre-wrap text-sm leading-6 text-zinc-200">
                {commanderCard.oracleText || "Kein Oracle-Text gefunden."}
              </p>
            </div>
          </div>
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
          <h3 className="text-lg font-black">Mana Curve</h3>
          <div className="mt-5 grid grid-cols-8 items-end gap-2">
            {analysis.stats.manaCurve.map((item) => (
              <div key={item.label} className="flex min-h-40 flex-col justify-end gap-2">
                <div
                  className="rounded-t-xl bg-orange-300/80"
                  style={{ height: `${Math.max(8, (item.count / maxCurve) * 128)}px` }}
                  title={`${item.count} Karte(n)`}
                />
                <div className="text-center text-xs font-bold text-zinc-400">
                  {item.label}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
          <h3 className="text-lg font-black">Rollen</h3>
          <div className="mt-4 flex flex-wrap gap-2">
            {getRecordEntries(analysis.stats.roleCounts).map(([role, count]) => (
              <span
                key={role}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-zinc-300"
              >
                {role}: {count}
              </span>
            ))}
            {getRecordEntries(analysis.stats.roleCounts).length === 0 && (
              <p className="text-sm text-zinc-500">Noch keine Rollen erkannt.</p>
            )}
          </div>

          <h3 className="mt-6 text-lg font-black">Typen</h3>
          <div className="mt-4 flex flex-wrap gap-2">
            {getRecordEntries(analysis.stats.typeCounts).map(([type, count]) => (
              <span
                key={type}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-zinc-300"
              >
                {type}: {count}
              </span>
            ))}
          </div>
        </section>
      </div>

      {analysis.missing.length > 0 && (
        <div className="rounded-3xl border border-red-300/20 bg-red-300/10 p-5">
          <h3 className="text-lg font-black text-red-100">Nicht gefunden</h3>
          <p className="mt-2 text-sm text-red-50/80">
            {analysis.missing.join(", ")}
          </p>
        </div>
      )}

      <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 className="text-lg font-black">Bilduebersicht</h3>
            <p className="mt-1 text-sm text-zinc-500">
              Zum visuellen Gegencheck, welche Karte gemeint ist.
            </p>
          </div>
          <span className="text-sm text-zinc-500">
            {analysis.cards.length} Karten
          </span>
        </div>

        <div className="mt-5 grid max-h-[760px] grid-cols-2 gap-4 overflow-auto pr-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {analysis.cards.map((card) => (
            <a
              key={`image-${card.section}-${card.id}`}
              href={card.scryfallUrl ?? undefined}
              target="_blank"
              rel="noreferrer"
              className={`group rounded-2xl border p-3 transition hover:bg-white/[0.07] ${
                card.section === "commander"
                  ? "border-emerald-300/30 bg-emerald-300/10"
                  : "border-white/10 bg-black/15"
              }`}
            >
              <div className="aspect-[5/7] overflow-hidden rounded-xl bg-zinc-900">
                {card.imageUrl ? (
                  <Image
                    src={card.imageUrl}
                    alt=""
                    width={220}
                    height={308}
                    className="h-full w-full object-cover transition group-hover:scale-[1.02]"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center px-3 text-center text-xs text-zinc-500">
                    Kein Bild
                  </div>
                )}
              </div>
              <div className="mt-3 text-sm font-bold text-white">
                {card.quantity}x {card.name}
              </div>
              <div className="mt-1 text-xs text-zinc-500">
                {card.section === "commander" ? "Commander" : card.typeLine}
              </div>
            </a>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 className="text-lg font-black">Karten</h3>
            <p className="mt-1 text-sm text-zinc-500">
              Sortiert nach Commander, Mana Value und Name.
            </p>
          </div>
          {analysis.commanderName && (
            <span className="rounded-full bg-emerald-400/15 px-3 py-1 text-sm text-emerald-200">
              Commander: {analysis.commanderName}
            </span>
          )}
        </div>

        <div className="mt-5 overflow-hidden rounded-2xl border border-white/10">
          <div className="max-h-[680px] overflow-auto">
            <table className="w-full min-w-[760px] border-collapse text-left text-sm">
              <thead className="sticky top-0 bg-zinc-950 text-xs uppercase text-zinc-500">
                <tr>
                  <th className="px-4 py-3">Karte</th>
                  <th className="px-4 py-3">MV</th>
                  <th className="px-4 py-3">Typ</th>
                  <th className="px-4 py-3">Rollen</th>
                  <th className="px-4 py-3">Preis</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {analysis.cards.map((card) => (
                  <tr key={`${card.section}-${card.id}`} className="align-top">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {card.imageUrl && (
                          <Image
                            src={card.imageUrl}
                            alt=""
                            width={44}
                            height={64}
                            className="rounded-md object-cover"
                          />
                        )}
                        <div>
                          <div className="font-bold text-white">
                            {card.quantity}x {card.name}
                          </div>
                          <div className="mt-1 text-xs text-zinc-500">
                            {card.section === "commander" ? "Commander" : card.setName}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-zinc-300">{card.manaValue}</td>
                    <td className="max-w-64 px-4 py-3 text-zinc-300">
                      {card.typeLine}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        {card.roles.map((role) => (
                          <span
                            key={role}
                            className="rounded-full bg-white/5 px-2 py-1 text-xs text-zinc-300"
                          >
                            {role}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-zinc-400">
                      {card.priceEur ? `${card.priceEur} EUR` : card.priceUsd ? `$${card.priceUsd}` : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </section>
  );
}

export default function DeckLabClient({
  initialDecks,
  setupError,
}: {
  initialDecks: DeckLabDeck[];
  setupError: string | null;
}) {
  const [decks, setDecks] = useState(initialDecks);
  const [selectedDeckId, setSelectedDeckId] = useState<string | null>(
    initialDecks[0]?.id ?? null
  );
  const selectedDeck = useMemo(
    () => decks.find((deck) => deck.id === selectedDeckId) ?? null,
    [decks, selectedDeckId]
  );
  const [name, setName] = useState(initialDecks[0]?.name ?? "Mein Commander Deck");
  const [format, setFormat] = useState(initialDecks[0]?.format ?? "commander");
  const [commanderName, setCommanderName] = useState(
    initialDecks[0]?.commanderName ?? starterCommander
  );
  const [rawList, setRawList] = useState(initialDecks[0]?.rawList ?? starterList);
  const [notes, setNotes] = useState(initialDecks[0]?.notes ?? "");
  const [analysis, setAnalysis] = useState<DeckLabAnalysis | null>(
    initialDecks[0]?.analysis ?? null
  );
  const [message, setMessage] = useState<string | null>(setupError);
  const [isPending, startTransition] = useTransition();

  function loadDeck(deck: DeckLabDeck) {
    setSelectedDeckId(deck.id);
    setName(deck.name);
    setFormat(deck.format);
    setCommanderName(deck.commanderName ?? "");
    setRawList(deck.rawList);
    setNotes(deck.notes ?? "");
    setAnalysis(deck.analysis);
    setMessage(null);
  }

  function startNewDeck() {
    setSelectedDeckId(null);
    setName("Neues Commander Deck");
    setFormat("commander");
    setCommanderName("");
    setRawList(starterList);
    setNotes("");
    setAnalysis(null);
    setMessage(null);
  }

  function runAnalysis() {
    setMessage(null);
    startTransition(async () => {
      try {
        const result = await analyzeDeckList(rawList, format, commanderName);
        setAnalysis(result);
        setCommanderName(result.commanderName ?? commanderName);
        setMessage("Analyse fertig.");
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Analyse fehlgeschlagen.");
      }
    });
  }

  function saveCurrentDeck() {
    setMessage(null);
    startTransition(async () => {
      try {
        const savedDeck = await saveDeck({
          id: selectedDeckId ?? undefined,
          name,
          format,
          commanderName,
          rawList,
          notes,
        });

        setSelectedDeckId(savedDeck.id);
        setCommanderName(savedDeck.commanderName ?? commanderName);
        setAnalysis(savedDeck.analysis);
        setDecks((currentDecks) => {
          const withoutSaved = currentDecks.filter((deck) => deck.id !== savedDeck.id);
          return [savedDeck, ...withoutSaved];
        });
        setMessage("Deck gespeichert.");
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Speichern fehlgeschlagen.");
      }
    });
  }

  function deleteCurrentDeck() {
    if (!selectedDeckId) return;

    setMessage(null);
    startTransition(async () => {
      try {
        await deleteDeck(selectedDeckId);
        setDecks((currentDecks) =>
          currentDecks.filter((deck) => deck.id !== selectedDeckId)
        );
        startNewDeck();
        setMessage("Deck geloescht.");
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Loeschen fehlgeschlagen.");
      }
    });
  }

  return (
    <div className="grid gap-8 xl:grid-cols-[320px_1fr]">
      <aside className="space-y-4">
        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-black">Deine Decks</h2>
            <button
              type="button"
              onClick={startNewDeck}
              className="rounded-full border border-white/15 px-3 py-1 text-sm font-semibold text-zinc-200 transition hover:bg-white/10"
            >
              Neu
            </button>
          </div>

          <div className="mt-4 space-y-2">
            {decks.length === 0 && (
              <p className="rounded-2xl border border-dashed border-white/10 p-4 text-sm leading-6 text-zinc-500">
                Noch keine gespeicherten Decks.
              </p>
            )}

            {decks.map((deck) => (
              <button
                key={deck.id}
                type="button"
                onClick={() => loadDeck(deck)}
                className={`w-full rounded-2xl border p-4 text-left transition ${
                  deck.id === selectedDeckId
                    ? "border-orange-200/40 bg-orange-200/10"
                    : "border-white/10 bg-black/15 hover:bg-white/5"
                }`}
              >
                <span className="block font-bold text-white">{deck.name}</span>
                <span className="mt-1 block text-xs text-zinc-500">
                  {deck.commanderName ?? deck.format} - {formatDate(deck.updatedAt)}
                </span>
              </button>
            ))}
          </div>
        </div>

        {selectedDeck && (
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
            <p className="text-sm text-zinc-500">Ausgewaehlt</p>
            <p className="mt-1 font-bold">{selectedDeck.name}</p>
            <button
              type="button"
              onClick={deleteCurrentDeck}
              disabled={isPending}
              className="mt-4 rounded-full border border-red-400/25 px-4 py-2 text-sm font-semibold text-red-200 transition hover:bg-red-400/10 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Loeschen
            </button>
          </div>
        )}
      </aside>

      <section className="space-y-6">
        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
          <div className="grid gap-4 lg:grid-cols-[1fr_1fr_180px]">
            <label className="block">
              <span className="text-sm font-bold text-zinc-300">Deckname</span>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-white/10 bg-zinc-900 px-4 py-3 text-white outline-none transition focus:border-orange-200/50"
              />
            </label>

            <label className="block">
              <span className="text-sm font-bold text-zinc-300">Commander</span>
              <input
                value={commanderName}
                onChange={(event) => setCommanderName(event.target.value)}
                placeholder="z. B. Muldrotha, the Gravetide"
                className="mt-2 w-full rounded-2xl border border-white/10 bg-zinc-900 px-4 py-3 text-white outline-none transition focus:border-orange-200/50"
              />
            </label>

            <label className="block">
              <span className="text-sm font-bold text-zinc-300">Format</span>
              <select
                value={format}
                onChange={(event) => setFormat(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-white/10 bg-zinc-900 px-4 py-3 text-white outline-none transition focus:border-orange-200/50"
              >
                <option value="commander">Commander</option>
                <option value="casual">Casual</option>
              </select>
            </label>
          </div>

          <label className="mt-4 block">
            <span className="text-sm font-bold text-zinc-300">Deckliste</span>
            <textarea
              value={rawList}
              onChange={(event) => setRawList(event.target.value)}
              rows={16}
              className="mt-2 w-full resize-y rounded-2xl border border-white/10 bg-zinc-900 px-4 py-3 font-mono text-sm leading-6 text-white outline-none transition focus:border-orange-200/50"
              spellCheck={false}
            />
          </label>

          <label className="mt-4 block">
            <span className="text-sm font-bold text-zinc-300">Notizen</span>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={3}
              className="mt-2 w-full resize-y rounded-2xl border border-white/10 bg-zinc-900 px-4 py-3 text-sm leading-6 text-white outline-none transition focus:border-orange-200/50"
            />
          </label>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={runAnalysis}
              disabled={isPending}
              className="rounded-full bg-white px-5 py-2 text-sm font-bold text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Analysieren
            </button>

            <button
              type="button"
              onClick={saveCurrentDeck}
              disabled={isPending || Boolean(setupError)}
              className="rounded-full bg-orange-300 px-5 py-2 text-sm font-bold text-black transition hover:bg-orange-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Speichern
            </button>

            {message && (
              <span className="text-sm text-zinc-400" role="status">
                {message}
              </span>
            )}
          </div>
        </div>

        <AnalysisPanel analysis={analysis} />
      </section>
    </div>
  );
}
