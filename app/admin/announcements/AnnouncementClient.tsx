"use client";

import { useMemo, useState, useTransition } from "react";

import { sendAnnouncement } from "./actions";

type AnnouncementClientProps = {
  defaultChannelId: string;
};

type StatusMessage = {
  tone: "success" | "error" | "info";
  text: string;
  url?: string;
};

const defaultDescription = `Explore my portfolio and discover everything I'm working on.

Whether you're looking for my latest projects, development updates, fanart, or just want to learn more about me, you'll find it all here.`;

export function AnnouncementClient({ defaultChannelId }: AnnouncementClientProps) {
  const [channelId, setChannelId] = useState(defaultChannelId);
  const [title, setTitle] = useState("Official Website");
  const [description, setDescription] = useState(defaultDescription);
  const [link, setLink] = useState("https://electrobeaty.vercel.app/");
  const [imageUrl, setImageUrl] = useState("");
  const [color, setColor] = useState("#2f3136");
  const [pingEveryone, setPingEveryone] = useState(false);
  const [reactions, setReactions] = useState("");
  const [status, setStatus] = useState<StatusMessage | null>(null);
  const [isPending, startTransition] = useTransition();

  const previewDescription = useMemo(() => description || "Embed-Text", [description]);

  function handleSend() {
    setStatus({ tone: "info", text: "Sende Nachricht..." });

    startTransition(() => {
      void (async () => {
        const result = await sendAnnouncement({
          channelId,
          title,
          description,
          link,
          imageUrl,
          color,
          pingEveryone,
          reactions,
        });

        if (!result.ok) {
          setStatus({ tone: "error", text: result.error });
          return;
        }

        const reactionText = result.reactionsFailed
          ? `Nachricht gesendet, ${result.reactionsAdded} Reactions gesetzt, ${result.reactionsFailed} fehlgeschlagen.`
          : `Nachricht gesendet${result.reactionsAdded ? `, ${result.reactionsAdded} Reactions gesetzt` : ""}.`;
        setStatus({ tone: "success", text: reactionText, url: result.messageUrl });
      })();
    });
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_420px]">
      <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/20 sm:p-6">
        <div className="grid gap-5">
          <label className="grid gap-2 text-sm font-semibold text-zinc-200">
            Channel-ID
            <input
              value={channelId}
              onChange={(event) => setChannelId(event.target.value)}
              className="h-11 rounded-2xl border border-white/10 bg-black/20 px-3 text-sm text-white outline-none transition focus:border-orange-100/50"
              placeholder="1176211895666090015"
            />
          </label>

          <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_120px]">
            <label className="grid gap-2 text-sm font-semibold text-zinc-200">
              Titel
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="h-11 rounded-2xl border border-white/10 bg-black/20 px-3 text-sm text-white outline-none transition focus:border-orange-100/50"
              />
            </label>

            <label className="grid gap-2 text-sm font-semibold text-zinc-200">
              Farbe
              <input
                type="color"
                value={color}
                onChange={(event) => setColor(event.target.value)}
                className="h-11 w-full rounded-2xl border border-white/10 bg-black/20 p-1 outline-none transition focus:border-orange-100/50"
              />
            </label>
          </div>

          <label className="grid gap-2 text-sm font-semibold text-zinc-200">
            Text
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={8}
              className="resize-y rounded-2xl border border-white/10 bg-black/20 px-3 py-3 text-sm leading-6 text-white outline-none transition focus:border-orange-100/50"
            />
          </label>

          <div className="grid gap-5 sm:grid-cols-2">
            <label className="grid gap-2 text-sm font-semibold text-zinc-200">
              Link
              <input
                value={link}
                onChange={(event) => setLink(event.target.value)}
                className="h-11 rounded-2xl border border-white/10 bg-black/20 px-3 text-sm text-white outline-none transition focus:border-orange-100/50"
                placeholder="https://"
              />
            </label>

            <label className="grid gap-2 text-sm font-semibold text-zinc-200">
              Bild-Link
              <input
                value={imageUrl}
                onChange={(event) => setImageUrl(event.target.value)}
                className="h-11 rounded-2xl border border-white/10 bg-black/20 px-3 text-sm text-white outline-none transition focus:border-orange-100/50"
                placeholder="https://"
              />
            </label>
          </div>

          <label className="grid gap-2 text-sm font-semibold text-zinc-200">
            Reactions
            <input
              value={reactions}
              onChange={(event) => setReactions(event.target.value)}
              className="h-11 rounded-2xl border border-white/10 bg-black/20 px-3 text-sm text-white outline-none transition focus:border-orange-100/50"
              placeholder="🔥 ❤️ <:staff:1234567890>"
            />
          </label>

          <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/15 px-3 py-3 text-sm font-semibold text-zinc-200">
            <input
              type="checkbox"
              checked={pingEveryone}
              onChange={(event) => setPingEveryone(event.target.checked)}
              className="h-4 w-4 accent-orange-300"
            />
            @everyone mitsenden
          </label>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleSend}
              disabled={isPending}
              className="h-11 rounded-full bg-white px-5 text-sm font-bold text-black transition hover:scale-[1.02] hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? "Sendet..." : "An Discord senden"}
            </button>

            {status ? (
              <p
                className={`text-sm ${
                  status.tone === "success" ? "text-emerald-300" : status.tone === "error" ? "text-red-300" : "text-zinc-400"
                }`}
              >
                {status.text}
                {status.url ? (
                  <a className="ml-2 font-semibold text-orange-100 underline" href={status.url} target="_blank" rel="noreferrer">
                    Oeffnen
                  </a>
                ) : null}
              </p>
            ) : null}
          </div>
        </div>
      </div>

      <aside className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/20">
        <p className="mb-4 text-xs font-semibold uppercase tracking-[0.3em] text-orange-100/50">Preview</p>
        <div className="rounded-2xl bg-[#313338] p-4 text-[#dbdee1]">
          <p className="mb-3 text-sm text-[#f2f3f5]">{pingEveryone ? "@everyone" : "Zyneaty-Bot"}</p>
          <div className="border-l-4 pl-4" style={{ borderColor: color }}>
            <h2 className="text-base font-bold text-white">{title || "Embed-Titel"}</h2>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[#dbdee1]">{previewDescription}</p>
            {link ? <p className="mt-3 break-all text-sm text-[#00a8fc]">{link}</p> : null}
            {imageUrl ? (
              <div className="mt-4 h-48 rounded-xl border border-white/10 bg-black/20 bg-cover bg-center" style={{ backgroundImage: `url(${imageUrl})` }} />
            ) : null}
          </div>
          {reactions ? <p className="mt-4 text-sm text-[#b5bac1]">Reactions: {reactions}</p> : null}
        </div>
      </aside>
    </div>
  );
}
