"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { isAdminDiscordId } from "@/lib/admin";
import { isReactionKey, type ReactionKey } from "@/lib/reactions";
import { supabase } from "@/lib/supabase";

async function requireUser() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  if (!userId) {
    redirect("/");
  }

  return {
    id: userId,
    name: session.user.name ?? "Unbekannt",
    image: session.user.image ?? null,
    isAdmin: isAdminDiscordId(userId),
  };
}

export async function deleteWikiEntry(id: string) {
  const user = await requireUser();

  if (!user.isAdmin) {
    redirect("/denied");
  }

  const { error } = await supabase
    .from("submissions")
    .delete()
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/wiki");
  revalidatePath("/media");
  redirect("/wiki");
}

export async function toggleReaction(
  submissionId: string,
  slug: string,
  reaction: ReactionKey
) {
  const user = await requireUser();

  if (!isReactionKey(reaction)) {
    throw new Error("Unbekannte Reaktion.");
  }

  const { data: existing, error: existingError } = await supabase
    .from("wiki_reactions")
    .select("id")
    .eq("submission_id", submissionId)
    .eq("user_id", user.id)
    .eq("reaction", reaction)
    .maybeSingle();

  if (existingError) {
    throw new Error(existingError.message);
  }

  if (existing) {
    const { error } = await supabase
      .from("wiki_reactions")
      .delete()
      .eq("id", existing.id);

    if (error) {
      throw new Error(error.message);
    }
  } else {
    const { error } = await supabase.from("wiki_reactions").insert({
      submission_id: submissionId,
      user_id: user.id,
      reaction,
    });

    if (error) {
      throw new Error(error.message);
    }
  }

  revalidatePath(`/wiki/${slug}`);
}

export async function addComment(
  submissionId: string,
  slug: string,
  formData: FormData
) {
  const user = await requireUser();
  const body = String(formData.get("body") ?? "").trim();

  if (!body) {
    return;
  }

  if (body.length > 500) {
    throw new Error("Kommentare duerfen maximal 500 Zeichen lang sein.");
  }

  const { error } = await supabase.from("wiki_comments").insert({
    submission_id: submissionId,
    user_id: user.id,
    user_name: user.name,
    user_image: user.image,
    body,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/wiki/${slug}`);
}

export async function deleteComment(commentId: string, slug: string) {
  const user = await requireUser();

  const { data: comment, error: commentError } = await supabase
    .from("wiki_comments")
    .select("user_id")
    .eq("id", commentId)
    .maybeSingle();

  if (commentError) {
    throw new Error(commentError.message);
  }

  if (!comment) return;

  if (!user.isAdmin && comment.user_id !== user.id) {
    redirect("/denied");
  }

  const { error } = await supabase
    .from("wiki_comments")
    .delete()
    .eq("id", commentId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/wiki/${slug}`);
}
