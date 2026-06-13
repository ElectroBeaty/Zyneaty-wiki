"use client";

import { useState } from "react";
import MediaUploadField from "@/components/MediaUploadField";
import { createSubmission } from "./actions";

export default function SubmitForm() {
  const [type, setType] = useState("Insider");

  const isQuote = type === "Zitat";

  return (
    <form
      action={createSubmission}
      encType="multipart/form-data"
      className="mt-10 rounded-[2rem] border border-white/10 bg-white/[0.04] p-8 shadow-2xl shadow-black/30"
    >
      <div className="space-y-6">
        <div>
          <label className="text-sm font-semibold text-zinc-300">Typ</label>

          <select
            name="category"
            required
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="mt-2 w-full rounded-2xl border border-white/10 bg-zinc-900 p-4 text-white outline-none transition focus:border-white/30"
          >
            <option value="Insider">Insider</option>
            <option value="Zitat">Zitat</option>
          </select>
        </div>

        {!isQuote ? (
          <>
            <div>
              <label className="text-sm font-semibold text-zinc-300">Titel</label>
              <input
                name="title"
                required
                placeholder="z.B. Der Marek-Incident"
                className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 p-4 text-white placeholder:text-zinc-500 outline-none transition focus:border-white/30"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-zinc-300">Beteiligte</label>
              <input
                name="people"
                placeholder="z.B. Marek Amoun Dave"
                className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 p-4 text-white placeholder:text-zinc-500 outline-none transition focus:border-white/30"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-zinc-300">Was ist passiert?</label>
              <textarea
                name="story"
                required
                placeholder="Erzähl die Story..."
                className="mt-2 min-h-32 w-full rounded-2xl border border-white/10 bg-white/5 p-4 text-white placeholder:text-zinc-500 outline-none transition focus:border-white/30"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-zinc-300">Warum ist es lustig?</label>
              <textarea
                name="whyFunny"
                required
                placeholder="Warum ist das hängen geblieben?"
                className="mt-2 min-h-28 w-full rounded-2xl border border-white/10 bg-white/5 p-4 text-white placeholder:text-zinc-500 outline-none transition focus:border-white/30"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-zinc-300">Typische Verwendung</label>
              <textarea
                name="usage"
                placeholder="z.B. Wird gesagt, wenn jemand wieder komplett lost ist."
                className="mt-2 min-h-24 w-full rounded-2xl border border-white/10 bg-white/5 p-4 text-white placeholder:text-zinc-500 outline-none transition focus:border-white/30"
              />
            </div>
          </>
        ) : (
          <>
            <input type="hidden" name="title" value="Zitat" />

            <div>
              <label className="text-sm font-semibold text-zinc-300">Zitat</label>
              <textarea
                name="story"
                required
                placeholder='z.B. "Ich dachte, das war optional."'
                className="mt-2 min-h-28 w-full rounded-2xl border border-white/10 bg-white/5 p-4 text-white placeholder:text-zinc-500 outline-none transition focus:border-white/30"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-zinc-300">Wer war beteiligt?</label>
              <input
                name="people"
                required
                placeholder="z.B. Marek Tom Dave"
                className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 p-4 text-white placeholder:text-zinc-500 outline-none transition focus:border-white/30"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-zinc-300">In welchem Kontext?</label>
              <textarea
                name="usage"
                placeholder="z.B. Während einem Call, nachdem ..."
                className="mt-2 min-h-28 w-full rounded-2xl border border-white/10 bg-white/5 p-4 text-white placeholder:text-zinc-500 outline-none transition focus:border-white/30"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-zinc-300">Warum ist es legendär?</label>
              <textarea
                name="whyFunny"
                required
                placeholder="Warum ist genau dieser Satz hängen geblieben?"
                className="mt-2 min-h-28 w-full rounded-2xl border border-white/10 bg-white/5 p-4 text-white placeholder:text-zinc-500 outline-none transition focus:border-white/30"
              />
            </div>
          </>
        )}

        <MediaUploadField
          label="Bild, Video oder Audio optional"
          note="Bilder, Videos und Audio bis 50 MB. Warte kurz, bis der Upload fertig ist."
        />

        <div className="hidden">
          <label className="text-sm font-semibold text-zinc-300">
            Bild, Video oder Audio optional
          </label>

          <input
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/webm,audio/mpeg,audio/mp4,audio/ogg,audio/wav,audio/webm"
            className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-zinc-300 file:mr-4 file:rounded-full file:border-0 file:bg-white file:px-4 file:py-2 file:font-semibold file:text-black hover:file:bg-zinc-200"
          />

          <div className="mt-2 text-sm text-zinc-500">
            📷 Bilder • 🎬 Videos • 🎵 Audio
            <br />
            Maximale Dateigröße: 50 MB
          </div>
        </div>
      </div>

      <button
        type="submit"
        className="mt-8 rounded-full bg-white px-8 py-4 font-semibold text-black transition hover:scale-105 hover:bg-zinc-200"
      >
        Vorschlag einreichen
      </button>
    </form>
  );
}
