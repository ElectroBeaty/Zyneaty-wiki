/* eslint-disable @next/next/no-img-element */
import Link from "next/link";

export type WikiEntryCardModel = {
  slug: string;
  title: string;
  category: string;
  summary: string;
  mediaUrl: string | null;
  mediaType: string | null;
  commentCount?: number;
  reactionCount?: number;
  topReactions?: Array<{
    label: string;
    count: number;
  }>;
};

function getMediaLabel(mediaType: string | null) {
  if (mediaType === "image") return "Bild";
  if (mediaType === "video") return "Video";
  if (mediaType === "audio") return "Audio";
  return "Medium";
}

function AudioVisual() {
  return (
    <div className="absolute inset-0 bg-[linear-gradient(135deg,#171717,#050505)]">
      <div className="absolute inset-x-8 top-8 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      <div className="absolute right-8 top-8 rounded-full border border-orange-200/20 bg-orange-300/10 px-3 py-1 text-xs font-black uppercase tracking-[0.28em] text-orange-100/70">
        Audio
      </div>
      <div className="absolute bottom-10 left-8 right-8 flex h-24 items-end justify-between gap-2 opacity-70">
        {[34, 58, 42, 76, 52, 88, 48, 70, 38, 64, 46, 82].map(
          (height, index) => (
            <span
              key={`${height}-${index}`}
              className="flex-1 rounded-full bg-gradient-to-t from-orange-200/30 to-white/80"
              style={{ height }}
            />
          )
        )}
      </div>
    </div>
  );
}

function VideoVisual({ mediaUrl }: { mediaUrl: string }) {
  return (
    <>
      <video
        src={mediaUrl}
        muted
        playsInline
        preload="metadata"
        className="absolute inset-0 h-full w-full object-cover opacity-45 transition duration-300 group-hover:scale-105 group-hover:opacity-60"
      />
      <div className="absolute right-8 top-8 flex h-12 w-12 items-center justify-center rounded-full border border-white/20 bg-black/45 backdrop-blur">
        <span className="ml-1 h-0 w-0 border-y-[7px] border-l-[11px] border-y-transparent border-l-white" />
      </div>
    </>
  );
}

function MediaVisual({ entry }: { entry: WikiEntryCardModel }) {
  if (!entry.mediaUrl || !entry.mediaType) {
    return (
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(255,255,255,0.08),transparent_28%),linear-gradient(135deg,rgba(255,255,255,0.05),transparent_42%)]" />
    );
  }

  if (entry.mediaType === "image") {
    return (
      <img
        src={entry.mediaUrl}
        alt=""
        className="absolute inset-0 h-full w-full object-cover opacity-55 transition duration-300 group-hover:scale-105 group-hover:opacity-70"
      />
    );
  }

  if (entry.mediaType === "video") {
    return <VideoVisual mediaUrl={entry.mediaUrl} />;
  }

  return <AudioVisual />;
}

export default function WikiEntryCard({
  entry,
  compact = false,
}: {
  entry: WikiEntryCardModel;
  compact?: boolean;
}) {
  const topReactions = entry.topReactions ?? [];
  const reactionCount = entry.reactionCount ?? 0;
  const commentCount = entry.commentCount ?? 0;
  const hasSocial = reactionCount > 0 || commentCount > 0;

  return (
    <Link
      href={`/wiki/${entry.slug}`}
      className={`group relative flex overflow-hidden rounded-[1.75rem] border border-white/10 bg-zinc-950/70 shadow-2xl shadow-black/20 transition hover:-translate-y-1 hover:border-orange-100/30 hover:bg-zinc-900/80 ${
        compact ? "min-h-[230px]" : "min-h-[292px]"
      }`}
    >
      <MediaVisual entry={entry} />

      <div
        className={`absolute inset-0 ${
          entry.mediaUrl
            ? "bg-gradient-to-t from-black via-black/78 to-black/20"
            : "bg-gradient-to-br from-black/35 via-black/10 to-black/35"
        }`}
      />

      <div className="relative z-10 flex w-full flex-col justify-between p-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-white/10 bg-black/25 px-3 py-1 text-xs font-semibold text-zinc-300 backdrop-blur">
            {entry.category}
          </span>

          {entry.mediaUrl && (
            <span className="rounded-full border border-orange-200/20 bg-orange-300/10 px-3 py-1 text-xs font-semibold text-orange-100 backdrop-blur">
              {getMediaLabel(entry.mediaType)}
            </span>
          )}

          {commentCount > 0 && (
            <span className="rounded-full border border-white/10 bg-black/25 px-3 py-1 text-xs font-semibold text-zinc-300 backdrop-blur">
              {commentCount} Kommentare
            </span>
          )}
        </div>

        <div className="pt-10">
          {entry.mediaType === "audio" && (
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/30 px-3 py-1 text-xs font-semibold text-zinc-200 backdrop-blur">
              <span className="h-2 w-2 rounded-full bg-orange-200" />
              Audio-Clip vorhanden
            </div>
          )}

          <h2
            className={`font-black tracking-tight text-white group-hover:text-orange-50 ${
              compact ? "text-2xl" : "text-3xl"
            }`}
          >
            {entry.title}
          </h2>

          <p className="mt-3 max-w-2xl leading-7 text-zinc-300">
            {entry.summary}
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <span className="text-sm font-semibold text-zinc-200">
              Weiterlesen -&gt;
            </span>

            {hasSocial && (
              <div className="flex flex-wrap gap-2">
                {topReactions.map((reaction) => (
                  <span
                    key={reaction.label}
                    className="rounded-full border border-orange-200/20 bg-orange-300/10 px-3 py-1 text-xs font-semibold text-orange-100"
                  >
                    {reaction.label} · {reaction.count}
                  </span>
                ))}

                {reactionCount > 0 && topReactions.length === 0 && (
                  <span className="rounded-full border border-orange-200/20 bg-orange-300/10 px-3 py-1 text-xs font-semibold text-orange-100">
                    Fire · {reactionCount}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
