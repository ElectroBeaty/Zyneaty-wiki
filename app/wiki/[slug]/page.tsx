import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { isAdminDiscordId } from "@/lib/admin";
import { reactionOptions, type ReactionKey } from "@/lib/reactions";
import {
  getPrimaryText,
  getQuoteStory,
  getPersonHref,
  mapSubmissionToWikiEntry,
  type WikiEntry,
} from "@/lib/wiki";
import { supabase } from "@/lib/supabase";
import {
  deleteComment,
  deleteWikiEntry,
  toggleReaction,
} from "./actions";
import CommentForm from "./CommentForm";

export const dynamic = "force-dynamic";

type ReactionRow = {
  reaction: string;
  user_id: string;
};

type CommentRow = {
  id: string;
  user_id: string;
  user_name: string;
  user_image: string | null;
  body: string;
  created_at: string;
};

type ReactionState = Record<
  ReactionKey,
  {
    count: number;
    active: boolean;
  }
>;

async function getApprovedEntries() {
  const { data, error } = await supabase
    .from("submissions")
    .select("*")
    .eq("approved", true);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(mapSubmissionToWikiEntry);
}

async function getSocialData(entryId: string, userId: string | undefined) {
  const emptyReactions = Object.fromEntries(
    reactionOptions.map((option) => [
      option.key,
      {
        count: 0,
        active: false,
      },
    ])
  ) as ReactionState;

  const [reactionsResult, commentsResult] = await Promise.all([
    supabase
      .from("wiki_reactions")
      .select("reaction,user_id")
      .eq("submission_id", String(entryId)),
    supabase
      .from("wiki_comments")
      .select("id,user_id,user_name,user_image,body,created_at")
      .eq("submission_id", String(entryId))
      .order("created_at", { ascending: false }),
  ]);

  if (reactionsResult.error || commentsResult.error) {
    return {
      enabled: false,
      reactions: emptyReactions,
      comments: [] as CommentRow[],
    };
  }

  const reactions = { ...emptyReactions };

  for (const row of (reactionsResult.data ?? []) as ReactionRow[]) {
    const reaction = row.reaction as ReactionKey;

    if (!reactions[reaction]) continue;

    reactions[reaction] = {
      count: reactions[reaction].count + 1,
      active: reactions[reaction].active || row.user_id === userId,
    };
  }

  return {
    enabled: true,
    reactions,
    comments: (commentsResult.data ?? []) as CommentRow[],
  };
}

function PeopleLinks({
  people,
  label,
}: {
  people: string[];
  label: string;
}) {
  if (people.length === 0) return null;

  return (
    <div className="mt-5">
      <div className="text-sm font-semibold text-zinc-400">{label}</div>

      <div className="mt-3 flex flex-wrap gap-2">
        {people.map((person) => (
          <Link
            key={person}
            href={getPersonHref(person)}
            className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-black transition hover:scale-105 hover:bg-zinc-200"
          >
            {person}
          </Link>
        ))}
      </div>
    </div>
  );
}

function MediaBlock({
  mediaUrl,
  mediaType,
}: {
  mediaUrl: string | null;
  mediaType: string | null;
}) {
  if (!mediaUrl || !mediaType) return null;

  return (
    <section className="mt-5 rounded-3xl border border-white/10 bg-white/[0.03] p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-bold">Medien</h2>

        <Link
          href="/media"
          className="text-sm font-semibold text-zinc-300 transition hover:text-white"
        >
          Zur Galerie →
        </Link>
      </div>

      {mediaType === "image" && (
        <img
          src={mediaUrl}
          alt=""
          className="mt-4 max-h-[600px] w-full rounded-2xl object-contain"
        />
      )}

      {mediaType === "video" && (
        <video src={mediaUrl} controls className="mt-4 w-full rounded-2xl" />
      )}

      {mediaType === "audio" && (
        <audio src={mediaUrl} controls className="mt-4 w-full" />
      )}
    </section>
  );
}

