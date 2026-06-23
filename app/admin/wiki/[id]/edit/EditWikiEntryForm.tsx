"use client";

import { useState } from "react";
import MediaUploadField from "@/components/MediaUploadField";
import { attachUploadedMedia, updateWikiEntry } from "./actions";

type EditableEntry = {
  id: string;
  title: string;
  category: string;
  people: string;
  quoteSpeaker: string;
  quoteText: string;
  story: string;
  whyFunny: string;
  usage: string;
  mediaUrl: string | null;
};

export default function EditWikiEntryForm({
  entry,
  hasQuoteSpeakerColumn,
  hasQuoteTextColumn,
}: {
  entry: EditableEntry;
  hasQuoteSpeakerColumn: boolean;
  hasQuoteTextColumn: boolean;
}) {
  const [category, setCategory] = useState(entry.category);
  const isQuote = category === "Zitat";
  const quoteSetupMissing =
    isQuote && (!hasQuoteSpeakerColumn || !hasQuoteTextColumn);

  return (
    <>
      {quoteSetupMissing && (
        <div className="mt-6 rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4 text-sm text-amber-100">
          Die Zitat-Felder sind im Code vorbereitet, aber Supabase braucht noch
          die Migrationen f&uuml;r{" "}
          <code className="rounded bg-black/30 px-1 py-0.5">
            quote_speaker
          </code>{" "}
          und{" "}
          <code className="rounded bg-black/30 px-1 py-0.5">quote_text</code>.
          Bis dahin wird das Zitat im alten Feld gespeichert.
        </div>
      )}

      <form
        action={updateWikiEntry.bind(null, entry.id)}
        encType="multipart/form-data"
        className="mt-10 rounded-[2rem] border border-white/10 bg-white/[0.04] p-8 shadow-2xl shadow-black/30"
      >
        <input
          type="hidden"
          name="quoteSpeakerColumnAvailable"
          value={hasQuoteSpeakerColumn ? "1" : "0"}
        />
        <input
          type="hidden"
          name="quoteTextColumnAvailable"
          value={hasQuoteTextColumn ? "1" : "0"}
        />

        <div className="space-y-6">
          <div>
            <label className="text-sm font-semibold text-zinc-300">
              Titel
            </label>

            <input
              name="title"
              required
              defaultValue={entry.title}
              className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 p-4 text-white placeholder:text-zinc-500 outline-none transition focus:border-white/30"
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-zinc-300">Typ</label>

            <select
              name="category"
              required
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-white/10 bg-zinc-900 p-4 text-white outline-none transition focus:border-white/30"
            >
              <option value="Eintrag">Eintrag</option>
              <option value="Zitat">Zitat</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-semibold text-zinc-300">
              Beteiligte
            </label>

            <input
              name="people"
              defaultValue={entry.people}
              placeholder="z.B. Marek Tom Dave"
              className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 p-4 text-white placeholder:text-zinc-500 outline-none transition focus:border-white/30"
            />
          </div>

          {isQuote && (
            <>
              <div>
                <label className="text-sm font-semibold text-zinc-300">
                  Zitat-Sprecher
                </label>

                <input
                  name="quoteSpeaker"
                  defaultValue={entry.quoteSpeaker}
                  placeholder="z.B. Marek"
                  disabled={!hasQuoteSpeakerColumn}
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 p-4 text-white placeholder:text-zinc-500 outline-none transition focus:border-white/30 disabled:cursor-not-allowed disabled:opacity-50"
                />

                {!hasQuoteSpeakerColumn && (
                  <p className="mt-2 text-sm text-amber-200">
                    Dieses Feld wird aktiv, sobald die Supabase-Migration f&uuml;r
                    den Zitat-Sprecher eingespielt ist.
                  </p>
                )}
              </div>

              <div>
                <label className="text-sm font-semibold text-zinc-300">
                  {hasQuoteTextColumn ? "Zitat" : "Zitat / bisheriger Inhalt"}
                </label>

                <textarea
                  name="quoteText"
                  defaultValue={entry.quoteText}
                  required
                  placeholder='z.B. "Achtung, ich kotze gleich!"'
                  className="mt-2 min-h-24 w-full rounded-2xl border border-white/10 bg-white/5 p-4 text-white placeholder:text-zinc-500 outline-none transition focus:border-white/30"
                />

                {!hasQuoteTextColumn && (
                  <p className="mt-2 text-sm text-zinc-500">
                    Die getrennte Story-Spalte wird nach der Supabase-Migration
                    aktiv.
                  </p>
                )}
              </div>
            </>
          )}

          {(!isQuote || hasQuoteTextColumn) && (
            <div>
              <label className="text-sm font-semibold text-zinc-300">
                {isQuote ? "Story / Was ist passiert?" : "Was ist passiert?"}
              </label>

              <textarea
                name="story"
                required={!isQuote}
                defaultValue={entry.story}
                className="mt-2 min-h-32 w-full rounded-2xl border border-white/10 bg-white/5 p-4 text-white placeholder:text-zinc-500 outline-none transition focus:border-white/30"
              />
            </div>
          )}

          <div>
            <label className="text-sm font-semibold text-zinc-300">
              {isQuote ? "Warum ist es legend\u00e4r?" : "Warum ist es lustig?"}
            </label>

            <textarea
              name="whyFunny"
              required
              defaultValue={entry.whyFunny}
              className="mt-2 min-h-28 w-full rounded-2xl border border-white/10 bg-white/5 p-4 text-white placeholder:text-zinc-500 outline-none transition focus:border-white/30"
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-zinc-300">
              {isQuote ? "Kontext" : "Typische Verwendung"}
            </label>

            <textarea
              name="usage"
              defaultValue={entry.usage}
              className="mt-2 min-h-24 w-full rounded-2xl border border-white/10 bg-white/5 p-4 text-white placeholder:text-zinc-500 outline-none transition focus:border-white/30"
            />
          </div>

          <MediaUploadField
            label="Neues Bild, Video oder Audio optional"
            note="Wenn du eine neue Datei ausw\u00e4hlst, ersetzt sie das aktuelle Medium. Warte kurz, bis der Upload fertig ist."
            onUploaded={attachUploadedMedia.bind(null, entry.id)}
          />

          <div className="hidden">
            <label className="text-sm font-semibold text-zinc-300">
              Neues Bild, Video oder Audio optional
            </label>

            <input
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/webm,audio/mpeg,audio/mp4,audio/ogg,audio/wav,audio/webm"
              className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-zinc-300 file:mr-4 file:rounded-full file:border-0 file:bg-white file:px-4 file:py-2 file:font-semibold file:text-black hover:file:bg-zinc-200"
            />

            <p className="mt-2 text-sm text-zinc-500">
              Wenn du eine neue Datei ausw&auml;hlst, ersetzt sie das aktuelle
              Medium.
            </p>
          </div>

          {entry.mediaUrl && (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-sm font-semibold text-zinc-300">
                Aktuelles Medium vorhanden
              </p>

              <a
                href={entry.mediaUrl}
                target="_blank"
                className="mt-2 block text-sm text-zinc-400 underline hover:text-white"
              >
                Medium &ouml;ffnen
              </a>

              <label className="mt-4 flex items-center gap-2 text-sm text-red-300">
                <input type="checkbox" name="removeMedia" />
                Medium entfernen
              </label>
            </div>
          )}
        </div>

        <button
          type="submit"
          className="mt-8 rounded-full bg-white px-8 py-4 font-semibold text-black transition hover:scale-105 hover:bg-zinc-200"
        >
          &Auml;nderungen speichern
        </button>
      </form>
    </>
  );
}
