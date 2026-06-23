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
  const story = String(formData.get("story")).trim();

  const rawTitle = String(formData.get("title")).trim();

  const title =
    category === "Zitat" && rawTitle === "Zitat"
      ? story.slice(0, 40) || "Zitat"
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

  const insertData = {
    title,
    category,
    people: normalizePeople(String(formData.get("people") ?? "")),
    quote_speaker:
      category === "Zitat"
        ? normalizePerson(String(formData.get("quoteSpeaker") ?? "")) || null
        : null,
    story,
    why_funny: String(formData.get("whyFunny")),
    usage: String(formData.get("usage") ?? ""),
    author_name: session.user.name ?? "Unknown",
    approved: false,
    media_url: mediaUrl,
    media_type: mediaType,
  };

  const { error } = await supabase.from("submissions").insert(insertData);

  if (error?.message.includes("quote_speaker")) {
    const fallbackData = { ...insertData, quote_speaker: undefined };
    const retry = await supabase.from("submissions").insert(fallbackData);

    if (retry.error) {
      throw new Error(retry.error.message);
    }

    redirect("/submit?success=1");
  }

  if (error) {
    throw new Error(error.message);
  }

  redirect("/submit?success=1");
}
