export type WikiEntry = {
  id: string;
  slug: string;
  title: string;
  category: string;
  people: string[];
  quoteSpeaker: string | null;
  quoteText: string | null;
  story: string;
  whyFunny: string;
  usage: string;
  mediaUrl: string | null;
  mediaType: string | null;
  createdAt: string | null;
};

type SubmissionRow = {
  id: string | number;
  title: string;
  category: string;
  people: string | null;
  quote_speaker?: string | null;
  quote_text?: string | null;
  story: string;
  why_funny: string;
  usage: string | null;
  media_url: string | null;
  media_type: string | null;
  created_at: string | null;
};

export function createSlug(title: string) {
  return title
    .toLowerCase()
    .trim()
    .replace(/[ä]/g, "ae")
    .replace(/[ö]/g, "oe")
    .replace(/[ü]/g, "ue")
    .replace(/[ß]/g, "ss")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function createSummary(text: string, length = 120) {
  return text.length > length ? `${text.slice(0, length)}...` : text;
}

export function splitPeople(value: string | null) {
  if (!value) return [];

  return value
    .split(",")
    .map((person) => person.trim())
    .filter(Boolean);
}

export function getPersonHref(person: string) {
  return `/people/${encodeURIComponent(person.toLowerCase())}`;
}

export function samePerson(left: string | null | undefined, right: string) {
  return left?.trim().toLowerCase() === right.trim().toLowerCase();
}

export function getPrimaryText(
  entry: Pick<WikiEntry, "category" | "quoteText" | "story">
) {
  if (entry.category === "Zitat") {
    return entry.quoteText?.trim() || entry.story;
  }

  return entry.story;
}

export function getQuoteStory(
  entry: Pick<WikiEntry, "category" | "quoteText" | "story">
) {
  if (entry.category !== "Zitat" || !entry.quoteText?.trim()) {
    return "";
  }

  return entry.story.trim();
}

export function mapSubmissionToWikiEntry(entry: SubmissionRow): WikiEntry {
  return {
    id: String(entry.id),
    slug: createSlug(entry.title),
    title: entry.title,
    category: entry.category,
    people: splitPeople(entry.people),
    quoteSpeaker: entry.quote_speaker?.trim() || null,
    quoteText: entry.quote_text?.trim() || null,
    story: entry.story,
    whyFunny: entry.why_funny,
    usage: entry.usage ?? "",
    mediaUrl: entry.media_url ?? null,
    mediaType: entry.media_type ?? null,
    createdAt: entry.created_at ?? null,
  };
}