function ReactionPanel({
  entry,
  reactions,
}: {
  entry: WikiEntry;
  reactions: ReactionState;
}) {
  return (
    <section
      id="reactions"
      className="mt-5 rounded-3xl border border-white/10 bg-white/[0.03] p-6"
    >
      <h2 className="text-2xl font-bold">Fire</h2>

      <p className="mt-2 text-sm text-zinc-400">
        Markier den Eintrag, wenn er Fire ist.
      </p>

      <div className="mt-4 flex flex-wrap gap-3">
        {reactionOptions.map((option) => {
          const state = reactions[option.key];

          return (
            <form
              key={option.key}
              action={toggleReaction.bind(
                null,
                entry.id,
                entry.slug,
                option.key
              )}
            >
              <button
                type="submit"
                className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                  state.active
                    ? "border-orange-200 bg-orange-200 text-black shadow-lg shadow-orange-500/20"
                    : "border-orange-300/20 bg-orange-400/10 text-orange-100 hover:border-orange-200/50 hover:bg-orange-400/20"
                }`}
              >
                {option.label} · {state.count}
              </button>
            </form>
          );
        })}
      </div>
    </section>
  );
}

function CommentsPanel({
  comments,
  entry,
  isAdmin,
  userId,
  commentStatus,
}: {
  comments: CommentRow[];
  entry: WikiEntry;
  isAdmin: boolean;
  userId: string | undefined;
  commentStatus: string | undefined;
}) {
  return (
    <section
      id="comments"
      className="mt-5 rounded-3xl border border-white/10 bg-white/[0.03] p-6"
    >
      <h2 className="text-2xl font-bold">Kommentare</h2>

      {commentStatus === "added" && (
        <div className="mt-4 rounded-2xl border border-green-500/20 bg-green-500/10 p-4 text-sm font-semibold text-green-300">
          Kommentar gespeichert.
        </div>
      )}

      {commentStatus === "deleted" && (
        <div className="mt-4 rounded-2xl border border-green-500/20 bg-green-500/10 p-4 text-sm font-semibold text-green-300">
          Kommentar gelöscht.
        </div>
      )}

      {commentStatus === "failed" && (
        <div className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm font-semibold text-red-300">
          Kommentar-Aktion konnte nicht abgeschlossen werden. Prüfe bitte, ob die
          Supabase-Migration für Kommentare und Fire eingespielt ist.
        </div>
      )}

      <CommentForm submissionId={entry.id} slug={entry.slug} />

      <div className="mt-6 space-y-4">
        {comments.map((comment) => {
          const canDelete = isAdmin || comment.user_id === userId;

          return (
            <article
              key={comment.id}
              className="rounded-2xl border border-white/10 bg-black/20 p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  {comment.user_image ? (
                    <img
                      src={comment.user_image}
                      alt=""
                      className="h-9 w-9 rounded-full border border-white/10"
                    />
                  ) : (
                    <div className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-sm font-bold">
                      {comment.user_name.slice(0, 1).toUpperCase()}
                    </div>
                  )}

                  <div>
                    <div className="font-semibold text-white">
                      {comment.user_name}
                    </div>
                    <div className="text-xs text-zinc-500">
                      {new Date(comment.created_at).toLocaleString("de-DE", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </div>
                  </div>
                </div>

                {canDelete && (
                  <form action={deleteComment.bind(null, comment.id, entry.slug)}>
                    <button
                      type="submit"
                      className="rounded-full border border-red-500/20 px-3 py-1 text-xs font-semibold text-red-300 transition hover:bg-red-500/10"
                    >
                      Löschen
                    </button>
                  </form>
                )}
              </div>

              <p className="mt-4 whitespace-pre-wrap leading-7 text-zinc-300">
                {comment.body}
              </p>
            </article>
          );
        })}

        {comments.length === 0 && (
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-zinc-400">
            Noch keine Kommentare.
          </div>
        )}
      </div>
    </section>
  );
}

export default async function WikiEntryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ comment?: string }>;
}) {
  const { slug } = await params;
  const query = await searchParams;
  const session = await getServerSession(authOptions);

  const entries = await getApprovedEntries();
  const entry = entries.find((item) => item.slug === slug);
  const userId = session?.user?.id;
  const isAdmin = isAdminDiscordId(userId);

  if (!entry) {
    return (
      <main className="min-h-screen bg-zinc-950 p-10 text-white">
        <h1 className="text-4xl font-bold">Nicht gefunden</h1>
      </main>
    );
  }

  const social = await getSocialData(entry.id, userId);
  const isQuote = entry.category === "Zitat";
  const primaryText = getPrimaryText(entry);
  const quoteStory = getQuoteStory(entry);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#ffffff1f,transparent_30%),linear-gradient(135deg,#050505,#111113,#050505)] text-white">
      <article className="mx-auto max-w-4xl px-6 pt-8 pb-14">
        <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-8 shadow-2xl shadow-black/30">
          <div>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-zinc-300">
              {entry.category}
            </span>
          </div>

          <h1 className="mt-6 text-5xl font-black tracking-tight">
            {entry.title}
          </h1>

          {isQuote && (
            <>
              <blockquote className="mt-6 rounded-3xl border border-white/10 bg-white/[0.04] p-6 text-2xl font-semibold leading-relaxed text-zinc-100">
                “{primaryText}”
              </blockquote>

              {entry.quoteSpeaker && (
                <div className="mt-4 text-sm text-zinc-400">
                  Gesagt von{" "}
                  <Link
                    href={getPersonHref(entry.quoteSpeaker)}
                    className="font-semibold text-zinc-200 transition hover:text-white"
                  >
                    {entry.quoteSpeaker}
                  </Link>
                </div>
              )}
            </>
          )}

          <PeopleLinks people={entry.people} label="Beteiligte" />

          {isAdmin && (
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href={`/admin/wiki/${entry.id}/edit`}
                className="rounded-full border border-white/20 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Eintrag bearbeiten
              </Link>

              <form
                action={async () => {
                  "use server";
                  await deleteWikiEntry(entry.id);
                }}
              >
                <button
                  type="submit"
                  className="rounded-full border border-red-500/20 px-4 py-2 text-sm font-semibold text-red-300 transition hover:bg-red-500/10"
                >
                  Eintrag löschen
                </button>
              </form>
            </div>
          )}
        </div>

        <MediaBlock mediaUrl={entry.mediaUrl} mediaType={entry.mediaType} />

        {!isQuote && (
          <section className="mt-10 rounded-3xl border border-white/10 bg-white/[0.03] p-6">
            <h2 className="text-2xl font-bold">Was ist passiert?</h2>
            <p className="mt-3 whitespace-pre-wrap leading-7 text-zinc-300">
              {entry.story}
            </p>
          </section>
        )}

        {isQuote && quoteStory && (
          <section className="mt-10 rounded-3xl border border-white/10 bg-white/[0.03] p-6">
            <h2 className="text-2xl font-bold">Story</h2>
            <p className="mt-3 whitespace-pre-wrap leading-7 text-zinc-300">
              {quoteStory}
            </p>
          </section>
        )}

        <section className="mt-5 rounded-3xl border border-white/10 bg-white/[0.03] p-6">
          <h2 className="text-2xl font-bold">
            {isQuote ? "Warum ist es legendär?" : "Warum ist es lustig?"}
          </h2>

          <p className="mt-3 whitespace-pre-wrap leading-7 text-zinc-300">
            {entry.whyFunny}
          </p>
        </section>

        {entry.usage && (
          <section className="mt-5 rounded-3xl border border-white/10 bg-white/[0.03] p-6">
            <h2 className="text-2xl font-bold">
              {isQuote ? "Kontext" : "Typische Verwendung"}
            </h2>

            <p className="mt-3 whitespace-pre-wrap leading-7 text-zinc-300">
              {entry.usage}
            </p>
          </section>
        )}

        {social.enabled ? (
          <>
            <ReactionPanel entry={entry} reactions={social.reactions} />
            <CommentsPanel
              comments={social.comments}
              entry={entry}
              isAdmin={isAdmin}
              userId={userId}
              commentStatus={query.comment}
            />
          </>
        ) : (
          <section className="mt-5 rounded-3xl border border-white/10 bg-white/[0.03] p-6 text-zinc-400">
            Fire und Kommentare sind vorbereitet, aber die Supabase-Tabellen
            oder Leserechte fehlen noch. Spiele die Migrationen für{" "}
            <code className="rounded bg-black/30 px-1 py-0.5">
              wiki_comments
            </code>{" "}
            und{" "}
            <code className="rounded bg-black/30 px-1 py-0.5">
              wiki_reactions
            </code>{" "}
            ein. Am einfachsten ist{" "}
            <code className="rounded bg-black/30 px-1 py-0.5">
              202606230003_wiki_runtime_setup.sql
            </code>
            , dann erscheint hier automatisch das Kommentarformular.
          </section>
        )}
      </article>
    </main>
  );
}
