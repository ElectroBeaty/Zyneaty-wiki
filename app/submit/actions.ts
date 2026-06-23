"use server";

import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { verifyMediaFile } from "@/lib/media-validation";
import { escapePostgrestLikePattern } from "@/lib/query-pattern";
import { supabase } from "@/lib/supabase";
import { getUploadedMedia } from "@/lib/uploaded-media";

function normalizePeople(value: string) {
  return value
    .split(/[,\s]+/)
    .map((person) => person.trim())
    .filter(Boolean)
    .join(", ");
}

function normalizePerson(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

type SubmissionInsertData = {
  title: string;
  category: string;
  people: string;
  quote_speaker?: string | null;
  quote_text?: string | null;
  story: string;
  why_funny: string;
  usage: string;
  author_name: string;
  approved: boolean;
  media_url: string | null;
  media_type: string | null;
};

async function insertSubmission(data: SubmissionInsertData) {
  const optionalColumns = ["quote_text", "quote_speaker"] as const;
  let payload: SubmissionInsertData = data;

  for (let attempt = 0; attempt <= optionalColumns.length; attempt += 1) {
    const { error } = await supabase.from("submissions").insert(payload);

    if (!error) return;

    const missingColumn = optionalColumns.find((column) =>
      error.message.includes(column)
    );

    if (!missingColumn) {
      throw new Error(error.message);
    }

    payload = {
      ...payload,
      [missingColumn]: undefined,
    };

    if (
      missingColumn === "quote_text" &&
      payload.category === "Zitat" &&
      !payload.story.trim() &&
      data.quote_text
    ) {
      payload.story = data.quote_text;
    }
  }

  throw new Error("Der Vorschlag konnte nicht gespeichert werden.");
}

async function uploadMedia(file: File) {
  if (!file || file.size === 0) {
    return { mediaUrl: null, mediaType: null };
  }

  const { contentType, extension, mediaType } = await verifyMediaFile(file);

  if (!mediaType) {
    throw new Error("Nur Bild-, Video- oder Audiodateien sind erlaubt.");
  }

  const maxSize = 50 * 1024 * 1024;

  if (file.size > maxSize) {
    throw new Error("Die Datei ist zu groß. Maximal erlaubt sind 50 MB.");
  }

  const fileExt = extension;
  const fileName = `${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}.${fileExt}`;

  const filePath = `submissions/${fileName}`;

  const { error } = await supabase.storage
    .from("wiki-media")
    .upload(filePath, file, {
      contentType,
      upsert: false,
    });

  if (error) {
    throw new Error(error.message);
  }

  const { data } = supabase.storage
    .from("wiki-media")
    .getPublicUrl(filePath);

  return {
    mediaUrl: data.publicUrl,
    mediaType,
  };
}

export async function createSubmission(formData: FormData) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    throw new Error("Nicht eingeloggt");
  }

  const category = String(formData.get("category"));
  const story = String(formData.get("story") ?? "").trim();
  const quoteText = String(formData.get("quoteText") ?? "").trim();

  const rawTitle = String(formData.get("title")).trim();

  const title =
    category === "Zitat" && rawTitle === "Zitat"
      ? (quoteText || story).slice(0, 40) || "Zitat"
      : rawTitle;

  const { data: existing } = await supabase
    .from("submissions")
    .select("id")
    .ilike("title", escapePostgrestLikePattern(title))
    .limit(1);

  if (existing && existing.length > 0) {
    redirect("/submit?error=duplicate");
  }

  const mediaFile = formData.get("media");
  const uploadedMedia = getUploadedMedia(formData);
  const { mediaUrl, mediaType } =
    uploadedMedia.mediaUrl || uploadedMedia.mediaType
      ? uploadedMedia
      : mediaFile instanceof File
        ? await uploadMedia(mediaFile)
        : { mediaUrl: null, mediaType: null };

  if (category === "Zitat" && !quoteText) {
    throw new Error("Bitte gib das eigentliche Zitat an.");
  }

  const insertData: SubmissionInsertData = {
    title,
    category,
    people: normalizePeople(String(formData.get("people") ?? "")),
    quote_speaker:
      category === "Zitat"
        ? normalizePerson(String(formData.get("quoteSpeaker") ?? "")) || null
        : null,
    quote_text: category === "Zitat" ? quoteText : null,
    story,
    why_funny: String(formData.get("whyFunny")),
    usage: String(formData.get("usage") ?? ""),
    author_name: session.user.name ?? "Unknown",
    approved: false,
    media_url: mediaUrl,
    media_type: mediaType,
  };

  await insertSubmission(insertData);

  redirect("/submit?success=1");
}
