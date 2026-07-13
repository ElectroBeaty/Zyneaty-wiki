import "server-only";
import { supabase } from "@/lib/supabase";

const SCRYFALL_COLLECTION_URL = "https://api.scryfall.com/cards/collection";
const SCRYFALL_NAMED_URL = "https://api.scryfall.com/cards/named";
const SCRYFALL_SEARCH_URL = "https://api.scryfall.com/cards/search";
const MOXFIELD_DECK_API_BASES = [
  "https://api2.moxfield.com/v3/decks/all",
  "https://api2.moxfield.com/v2/decks/all",
];
const COLLECTION_CHUNK_SIZE = 75;

const COLOR_ORDER = ["W", "U", "B", "R", "G"] as const;
const BASIC_LANDS = new Set([
  "plains",
  "island",
  "swamp",
  "mountain",
  "forest",
  "wastes",
]);

type DeckSection = "main" | "commander" | "sideboard";

type ParsedDeckLine = {
  quantity: number;
  name: string;
  section: DeckSection;
  setCode: string | null;
  collectorNumber: string | null;
};

type ScryfallFace = {
  name?: string;
  oracle_text?: string;
  image_uris?: {
    small?: string;
    normal?: string;
  };
};

type ScryfallCard = {
  id: string;
  name: string;
  set?: string;
  collector_number?: string;
  mana_cost?: string;
  cmc?: number;
  colors?: string[];
  color_identity?: string[];
  type_line?: string;
  oracle_text?: string;
  image_uris?: {
    small?: string;
    normal?: string;
  };
  card_faces?: ScryfallFace[];
  rarity?: string;
  set_name?: string;
  scryfall_uri?: string;
  prices?: {
    usd?: string | null;
    eur?: string | null;
  };
  legalities?: Record<string, string>;
};

