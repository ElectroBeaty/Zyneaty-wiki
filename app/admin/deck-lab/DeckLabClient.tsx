"use client";

import Image from "next/image";
import type { FocusEvent, MouseEvent } from "react";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  analyzeDeckList,
  deleteDeck,
  saveDeck,
} from "./actions";

type DeckLabCard = {
  id: string;
  name: string;
  quantity: number;
  section: "main" | "commander" | "sideboard";
  importedName?: string;
  setCode?: string | null;
  collectorNumber?: string | null;
  matchNote?: string | null;
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

type DeckLabCorrection = {
  input: string;
  matched: string;
  note: string;
};

type DeckLabRecommendation = {
  title: string;
  reason: string;
  source: "curated" | "scryfall";
  cards: Array<{
    name: string;
    reason: string;
    imageUrl?: string | null;
    scryfallUrl?: string | null;
    typeLine?: string;
    oracleText?: string;
    setCode?: string | null;
    collectorNumber?: string | null;
    rarity?: string | null;
    setName?: string | null;
    manaValue?: number;
  }>;
};

type DeckLabCutSuggestion = {
  name: string;
  quantity: number;
  reason: string;
  priority: "hoch" | "mittel" | "niedrig";
  score: number;
  imageUrl?: string | null;
  scryfallUrl?: string | null;
  typeLine?: string;
  oracleText?: string;
  roles: string[];
  manaValue?: number;
  setCode?: string | null;
  collectorNumber?: string | null;
  rarity?: string | null;
  setName?: string | null;
  matchNote?: string | null;
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
  corrections: DeckLabCorrection[];
  recommendations: DeckLabRecommendation[];
  cutSuggestions: DeckLabCutSuggestion[];
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

type ActiveTask = "analysis" | "save" | "delete";

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

const cardPreviewWidth = 340;
const cardPreviewHeight = 532;

type PreviewCard = {
  name: string;
  imageUrl?: string | null;
  setCode?: string | null;
  collectorNumber?: string | null;
  matchNote?: string | null;
  rarity?: string | null;
  setName?: string | null;
};

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

function getPrintLabel(card: PreviewCard) {
  const setCode = card.setCode?.toUpperCase();

  if (setCode && card.collectorNumber) {
    return `${setCode} #${card.collectorNumber}`;
  }

  if (setCode) return setCode;

  return card.setName || "Druck unbekannt";
}

function getSectionLabel(card: DeckLabCard) {
  if (card.section === "commander") return "Commander";
  if (card.section === "sideboard") return "Sideboard";

  return card.typeLine;
}

function getCutPriorityClass(priority: DeckLabCutSuggestion["priority"]) {
  if (priority === "hoch") {
    return "border-red-200/25 bg-red-300/15 text-red-100";
  }

  if (priority === "mittel") {
    return "border-orange-200/25 bg-orange-300/15 text-orange-100";
  }

  return "border-white/10 bg-white/5 text-zinc-300";
}

function estimateAnalysisSeconds(rawList: string) {
  const cardLineCount = rawList
    .split(/\r?\n/)
    .filter((line) =>
      /^\s*(?:(?:SB|Sideboard):\s*)?\d+\s*x?\s+\S+/i.test(line)
    ).length;

  return Math.min(90, Math.max(20, Math.ceil(cardLineCount * 0.8)));
}

function formatDuration(seconds: number) {
  if (seconds < 60) return `${seconds}s`;

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  return remainingSeconds > 0
    ? `${minutes}m ${remainingSeconds}s`
    : `${minutes}m`;
}

function getPreviewPositionFromMouse(event: MouseEvent<HTMLElement>) {
  const left = Math.min(
    event.clientX + 18,
    window.innerWidth - cardPreviewWidth - 16
  );
  const top = Math.min(
    event.clientY + 18,
    window.innerHeight - cardPreviewHeight - 16
  );

  return {
    left: Math.max(16, left),
    top: Math.max(16, top),
  };
}

function getPreviewPositionFromFocus(event: FocusEvent<HTMLElement>) {
  const rect = event.currentTarget.getBoundingClientRect();
  const left = Math.min(
    rect.right + 16,
    window.innerWidth - cardPreviewWidth - 16
  );
  const top = Math.min(rect.top, window.innerHeight - cardPreviewHeight - 16);

  return {
    left: Math.max(16, left),
    top: Math.max(16, top),
  };
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

function CardPreview({
  card,
  position,
}: {
  card: PreviewCard | null;
  position: { left: number; top: number };
}) {
  if (!card?.imageUrl) return null;

  return (
    <div
      className="pointer-events-none fixed z-50 hidden w-[340px] rounded-2xl border border-white/15 bg-zinc-950/95 p-3 shadow-2xl shadow-black/60 backdrop-blur md:block"
      style={{ left: position.left, top: position.top }}
    >
      <Image
        src={card.imageUrl}
        alt=""
        width={316}
        height={442}
        className="w-full rounded-xl border border-white/10 object-cover"
      />
      <div className="mt-3 text-sm font-black text-white">{card.name}</div>
      <div className="mt-1 flex items-center justify-between gap-3 text-xs text-zinc-400">
        <span>{getPrintLabel(card)}</span>
        <span>{card.rarity || "unknown"}</span>
      </div>
      {card.matchNote && (
        <div className="mt-2 rounded-xl border border-amber-200/15 bg-amber-200/10 px-3 py-2 text-xs leading-5 text-amber-50/85">
          {card.matchNote}
        </div>
      )}
    </div>
  );
}

function AnalysisPanel({ analysis }: { analysis: DeckLabAnalysis | null }) {
  const [previewCard, setPreviewCard] = useState<PreviewCard | null>(null);
  const [previewPosition, setPreviewPosition] = useState({ left: 16, top: 16 });
  const [activeRole, setActiveRole] = useState<string | null>(null);
  const imageOverviewRef = useRef<HTMLElement | null>(null);

  if (!analysis) {
    return (
      <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 text-zinc-400">
        Füge eine Deckliste ein und starte die Analyse.
      </section>
    );
  }

  const maxCurve = Math.max(...analysis.stats.manaCurve.map((item) => item.count), 1);
  const commanderCard =
    analysis.cards.find((card) => card.section === "commander") ?? null;
  const roleEntries = getRecordEntries(analysis.stats.roleCounts);
  const selectedRole =
    activeRole && roleEntries.some(([role]) => role === activeRole)
      ? activeRole
      : null;
  const imageCards = selectedRole
    ? analysis.cards.filter((card) => card.roles.includes(selectedRole))
    : analysis.cards;
  const imageCardCount = imageCards.reduce(
    (total, card) => total + card.quantity,
    0
  );
  const coreCoverage = [
    { label: "Ramp", count: analysis.stats.roleCounts.Ramp ?? 0, target: 10 },
    { label: "Draw", count: analysis.stats.roleCounts.Draw ?? 0, target: 10 },
    {
      label: "Interaction",
      count: analysis.stats.roleCounts.Interaction ?? 0,
      target: 9,
    },
    {
      label: "Boardwipes",
      count: analysis.stats.roleCounts.Boardwipe ?? 0,
      target: 2,
    },
  ];
  const coveredCoreAreas = coreCoverage.filter(
    (item) => item.count >= item.target
  ).length;
  const shouldExplainFewRecommendations = analysis.recommendations.length <= 2;

  function showPreview(card: PreviewCard, event: MouseEvent<HTMLElement>) {
    setPreviewCard(card);
    setPreviewPosition(getPreviewPositionFromMouse(event));
  }

  function showPreviewFromFocus(
    card: PreviewCard,
    event: FocusEvent<HTMLElement>
  ) {
    setPreviewCard(card);
    setPreviewPosition(getPreviewPositionFromFocus(event));
  }

  function selectRoleFilter(role: string | null) {
    setActiveRole(role);
    imageOverviewRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  return (
    <section className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          label="Karten"
          value={analysis.stats.totalCards}
          text={`${analysis.stats.mainCards} Main, ${analysis.stats.commanderCards} Commander`}
        />
        <Metric
          label="Länder"
          value={analysis.stats.landCount}
          text={`${analysis.stats.nonLandCount} Nonlands im Deck`}
        />
        <Metric
          label="Average MV"
          value={analysis.stats.averageManaValue}
          text="ohne Länder gerechnet"
        />
        <Metric
          label="Nicht gefunden"
          value={analysis.missing.length}
          text="Namen, die Scryfall nicht auflösen konnte"
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

      {analysis.corrections?.length > 0 && (
        <div className="rounded-3xl border border-sky-300/20 bg-sky-300/10 p-5">
          <h3 className="text-lg font-black text-sky-100">Fallbacks</h3>
          <div className="mt-3 grid gap-2">
            {analysis.corrections.map((correction) => (
              <div
                key={`${correction.input}-${correction.matched}`}
                className="rounded-2xl border border-white/10 bg-black/15 px-4 py-3 text-sm text-sky-50/85"
              >
                <span className="font-bold text-white">{correction.input}</span>
                <span className="text-sky-100/50">{" -> "}</span>
                <span>{correction.matched}</span>
                <span className="mt-1 block text-xs text-sky-100/60">
                  {correction.note}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {shouldExplainFewRecommendations && (
        <section className="rounded-3xl border border-emerald-300/20 bg-emerald-300/10 p-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h3 className="text-lg font-black text-emerald-100">
                Analyse-Einschätzung
              </h3>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-emerald-50/75">
                Wenige Empfehlungsbereiche sind nicht automatisch schlecht. Die
                Analyse trennt Pflichtlücken von Upgrade-Impulsen und bleibt
                beim Commander-Plan, statt falsche Themes in das Deck zu lesen.
              </p>
            </div>
            <span className="rounded-full bg-black/20 px-3 py-1 text-xs text-emerald-50/75">
              {coveredCoreAreas}/4 Kernbereiche gedeckt
            </span>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {coreCoverage.map((item) => {
              const covered = item.count >= item.target;

              return (
                <span
                  key={item.label}
                  className={`rounded-full border px-3 py-1 text-sm ${
                    covered
                      ? "border-emerald-200/25 bg-emerald-300/10 text-emerald-100"
                      : "border-orange-200/25 bg-orange-300/10 text-orange-100"
                  }`}
                >
                  {item.label}: {item.count}/{item.target}
                </span>
              );
            })}
          </div>
        </section>
      )}

      {analysis.cutSuggestions?.length > 0 && (
        <section className="rounded-3xl border border-orange-300/20 bg-orange-300/10 p-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h3 className="text-lg font-black text-orange-100">
                Prüfslots für Cuts
              </h3>
              <p className="mt-1 text-sm text-orange-50/70">
                Konservative Hinweise auf austauschbare Slots. Gute Karten
                können trotzdem bleiben, wenn sie für deinen Spielplan wichtig
                sind.
              </p>
            </div>
            <span className="rounded-full bg-black/20 px-3 py-1 text-xs text-orange-50/75">
              {analysis.cutSuggestions.length} Kandidaten
            </span>
          </div>

          <div className="mt-5 grid gap-3 lg:grid-cols-2">
            {analysis.cutSuggestions.map((card) => (
              <a
                key={`cut-${card.name}-${card.setCode ?? "set"}`}
                href={card.scryfallUrl ?? undefined}
                target={card.scryfallUrl ? "_blank" : undefined}
                rel={card.scryfallUrl ? "noreferrer" : undefined}
                tabIndex={0}
                onMouseEnter={(event) => showPreview(card, event)}
                onMouseMove={(event) =>
                  setPreviewPosition(getPreviewPositionFromMouse(event))
                }
                onMouseLeave={() => setPreviewCard(null)}
                onFocus={(event) => showPreviewFromFocus(card, event)}
                onBlur={() => setPreviewCard(null)}
                className="group flex min-h-28 gap-3 rounded-2xl border border-white/10 bg-black/15 p-3 text-left outline-none transition hover:border-orange-200/35 hover:bg-white/[0.06] focus-visible:border-orange-200/45 focus-visible:bg-white/[0.06]"
              >
                <div className="h-24 w-16 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-zinc-900">
                  {card.imageUrl ? (
                    <Image
                      src={card.imageUrl}
                      alt=""
                      width={64}
                      height={96}
                      className="h-full w-full object-cover transition group-hover:scale-[1.03]"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center px-1 text-center text-[10px] text-zinc-500">
                      kein Bild
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="font-black leading-5 text-white">
                        {card.quantity}x {card.name}
                      </div>
                      {card.typeLine && (
                        <div className="mt-1 text-xs text-zinc-500">
                          {card.typeLine}
                        </div>
                      )}
                    </div>
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[11px] font-bold uppercase ${getCutPriorityClass(
                        card.priority
                      )}`}
                    >
                      {card.priority}
                    </span>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-orange-50/75">
                    {card.reason}
                  </p>
                  {card.roles.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {card.roles.slice(0, 5).map((role) => (
                        <span
                          key={`${card.name}-${role}`}
                          className="rounded-full bg-white/5 px-2 py-0.5 text-[11px] text-zinc-300"
                        >
                          {role}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </a>
            ))}
          </div>
        </section>
      )}

      {analysis.recommendations?.length > 0 && (
        <section className="rounded-3xl border border-violet-300/20 bg-violet-300/10 p-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h3 className="text-lg font-black text-violet-100">
                Empfehlungen
              </h3>
              <p className="mt-1 text-sm text-violet-50/65">
                Commander-nahe Pflichtlücken plus Upgrade-Impulse für
                alternative Builds. Scryfall-Daten bleiben aktuell, vorhandene
                Deckkarten werden ausgeblendet und Preise werden ignoriert.
              </p>
            </div>
            <span className="rounded-full bg-black/20 px-3 py-1 text-xs text-violet-50/70">
              {analysis.recommendations.length} Bereiche
            </span>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            {analysis.recommendations.map((recommendation) => (
              <div
                key={recommendation.title}
                className="rounded-2xl border border-white/10 bg-black/15 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="font-black text-white">
                      {recommendation.title}
                    </h4>
                    <p className="mt-1 text-sm leading-6 text-violet-50/70">
                      {recommendation.reason}
                    </p>
                  </div>
                  <span className="rounded-full border border-white/10 px-2 py-1 text-xs text-violet-50/60">
                    {recommendation.source === "scryfall" ? "Scryfall" : "Best-of"}
                  </span>
                </div>

                <div className="mt-4 max-h-[560px] space-y-2 overflow-auto pr-1">
                  {recommendation.cards.map((card) => (
                    <a
                      key={`${recommendation.title}-${card.name}`}
                      href={card.scryfallUrl ?? undefined}
                      target={card.scryfallUrl ? "_blank" : undefined}
                      rel={card.scryfallUrl ? "noreferrer" : undefined}
                      tabIndex={0}
                      onMouseEnter={(event) => showPreview(card, event)}
                      onMouseMove={(event) =>
                        setPreviewPosition(getPreviewPositionFromMouse(event))
                      }
                      onMouseLeave={() => setPreviewCard(null)}
                      onFocus={(event) => showPreviewFromFocus(card, event)}
                      onBlur={() => setPreviewCard(null)}
                      className="group flex min-h-24 gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-2 text-left outline-none transition hover:border-violet-200/30 hover:bg-white/[0.07] focus-visible:border-violet-200/40 focus-visible:bg-white/[0.07]"
                    >
                      <div className="h-20 w-14 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-zinc-900">
                        {card.imageUrl ? (
                          <Image
                            src={card.imageUrl}
                            alt=""
                            width={56}
                            height={80}
                            className="h-full w-full object-cover transition group-hover:scale-[1.03]"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center px-1 text-center text-[10px] text-zinc-500">
                            kein Bild
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1 py-1">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="font-bold leading-5 text-white">
                            {card.name}
                          </div>
                          {Number.isFinite(card.manaValue) && (
                            <span className="rounded-full bg-black/20 px-2 py-0.5 text-[11px] text-violet-50/65">
                              MV {card.manaValue}
                            </span>
                          )}
                        </div>
                        {card.typeLine && (
                          <div className="mt-1 truncate text-xs text-zinc-500">
                            {card.typeLine}
                          </div>
                        )}
                        <p className="mt-2 text-xs leading-5 text-zinc-400">
                          {card.reason}
                        </p>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
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
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h3 className="text-lg font-black">Rollen</h3>
              <p className="mt-1 text-sm text-zinc-500">
                Anklicken filtert unten die Bildübersicht.
              </p>
            </div>
            {selectedRole && (
              <span className="rounded-full bg-orange-300/15 px-3 py-1 text-xs font-bold text-orange-100">
                Filter: {selectedRole}
              </span>
            )}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {roleEntries.length > 0 && (
              <button
                type="button"
                onClick={() => selectRoleFilter(null)}
                aria-pressed={!selectedRole}
                className={`rounded-full border px-3 py-1 text-sm transition ${
                  !selectedRole
                    ? "border-orange-200/45 bg-orange-200/15 text-orange-50"
                    : "border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10"
                }`}
              >
                Alle: {analysis.stats.totalCards}
              </button>
            )}
            {roleEntries.map(([role, count]) => (
              <button
                key={role}
                type="button"
                onClick={() => selectRoleFilter(selectedRole === role ? null : role)}
                aria-pressed={selectedRole === role}
                className={`rounded-full border px-3 py-1 text-sm transition ${
                  selectedRole === role
                    ? "border-orange-200/45 bg-orange-200/15 text-orange-50"
                    : "border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10"
                }`}
              >
                {role}: {count}
              </button>
            ))}
            {roleEntries.length === 0 && (
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
          <div className="mt-3 flex flex-wrap gap-2">
            {analysis.missing.map((name) => (
              <span
                key={name}
                className="rounded-full border border-red-100/10 bg-black/20 px-3 py-1 text-sm text-red-50/85"
              >
                {name}
              </span>
            ))}
          </div>
        </div>
      )}

      <section
        ref={imageOverviewRef}
        className="scroll-mt-24 rounded-3xl border border-white/10 bg-white/[0.04] p-5"
      >
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 className="text-lg font-black">
              {selectedRole ? `${selectedRole}-Karten` : "Bildübersicht"}
            </h3>
            <p className="mt-1 text-sm text-zinc-500">
              {selectedRole
                ? `Diese Karten erkennt die Analyse aktuell als ${selectedRole}.`
                : "Zum visuellen Gegencheck, welche Karte gemeint ist."}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {selectedRole && (
              <button
                type="button"
                onClick={() => setActiveRole(null)}
                className="rounded-full border border-white/10 px-3 py-1 text-sm font-semibold text-zinc-300 transition hover:bg-white/10"
              >
                Alle anzeigen
              </button>
            )}
            <span className="text-sm text-zinc-500">
              {imageCardCount} Karten
            </span>
          </div>
        </div>

        <div className="mt-5 grid max-h-[760px] grid-cols-2 gap-4 overflow-auto pr-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {imageCards.map((card) => (
            <a
              key={`image-${card.section}-${card.id}`}
              href={card.scryfallUrl ?? undefined}
              target={card.scryfallUrl ? "_blank" : undefined}
              rel={card.scryfallUrl ? "noreferrer" : undefined}
              tabIndex={0}
              onMouseEnter={(event) => showPreview(card, event)}
              onMouseMove={(event) =>
                setPreviewPosition(getPreviewPositionFromMouse(event))
              }
              onMouseLeave={() => setPreviewCard(null)}
              onFocus={(event) => showPreviewFromFocus(card, event)}
              onBlur={() => setPreviewCard(null)}
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
                {getPrintLabel(card)} - {getSectionLabel(card)}
              </div>
              {selectedRole && (
                <div className="mt-2 rounded-full bg-orange-300/10 px-2 py-1 text-center text-[11px] font-bold text-orange-100/80">
                  {selectedRole}
                </div>
              )}
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
            <table className="w-full min-w-[980px] border-collapse text-left text-sm">
              <thead className="sticky top-0 bg-zinc-950 text-xs uppercase text-zinc-500">
                <tr>
                  <th className="px-4 py-3">Karte</th>
                  <th className="px-4 py-3">Druck</th>
                  <th className="px-4 py-3">MV</th>
                  <th className="px-4 py-3">Typ</th>
                  <th className="px-4 py-3">Rollen</th>
                  <th className="px-4 py-3">Preis</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {analysis.cards.map((card) => (
                  <tr
                    key={`${card.section}-${card.id}`}
                    tabIndex={0}
                    onMouseEnter={(event) => showPreview(card, event)}
                    onMouseMove={(event) =>
                      setPreviewPosition(getPreviewPositionFromMouse(event))
                    }
                    onMouseLeave={() => setPreviewCard(null)}
                    onFocus={(event) => showPreviewFromFocus(card, event)}
                    onBlur={() => setPreviewCard(null)}
                    className="align-top outline-none transition hover:bg-white/[0.04] focus-visible:bg-white/[0.04]"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {card.imageUrl ? (
                          <Image
                            src={card.imageUrl}
                            alt=""
                            width={44}
                            height={64}
                            className="h-16 w-11 rounded-md border border-white/10 object-cover"
                          />
                        ) : (
                          <div className="flex h-16 w-11 items-center justify-center rounded-md border border-white/10 bg-zinc-900 text-[10px] text-zinc-500">
                            kein Bild
                          </div>
                        )}
                        <div>
                          <div className="font-bold text-white">
                            {card.quantity}x {card.name}
                          </div>
                          <div className="mt-1 text-xs text-zinc-500">
                            {getSectionLabel(card)}
                          </div>
                          {card.importedName &&
                            card.importedName !== card.name && (
                              <div className="mt-1 text-xs text-amber-100/75">
                                Import: {card.importedName}
                              </div>
                            )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-bold text-zinc-200">
                        {getPrintLabel(card)}
                      </div>
                      <div className="mt-1 max-w-44 text-xs text-zinc-500">
                        {card.setName || "Scryfall-Standarddruck"}
                      </div>
                      {card.matchNote && (
                        <div className="mt-2 rounded-full bg-amber-200/10 px-2 py-1 text-xs text-amber-100">
                          Fallback
                        </div>
                      )}
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

      <CardPreview card={previewCard} position={previewPosition} />
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
  const [activeTask, setActiveTask] = useState<ActiveTask | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isPending, startTransition] = useTransition();
  const isBusy = activeTask !== null || isPending;
  const analysisEstimateSeconds = useMemo(
    () => estimateAnalysisSeconds(rawList),
    [rawList]
  );
  const remainingAnalysisSeconds = Math.max(
    0,
    analysisEstimateSeconds - elapsedSeconds
  );
  const analysisProgress = Math.min(
    96,
    Math.max(8, Math.round((elapsedSeconds / analysisEstimateSeconds) * 92))
  );

  useEffect(() => {
    if (!activeTask) {
      return;
    }

    const startedAt = Date.now();

    const intervalId = window.setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [activeTask]);

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
    if (activeTask) return;

    setActiveTask("analysis");
    setElapsedSeconds(0);
    setMessage(null);
    startTransition(async () => {
      try {
        const result = await analyzeDeckList(
          rawList,
          format,
          commanderName,
          notes
        );
        setAnalysis(result);
        setCommanderName(result.commanderName ?? commanderName);
        setMessage("Analyse fertig.");
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Analyse fehlgeschlagen.");
      } finally {
        setActiveTask(null);
      }
    });
  }

  function saveCurrentDeck() {
    if (activeTask) return;

    setActiveTask("save");
    setElapsedSeconds(0);
    setMessage("Deck wird gespeichert...");
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
      } finally {
        setActiveTask(null);
      }
    });
  }

  function deleteCurrentDeck() {
    if (!selectedDeckId) return;
    if (activeTask) return;

    setActiveTask("delete");
    setElapsedSeconds(0);
    setMessage("Deck wird gelöscht...");
    startTransition(async () => {
      try {
        await deleteDeck(selectedDeckId);
        setDecks((currentDecks) =>
          currentDecks.filter((deck) => deck.id !== selectedDeckId)
        );
        startNewDeck();
        setMessage("Deck gelöscht.");
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Löschen fehlgeschlagen.");
      } finally {
        setActiveTask(null);
      }
    });
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-black">Deine Decks</h2>
            <p className="mt-1 text-sm text-zinc-500">
              {decks.length > 0
                ? "Schnell zwischen gespeicherten Decks wechseln."
                : "Noch nichts gespeichert. Analyse und Speichern sind bereit."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {selectedDeck && (
              <button
                type="button"
                onClick={deleteCurrentDeck}
                disabled={isBusy}
                className="rounded-full border border-red-400/25 px-4 py-2 text-sm font-semibold text-red-200 transition hover:bg-red-400/10 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {activeTask === "delete" ? "Lösche..." : "Löschen"}
              </button>
            )}
            <button
              type="button"
              onClick={startNewDeck}
              disabled={isBusy}
              className="rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-zinc-200 transition hover:bg-white/10"
            >
              Neu
            </button>
          </div>
        </div>

        <div className="mt-4 flex gap-3 overflow-x-auto pb-1">
          {decks.length === 0 && (
            <p className="min-w-full rounded-2xl border border-dashed border-white/10 bg-black/10 p-4 text-sm leading-6 text-zinc-500">
              Gespeicherte Decks erscheinen hier als kompakte Auswahlleiste.
            </p>
          )}

          {decks.map((deck) => (
            <button
              key={deck.id}
              type="button"
              onClick={() => loadDeck(deck)}
              className={`min-w-[240px] rounded-2xl border p-4 text-left transition ${
                deck.id === selectedDeckId
                  ? "border-orange-200/40 bg-orange-200/10"
                  : "border-white/10 bg-black/15 hover:bg-white/5"
              }`}
            >
              <span className="block truncate font-bold text-white">
                {deck.name}
              </span>
              <span className="mt-1 block truncate text-xs text-zinc-500">
                {deck.commanderName ?? deck.format}
              </span>
              <span className="mt-2 block text-xs text-zinc-600">
                {formatDate(deck.updatedAt)}
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-6">
        <div
          className="rounded-3xl border border-white/10 bg-white/[0.04] p-5"
          aria-busy={activeTask === "analysis"}
        >
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
            <span className="text-sm font-bold text-zinc-300">
              Deckliste oder Moxfield-Text-Export
            </span>
            <textarea
              value={rawList}
              onChange={(event) => setRawList(event.target.value)}
              rows={16}
              placeholder={`Commander
1 Atraxa, Praetors' Voice

Deck
1 Sol Ring
1 Arcane Signet`}
              className="mt-2 w-full resize-y rounded-2xl border border-white/10 bg-zinc-900 px-4 py-3 font-mono text-sm leading-6 text-white outline-none transition focus:border-orange-200/50"
              spellCheck={false}
            />
            <span className="mt-2 block text-xs leading-5 text-zinc-500">
              Moxfield-Direktlinks werden von Cloudflare blockiert. Kopiere in
              Moxfield den Text-Export hier hinein und starte die Analyse.
            </span>
          </label>

          <label className="mt-4 block">
            <span className="text-sm font-bold text-zinc-300">
              Deckplan / Notizen
            </span>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={3}
              placeholder="z. B. Lifegain + Gegner millen, keine Budget-Grenze, mehr Combo-Payoffs"
              className="mt-2 w-full resize-y rounded-2xl border border-white/10 bg-zinc-900 px-4 py-3 text-sm leading-6 text-white outline-none transition focus:border-orange-200/50"
            />
            <span className="mt-2 block text-xs leading-5 text-zinc-500">
              Optional: Wird zusammen mit den Commander-Karten für bessere
              Strategie-Empfehlungen ausgewertet.
            </span>
          </label>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={runAnalysis}
              disabled={isBusy}
              className="rounded-full bg-white px-5 py-2 text-sm font-bold text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {activeTask === "analysis" ? "Analysiere..." : "Analysieren"}
            </button>

            <button
              type="button"
              onClick={saveCurrentDeck}
              disabled={isBusy || Boolean(setupError)}
              className="rounded-full bg-orange-300 px-5 py-2 text-sm font-bold text-black transition hover:bg-orange-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {activeTask === "save" ? "Speichere..." : "Speichern"}
            </button>

            {message && (
              <span className="text-sm text-zinc-400" role="status">
                {message}
              </span>
            )}
          </div>

          {activeTask === "analysis" && (
            <div
              className="mt-4 rounded-2xl border border-orange-200/20 bg-orange-300/10 p-4"
              role="status"
              aria-live="polite"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
                <div className="flex items-center gap-2 font-bold text-orange-100">
                  <span className="relative flex h-3 w-3">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-orange-200 opacity-60" />
                    <span className="relative inline-flex h-3 w-3 rounded-full bg-orange-200" />
                  </span>
                  Analyse läuft
                </div>
                <div className="flex flex-wrap gap-2 text-xs text-orange-50/70">
                  <span>{formatDuration(elapsedSeconds)} vergangen</span>
                  <span>
                    ca.{" "}
                    {remainingAnalysisSeconds > 0
                      ? formatDuration(remainingAnalysisSeconds)
                      : "kurz"}{" "}
                    übrig
                  </span>
                </div>
              </div>

              <div className="mt-3 h-2 overflow-hidden rounded-full bg-black/30">
                <div
                  className="h-full rounded-full bg-orange-200 transition-all duration-500"
                  style={{ width: `${analysisProgress}%` }}
                />
              </div>

              <p className="mt-3 text-xs leading-5 text-orange-50/70">
                Scryfall wird abgefragt, Kartenbilder werden aufgelöst und die
                Empfehlungen werden neu gebaut.
              </p>
            </div>
          )}
        </div>

        <AnalysisPanel analysis={analysis} />
      </section>
    </div>
  );
}
