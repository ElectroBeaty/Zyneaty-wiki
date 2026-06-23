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

function normalizePerson(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

type UpdateData = {
  title: string;
  category: string;
  people: string;
  quote_speaker?: string | null;
  quote_text?: string | null;
  story: string;
  why_funny: string;
  usage: string;
  media_url?: string | null;
  media_type?: string | null;
};

async function updateSubmissionWithSchemaFallback(
  id: string,
  data: UpdateData
) {
  const optionalColumns = ["quote_text", "quote_speaker"] as const;
  const missingColumns: string[] = [];
  let payload: UpdateData = data;

  for (let attempt = 0; attempt <= optionalColumns.length; attempt += 1) {
    const { error } = await supabase
      .from("submissions")
      .update(payload)
      .eq("id", id);

    if (!error) return missingColumns;

    const missingColumn = optionalColumns.find((column) =>
      error.message.includes(column)
    );

    if (!missingColumn) {
      throw new Error(error.message);
    }

    missingColumns.push(missingColumn);

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

  throw new Error("Der Eintrag konnte nicht gespeichert werden.");
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
  const category = String(formData.get("category"));
  const quoteText = String(formData.get("quoteText") ?? "").trim();

  const updateData: UpdateData = {
    title: String(formData.get("title")).trim(),
    category,
    people: normalizePeople(String(formData.get("people") ?? "")),
    quote_speaker:
      category === "Zitat"
        ? normalizePerson(String(formData.get("quoteSpeaker") ?? "")) || null
        : null,
    quote_text: category === "Zitat" ? quoteText || null : null,
    story: String(formData.get("story") ?? "").trim(),
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

  const missingColumns = await updateSubmissionWithSchemaFallback(
    id,
    updateData
  );

  if (missingColumns.length > 0) {
    updateStatus = "schema-missing";
  }

  revalidatePath("/wiki");
  revalidatePath("/media");
  revalidatePath(`/wiki/${createSlug(updateData.title)}`);
  revalidatePath(`/admin/wiki/${id}/edit`);

  redirect(`/admin/wiki/${id}/edit?status=${updateStatus}`);
}

export async function attachUploadedMedia(
  id: string,
  mediaUrl: string,
  mediaType: string
) {
  const session = await getServerSession(authOptions);

  if (!isAdminDiscordId(session?.user?.id)) {
    redirect("/denied");
  }

  const formData = new FormData();
  formData.set("uploadedMediaUrl", mediaUrl);
  formData.set("uploadedMediaType", mediaType);

  const uploadedMedia = getUploadedMedia(formData);

  if (!uploadedMedia.mediaUrl || !uploadedMedia.mediaType) {
    throw new Error("Der Medienupload ist unvollständig.");
  }

  const { data, error } = await supabase
    .from("submissions")
    .update({
      media_url: uploadedMedia.mediaUrl,
      media_type: uploadedMedia.mediaType,
    })
    .eq("id", id)
    .select("title")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  console.info("admin_media_attached", {
    id,
    mediaType: uploadedMedia.mediaType,
    hasMediaUrl: Boolean(uploadedMedia.mediaUrl),
    title: data.title,
  });

  revalidatePath("/wiki");
  revalidatePath("/media");
  revalidatePath(`/wiki/${createSlug(data.title)}`);
  revalidatePath(`/admin/wiki/${id}/edit`);
}
