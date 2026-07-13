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
const SEARCH_RECOMMENDATION_EXCLUSIONS = new Set(
  [
    "Commander Sphere",
    "Evolving Wilds",
    "Hedron Archive",
    "Mind Stone",
    "Rogue's Passage",
    "Solemn Simulacrum",
    "Terramorphic Expanse",
  ].map((name) => name.toLowerCase())
);

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
  imageUrl: string | null;
  scryfallUrl: string | null;
  typeLine: string;
  oracleText: string;
  setCode: string | null;
  collectorNumber: string | null;
  rarity: string;
  setName: string;
  manaValue: number;
  colorIdentity: string[];
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
    text.includes("gain life") ||
    text.includes("gains life") ||
    text.includes("you gain") ||
    text.includes("lifelink")
  ) {
    roles.add("Lifegain");
  }
  if (
    text.includes("mill") ||
    text.includes("mills") ||
    text.includes("milled")
  ) {
    roles.add("Mill");
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

const PREMIUM_RAMP_RECOMMENDATIONS: RecommendationCandidate[] = [
  { name: "Sol Ring", colors: [], reason: "Der Benchmark fuer Commander-Ramp." },
  { name: "Mana Vault", colors: [], reason: "Explosiver Fast-Mana-Slot fuer sehr schnelle Starts." },
  { name: "Grim Monolith", colors: [], reason: "Starker Burst-Ramp fuer teure Commander und Power-Turns." },
  { name: "Chrome Mox", colors: [], reason: "Fast Mana, wenn Tempo wichtiger ist als Kartenvorteil." },
  { name: "Mox Diamond", colors: [], reason: "Fixing und Beschleunigung in einem sehr effizienten Slot." },
  { name: "Arcane Signet", colors: [], reason: "Der sauberste universelle Zweimana-Rock." },
  { name: "Fellwar Stone", colors: [], reason: "In Multiplayer oft ein Zweimana-Rock mit mehreren Farben." },
  { name: "Birds of Paradise", colors: ["G"], reason: "Einmana-Fixing fuer alle Commander-Farben." },
  { name: "Delighted Halfling", colors: ["G"], reason: "Schuetzt legendare Spells vor Countern und rampt frueh." },
  { name: "Bloom Tender", colors: ["G"], reason: "Skaliert extrem mit mehrfarbigen Permanents." },
  { name: "Carpet of Flowers", colors: ["G"], reason: "Sehr stark in blauen Pods und kostet nur ein Mana." },
  { name: "Nature's Lore", colors: ["G"], reason: "Sucht Forest-Duals und kann sie ungetappt bringen." },
  { name: "Three Visits", colors: ["G"], reason: "Zweite Kopie von Nature's Lore fuer schnelle Fixing-Linien." },
  { name: "Farseek", colors: ["G"], reason: "Findet viele Shocklands und Triomes fuer sauberes Fixing." },
  { name: "Skyshroud Claim", colors: ["G"], reason: "Starker Sprung auf sechs Mana mit passenden Forest-Duals." },
  { name: "Smothering Tithe", colors: ["W"], reason: "Multiplayer-Manaengine, die Gegner unter Druck setzt." },
  { name: "Jeska's Will", colors: ["R"], reason: "Explosiver Ritual- und Card-Advantage-Turn mit Commander." },
  { name: "Talisman of Dominance", colors: ["U", "B"], reason: "Ungetappter Zweimana-Ramp fuer Dimir-Farben." },
  { name: "Talisman of Progress", colors: ["W", "U"], reason: "Ungetappter Zweimana-Ramp fuer Azorius-Farben." },
  { name: "Talisman of Indulgence", colors: ["B", "R"], reason: "Ungetappter Zweimana-Ramp fuer Rakdos-Farben." },
  { name: "Talisman of Impulse", colors: ["R", "G"], reason: "Ungetappter Zweimana-Ramp fuer Gruul-Farben." },
  { name: "Talisman of Unity", colors: ["G", "W"], reason: "Ungetappter Zweimana-Ramp fuer Selesnya-Farben." },
  { name: "Talisman of Hierarchy", colors: ["W", "B"], reason: "Ungetappter Zweimana-Ramp fuer Orzhov-Farben." },
  { name: "Talisman of Creativity", colors: ["U", "R"], reason: "Ungetappter Zweimana-Ramp fuer Izzet-Farben." },
  { name: "Talisman of Resilience", colors: ["B", "G"], reason: "Ungetappter Zweimana-Ramp fuer Golgari-Farben." },
  { name: "Talisman of Conviction", colors: ["R", "W"], reason: "Ungetappter Zweimana-Ramp fuer Boros-Farben." },
  { name: "Talisman of Curiosity", colors: ["G", "U"], reason: "Ungetappter Zweimana-Ramp fuer Simic-Farben." },
  ...RAMP_RECOMMENDATIONS,
];

const PREMIUM_DRAW_RECOMMENDATIONS: RecommendationCandidate[] = [
  { name: "The One Ring", colors: [], reason: "Massiver Kartenvorteil und ein Schutzturn in einem Slot." },
  { name: "Skullclamp", colors: [], reason: "Brutaler Draw-Motor mit kleinen Kreaturen oder Tokens." },
  { name: "Sensei's Divining Top", colors: [], reason: "Topdeck-Kontrolle fuer Tutoren, Fetchlands und Setup-Turns." },
  { name: "Rhystic Study", colors: ["U"], reason: "Eine der staerksten dauerhaften Draw-Engines in Commander." },
  { name: "Mystic Remora", colors: ["U"], reason: "Bestraft schnelle Noncreature-Turns und zieht oft mehrere Karten." },
  { name: "Consecrated Sphinx", colors: ["U"], reason: "Uebernimmt lange Multiplayer-Spiele, wenn sie liegen bleibt." },
  { name: "Windfall", colors: ["U"], reason: "Refill, Disruption und Graveyard-Fuel in einem effizienten Spell." },
  { name: "Ledger Shredder", colors: ["U"], reason: "Filtert Karten nebenbei und skaliert mit mehreren Spells pro Zug." },
  { name: "Esper Sentinel", colors: ["W"], reason: "Frueher Tax-Draw, der Gegner direkt verlangsamt." },
  { name: "Archivist of Oghma", colors: ["W"], reason: "Zieht Karten aus gegnerischen Tutoren und Ramp-Spells." },
  { name: "Trouble in Pairs", colors: ["W"], reason: "Sehr viel Kartenvorteil, wenn Gegner im Multiplayer doppelt handeln." },
  { name: "Smuggler's Share", colors: ["W"], reason: "Belohnt gegnerischen Ramp und Draw mit Karten oder Treasures." },
  { name: "Necropotence", colors: ["B"], reason: "Einer der staerksten Draw-Effekte, wenn das Deck Life bezahlen kann." },
  { name: "Black Market Connections", colors: ["B"], reason: "Flexibler Vorteil aus Karten, Treasures und Bodies." },
  { name: "Dark Confidant", colors: ["B"], reason: "Fruehe wiederholbare Kartenquelle fuer niedrige Kurven." },
  { name: "Night's Whisper", colors: ["B"], reason: "Effizienter Zwei-Mana-Draw ohne Synergiebedingung." },
  { name: "Sylvan Library", colors: ["G"], reason: "Topdeck-Kontrolle und explosiver Kartenzug gegen Lebenspunkte." },
  { name: "The Great Henge", colors: ["G"], reason: "Mana, Lifegain, Counter und Draw in Creature-Decks." },
  { name: "Guardian Project", colors: ["G"], reason: "Saubere Creature-Draw-Engine fuer Singleton-Decks." },
  { name: "Beast Whisperer", colors: ["G"], reason: "Zieht aus jeder Kreatur und haelt Creature-Chains am Laufen." },
  { name: "Toski, Bearer of Secrets", colors: ["G"], reason: "Schwer zu entfernen und sehr stark bei breiten Boards." },
  { name: "Wheel of Fortune", colors: ["R"], reason: "Premium-Refill und Graveyard-Fuel fuer rote Decks." },
  { name: "Professional Face-Breaker", colors: ["R"], reason: "Macht Combat-Damage zu Treasures und Kartenimpuls." },
  ...DRAW_RECOMMENDATIONS,
];

const PREMIUM_INTERACTION_RECOMMENDATIONS: RecommendationCandidate[] = [
  { name: "Swords to Plowshares", colors: ["W"], reason: "Das effizienteste Creature-Removal fuer einen Mana." },
  { name: "Path to Exile", colors: ["W"], reason: "Zweiter sehr effizienter Weiss-Removal-Slot." },
  { name: "Generous Gift", colors: ["W"], reason: "Entfernt fast jedes Permanent, egal welcher Typ." },
  { name: "Stroke of Midnight", colors: ["W"], reason: "Flexibles Exile-Removal fuer problematische Permanents." },
  { name: "Teferi's Protection", colors: ["W"], reason: "Schuetzt Board, Life Total und Combo-Turns gleichzeitig." },
  { name: "Flawless Maneuver", colors: ["W"], reason: "Kostenloser Board-Schutz, wenn dein Commander liegt." },
  { name: "Fierce Guardianship", colors: ["U"], reason: "Kostenloser Schutz gegen die wichtigsten Noncreature-Spells." },
  { name: "Force of Will", colors: ["U"], reason: "Premium-Stack-Interaktion ohne offenes Mana." },
  { name: "Force of Negation", colors: ["U"], reason: "Schuetzt vor gegnerischen Noncreature-Combo-Turns." },
  { name: "Mana Drain", colors: ["U"], reason: "Counterspell plus massiver Tempo-Swing." },
  { name: "Swan Song", colors: ["U"], reason: "Ein Mana gegen viele der gefaehrlichsten Spell-Typen." },
  { name: "Flusterstorm", colors: ["U"], reason: "Extrem effizient gegen Stack-Fights und Storm-Turns." },
  { name: "Cyclonic Rift", colors: ["U"], reason: "Einseitiger Reset oder fruehe Notfallantwort." },
  { name: "Deadly Rollick", colors: ["B"], reason: "Kostenloses Exile-Removal mit Commander im Spiel." },
  { name: "Snuff Out", colors: ["B"], reason: "Kostenlose Tempo-Antwort gegen viele Kreaturen." },
  { name: "Opposition Agent", colors: ["B"], reason: "Bestraft Tutoren und Fetchlands als Flash-Hatebear." },
  { name: "Feed the Swarm", colors: ["B"], reason: "Schwarz bekommt damit auch Enchantments sauber weg." },
  { name: "Deflecting Swat", colors: ["R"], reason: "Kostenlose Schutz- und Blowout-Karte mit Commander." },
  { name: "Chaos Warp", colors: ["R"], reason: "Rotes Universal-Removal gegen fast jedes Permanent." },
  { name: "Pyroblast", colors: ["R"], reason: "Ein Mana fuer sehr starke Interaktion gegen Blau." },
  { name: "Red Elemental Blast", colors: ["R"], reason: "Zweite Premium-Antwort gegen blaue Spells und Permanents." },
  { name: "Force of Vigor", colors: ["G"], reason: "Kostenlose Antwort auf Artefakte und Enchantments." },
  { name: "Nature's Claim", colors: ["G"], reason: "Ein Mana fuer sehr effizientes Artifact- oder Enchantment-Removal." },
  { name: "Veil of Summer", colors: ["G"], reason: "Schuetzt eigene Plays gegen Blau und Schwarz und ersetzt sich." },
  { name: "Heroic Intervention", colors: ["G"], reason: "Schuetzt dein Board gegen Wipes und Spot Removal." },
  { name: "Beast Within", colors: ["G"], reason: "Gruenes Universal-Removal fuer jedes Permanent." },
  { name: "Assassin's Trophy", colors: ["B", "G"], reason: "Sehr breites Removal fuer jedes Permanent." },
  { name: "Abrupt Decay", colors: ["B", "G"], reason: "Uncounterbares Removal gegen viele fruehe Engines." },
  { name: "Anguished Unmaking", colors: ["W", "B"], reason: "Exiliert fast jedes Nonland-Permanent instant-speed." },
  { name: "Dovin's Veto", colors: ["W", "U"], reason: "Uncounterbarer Schutz gegen Noncreature-Schluesselspells." },
  ...INTERACTION_RECOMMENDATIONS,
];

const PREMIUM_BOARDWIPE_RECOMMENDATIONS: RecommendationCandidate[] = [
  { name: "Farewell", colors: ["W"], reason: "Einer der flexibelsten Resets gegen Boards, Graveyards und Artifacts." },
  { name: "Toxic Deluge", colors: ["B"], reason: "Guenscher Wipe, der Indestructible umgeht." },
  { name: "Cyclonic Rift", colors: ["U"], reason: "Einseitiger Reset, der Spiele oeffnen kann." },
  { name: "Blasphemous Act", colors: ["R"], reason: "Meist sehr billig und stark gegen volle Boards." },
  { name: "Supreme Verdict", colors: ["W", "U"], reason: "Uncounterbarer Creature-Wipe fuer Azorius-Farben." },
  { name: "Damnation", colors: ["B"], reason: "Klarer Vier-Mana-Creature-Reset in Schwarz." },
  { name: "Wrath of God", colors: ["W"], reason: "Effizienter klassischer Creature-Wipe." },
  { name: "Vanquish the Horde", colors: ["W"], reason: "Wird in Multiplayer oft extrem billig." },
  { name: "Austere Command", colors: ["W"], reason: "Waehlt die Achsen, die das eigene Board am besten verschonen." },
  { name: "Damn", colors: ["W", "B"], reason: "Spot Removal frueh, Boardwipe spaet." },
  { name: "Fire Covenant", colors: ["B", "R"], reason: "Instant-Speed-Wipe, der sehr gezielt gegnerische Boards zerlegt." },
  { name: "Living Death", colors: ["B"], reason: "Boardwipe und Reanimation zugleich fuer Graveyard-Decks." },
  { name: "Merciless Eviction", colors: ["W", "B"], reason: "Exiliert den problematischen Permanent-Typ komplett." },
  { name: "Pernicious Deed", colors: ["B", "G"], reason: "Skalierbarer Reset, besonders stark aus dem Graveyard." },
  ...BOARDWIPE_RECOMMENDATIONS,
];

const PREMIUM_LAND_RECOMMENDATIONS: RecommendationCandidate[] = [
  { name: "Command Tower", colors: [], reason: "Der sauberste Commander-Fixer." },
  { name: "Ancient Tomb", colors: [], reason: "Premium-Tempo fuer fruehe Commander und Power-Plays." },
  { name: "City of Brass", colors: [], reason: "Ungetapptes Fuenffarben-Fixing ohne Tempoverlust." },
  { name: "Mana Confluence", colors: [], reason: "Zweites ungetapptes Fuenffarben-Fixing fuer schnelle Decks." },
  { name: "Exotic Orchard", colors: [], reason: "In Multiplayer fast immer sehr gutes Fixing." },
  { name: "Reflecting Pool", colors: [], reason: "Skaliert stark mit vorhandener Manabase." },
  { name: "Cavern of Souls", colors: [], reason: "Schuetzt den Commander oder zentrale Kreaturentypen vor Countern." },
  { name: "Gemstone Caverns", colors: [], reason: "Explosiver Startvorteil, wenn du nicht anfaengst." },
  { name: "Urza's Saga", colors: [], reason: "Land-Slot, Threat und Tutor fuer wichtige Einmana-Artefakte." },
  { name: "Boseiju, Who Endures", colors: ["G"], reason: "Uncounterbare Interaction auf einem Land-Slot." },
  { name: "Otawara, Soaring City", colors: ["U"], reason: "Flexibler Bounce, der kaum einen Spell-Slot kostet." },
  { name: "Takenuma, Abandoned Mire", colors: ["B"], reason: "Recursion fuer Commander und Schluesselkreaturen auf einem Land." },
  { name: "Eiganjo, Seat of the Empire", colors: ["W"], reason: "Removal-Modus auf einem fast kostenlosen Land-Slot." },
  { name: "Sokenzan, Crucible of Defiance", colors: ["R"], reason: "Instant-Speed-Bodies aus einem Land-Slot." },
  { name: "Urborg, Tomb of Yawgmoth", colors: [], reason: "Verbessert schwarze Manaquellen und Utility-Lands." },
  { name: "Yavimaya, Cradle of Growth", colors: [], reason: "Verbessert gruene Manaquellen und Utility-Lands." },
  { name: "Field of the Dead", colors: [], reason: "Wincondition aus der Manabase in langen Spielen." },
  { name: "Prismatic Vista", colors: [], reason: "Premium-Fetchland fuer Basics ohne Farbbindung." },
  { name: "Fabled Passage", colors: [], reason: "Solides Fixing mit Landfall- und Shuffle-Synergie." },
  { name: "Polluted Delta", colors: [], reason: "Premium-Fetchland fuer passende Island- oder Swamp-Duals." },
  { name: "Verdant Catacombs", colors: [], reason: "Premium-Fetchland fuer passende Swamp- oder Forest-Duals." },
  { name: "Misty Rainforest", colors: [], reason: "Premium-Fetchland fuer passende Forest- oder Island-Duals." },
  { name: "Flooded Strand", colors: [], reason: "Premium-Fetchland fuer passende Plains- oder Island-Duals." },
  { name: "Scalding Tarn", colors: [], reason: "Premium-Fetchland fuer passende Island- oder Mountain-Duals." },
  { name: "Marsh Flats", colors: [], reason: "Premium-Fetchland fuer passende Plains- oder Swamp-Duals." },
  { name: "Bloodstained Mire", colors: [], reason: "Premium-Fetchland fuer passende Swamp- oder Mountain-Duals." },
  { name: "Wooded Foothills", colors: [], reason: "Premium-Fetchland fuer passende Mountain- oder Forest-Duals." },
  { name: "Windswept Heath", colors: [], reason: "Premium-Fetchland fuer passende Forest- oder Plains-Duals." },
  { name: "Arid Mesa", colors: [], reason: "Premium-Fetchland fuer passende Mountain- oder Plains-Duals." },
  { name: "Watery Grave", colors: ["U", "B"], reason: "Ungetapptes Dual mit Fetchland-Synergie." },
  { name: "Overgrown Tomb", colors: ["B", "G"], reason: "Ungetapptes Dual mit Fetchland-Synergie." },
  { name: "Breeding Pool", colors: ["G", "U"], reason: "Ungetapptes Dual mit Fetchland-Synergie." },
  { name: "Hallowed Fountain", colors: ["W", "U"], reason: "Ungetapptes Dual mit Fetchland-Synergie." },
  { name: "Blood Crypt", colors: ["B", "R"], reason: "Ungetapptes Dual mit Fetchland-Synergie." },
  { name: "Stomping Ground", colors: ["R", "G"], reason: "Ungetapptes Dual mit Fetchland-Synergie." },
  { name: "Temple Garden", colors: ["G", "W"], reason: "Ungetapptes Dual mit Fetchland-Synergie." },
  { name: "Godless Shrine", colors: ["W", "B"], reason: "Ungetapptes Dual mit Fetchland-Synergie." },
  { name: "Steam Vents", colors: ["U", "R"], reason: "Ungetapptes Dual mit Fetchland-Synergie." },
  { name: "Sacred Foundry", colors: ["R", "W"], reason: "Ungetapptes Dual mit Fetchland-Synergie." },
  { name: "Zagoth Triome", colors: ["U", "B", "G"], reason: "Fetchbares Dreifarben-Fixing, das spaet cycled." },
  { name: "Raffine's Tower", colors: ["W", "U", "B"], reason: "Fetchbares Dreifarben-Fixing, das spaet cycled." },
  { name: "Xander's Lounge", colors: ["U", "B", "R"], reason: "Fetchbares Dreifarben-Fixing, das spaet cycled." },
  { name: "Ziatora's Proving Ground", colors: ["B", "R", "G"], reason: "Fetchbares Dreifarben-Fixing, das spaet cycled." },
  { name: "Spara's Headquarters", colors: ["G", "W", "U"], reason: "Fetchbares Dreifarben-Fixing, das spaet cycled." },
  ...LAND_RECOMMENDATIONS,
];

const PREMIUM_GRAVEYARD_RECOMMENDATIONS: RecommendationCandidate[] = [
  { name: "Entomb", colors: ["B"], reason: "Der effizienteste Tutor direkt in den Graveyard." },
  { name: "Buried Alive", colors: ["B"], reason: "Fuellt den Graveyard gezielt mit mehreren Kreaturen." },
  { name: "Reanimate", colors: ["B"], reason: "Ein Mana fuer starke Reanimation aus jedem Graveyard." },
  { name: "Animate Dead", colors: ["B"], reason: "Guenstige Reanimation, die mit Enchantment-Synergien arbeitet." },
  { name: "Necromancy", colors: ["B"], reason: "Flexible Reanimation, auch als Trick im gegnerischen Zug." },
  { name: "Victimize", colors: ["B"], reason: "Macht aus einer Kreatur zwei Reanimation-Ziele." },
  { name: "Living Death", colors: ["B"], reason: "Boardwipe und Mass-Reanimation in einem Effekt." },
  { name: "Stitcher's Supplier", colors: ["B"], reason: "Extrem effizienter Selbstmill fuer Graveyard-Plaene." },
  { name: "Life from the Loam", colors: ["G"], reason: "Holt Fetchlands und Utility-Lands wieder und fuellt den Graveyard." },
  { name: "Eternal Witness", colors: ["G"], reason: "Universelle Recursion auf einer Kreatur." },
  { name: "Bala Ged Recovery", colors: ["G"], reason: "Recursion oder Land-Slot, je nachdem was der Zug braucht." },
  { name: "Satyr Wayfinder", colors: ["G"], reason: "Fuellt den Graveyard und findet Land Drops." },
  { name: "Underworld Breach", colors: ["R"], reason: "Explosive Graveyard-Engine fuer Spell- und Combo-Turns." },
  { name: "Sevinne's Reclamation", colors: ["W"], reason: "Holt kleine Permanents mehrfach zurueck." },
  ...GRAVEYARD_RECOMMENDATIONS,
];

const PREMIUM_TOKEN_RECOMMENDATIONS: RecommendationCandidate[] = [
  { name: "Skullclamp", colors: [], reason: "Verwandelt kleine Tokens in echten Kartenvorteil." },
  { name: "Ashnod's Altar", colors: [], reason: "Macht Tokens zu Mana und ermoeglicht Combo-Lines." },
  { name: "Phyrexian Altar", colors: [], reason: "Farbiges Mana aus Tokens fuer explosive Turns." },
  { name: "Anointed Procession", colors: ["W"], reason: "Verdoppelt Token-Produktion in Weiss." },
  { name: "Mondrak, Glory Dominus", colors: ["W"], reason: "Token-Verdoppler auf einem schwer zu entfernenden Body." },
  { name: "Ojer Taq, Deepest Foundation", colors: ["W"], reason: "Verdreifacht Creature-Token und kommt als Land zurueck." },
  { name: "Parallel Lives", colors: ["G"], reason: "Verdoppelt Token-Produktion in Gruen." },
  { name: "Doubling Season", colors: ["G"], reason: "Premium-Verdoppler fuer Tokens und Counter." },
  { name: "Chatterfang, Squirrel General", colors: ["B", "G"], reason: "Erweitert Token-Produktion und bietet Removal." },
  { name: "Pitiless Plunderer", colors: ["B"], reason: "Macht sterbende Kreaturen zu Treasures und Combo-Ressourcen." },
  { name: "Impact Tremors", colors: ["R"], reason: "Jeder Token wird zu direktem Schaden." },
  { name: "Purphoros, God of the Forge", colors: ["R"], reason: "Sehr starke Wincondition fuer breite Token-Turns." },
  ...TOKEN_RECOMMENDATIONS,
];

const PREMIUM_COUNTER_RECOMMENDATIONS: RecommendationCandidate[] = [
  { name: "The Ozolith", colors: [], reason: "Sichert Counter nach Removal und stapelt sie neu." },
  { name: "Hardened Scales", colors: ["G"], reason: "Der effizienteste guenstige +1/+1-Counter-Multiplikator." },
  { name: "Branching Evolution", colors: ["G"], reason: "Verdoppelt +1/+1-Counter fuer breite und hohe Boards." },
  { name: "Doubling Season", colors: ["G"], reason: "Premium-Verdoppler fuer Counter, Tokens und Planeswalker." },
  { name: "Vorinclex, Monstrous Raider", colors: ["G"], reason: "Verdoppelt eigene Counter und halbiert gegnerische Counter." },
  { name: "Kami of Whispered Hopes", colors: ["G"], reason: "Counter-Payoff und Manaquelle in einem Slot." },
  { name: "Evolution Sage", colors: ["G"], reason: "Proliferate auf Landfall laesst Counter-Boards schnell wachsen." },
  { name: "Innkeeper's Talent", colors: ["G"], reason: "Counter-Support mit spaeterem Schutz- und Verdopplungsmodus." },
  { name: "Winding Constrictor", colors: ["B", "G"], reason: "Verdichtet Counter- und Marken-Synergien frueh." },
  { name: "Corpsejack Menace", colors: ["B", "G"], reason: "Verdoppelt +1/+1-Counter auf Kreaturen." },
  ...COUNTER_RECOMMENDATIONS,
];

const PREMIUM_SPELL_RECOMMENDATIONS: RecommendationCandidate[] = [
  { name: "Underworld Breach", colors: ["R"], reason: "Ermoeglicht explosive Recursion-Turns mit Instants und Sorceries." },
  { name: "Jeska's Will", colors: ["R"], reason: "Mana und Kartenimpuls fuer grosse Spell-Turns." },
  { name: "Birgi, God of Storytelling", colors: ["R"], reason: "Jeder Spell erzeugt Mana fuer lange Ketten." },
  { name: "Storm-Kiln Artist", colors: ["R"], reason: "Macht Treasures aus Instants und Sorceries." },
  { name: "Archmage Emeritus", colors: ["U"], reason: "Zieht Karten aus Magecraft und haelt Spell-Chains am Leben." },
  { name: "Talrand, Sky Summoner", colors: ["U"], reason: "Verwandelt Spells in fliegende Board-Praesenz." },
  { name: "Baral, Chief of Compliance", colors: ["U"], reason: "Macht Interaction billiger und looted bei Countern." },
  { name: "Veyran, Voice of Duality", colors: ["U", "R"], reason: "Verdoppelt Magecraft- und Prowess-aehnliche Trigger." },
  { name: "Third Path Iconoclast", colors: ["U", "R"], reason: "Macht aus Noncreature-Spells ein breites Board." },
  { name: "Young Pyromancer", colors: ["R"], reason: "Guenstiger Token-Payoff fuer Spell-Dichte." },
  { name: "Thousand-Year Storm", colors: ["U", "R"], reason: "Top-End-Engine fuer grosse Spell-Turns." },
  { name: "Past in Flames", colors: ["R"], reason: "Graveyard-Refill fuer Instant- und Sorcery-Turns." },
  ...SPELL_RECOMMENDATIONS,
];

const PREMIUM_LIFEGAIN_RECOMMENDATIONS: RecommendationCandidate[] = [
  { name: "Aetherflux Reservoir", colors: [], reason: "Macht viele Lifegain-Trigger zu einer echten Wincondition." },
  { name: "Well of Lost Dreams", colors: [], reason: "Verwandelt Lifegain direkt in Kartenvorteil." },
  { name: "Alhammarret's Archive", colors: [], reason: "Verdoppelt Lifegain und macht Draw-Effekte deutlich staerker." },
  { name: "The One Ring", colors: [], reason: "Starker Draw, der Lifegain-Decks Zeit zum Stabilisieren gibt." },
  { name: "Soul Warden", colors: ["W"], reason: "Frueher, dauerhafter Lifegain-Trigger in Creature-Pods." },
  { name: "Soul's Attendant", colors: ["W"], reason: "Zweiter Einmana-Soul-Sister-Effekt fuer konstante Trigger." },
  { name: "Authority of the Consuls", colors: ["W"], reason: "Bremst gegnerische Kreaturen und erzeugt wiederholten Lifegain." },
  { name: "Blind Obedience", colors: ["W"], reason: "Verlangsamt Artefakte/Kreaturen und gewinnt ueber Extort Leben." },
  { name: "Heliod, Sun-Crowned", colors: ["W"], reason: "Macht Lifegain zu Countern und ermoeglicht Combo-Lines." },
  { name: "Walking Ballista", colors: [], reason: "Kombo-Piece mit Heliod und auch ohne Combo flexibel." },
  { name: "Voice of the Blessed", colors: ["W"], reason: "Wird durch Lifegain schnell zur evasiven Bedrohung." },
  { name: "Cleric Class", colors: ["W"], reason: "Verstaerkt Lifegain und skaliert spaeter in Recursion." },
  { name: "Resplendent Angel", colors: ["W"], reason: "Belohnt grosse Lifegain-Zuege mit evasiven Token." },
  { name: "Rhox Faithmender", colors: ["W"], reason: "Verdoppelt Lifegain und macht Race-Situationen schwer fuer Gegner." },
  { name: "Vito, Thorn of the Dusk Rose", colors: ["B"], reason: "Verwandelt Lifegain in direkten Drain gegen Gegner." },
  { name: "Sanguine Bond", colors: ["B"], reason: "Macht jeden Lifegain-Trigger zu Schaden am Tisch." },
  { name: "Exquisite Blood", colors: ["B"], reason: "Premium-Combo-Piece mit Sanguine-Bond-Effekten." },
  { name: "Bloodchief Ascension", colors: ["B"], reason: "Verbindet gegnerische Graveyards, Mill und Drain besonders stark." },
  { name: "Marauding Blight-Priest", colors: ["B"], reason: "Guenschtiger zweiter Vito-aehnlicher Payoff." },
  { name: "Bolas's Citadel", colors: ["B"], reason: "Lifegain puffert die Life-Kosten und macht explosive Turns moeglich." },
  { name: "Dina, Soul Steeper", colors: ["B", "G"], reason: "Drain-Payoff und Sac-Outlet fuer Lifegain-Decks." },
  { name: "Karlov of the Ghost Council", colors: ["W", "B"], reason: "Wird durch Lifegain riesig und exiliert Problemkreaturen." },
  { name: "Elas il-Kor, Sadistic Pilgrim", colors: ["W", "B"], reason: "Verbindet Creature-ETBs, Lifegain und Drain." },
  { name: "Kambal, Consul of Allocation", colors: ["W", "B"], reason: "Bestraft Noncreature-Spells mit Drain und stabilisiert dein Leben." },
];

const PREMIUM_MILL_RECOMMENDATIONS: RecommendationCandidate[] = [
  { name: "Altar of the Brood", colors: [], reason: "Guenschtiger permanenter Mill-Trigger fuer jedes eigene Permanent." },
  { name: "Mindcrank", colors: [], reason: "Verknuepft Life Loss mit Mill und bildet starke Combo-Lines." },
  { name: "Mesmeric Orb", colors: [], reason: "Sehr effizienter globaler Mill-Motor fuer lange Spiele." },
  { name: "Terisian Mindbreaker", colors: [], reason: "Millt riesige Mengen und kommt mit Unearth noch einmal." },
  { name: "Keening Stone", colors: [], reason: "Finisher, wenn gegnerische Graveyards bereits gefuellt sind." },
  { name: "Bruvac the Grandiloquent", colors: ["U"], reason: "Verdoppelt gegnerischen Mill und macht jeden Mill-Spell gefaehrlich." },
  { name: "Maddening Cacophony", colors: ["U"], reason: "Skaliert vom fruehen Mill-Spell bis zum spaeten Finisher." },
  { name: "Fractured Sanity", colors: ["U"], reason: "Effizienter Mill-Spell, der auch gecycled noch alle Gegner trifft." },
  { name: "Tasha's Hideous Laughter", colors: ["U"], reason: "Exiliert viele Low-MV-Karten und trifft Commander-Decks oft hart." },
  { name: "Archive Trap", colors: ["U"], reason: "Sehr starker Gratis-Mill gegen Such- und Fetch-Effekte." },
  { name: "Court of Cunning", colors: ["U"], reason: "Wiederholter gegnerischer Mill mit Monarch-Value." },
  { name: "Fraying Sanity", colors: ["U"], reason: "Verdoppelt Mill gegen einen ausgewaehlten Gegner." },
  { name: "Psychic Corrosion", colors: ["U"], reason: "Macht deine Draw-Engines zu Mill-Engines gegen Gegner." },
  { name: "Sphinx's Tutelage", colors: ["U"], reason: "Belohnt Kartenziehen mit wiederholtem Gegner-Mill." },
  { name: "Ruin Crab", colors: ["U"], reason: "Sehr effizienter Landfall-Mill fuer Fetchland-Decks." },
  { name: "Hedron Crab", colors: ["U"], reason: "Zweiter guenstiger Landfall-Mill-Motor." },
  { name: "Jace, the Perfected Mind", colors: ["U"], reason: "Flexibler Mill- und Draw-Planeswalker." },
  { name: "Jace, Memory Adept", colors: ["U"], reason: "Wiederholbarer zehn-Karten-Mill pro Aktivierung." },
  { name: "Consuming Aberration", colors: ["U", "B"], reason: "Wird riesig und millt bei jedem Spell weiter." },
  { name: "Phenax, God of Deception", colors: ["U", "B"], reason: "Verwandelt dein Board in wiederholbaren Mill." },
  { name: "Glimpse the Unthinkable", colors: ["U", "B"], reason: "Zwei Mana fuer zehn Karten Mill ist extrem effizient." },
  { name: "Mind Grind", colors: ["U", "B"], reason: "Skalierbarer Multiplayer-Finisher fuer grosse Mana-Zuege." },
  { name: "Duskmantle Guildmage", colors: ["U", "B"], reason: "Verbindet Mill mit Life Loss und comboed mit Mindcrank." },
];

const PREMIUM_LIFEGAIN_MILL_RECOMMENDATIONS: RecommendationCandidate[] = [
  { name: "Bloodchief Ascension", colors: ["B"], reason: "Der staerkste Glue zwischen gegnerischem Mill, Life Loss und deinem Lifegain." },
  { name: "Mindcrank", colors: [], reason: "Verbindet Life Loss und Mill und geht mit Bloodchief Ascension unendlich." },
  { name: "Duskmantle Guildmage", colors: ["U", "B"], reason: "Macht Mill zu Life Loss und bildet mit Mindcrank eine klare Winline." },
  { name: "Syr Konrad, the Grim", colors: ["B"], reason: "Bestraft Kreaturen im Graveyard und profitiert stark von Mill." },
  { name: "Vito, Thorn of the Dusk Rose", colors: ["B"], reason: "Macht Lifegain zu Drain, der wiederum Mindcrank-Lines anschiebt." },
  { name: "Sanguine Bond", colors: ["B"], reason: "Zweiter Lifegain-zu-Drain-Payoff fuer Combo- und Grind-Spiele." },
  { name: "Exquisite Blood", colors: ["B"], reason: "Combo-Piece mit Sanguine Bond oder Vito und stark in Drain-Shells." },
  { name: "Marauding Blight-Priest", colors: ["B"], reason: "Guenstiger redundancy-Payoff fuer Lifegain-zu-Drain." },
  { name: "Psychic Corrosion", colors: ["U"], reason: "Wenn dein Deck viel zieht, wird daraus wiederholter Gegner-Mill." },
  { name: "Fraying Sanity", colors: ["U"], reason: "Verstaerkt einen Mill-Fokus enorm gegen den wichtigsten Gegner." },
  { name: "Bruvac the Grandiloquent", colors: ["U"], reason: "Verdoppelt gegnerischen Mill und macht jede Mill-Line schneller." },
  { name: "Altar of the Brood", colors: [], reason: "Billiger Mill-Trigger, der mit permanentlastigen Lifegain-Boards skaliert." },
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

function isCommanderLegalCard(card: ScryfallCard) {
  const commanderLegality = card.legalities?.commander;

  return !commanderLegality || commanderLegality === "legal";
}

function isStrongSearchRecommendation(card: ScryfallCard) {
  return !SEARCH_RECOMMENDATION_EXCLUSIONS.has(card.name.toLowerCase());
}

function toRecommendationCard(
  card: ScryfallCard,
  title: string,
  reason?: string
) {
  return {
    name: card.name,
    reason: reason ?? getRecommendationReason(card, title),
    imageUrl: getCardImageUrl(card),
    scryfallUrl: card.scryfall_uri ?? null,
    typeLine: card.type_line ?? "",
    oracleText: getCardOracleText(card),
    setCode: card.set ?? null,
    collectorNumber: card.collector_number ?? null,
    rarity: card.rarity ?? "",
    setName: card.set_name ?? "",
    manaValue: card.cmc ?? 0,
    colorIdentity: card.color_identity ?? [],
  };
}

function getUniqueCandidates(candidates: RecommendationCandidate[]) {
  const seen = new Set<string>();
  const uniqueCandidates: RecommendationCandidate[] = [];

  for (const candidate of candidates) {
    const key = candidate.name.toLowerCase();

    if (seen.has(key)) continue;

    seen.add(key);
    uniqueCandidates.push(candidate);
  }

  return uniqueCandidates;
}

async function resolveRecommendationCandidates(
  need: RecommendationNeed,
  cards: DeckLabCard[],
  deckColors: string[]
) {
  const existingNames = new Set(cards.map((card) => card.name.toLowerCase()));
  const limit = need.limit ?? 10;
  const candidates = getUniqueCandidates(need.fallback)
    .filter((candidate) => !existingNames.has(candidate.name.toLowerCase()))
    .filter((candidate) => canPlayCandidate(candidate, deckColors));

  if (candidates.length === 0) return [];

  const candidateLines: ParsedDeckLine[] = candidates.map((candidate) => ({
    quantity: 1,
    name: candidate.name,
    section: "main",
    setCode: null,
    collectorNumber: null,
  }));
  const { cards: resolvedCards } = await fetchScryfallCards(candidateLines);
  const pickedCards: DeckLabRecommendationCard[] = [];

  for (const candidate of candidates) {
    const resolved = resolvedCards.get(candidate.name.toLowerCase());
    const card = resolved?.card;

    if (!card) continue;
    if (existingNames.has(card.name.toLowerCase())) continue;
    if (!canPlayCard(card, deckColors)) continue;
    if (!isCommanderLegalCard(card)) continue;

    pickedCards.push(toRecommendationCard(card, need.title, candidate.reason));

    if (pickedCards.length >= limit) break;
  }

  return pickedCards;
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
    .filter(isCommanderLegalCard)
    .filter(isStrongSearchRecommendation)
    .slice(0, need.limit ?? 10)
    .map((card) => toRecommendationCard(card, need.title));

  if (pickedCards.length === 0) return null;

  return {
    title: need.title,
    reason: `${need.reason} Quelle: aktuelle Scryfall-Suche, nach EDHREC-Relevanz sortiert; Preise werden bewusst ignoriert.`,
    source: "scryfall" as const,
    cards: pickedCards,
  };
}

function mergeRecommendationCards(
  primaryCards: DeckLabRecommendationCard[],
  secondaryCards: DeckLabRecommendationCard[],
  limit: number
) {
  const seen = new Set<string>();
  const mergedCards: DeckLabRecommendationCard[] = [];

  for (const card of [...primaryCards, ...secondaryCards]) {
    const key = card.name.toLowerCase();

    if (seen.has(key)) continue;

    seen.add(key);
    mergedCards.push(card);

    if (mergedCards.length >= limit) break;
  }

  return mergedCards;
}

function includesAny(value: string, phrases: string[]) {
  return phrases.some((phrase) => value.includes(phrase));
}

function collectRecommendationNeeds(
  cards: DeckLabCard[],
  stats: DeckLabStats,
  commanderName: string | null,
  strategyNotes?: string
) {
  const needs: RecommendationNeed[] = [];
  const commanderCards = cards.filter((card) => card.section === "commander");
  const commanderLabel =
    commanderCards.map((card) => card.name).join(" + ") ||
    commanderName ||
    "Commander";
  const commanderText = commanderCards
    .map((card) => [card.name, card.typeLine, card.oracleText].join(" "))
    .join(" ")
    .toLowerCase();
  const deckThemeText = cards
    .map((card) => [card.name, card.typeLine, card.oracleText].join(" "))
    .join(" ")
    .toLowerCase();
  const notesText = strategyNotes?.trim().toLowerCase() ?? "";
  const strategyText = `${commanderText} ${deckThemeText} ${notesText}`;
  const hasLifegainTheme = includesAny(strategyText, [
    "gain life",
    "gains life",
    "you gain",
    "life total",
    "lifelink",
  ]);
  const hasMillTheme = includesAny(strategyText, [
    "mill",
    "mills",
    "milled",
  ]);

  if (hasLifegainTheme && hasMillTheme) {
    needs.push({
      title: `${commanderLabel}: Lifegain + Mill verbinden`,
      reason:
        "Dein Plan zeigt Lifegain und gegnerischen Mill; diese Karten machen daraus echte Winlines statt nur Value.",
      query: '(oracle:"opponent" oracle:"graveyard" or oracle:"mill" oracle:"life")',
      fallback: PREMIUM_LIFEGAIN_MILL_RECOMMENDATIONS,
      limit: 10,
    });
  }

  if (hasLifegainTheme) {
    needs.push({
      title: `${commanderLabel}: Lifegain-Payoffs`,
      reason:
        "Das Deck will Lifegain nicht nur als Polster, sondern als Kartenvorteil, Boarddruck oder Wincondition nutzen.",
      query: '(oracle:"whenever you gain life" or oracle:"you gain life" or oracle:"you gained life" or oracle:"if you gained life")',
      fallback: PREMIUM_LIFEGAIN_RECOMMENDATIONS,
      limit: 12,
    });
  }

  if (hasMillTheme) {
    needs.push({
      title: `${commanderLabel}: Gegner millen`,
      reason:
        "Der Deckplan millt Gegner; diese Karten verdichten den Mill-Plan oder machen gegnerische Graveyards verwertbar.",
      query: '(oracle:"target opponent mills" or oracle:"each opponent mills" or oracle:"opponent mills" or oracle:"opponents mill" or oracle:"opponent would mill")',
      fallback: PREMIUM_MILL_RECOMMENDATIONS,
      limit: 12,
    });
  }

  if ((stats.roleCounts.Ramp ?? 0) < 10) {
    needs.push({
      title: "Mehr Ramp",
      reason:
        "Das Deck will stabil frueher auf seinen Commander und die teureren Plays kommen.",
      query: '(type:artifact oracle:"add" oracle:"mana" or type:creature oracle:"add" oracle:"mana" or oracle:"search your library for a land")',
      fallback: PREMIUM_RAMP_RECOMMENDATIONS,
      limit: 12,
    });
  }

  if ((stats.roleCounts.Draw ?? 0) < 10) {
    needs.push({
      title: "Mehr Card Draw",
      reason:
        "Mehr Kartennachschub verhindert, dass du nach den ersten Turns leer laeufst.",
      query: '(oracle:"draw a card" or oracle:"draw cards" or oracle:"draw two cards" or oracle:"draw three cards")',
      fallback: PREMIUM_DRAW_RECOMMENDATIONS,
      limit: 12,
    });
  }

  if ((stats.roleCounts.Interaction ?? 0) < 9) {
    needs.push({
      title: "Mehr Interaktion",
      reason:
        "Ein paar gezielte Antworten helfen gegen gegnerische Engines und Combo-Pieces.",
      query: '(oracle:"destroy target" or oracle:"exile target" or oracle:"counter target" or oracle:"return target")',
      fallback: PREMIUM_INTERACTION_RECOMMENDATIONS,
      limit: 12,
    });
  }

  if ((stats.roleCounts.Boardwipe ?? 0) < 2) {
    needs.push({
      title: "Boardwipes pruefen",
      reason:
        "Mindestens ein bis zwei Reset-Knoepfe retten Spiele, wenn das Board kippt.",
      query: '(oracle:"destroy all" or oracle:"exile all" or oracle:"all creatures" or oracle:"each creature")',
      fallback: PREMIUM_BOARDWIPE_RECOMMENDATIONS,
      limit: 10,
    });
  }

  if (stats.landCount < 36) {
    needs.push({
      title: "Manabase stabilisieren",
      reason:
        "Die Landzahl wirkt knapp; diese Slots helfen beim Fixing oder bringen Zusatznutzen.",
      query: 'type:land (is:fetchland or oracle:"add one mana of any color" or oracle:"any color" or oracle:"channel")',
      fallback: PREMIUM_LAND_RECOMMENDATIONS,
      limit: 12,
    });
  }

  if (
    strategyText.includes("graveyard") ||
    strategyText.includes("from your graveyard") ||
    strategyText.includes("return target card")
  ) {
    needs.push({
      title: `${commanderLabel}: Graveyard-Synergie`,
      reason:
        "Der Commander deutet auf Friedhofsplaene hin; diese Karten fuellen oder nutzen den Graveyard.",
      query: '(oracle:"graveyard" or oracle:"mill" or oracle:"return target card")',
      fallback: PREMIUM_GRAVEYARD_RECOMMENDATIONS,
      limit: 12,
    });
  }

  if (strategyText.includes("token")) {
    needs.push({
      title: `${commanderLabel}: Token-Synergie`,
      reason:
        "Token-Decks profitieren stark von Verdopplern, Payoffs und Card-Draw aus kleinen Bodies.",
      query: '(oracle:"token" or oracle:"tokens")',
      fallback: PREMIUM_TOKEN_RECOMMENDATIONS,
      limit: 10,
    });
  }

  if (strategyText.includes("counter") || strategyText.includes("+1/+1")) {
    needs.push({
      title: `${commanderLabel}: Counter-Synergie`,
      reason: "Der Commander spricht fuer Marken- oder Counter-Plaene.",
      query: '(oracle:"+1/+1 counter" or oracle:"proliferate")',
      fallback: PREMIUM_COUNTER_RECOMMENDATIONS,
      limit: 10,
    });
  }

  if (
    strategyText.includes("instant") ||
    strategyText.includes("sorcery") ||
    strategyText.includes("copy")
  ) {
    needs.push({
      title: `${commanderLabel}: Spells-Synergie`,
      reason:
        "Wenn der Plan ueber Instants und Sorceries laeuft, helfen diese Payoffs.",
      query: '(oracle:"instant" or oracle:"sorcery" or oracle:"copy")',
      fallback: PREMIUM_SPELL_RECOMMENDATIONS,
      limit: 10,
    });
  }

  return needs.slice(0, 10);
}

async function createRecommendations(
  cards: DeckLabCard[],
  stats: DeckLabStats,
  commanderName: string | null,
  strategyNotes?: string
) {
  const deckColors = getDeckColorIdentity(cards);
  const needs = collectRecommendationNeeds(
    cards,
    stats,
    commanderName,
    strategyNotes
  );
  const recommendations: DeckLabRecommendation[] = [];

  for (const need of needs) {
    const limit = need.limit ?? 10;
    const curatedCards = await resolveRecommendationCandidates(
      need,
      cards,
      deckColors
    );
    const searchedRecommendation = await searchRecommendationCards(
      need,
      cards,
      deckColors
    );
    const mergedCards = mergeRecommendationCards(
      curatedCards,
      searchedRecommendation?.cards ?? [],
      limit
    );

    if (mergedCards.length > 0) {
      recommendations.push({
        title: need.title,
        reason: `${need.reason} Quelle: kuratierte Best-of-Liste, aktuelle Scryfall-Daten und EDHREC-sortierte Live-Suche; Preise werden bewusst ignoriert.`,
        source: curatedCards.length > 0 ? "curated" : "scryfall",
        cards: mergedCards,
      });
    }
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
  commanderName?: string,
  strategyNotes?: string
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
    resolvedCommanderName,
    strategyNotes
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
