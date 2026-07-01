"use server";

import { randomUUID } from "node:crypto";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { getMediaDescriptor } from "@/lib/media-validation";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function createSignedMediaUpload(contentType: string) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  if (!userId) {
    throw new Error("Nicht eingeloggt.");
  }

  const media = getMediaDescriptor(contentType);

  if (!media) {
    throw new Error("Dieser Dateityp ist nicht erlaubt.");
  }

  const path = `submissions/${userId}/${randomUUID()}.${media.extension}`;
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.storage
    .from("wiki-media")
    .createSignedUploadUrl(path, { upsert: false });

  if (error || !data?.token) {
    throw new Error(error?.message ?? "Upload konnte nicht vorbereitet werden.");
  }

  const { data: publicUrlData } = supabase.storage
    .from("wiki-media")
    .getPublicUrl(path);

  return {
    path,
    token: data.token,
    publicUrl: publicUrlData.publicUrl,
    mediaType: media.mediaType,
  };
}
