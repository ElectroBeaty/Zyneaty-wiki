"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { isAdminDiscordId } from "@/lib/admin";
import { announceApprovedSubmission } from "@/lib/discord-webhook";
import { supabase } from "@/lib/supabase";

async function requireAdmin() {
  const session = await getServerSession(authOptions);

  if (!isAdminDiscordId(session?.user?.id)) {
    redirect("/denied");
  }
}

type ApprovedSubmission = {
  title: string;
  category: string;
  people?: string | null;
  quote_speaker?: string | null;
  quote_text?: string | null;
  story: string;
  media_url?: string | null;
};

export async function deleteSubmission(id: string) {
  await requireAdmin();

  const { error } = await supabase.from("submissions").delete().eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin/submissions");
}

export async function approveSubmission(id: string) {
  await requireAdmin();

  const optionalColumns = ["quote_text", "quote_speaker"] as const;
  let selectColumns = [
    "title",
    "category",
    "people",
    "quote_speaker",
    "quote_text",
    "story",
    "media_url",
  ];
  let submission: ApprovedSubmission | null = null;
  let error: { message: string } | null = null;

  for (let attempt = 0; attempt <= optionalColumns.length; attempt += 1) {
    const result = await supabase
      .from("submissions")
      .update({ approved: true })
      .eq("id", id)
      .select(selectColumns.join(","))
      .single();

    if (!result.error) {
      submission = result.data as unknown as ApprovedSubmission;
      break;
    }

    const missingColumn = optionalColumns.find((column) =>
      result.error?.message.includes(column)
    );

    if (!missingColumn) {
      error = result.error;
      break;
    }

    selectColumns = selectColumns.filter((column) => column !== missingColumn);
  }

  if (error) {
    throw new Error(error.message);
  }

  if (!submission) {
    throw new Error("Der Vorschlag konnte nicht freigegeben werden.");
  }

  await announceApprovedSubmission(submission);

  revalidatePath("/admin/submissions");
  revalidatePath("/wiki");
  revalidatePath("/media");
  revalidatePath("/people");
}
