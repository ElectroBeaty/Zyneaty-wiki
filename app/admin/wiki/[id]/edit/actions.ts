"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { isAdminDiscordId } from "@/lib/admin";
import { verifyMediaFile } from "@/lib/media-validation";
import { supabase } from "@/lib/supabase";
import { createSlug } from "@/lib/wiki";
import { getUploadedMedia } from "@/lib/uploaded-media";

function normalizePeople(value: string) {
  return value
    .split(/[,\s]+/)
    .map((person) => person.trim())
    .filter(Boolean)
    .join(", ");
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

export async function updateWikiEntry(id: string, formData: FormData) {
  const session = await getServerSession(authOptions);

  if (!isAdminDiscordId(session?.user?.id)) {
    redirect("/denied");
  }

  const mediaFile = formData.get("media");
  let updateStatus = "saved";

  const updateData: {
    title: string;
    category: string;
    people: string;
    story: string;
    why_funny: string;
    usage: string;
    media_url?: string | null;
    media_type?: string | null;
  } = {
    title: String(formData.get("title")).trim(),
    category: String(formData.get("category")),
    people: normalizePeople(String(formData.get("people") ?? "")),
    story: String(formData.get("story")),
    why_funny: String(formData.get("whyFunny")),
    usage: String(formData.get("usage") ?? ""),
  };

  if (mediaFile instanceof File && mediaFile.size > 0) {
    const { mediaUrl, mediaType } = await uploadMedia(mediaFile);
    updateData.media_url = mediaUrl;
    updateData.media_type = mediaType;
    updateStatus = "media-updated";
  }

  const uploadedMedia = getUploadedMedia(formData);

  if (uploadedMedia.mediaUrl && uploadedMedia.mediaType) {
    updateData.media_url = uploadedMedia.mediaUrl;
    updateData.media_type = uploadedMedia.mediaType;
    updateStatus = "media-updated";
  }

  if (formData.get("removeMedia") === "on") {
    updateData.media_url = null;
    updateData.media_type = null;
    updateStatus = "media-removed";
  }

  const { error } = await supabase
    .from("submissions")
    .update(updateData)
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/wiki");
  revalidatePath("/media");
  revalidatePath(`/wiki/${createSlug(updateData.title)}`);
  revalidatePath(`/admin/wiki/${id}/edit`);

  redirect(`/admin/wiki/${id}/edit?status=${updateStatus}`);
}
