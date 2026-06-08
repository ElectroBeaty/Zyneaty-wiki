"use server";

import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { supabase } from "@/lib/supabase";

function normalizePeople(value: string) {
  return value
    .split(/[,\s]+/)
    .map((person) => person.trim())
    .filter(Boolean)
    .join(", ");
}

function getMediaType(file: File) {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  if (file.type.startsWith("audio/")) return "audio";
  return null;
}

function getFileExtension(fileName: string) {
  return fileName.split(".").pop() || "file";
}

async function uploadMedia(file: File) {
  if (!file || file.size === 0) {
    return { mediaUrl: null, mediaType: null };
  }

  const mediaType = getMediaType(file);

  if (!mediaType) {
    throw new Error("Nur Bild-, Video- oder Audiodateien sind erlaubt.");
  }

  const maxSize = 50 * 1024 * 1024;

  if (file.size > maxSize) {
    throw new Error("Die Datei ist zu groß. Maximal erlaubt sind 50 MB.");
  }

  const fileExt = getFileExtension(file.name);
  const fileName = `${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}.${fileExt}`;

  const filePath = `submissions/${fileName}`;

  const { error } = await supabase.storage
    .from("wiki-media")
    .upload(filePath, file, {
      contentType: file.type,
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
    .ilike("title", title)
    .limit(1);

  if (existing && existing.length > 0) {
    redirect("/submit?error=duplicate");
  }

  const mediaFile = formData.get("media");
  const { mediaUrl, mediaType } =
    mediaFile instanceof File
      ? await uploadMedia(mediaFile)
      : { mediaUrl: null, mediaType: null };

  const { error } = await supabase.from("submissions").insert({
    title,
    category,
    people: normalizePeople(String(formData.get("people") ?? "")),
    story,
    why_funny: String(formData.get("whyFunny")),
    usage: String(formData.get("usage") ?? ""),
    author_name: session.user.name ?? "Unknown",
    approved: false,
    media_url: mediaUrl,
    media_type: mediaType,
  });

  if (error) {
    throw new Error(error.message);
  }

  redirect("/submit?success=1");
}