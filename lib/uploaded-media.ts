import type { MediaType } from "@/lib/media-validation";

const allowedMediaTypes = new Set(["image", "video", "audio"]);

export function getUploadedMedia(formData: FormData) {
  const mediaUrl = String(formData.get("uploadedMediaUrl") ?? "").trim();
  const mediaType = String(formData.get("uploadedMediaType") ?? "").trim();

  if (!mediaUrl && !mediaType) {
    return { mediaUrl: null, mediaType: null };
  }

  if (!mediaUrl || !allowedMediaTypes.has(mediaType)) {
    throw new Error("Der Medienupload ist unvollständig.");
  }

  const expectedPrefix = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/wiki-media/submissions/`;

  if (!mediaUrl.startsWith(expectedPrefix)) {
    throw new Error("Der Medienlink ist ungültig.");
  }

  return {
    mediaUrl,
    mediaType: mediaType as MediaType,
  };
}
