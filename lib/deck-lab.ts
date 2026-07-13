import "server-only";
import { supabase } from "@/lib/supabase";

const SCRYFALL_COLLECTION_URL = "https://api.scryfall.com/cards/collection";
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
  warnings: string[];
  stats: DeckLabStats;
  commanderName: string | null;
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
      warnings: [],
      stats: getEmptyStats(),
      commanderName: null,
    };
  }

  const analysis = value as Partial<DeckLabAnalysis>;

  return {
    cards: Array.isArray(analysis.cards) ? analysis.cards : [],
    missing: Array.isArray(analysis.missing) ? analysis.missing : [],
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

function normalizeDeckLineName(value: string) {
  return value
    .replace(/\s+\[[^\]]+\]$/g, "")
    .replace(/\s+\([A-Z0-9]{2,6}\)\s*[\w-]*$/g, "")
    .replace(/\s+#.*$/g, "")
    .replace(/\s+\*F\*$/gi, "")
    .trim();
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

    const match = line.match(/^(\d+)\s*x?\s+(.+)$/i);
    if (!match) continue;

    const quantity = Number.parseInt(match[1], 10);
    const name = normalizeDeckLineName(match[2]);

    if (!Number.isFinite(quantity) || quantity < 1 || !name) continue;

    lines.push({
      quantity,
      name,
      section,
    });
  }

  return lines;
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
  stats: DeckLabStats,
  commanderName: string | null
) {
  const warnings: string[] = [];
  const lowerFormat = format.toLowerCase();

  if (missing.length > 0) {
    warnings.push(`${missing.length} Karte(n) konnten nicht gefunden werden.`);
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

async function fetchScryfallCards(names: string[]) {
  const cards = new Map<string, ScryfallCard>();
  const missing: string[] = [];

  for (let index = 0; index < names.length; index += COLLECTION_CHUNK_SIZE) {
    const chunk = names.slice(index, index + COLLECTION_CHUNK_SIZE);
    const response = await fetch(SCRYFALL_COLLECTION_URL, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "User-Agent": "ZyneatyWikiDeckLab/0.1",
      },
      body: JSON.stringify({
        identifiers: chunk.map((name) => ({ name })),
      }),
    });

    if (!response.ok) {
      throw new Error("Scryfall konnte gerade nicht abgefragt werden.");
    }

    const payload = (await response.json()) as {
      data?: ScryfallCard[];
      not_found?: Array<{ name?: string }>;
    };

    for (const card of payload.data ?? []) {
      cards.set(card.name.toLowerCase(), card);
    }

    for (const item of payload.not_found ?? []) {
      if (item.name) missing.push(item.name);
    }
  }

  return { cards, missing };
}

export async function analyzeDeckList(
  rawList: string,
  format = "commander"
): Promise<DeckLabAnalysis> {
  const parsedLines = parseDeckList(rawList);

  if (parsedLines.length === 0) {
    return {
      cards: [],
      missing: [],
      warnings: ["Keine Karten erkannt. Nutze Zeilen wie '1 Sol Ring'."],
      stats: getEmptyStats(),
      commanderName: null,
    };
  }

  const quantityByName = new Map<string, ParsedDeckLine>();

  for (const line of parsedLines) {
    const key = line.name.toLowerCase();
    const existing = quantityByName.get(key);

    if (existing) {
      existing.quantity += line.quantity;
      if (existing.section !== "commander") existing.section = line.section;
    } else {
      quantityByName.set(key, { ...line });
    }
  }

  const uniqueNames = Array.from(quantityByName.values()).map((line) => line.name);
  const { cards: scryfallCards, missing } = await fetchScryfallCards(uniqueNames);

  const cards = Array.from(quantityByName.values())
    .map((line): DeckLabCard | null => {
      const source = scryfallCards.get(line.name.toLowerCase());
      if (!source) return null;

      const typeLine = source.type_line ?? "";

      return {
        id: source.id,
        name: source.name,
        quantity: line.quantity,
        section: line.section,
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

  const commanderName =
    cards.find((card) => card.section === "commander")?.name ?? null;
  const stats = createStats(cards);

  return {
    cards,
    missing,
    warnings: createWarnings(format, cards, missing, stats, commanderName),
    stats,
    commanderName,
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
