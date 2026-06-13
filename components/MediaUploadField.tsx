"use client";

import { useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { verifyMediaFile, type MediaType } from "@/lib/media-validation";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type UploadState = "idle" | "uploading" | "ready" | "error";

export default function MediaUploadField({
  label,
  note,
}: {
  label: string;
  note: string;
}) {
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
      const { contentType, extension, mediaType } = await verifyMediaFile(file);
      const fileName = `${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}.${extension}`;
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

      const { data } = supabase.storage.from("wiki-media").getPublicUrl(filePath);

      setMediaUrl(data.publicUrl);
      setMediaType(mediaType);
      setState("ready");
      setMessage("Datei ist hochgeladen und wird beim Speichern übernommen.");
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