export type DeckLabCard = {
  id: string;
  name: string;
  quantity: number;
  section: DeckSection;
  importedName: string;
  setCode: string | null;
  collectorNumber: string | null;
  matchNote: string | null;
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

export type DeckLabCorrection = {
  input: string;
  matched: string;
  note: string;
};

export type DeckLabRecommendationCard = {
  name: string;
  reason: string;
};

export type DeckLabRecommendation = {
  title: string;
  reason: string;
  source: "curated" | "scryfall";
  cards: DeckLabRecommendationCard[];
};

export type DeckLabStats = {
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

export type DeckLabAnalysis = {
  cards: DeckLabCard[];
  missing: string[];
  corrections: DeckLabCorrection[];
  recommendations: DeckLabRecommendation[];
  warnings: string[];
  stats: DeckLabStats;
  commanderName: string | null;
};

export type MoxfieldImportResult = {
  name: string;
  format: string;
  commanderName: string | null;
  rawList: string;
  notes: string | null;
  sourceUrl: string;
  analysis: DeckLabAnalysis;
};

export type DeckLabDeck = {
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

type DeckLabDeckRow = {
  id: string;
  name: string;
  format: string;
  commander_name: string | null;
  raw_list: string;
  notes: string | null;
  analysis: unknown;
  created_at: string;
  updated_at: string;
};

function getEmptyStats(): DeckLabStats {
  return {
    totalCards: 0,
    mainCards: 0,
    commanderCards: 0,
    landCount: 0,
    nonLandCount: 0,
    averageManaValue: 0,
    manaCurve: ["0", "1", "2", "3", "4", "5", "6", "7+"].map((label) => ({
      label,
      count: 0,
    })),
    typeCounts: {},
    roleCounts: {},
    colorCounts: Object.fromEntries(COLOR_ORDER.map((color) => [color, 0])),
  };
}

function normalizeStoredAnalysis(value: unknown): DeckLabAnalysis {
  if (!value || typeof value !== "object") {
    return {
      cards: [],
      missing: [],
      corrections: [],
      recommendations: [],
      warnings: [],
      stats: getEmptyStats(),
      commanderName: null,
    };
  }

  const analysis = value as Partial<DeckLabAnalysis>;

  return {
    cards: Array.isArray(analysis.cards) ? analysis.cards : [],
    missing: Array.isArray(analysis.missing) ? analysis.missing : [],
    corrections: Array.isArray(analysis.corrections)
      ? analysis.corrections
      : [],
    recommendations: Array.isArray(analysis.recommendations)
      ? analysis.recommendations
      : [],
    warnings: Array.isArray(analysis.warnings) ? analysis.warnings : [],
    stats: analysis.stats ?? getEmptyStats(),
    commanderName: analysis.commanderName ?? null,
  };
}

function toDeck(row: DeckLabDeckRow): DeckLabDeck {
  return {
    id: row.id,
    name: row.name,
    format: row.format,
    commanderName: row.commander_name,
    rawList: row.raw_list,
    notes: row.notes,
    analysis: normalizeStoredAnalysis(row.analysis),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function cleanCardName(value: string) {
  return value
    .replace(/^["']|["']$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function parseCardReference(value: string) {
  let working = value.trim();

  working = working
    .replace(/\s+\*[A-Z]+\*$/gi, "")
    .replace(/\s+\[(foil|etched|showcase|borderless|promo)\]$/gi, "")
    .replace(/\s+#(?!\d+\s*$).+$/g, "")
    .trim();

  const setCollectorMatch = working.match(
    /^(.+?)\s+\(([A-Z0-9]{2,8})\)\s*#?([A-Z0-9\-]+)?$/i
  );

  if (setCollectorMatch) {
    return {
      name: cleanCardName(setCollectorMatch[1]),
      setCode: setCollectorMatch[2].toLowerCase(),
      collectorNumber: setCollectorMatch[3] ?? null,
    };
  }

  const bracketSetMatch = working.match(/^(.+?)\s+\[([A-Z0-9]{2,8})\]$/i);

  if (bracketSetMatch) {
    return {
      name: cleanCardName(bracketSetMatch[1]),
      setCode: bracketSetMatch[2].toLowerCase(),
      collectorNumber: null,
    };
  }

  return {
    name: cleanCardName(working),
    setCode: null,
    collectorNumber: null,
  };
}

function getSectionFromHeading(value: string): DeckSection | null {
  const normalized = value
    .toLowerCase()
    .replace(/[:]/g, "")
    .replace(/\s+\(\d+\)$/g, "")
    .trim();

  if (["commander", "commanders"].includes(normalized)) return "commander";
  if (["sideboard", "maybeboard"].includes(normalized)) return "sideboard";
  if (
    [
      "deck",
      "main",
      "mainboard",
      "creatures",
      "artifacts",
      "enchantments",
      "instants",
      "sorceries",
      "planeswalkers",
      "lands",
    ].includes(normalized)
  ) {
    return "main";
  }

  return null;
}

function parseDeckList(rawList: string) {
  const lines: ParsedDeckLine[] = [];
  let section: DeckSection = "main";

  for (const originalLine of rawList.split(/\r?\n/)) {
    const line = originalLine.trim();

    if (!line || line.startsWith("//")) continue;

    const heading = getSectionFromHeading(line);
    if (heading) {
      section = heading;
      continue;
    }

    const match = line.match(/^(?:(SB|Sideboard):\s*)?(\d+)\s*x?\s+(.+)$/i);
    if (!match) continue;

    const quantity = Number.parseInt(match[2], 10);
    const reference = parseCardReference(match[3]);
    const name = reference.name;

    if (!Number.isFinite(quantity) || quantity < 1 || !name) continue;

    lines.push({
      quantity,
      name,
      section: match[1] ? "sideboard" : section,
      setCode: reference.setCode,
      collectorNumber: reference.collectorNumber,
    });
  }

  return lines;
}

function applyCommanderField(lines: ParsedDeckLine[], commanderName?: string) {
  const normalizedCommanderName = commanderName?.trim();

  if (!normalizedCommanderName) return lines;

  const commanderReference = parseCardReference(normalizedCommanderName);
  const commanderKey = commanderReference.name.toLowerCase();
  let foundCommander = false;

  const updatedLines = lines.map((line) => {
    if (line.name.toLowerCase() !== commanderKey) return line;

    foundCommander = true;

    return {
      ...line,
      quantity: 1,
      section: "commander" as DeckSection,
    };
  });

  if (foundCommander) return updatedLines;

  return [
    {
      quantity: 1,
      name: commanderReference.name,
      section: "commander" as DeckSection,
      setCode: commanderReference.setCode,
      collectorNumber: commanderReference.collectorNumber,
    },
    ...updatedLines,
  ];
}

function getCardOracleText(card: ScryfallCard) {
  if (card.oracle_text) return card.oracle_text;

  return (
    card.card_faces
      ?.map((face) => [face.name, face.oracle_text].filter(Boolean).join(": "))
      .filter(Boolean)
      .join("\n") ?? ""
  );
}

function getCardImageUrl(card: ScryfallCard) {
  return (
    card.image_uris?.normal ??
    card.image_uris?.small ??
    card.card_faces?.find((face) => face.image_uris)?.image_uris?.normal ??
    card.card_faces?.find((face) => face.image_uris)?.image_uris?.small ??
    null
  );
}

function inferRoles(card: ScryfallCard) {
  const typeLine = card.type_line?.toLowerCase() ?? "";
  const text = getCardOracleText(card).toLowerCase();
  const roles = new Set<string>();

  if (typeLine.includes("land")) roles.add("Land");
  if (typeLine.includes("creature")) roles.add("Creature");
  if (
    text.includes("add {") ||
    text.includes("add one mana") ||
    text.includes("treasure token") ||
    text.includes("search your library for a land") ||
    text.includes("search your library for up to") ||
    text.includes("mana pool")
  ) {
    roles.add("Ramp");
  }
  if (
    text.includes("draw a card") ||
    text.includes("draw two cards") ||
    text.includes("draw three cards") ||
    text.includes("draw cards")
  ) {
    roles.add("Draw");
  }
  if (
    text.includes("destroy target") ||
    text.includes("exile target") ||
    text.includes("counter target") ||
    text.includes("return target") ||
    text.includes("deals") && text.includes("damage to any target")
  ) {
    roles.add("Interaction");
  }
  if (
    text.includes("destroy all") ||
    text.includes("exile all") ||
    text.includes("all creatures") ||
    text.includes("each creature")
  ) {
    roles.add("Boardwipe");
  }
  if (
    text.includes("whenever") ||
    text.includes("at the beginning") ||
    text.includes("you may cast") ||
    text.includes("copy target")
  ) {
    roles.add("Engine");
  }

  return Array.from(roles);
}

function getPrimaryType(card: DeckLabCard) {
  const typeLine = card.typeLine;

  for (const type of [
    "Land",
    "Creature",
    "Artifact",
    "Enchantment",
    "Instant",
    "Sorcery",
    "Planeswalker",
    "Battle",
  ]) {
    if (typeLine.includes(type)) return type;
  }

  return "Other";
}

function getCurveLabel(manaValue: number) {
  if (manaValue >= 7) return "7+";
  return String(Math.max(0, Math.floor(manaValue)));
}

function addCount(record: Record<string, number>, key: string, amount: number) {
  record[key] = (record[key] ?? 0) + amount;
}

function createStats(cards: DeckLabCard[]): DeckLabStats {
  const stats = getEmptyStats();
  const curve = new Map(stats.manaCurve.map((item) => [item.label, item.count]));
  let manaValueSum = 0;
  let manaValueCards = 0;

  for (const card of cards) {
    stats.totalCards += card.quantity;

    if (card.section === "commander") {
      stats.commanderCards += card.quantity;
    } else {
      stats.mainCards += card.quantity;
    }

    if (card.isLand) {
      stats.landCount += card.quantity;
    } else {
      stats.nonLandCount += card.quantity;
      manaValueSum += card.manaValue * card.quantity;
      manaValueCards += card.quantity;
      curve.set(getCurveLabel(card.manaValue), (curve.get(getCurveLabel(card.manaValue)) ?? 0) + card.quantity);
    }

    addCount(stats.typeCounts, getPrimaryType(card), card.quantity);

    for (const role of card.roles) {
      addCount(stats.roleCounts, role, card.quantity);
    }

    for (const color of card.colorIdentity) {
      if (COLOR_ORDER.includes(color as (typeof COLOR_ORDER)[number])) {
        addCount(stats.colorCounts, color, card.quantity);
      }
    }
  }

  stats.averageManaValue =
    manaValueCards > 0 ? Number((manaValueSum / manaValueCards).toFixed(2)) : 0;
  stats.manaCurve = stats.manaCurve.map((item) => ({
    label: item.label,
    count: curve.get(item.label) ?? 0,
  }));

  return stats;
}

function createWarnings(
  format: string,
  cards: DeckLabCard[],
  missing: string[],
  corrections: DeckLabCorrection[],
  stats: DeckLabStats,
  commanderName: string | null
) {
  const warnings: string[] = [];
  const lowerFormat = format.toLowerCase();

  if (missing.length > 0) {
    warnings.push(`${missing.length} Karte(n) konnten nicht gefunden werden.`);
  }

  if (corrections.length > 0) {
    warnings.push(
      `${corrections.length} Karte(n) wurden per Fallback aufgeloest. Pruefe kurz, ob der Druck passt.`
    );
  }

  if (lowerFormat === "commander") {
    if (stats.totalCards !== 100) {
      warnings.push(
        `Commander-Decks haben normalerweise genau 100 Karten. Aktuell sind es ${stats.totalCards}.`
      );
    }

    if (!commanderName) {
      warnings.push(
        "Kein Commander-Bereich erkannt. Schreibe z. B. eine Zeile 'Commander' vor deinen Commander."
      );
    }

    const duplicates = cards
      .filter((card) => {
        if (card.quantity <= 1) return false;
        if (BASIC_LANDS.has(card.name.toLowerCase())) return false;
        return !card.typeLine.toLowerCase().includes("basic");
      })
      .map((card) => `${card.quantity}x ${card.name}`);

    if (duplicates.length > 0) {
      warnings.push(
        `Singleton-Check: ${duplicates.slice(0, 6).join(", ")} ${
          duplicates.length > 6 ? "..." : ""
        }`
      );
    }

    if (stats.landCount < 34) {
      warnings.push("Die Manabase wirkt knapp: Unter 34 Laender ist Commander oft holprig.");
    }

    if (stats.landCount > 40) {
      warnings.push("Sehr viele Laender: Pruefe, ob genug Action-Spells im Deck bleiben.");
    }

    if ((stats.roleCounts.Ramp ?? 0) < 8) {
      warnings.push("Ramp ist eher niedrig. Viele Commander-Decks moegen etwa 8-12 Ramp-Pieces.");
    }

    if ((stats.roleCounts.Draw ?? 0) < 8) {
      warnings.push("Card Draw ist eher niedrig. Das Deck koennte im Midgame leer laufen.");
    }

    if ((stats.roleCounts.Interaction ?? 0) < 8) {
      warnings.push("Interaktion ist eher niedrig. Mehr Removal/Counter kann Spiele retten.");
    }
  }

  if (stats.averageManaValue > 3.6) {
    warnings.push("Die durchschnittliche Mana Value ist recht hoch. Fruehe Plays koennten fehlen.");
  }

  return warnings;
}

type RecommendationCandidate = {
  name: string;
  colors: string[];
  reason: string;
};

type RecommendationNeed = {
  title: string;
  reason: string;
  query: string;
  fallback: RecommendationCandidate[];
  limit?: number;
};

const RAMP_RECOMMENDATIONS: RecommendationCandidate[] = [
  {
    name: "Sol Ring",
    colors: [],
    reason: "Der effizienteste Commander-Ramp fuer fast jedes Deck.",
  },
  {
    name: "Arcane Signet",
    colors: [],
    reason: "Fixiert direkt deine Commander-Farben.",
  },
  {
    name: "Fellwar Stone",
    colors: [],
    reason: "Guenscher Zweimana-Rock, der oft mehrere Farben macht.",
  },
  {
    name: "Nature's Lore",
    colors: ["G"],
    reason: "Sucht ungetappte Forest-Duals und beschleunigt sauber.",
  },
  {
    name: "Farseek",
    colors: ["G"],
    reason: "Findet wichtige Duals und stabilisiert mehrere Farben.",
  },
  {
    name: "Smothering Tithe",
    colors: ["W"],
    reason: "Skaliert in Multiplayer-Spielen extrem stark.",
  },
  {
    name: "Talisman of Dominance",
    colors: ["U", "B"],
    reason: "Zweimana-Ramp fuer Dimir-Farbpaare.",
  },
  {
    name: "Talisman of Curiosity",
    colors: ["G", "U"],
    reason: "Zweimana-Ramp fuer Simic-Farbpaare.",
  },
  {
    name: "Talisman of Resilience",
    colors: ["B", "G"],
    reason: "Zweimana-Ramp fuer Golgari-Farbpaare.",
  },
];

const DRAW_RECOMMENDATIONS: RecommendationCandidate[] = [
  {
    name: "Skullclamp",
    colors: [],
    reason: "Macht kleine Kreaturen zu echten Ressourcen.",
  },
  {
    name: "Tome of Legends",
    colors: [],
    reason: "Gut, wenn dein Commander regelmaessig angreift oder ins Spiel kommt.",
  },
  {
    name: "Rhystic Study",
    colors: ["U"],
    reason: "Zwingt Gegner zu schlechten Mana-Entscheidungen.",
  },
  {
    name: "Mystic Remora",
    colors: ["U"],
    reason: "Sehr stark gegen schnelle Noncreature-Starts.",
  },
  {
    name: "Night's Whisper",
    colors: ["B"],
    reason: "Billiger, verlässlicher Kartennachschub.",
  },
  {
    name: "Read the Bones",
    colors: ["B"],
    reason: "Filtert und zieht gleichzeitig.",
  },
  {
    name: "Harmonize",
    colors: ["G"],
    reason: "Solider Kartenvorteil in Gruen.",
  },
  {
    name: "Welcoming Vampire",
    colors: ["W"],
    reason: "Zieht Karten in Kreaturen-Decks mit kleinen Bodies.",
  },
  {
    name: "Faithless Looting",
    colors: ["R"],
    reason: "Filtert Haende und fuellt graveyardbasierte Plaene.",
  },
];

const INTERACTION_RECOMMENDATIONS: RecommendationCandidate[] = [
  {
    name: "Beast Within",
    colors: ["G"],
    reason: "Trifft fast jedes Problem-Permanent.",
  },
  {
    name: "Generous Gift",
    colors: ["W"],
    reason: "Universelles Removal fuer Weiss.",
  },
  {
    name: "Swords to Plowshares",
    colors: ["W"],
    reason: "Eines der effizientesten Creature-Removal.",
  },
  {
    name: "Counterspell",
    colors: ["U"],
    reason: "Klarer Schutz gegen gegnerische Schluesselspells.",
  },
  {
    name: "Pongify",
    colors: ["U"],
    reason: "Ein Mana fuer effizientes Creature-Removal.",
  },
  {
    name: "Feed the Swarm",
    colors: ["B"],
    reason: "Schwarz bekommt damit auch Enchantments weg.",
  },
  {
    name: "Chaos Warp",
    colors: ["R"],
    reason: "Rotes Universal-Removal fuer schwierige Permanents.",
  },
  {
    name: "Abrade",
    colors: ["R"],
    reason: "Flexibel gegen Artefakte oder kleine Kreaturen.",
  },
];

const BOARDWIPE_RECOMMENDATIONS: RecommendationCandidate[] = [
  {
    name: "Blasphemous Act",
    colors: ["R"],
    reason: "Sehr effizient in vollen Commander-Boards.",
  },
  {
    name: "Farewell",
    colors: ["W"],
    reason: "Raumt mehrere problematische Permanent-Typen auf.",
  },
  {
    name: "Austere Command",
    colors: ["W"],
    reason: "Flexibler Boardwipe, der eigene Boards oft verschont.",
  },
  {
    name: "Toxic Deluge",
    colors: ["B"],
    reason: "Guenscher Wipe, der Indestructible umgeht.",
  },
  {
    name: "Cyclonic Rift",
    colors: ["U"],
    reason: "Kann defensiv retten oder ein Spiel oeffnen.",
  },
  {
    name: "Nevinyrral's Disk",
    colors: [],
    reason: "Farbloser Reset fuer Decks ohne gute Wipes.",
  },
];

const LAND_RECOMMENDATIONS: RecommendationCandidate[] = [
  {
    name: "Command Tower",
    colors: [],
    reason: "Der sauberste Fixer fuer Commander.",
  },
  {
    name: "Path of Ancestry",
    colors: [],
    reason: "Fixing plus gelegentliches Scrying.",
  },
  {
    name: "Exotic Orchard",
    colors: [],
    reason: "In Multiplayer-Partien fast immer gutes Fixing.",
  },
  {
    name: "Fabled Passage",
    colors: [],
    reason: "Sucht Basics und stabilisiert die Manabase.",
  },
  {
    name: "Bojuka Bog",
    colors: [],
    reason: "Gratis Graveyard-Hate auf einem Land-Slot.",
  },
];

const GRAVEYARD_RECOMMENDATIONS: RecommendationCandidate[] = [
  {
    name: "Eternal Witness",
    colors: ["G"],
    reason: "Holt wichtige Karten aus dem Friedhof zurueck.",
  },
  {
    name: "Victimize",
    colors: ["B"],
    reason: "Macht aus einer Kreatur zwei Reanimation-Ziele.",
  },
  {
    name: "Living Death",
    colors: ["B"],
    reason: "Kann ein voller Friedhof in ein neues Board drehen.",
  },
  {
    name: "Satyr Wayfinder",
    colors: ["G"],
    reason: "Fuellt den Friedhof und findet Laender.",
  },
  {
    name: "Stitcher's Supplier",
    colors: ["B"],
    reason: "Sehr effizienter Selbstmill fuer Graveyard-Pläne.",
  },
];

const TOKEN_RECOMMENDATIONS: RecommendationCandidate[] = [
  {
    name: "Skullclamp",
    colors: [],
    reason: "Tokens werden zu Kartenvorteil.",
  },
  {
    name: "Anointed Procession",
    colors: ["W"],
    reason: "Verdoppelt Token-Produktion in Weiss.",
  },
  {
    name: "Parallel Lives",
    colors: ["G"],
    reason: "Verdoppelt Token-Produktion in Gruen.",
  },
  {
    name: "Impact Tremors",
    colors: ["R"],
    reason: "Jeder Token wird zu direktem Druck.",
  },
];

const COUNTER_RECOMMENDATIONS: RecommendationCandidate[] = [
  {
    name: "Hardened Scales",
    colors: ["G"],
    reason: "Verstaerkt +1/+1-Counter-Pläne guenstig.",
  },
  {
    name: "Evolution Sage",
    colors: ["G"],
    reason: "Proliferate macht Counter-Boards schnell groesser.",
  },
  {
    name: "Winding Constrictor",
    colors: ["B", "G"],
    reason: "Verdichtet Counter- und Marken-Synergien.",
  },
];

const SPELL_RECOMMENDATIONS: RecommendationCandidate[] = [
  {
    name: "Archmage Emeritus",
    colors: ["U"],
    reason: "Zieht Karten aus Instants und Sorceries.",
  },
  {
    name: "Storm-Kiln Artist",
    colors: ["R"],
    reason: "Macht Mana aus Spells und haelt explosive Turns offen.",
  },
  {
    name: "Young Pyromancer",
    colors: ["R"],
    reason: "Verwandelt Spells in Board-Praesenz.",
  },
];

function getDeckColorIdentity(cards: DeckLabCard[]) {
  const commanderColors =
    cards.find((card) => card.section === "commander")?.colorIdentity ?? [];

  if (commanderColors.length > 0) return commanderColors;

  return COLOR_ORDER.filter((color) =>
    cards.some((card) => card.colorIdentity.includes(color))
  );
}

function canPlayCandidate(
  candidate: RecommendationCandidate,
  deckColors: string[]
) {
  return candidate.colors.every((color) => deckColors.includes(color));
}

function canPlayCard(card: ScryfallCard, deckColors: string[]) {
  const colorIdentity = card.color_identity ?? [];

  return colorIdentity.every((color) => deckColors.includes(color));
}

function pickRecommendationCards(
  cards: DeckLabCard[],
  candidates: RecommendationCandidate[],
  limit = 4
) {
  const existingNames = new Set(cards.map((card) => card.name.toLowerCase()));
  const deckColors = getDeckColorIdentity(cards);

  return candidates
    .filter((candidate) => !existingNames.has(candidate.name.toLowerCase()))
    .filter((candidate) => canPlayCandidate(candidate, deckColors))
    .slice(0, limit)
    .map((candidate) => ({
      name: candidate.name,
      reason: candidate.reason,
    }));
}

function createFallbackRecommendation(
  cards: DeckLabCard[],
  title: string,
  reason: string,
  candidates: RecommendationCandidate[],
  limit?: number
) {
  const pickedCards = pickRecommendationCards(cards, candidates, limit);

  if (pickedCards.length === 0) return null;

  return {
    title,
    reason,
    source: "curated" as const,
    cards: pickedCards,
  };
}

function getColorIdentitySearchPart(deckColors: string[]) {
  if (deckColors.length === 0) return "";

  return ` id<=${deckColors.join("")}`;
}

function getRecommendationReason(card: ScryfallCard, title: string) {
  const typeLine = card.type_line ?? "Magic-Karte";

  return `${title}: ${typeLine}.`;
}

async function searchRecommendationCards(
  need: RecommendationNeed,
  cards: DeckLabCard[],
  deckColors: string[]
) {
  const existingNames = new Set(cards.map((card) => card.name.toLowerCase()));
  const url = new URL(SCRYFALL_SEARCH_URL);
  const query = [
    need.query,
    getColorIdentitySearchPart(deckColors),
    " legal:commander -is:digital unique:cards sort:edhrec",
  ].join("");

  url.searchParams.set("q", query);
  url.searchParams.set("order", "edhrec");
  url.searchParams.set("unique", "cards");

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "ZyneatyWikiDeckLab/0.1",
    },
  });

  if (response.status === 404) return null;

  if (!response.ok) {
    throw new Error("Scryfall konnte gerade nicht abgefragt werden.");
  }

  const payload = (await response.json()) as { data?: ScryfallCard[] };
  const pickedCards = (payload.data ?? [])
    .filter((card) => !existingNames.has(card.name.toLowerCase()))
    .filter((card) => canPlayCard(card, deckColors))
    .slice(0, need.limit ?? 5)
    .map((card) => ({
      name: card.name,
      reason: getRecommendationReason(card, need.title),
    }));

  if (pickedCards.length === 0) return null;

  return {
    title: need.title,
    reason: `${need.reason} Quelle: aktuelle Scryfall-Suche, nach EDHREC-Relevanz sortiert; Preise werden bewusst ignoriert.`,
    source: "scryfall" as const,
    cards: pickedCards,
  };
}

function collectRecommendationNeeds(
  cards: DeckLabCard[],
  stats: DeckLabStats,
  commanderName: string | null
) {
  const needs: RecommendationNeed[] = [];
  const commander = cards.find((card) => card.section === "commander");
  const commanderText = [
    commander?.name,
    commander?.typeLine,
    commander?.oracleText,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if ((stats.roleCounts.Ramp ?? 0) < 10) {
    needs.push({
      title: "Mehr Ramp",
      reason:
        "Das Deck will stabil frueher auf seinen Commander und die teureren Plays kommen.",
      query: '(oracle:"add" oracle:"mana" or oracle:"search your library for a land" or type:artifact oracle:"add")',
      fallback: RAMP_RECOMMENDATIONS,
      limit: 5,
    });
  }

  if ((stats.roleCounts.Draw ?? 0) < 10) {
    needs.push({
      title: "Mehr Card Draw",
      reason:
        "Mehr Kartennachschub verhindert, dass du nach den ersten Turns leer laeufst.",
      query: 'oracle:"draw" (oracle:"card" or oracle:"cards")',
      fallback: DRAW_RECOMMENDATIONS,
      limit: 5,
    });
  }

  if ((stats.roleCounts.Interaction ?? 0) < 9) {
    needs.push({
      title: "Mehr Interaktion",
      reason:
        "Ein paar gezielte Antworten helfen gegen gegnerische Engines und Combo-Pieces.",
      query: '(oracle:"destroy target" or oracle:"exile target" or oracle:"counter target" or oracle:"return target")',
      fallback: INTERACTION_RECOMMENDATIONS,
      limit: 5,
    });
  }

  if ((stats.roleCounts.Boardwipe ?? 0) < 2) {
    needs.push({
      title: "Boardwipes pruefen",
      reason:
        "Mindestens ein bis zwei Reset-Knoepfe retten Spiele, wenn das Board kippt.",
      query: '(oracle:"destroy all" or oracle:"exile all" or oracle:"all creatures" or oracle:"each creature")',
      fallback: BOARDWIPE_RECOMMENDATIONS,
      limit: 4,
    });
  }

  if (stats.landCount < 36) {
    needs.push({
      title: "Manabase stabilisieren",
      reason:
        "Die Landzahl wirkt knapp; diese Slots helfen beim Fixing oder bringen Zusatznutzen.",
      query: 'type:land (oracle:"add" or oracle:"search" or oracle:"enters")',
      fallback: LAND_RECOMMENDATIONS,
      limit: 4,
    });
  }

  if (
    commanderText.includes("graveyard") ||
    commanderText.includes("from your graveyard") ||
    commanderText.includes("return target card")
  ) {
    needs.push({
      title: `${commanderName ?? "Commander"}: Graveyard-Synergie`,
      reason:
        "Der Commander deutet auf Friedhofsplaene hin; diese Karten fuellen oder nutzen den Graveyard.",
      query: '(oracle:"graveyard" or oracle:"mill" or oracle:"return target card")',
      fallback: GRAVEYARD_RECOMMENDATIONS,
      limit: 5,
    });
  }

  if (commanderText.includes("token")) {
    needs.push({
      title: `${commanderName ?? "Commander"}: Token-Synergie`,
      reason:
        "Token-Decks profitieren stark von Verdopplern, Payoffs und Card-Draw aus kleinen Bodies.",
      query: '(oracle:"token" or oracle:"tokens")',
      fallback: TOKEN_RECOMMENDATIONS,
      limit: 4,
    });
  }

  if (commanderText.includes("counter") || commanderText.includes("+1/+1")) {
    needs.push({
      title: `${commanderName ?? "Commander"}: Counter-Synergie`,
      reason: "Der Commander spricht fuer Marken- oder Counter-Plaene.",
      query: '(oracle:"+1/+1 counter" or oracle:"proliferate")',
      fallback: COUNTER_RECOMMENDATIONS,
      limit: 4,
    });
  }

  if (
    commanderText.includes("instant") ||
    commanderText.includes("sorcery") ||
    commanderText.includes("copy")
  ) {
    needs.push({
      title: `${commanderName ?? "Commander"}: Spells-Synergie`,
      reason:
        "Wenn der Plan ueber Instants und Sorceries laeuft, helfen diese Payoffs.",
      query: '(oracle:"instant" or oracle:"sorcery" or oracle:"copy")',
      fallback: SPELL_RECOMMENDATIONS,
      limit: 4,
    });
  }

  return needs.slice(0, 7);
}

async function createRecommendations(
  cards: DeckLabCard[],
  stats: DeckLabStats,
  commanderName: string | null
) {
  const deckColors = getDeckColorIdentity(cards);
  const needs = collectRecommendationNeeds(cards, stats, commanderName);
  const recommendations: DeckLabRecommendation[] = [];

  for (const need of needs) {
    const searchedRecommendation = await searchRecommendationCards(
      need,
      cards,
      deckColors
    );

    if (searchedRecommendation) {
      recommendations.push(searchedRecommendation);
      continue;
    }

    const fallbackRecommendation = createFallbackRecommendation(
      cards,
      need.title,
      `${need.reason} Quelle: kuratierte Fallback-Liste, weil die Live-Suche keine passenden Treffer geliefert hat.`,
      need.fallback,
      need.limit
    );

    if (fallbackRecommendation) recommendations.push(fallbackRecommendation);
  }

  return recommendations;
}

type ScryfallCollectionIdentifier =
  | { name: string }
  | { set: string; collector_number: string };

type ResolvedScryfallCard = {
  card: ScryfallCard;
  matchNote: string | null;
};

function getLineLookupKey(line: ParsedDeckLine) {
  if (line.setCode && line.collectorNumber) {
    return `${line.name.toLowerCase()}|${line.setCode}|${line.collectorNumber.toLowerCase()}`;
  }

  return line.name.toLowerCase();
}

function getCardPrintKey(card: ScryfallCard) {
  if (!card.set || !card.collector_number) return null;

  return `${card.set.toLowerCase()}|${card.collector_number.toLowerCase()}`;
}

function formatCardPrint(card: ScryfallCard) {
  if (!card.set || !card.collector_number) return null;

  return `${card.set.toUpperCase()} #${card.collector_number}`;
}

function formatLinePrint(line: ParsedDeckLine) {
  if (line.setCode && line.collectorNumber) {
    return `${line.setCode.toUpperCase()} #${line.collectorNumber}`;
  }

  if (line.setCode) return line.setCode.toUpperCase();

  return null;
}

function formatLineInput(line: ParsedDeckLine) {
  const print = formatLinePrint(line);

  return print ? `${line.name} (${print})` : line.name;
}

async function fetchScryfallFuzzyCard(name: string) {
  const url = new URL(SCRYFALL_NAMED_URL);
  url.searchParams.set("fuzzy", name);

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "ZyneatyWikiDeckLab/0.1",
    },
  });

  if (response.status === 404) return null;

  if (!response.ok) {
    throw new Error("Scryfall konnte gerade nicht abgefragt werden.");
  }

  return (await response.json()) as ScryfallCard;
}

async function fetchScryfallCards(lines: ParsedDeckLine[]) {
  const cards = new Map<string, ResolvedScryfallCard>();
  const missing: string[] = [];
  const corrections: DeckLabCorrection[] = [];
  const requests = lines.map((line) => {
    const identifier: ScryfallCollectionIdentifier =
      line.setCode && line.collectorNumber
        ? {
            set: line.setCode,
            collector_number: line.collectorNumber,
          }
        : { name: line.name };

    return {
      key: getLineLookupKey(line),
      line,
      identifier,
    };
  });

  const printRequests = new Map<string, string>();
  const nameRequests = new Map<string, string[]>();

  for (const request of requests) {
    if ("set" in request.identifier) {
      printRequests.set(
        `${request.identifier.set.toLowerCase()}|${request.identifier.collector_number.toLowerCase()}`,
        request.key
      );
    } else {
      const key = request.identifier.name.toLowerCase();
      nameRequests.set(key, [...(nameRequests.get(key) ?? []), request.key]);
    }
  }

  for (let index = 0; index < requests.length; index += COLLECTION_CHUNK_SIZE) {
    const chunk = requests.slice(index, index + COLLECTION_CHUNK_SIZE);
    const response = await fetch(SCRYFALL_COLLECTION_URL, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "User-Agent": "ZyneatyWikiDeckLab/0.1",
      },
      body: JSON.stringify({
        identifiers: chunk.map((request) => request.identifier),
      }),
    });

    if (!response.ok) {
      throw new Error("Scryfall konnte gerade nicht abgefragt werden.");
    }

    const payload = (await response.json()) as { data?: ScryfallCard[] };

    for (const card of payload.data ?? []) {
      const printKey = getCardPrintKey(card);
      const requestKey = printKey ? printRequests.get(printKey) : undefined;

      if (requestKey) {
        cards.set(requestKey, { card, matchNote: null });
        continue;
      }

      const nameKey = card.name.toLowerCase();
      const requestKeys = nameRequests.get(nameKey);
      const nextRequestKey = requestKeys?.shift();

      if (nextRequestKey) {
        cards.set(nextRequestKey, { card, matchNote: null });
      }
    }
  }

  for (const request of requests) {
    if (cards.has(request.key)) continue;

    const fuzzyCard = await fetchScryfallFuzzyCard(request.line.name);

    if (fuzzyCard) {
      const exactPrint = Boolean(
        request.line.setCode && request.line.collectorNumber
      );
      const cardPrint = formatCardPrint(fuzzyCard);
      const note = exactPrint
        ? "Exakter Druck nicht gefunden, Standarddruck per Name genutzt."
        : "Per Scryfall-Fuzzy-Suche aufgeloest.";

      cards.set(request.key, {
        card: fuzzyCard,
        matchNote: note,
      });
      corrections.push({
        input: formatLineInput(request.line),
        matched: cardPrint ? `${fuzzyCard.name} (${cardPrint})` : fuzzyCard.name,
        note,
      });
      continue;
    }

    missing.push(formatLineInput(request.line));
  }

  return { cards, missing, corrections };
}

function getMoxfieldDeckId(value: string) {
  const trimmed = value.trim();

  if (!trimmed) return null;

  try {
    const url = new URL(trimmed);
    const isMoxfield =
      url.hostname === "moxfield.com" ||
      url.hostname === "www.moxfield.com";

    if (!isMoxfield) return null;

    const parts = url.pathname.split("/").filter(Boolean);
    const deckIndex = parts.findIndex((part) => part === "decks");
    const deckId = deckIndex >= 0 ? parts[deckIndex + 1] : null;

    return deckId && /^[A-Za-z0-9_-]+$/.test(deckId) ? deckId : null;
  } catch {
    return /^[A-Za-z0-9_-]+$/.test(trimmed) ? trimmed : null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function getString(value: unknown) {
  return typeof value === "string" ? value : null;
}

function getMoxfieldCardObject(entry: unknown) {
  if (!isRecord(entry)) return null;

  const card = entry.card;

  if (isRecord(card)) return card;

  return entry;
}

function getMoxfieldQuantity(entry: unknown) {
  if (!isRecord(entry)) return 1;

  const quantity = entry.quantity ?? entry.count ?? entry.qty;
  const numberValue =
    typeof quantity === "number" ? quantity : Number.parseInt(String(quantity), 10);

  return Number.isFinite(numberValue) && numberValue > 0 ? numberValue : 1;
}

function getMoxfieldBoardEntries(board: unknown) {
  if (!board) return [];

  if (Array.isArray(board)) return board;

  if (!isRecord(board)) return [];

  if (Array.isArray(board.cards)) return board.cards;
  if (isRecord(board.cards)) return Object.values(board.cards);

  return Object.values(board);
}

function findMoxfieldBoard(deck: Record<string, unknown>, names: string[]) {
  for (const name of names) {
    if (deck[name]) return deck[name];
  }

  const boards = deck.boards;

  if (isRecord(boards)) {
    for (const name of names) {
      const board = boards[name];

      if (isRecord(board) && "cards" in board) return board.cards;
      if (board) return board;
    }
  }

  return null;
}

function getMoxfieldCardName(entry: unknown) {
  const card = getMoxfieldCardObject(entry);

  if (!card) return null;

  return (
    getString(card.name) ??
    getString(card.cardName) ??
    getString(card.displayName)
  );
}

function getMoxfieldSetCode(entry: unknown) {
  const card = getMoxfieldCardObject(entry);

  if (!card) return null;

  return (
    getString(card.set) ??
    getString(card.setCode) ??
    getString(card.edition)
  );
}

function getMoxfieldCollectorNumber(entry: unknown) {
  const card = getMoxfieldCardObject(entry);

  if (!card) return null;

  return (
    getString(card.cn) ??
    getString(card.collectorNumber) ??
    getString(card.collector_number) ??
    getString(card.number)
  );
}

function formatImportedDeckLine(entry: unknown) {
  const name = getMoxfieldCardName(entry);

  if (!name) return null;

  const quantity = getMoxfieldQuantity(entry);
  const setCode = getMoxfieldSetCode(entry);
  const collectorNumber = getMoxfieldCollectorNumber(entry);
  const print =
    setCode && collectorNumber
      ? ` (${setCode.toUpperCase()}) ${collectorNumber}`
      : setCode
        ? ` (${setCode.toUpperCase()})`
        : "";

  return `${quantity} ${name}${print}`;
}

function formatMoxfieldSection(label: string, entries: unknown[]) {
  const lines = entries.map(formatImportedDeckLine).filter(Boolean);

  if (lines.length === 0) return [];

  return [label, ...lines];
}

function normalizeMoxfieldFormat(value: unknown) {
  const format = getString(value)?.toLowerCase();

  if (format === "commander" || format === "edh") return "commander";

  return "casual";
}

function createMoxfieldRawList(deck: Record<string, unknown>) {
  const commanderEntries = getMoxfieldBoardEntries(
    findMoxfieldBoard(deck, ["commanders", "commander"])
  );
  const mainEntries = getMoxfieldBoardEntries(
    findMoxfieldBoard(deck, ["mainboard", "main", "deck"])
  );
  const sideEntries = getMoxfieldBoardEntries(
    findMoxfieldBoard(deck, ["sideboard", "side", "maybeboard"])
  );
  const sections = [
    ...formatMoxfieldSection("Commander", commanderEntries),
    ...formatMoxfieldSection("Deck", mainEntries),
    ...formatMoxfieldSection("Sideboard", sideEntries),
  ];

  return {
    rawList: sections.join("\n"),
    commanderName: getMoxfieldCardName(commanderEntries[0]) ?? null,
  };
}

async function fetchMoxfieldDeck(deckId: string) {
  const failedStatuses: number[] = [];

  for (const base of MOXFIELD_DECK_API_BASES) {
    const response = await fetch(`${base}/${deckId}`, {
      cache: "no-store",
      headers: {
        Accept: "application/json",
        Referer: "https://www.moxfield.com/",
        "User-Agent": "ZyneatyWikiDeckLab/0.1",
      },
    });

    if (response.status === 404) continue;

    if (response.status === 403) {
      throw new Error(
        "Moxfield blockiert den direkten Server-Import gerade mit Cloudflare 403. Exportiere das Deck in Moxfield als Text und fuege die Liste unten in die Deckliste ein; Analyse und Empfehlungen funktionieren danach normal."
      );
    }

    if (!response.ok) {
      failedStatuses.push(response.status);
      continue;
    }

    const payload = (await response.json()) as unknown;

    if (isRecord(payload)) return payload;
  }

  if (failedStatuses.length > 0) {
    throw new Error(
      `Moxfield konnte gerade nicht abgefragt werden. Antwortstatus: ${failedStatuses.join(", ")}.`
    );
  }

  throw new Error(
    "Dieses Moxfield-Deck konnte nicht gefunden werden. Ist der Link oeffentlich?"
  );
}

export async function importMoxfieldDeck(
  sourceUrl: string
): Promise<MoxfieldImportResult> {
  const deckId = getMoxfieldDeckId(sourceUrl);

  if (!deckId) {
    throw new Error("Bitte fuege einen gueltigen Moxfield-Decklink ein.");
  }

  const deck = await fetchMoxfieldDeck(deckId);
  const name = getString(deck.name)?.trim() || "Moxfield Import";
  const format = normalizeMoxfieldFormat(deck.format);
  const { rawList, commanderName } = createMoxfieldRawList(deck);

  if (!rawList.trim()) {
    throw new Error("Aus diesem Moxfield-Link konnte keine Deckliste gelesen werden.");
  }

  const analysis = await analyzeDeckList(rawList, format, commanderName ?? undefined);

  return {
    name,
    format,
    commanderName: analysis.commanderName ?? commanderName,
    rawList,
    notes: `Importiert von Moxfield: ${sourceUrl.trim()}`,
    sourceUrl: sourceUrl.trim(),
    analysis,
  };
}

export async function analyzeDeckList(
  rawList: string,
  format = "commander",
  commanderName?: string
): Promise<DeckLabAnalysis> {
  const parsedLines = applyCommanderField(parseDeckList(rawList), commanderName);

  if (parsedLines.length === 0) {
    return {
      cards: [],
      missing: [],
      corrections: [],
      recommendations: [],
      warnings: ["Keine Karten erkannt. Nutze Zeilen wie '1 Sol Ring'."],
      stats: getEmptyStats(),
      commanderName: null,
    };
  }

  const quantityByName = new Map<string, ParsedDeckLine>();

  for (const line of parsedLines) {
    const key = getLineLookupKey(line);
    const existing = quantityByName.get(key);

    if (existing) {
      existing.quantity += line.quantity;
      if (existing.section !== "commander") existing.section = line.section;
    } else {
      quantityByName.set(key, { ...line });
    }
  }

  const uniqueLines = Array.from(quantityByName.values());
  const {
    cards: scryfallCards,
    missing,
    corrections,
  } = await fetchScryfallCards(uniqueLines);

  const cards = uniqueLines
    .map((line): DeckLabCard | null => {
      const resolved = scryfallCards.get(getLineLookupKey(line));
      const source = resolved?.card;
      if (!source) return null;

      const typeLine = source.type_line ?? "";

      return {
        id: source.id,
        name: source.name,
        quantity: line.quantity,
        section: line.section,
        importedName: line.name,
        setCode: source.set ?? line.setCode,
        collectorNumber: source.collector_number ?? line.collectorNumber,
        matchNote: resolved.matchNote,
        manaCost: source.mana_cost ?? "",
        manaValue: source.cmc ?? 0,
        colors: source.colors ?? [],
        colorIdentity: source.color_identity ?? [],
        typeLine,
        oracleText: getCardOracleText(source),
        imageUrl: getCardImageUrl(source),
        rarity: source.rarity ?? "",
        setName: source.set_name ?? "",
        priceUsd: source.prices?.usd ?? null,
        priceEur: source.prices?.eur ?? null,
        scryfallUrl: source.scryfall_uri ?? null,
        roles: inferRoles(source),
        isLand: typeLine.toLowerCase().includes("land"),
      };
    })
    .filter((card): card is DeckLabCard => Boolean(card))
    .sort((a, b) => {
      if (a.section !== b.section) return a.section === "commander" ? -1 : 1;
      if (a.isLand !== b.isLand) return a.isLand ? 1 : -1;
      return a.manaValue - b.manaValue || a.name.localeCompare(b.name);
    });

  const resolvedCommanderName =
    cards.find((card) => card.section === "commander")?.name ?? null;
  const stats = createStats(cards);
  const recommendations = await createRecommendations(
    cards,
    stats,
    resolvedCommanderName
  );

  return {
    cards,
    missing,
    corrections,
    recommendations,
    warnings: createWarnings(
      format,
      cards,
      missing,
      corrections,
      stats,
      resolvedCommanderName
    ),
    stats,
    commanderName: resolvedCommanderName,
  };
}

export async function listDeckLabDecks(ownerDiscordId: string) {
  const { data, error } = await supabase
    .from("deck_lab_decks")
    .select(
      "id,name,format,commander_name,raw_list,notes,analysis,created_at,updated_at"
    )
    .eq("owner_discord_id", ownerDiscordId)
    .order("updated_at", { ascending: false });

  if (error) {
    if (error.message.includes("deck_lab_decks")) {
      return {
        decks: [],
        setupError:
          "Die Supabase-Tabelle fuer das Deck Lab fehlt noch. Fuehre die neue Migration aus.",
      };
    }

    throw new Error(error.message);
  }

  return {
    decks: ((data ?? []) as DeckLabDeckRow[]).map(toDeck),
    setupError: null,
  };
}

export async function saveDeckLabDeck(input: {
  id?: string;
  ownerDiscordId: string;
  name: string;
  format: string;
  rawList: string;
  notes?: string;
  analysis: DeckLabAnalysis;
}) {
  const payload = {
    owner_discord_id: input.ownerDiscordId,
    name: input.name.trim(),
    format: input.format,
    commander_name: input.analysis.commanderName,
    raw_list: input.rawList,
    notes: input.notes?.trim() || null,
    analysis: input.analysis,
    updated_at: new Date().toISOString(),
  };

  const query = input.id
    ? supabase
        .from("deck_lab_decks")
        .update(payload)
        .eq("id", input.id)
        .eq("owner_discord_id", input.ownerDiscordId)
    : supabase.from("deck_lab_decks").insert(payload);

  const { data, error } = await query
    .select(
      "id,name,format,commander_name,raw_list,notes,analysis,created_at,updated_at"
    )
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return toDeck(data as DeckLabDeckRow);
}

export async function deleteDeckLabDeck(id: string, ownerDiscordId: string) {
  const { error } = await supabase
    .from("deck_lab_decks")
    .delete()
    .eq("id", id)
    .eq("owner_discord_id", ownerDiscordId);

  if (error) {
    throw new Error(error.message);
  }
}
