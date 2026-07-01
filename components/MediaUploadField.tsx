"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { createSignedMediaUpload } from "@/app/actions/media-upload";
import { verifyMediaFile, type MediaType } from "@/lib/media-validation";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type UploadState = "idle" | "uploading" | "ready" | "error";

export default function MediaUploadField({
  label,
  note,
  onUploaded,
}: {
  label: string;
  note: string;
  onUploaded?: (mediaUrl: string, mediaType: MediaType) => Promise<void>;
}) {
  const router = useRouter();
  const [state, setState] = useState<UploadState>("idle");
  const [message, setMessage] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [mediaType, setMediaType] = useState<MediaType | "">("");

  async function uploadFile(file: File) {
    setState("uploading");
    setMessage("Datei wird hochgeladen...");
    setMediaUrl("");
    setMediaType("");

    try {
      const { contentType } = await verifyMediaFile(file);
      const signedUpload = await createSignedMediaUpload(contentType);

      const { error } = await supabase.storage
        .from("wiki-media")
        .uploadToSignedUrl(signedUpload.path, signedUpload.token, file, {
          contentType,
        });

      if (error) {
        throw new Error(error.message);
      }

      if (onUploaded) {
        setMessage("Datei ist hochgeladen und wird im Eintrag gespeichert...");
        await onUploaded(signedUpload.publicUrl, signedUpload.mediaType);
        router.refresh();
      }

      setMediaUrl(signedUpload.publicUrl);
      setMediaType(signedUpload.mediaType);
      setState("ready");
      setMessage(
        onUploaded
          ? "Datei ist hochgeladen und im Eintrag gespeichert."
          : "Datei ist hochgeladen und wird beim Speichern übernommen."
      );
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "Upload fehlgeschlagen.");
    }
  }

  return (
    <div>
      <label className="text-sm font-semibold text-zinc-300">{label}</label>

      <input
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/webm,audio/mpeg,audio/mp4,audio/ogg,audio/wav,audio/webm"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void uploadFile(file);
        }}
        className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-zinc-300 file:mr-4 file:rounded-full file:border-0 file:bg-white file:px-4 file:py-2 file:font-semibold file:text-black hover:file:bg-zinc-200"
      />

      <input type="hidden" name="uploadedMediaUrl" value={mediaUrl} />
      <input type="hidden" name="uploadedMediaType" value={mediaType} />

      <p className="mt-2 text-sm text-zinc-500">{note}</p>

      {state !== "idle" && (
        <p
          className={`mt-2 text-sm font-semibold ${
            state === "error"
              ? "text-red-300"
              : state === "ready"
                ? "text-emerald-300"
                : "text-zinc-300"
          }`}
        >
          {message}
        </p>
      )}
    </div>
  );
}
