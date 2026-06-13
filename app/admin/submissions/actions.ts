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

  const { data: submission, error } = await supabase
    .from("submissions")
    .update({ approved: true })
    .eq("id", id)
    .select("title,category,story,media_url")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  if (submission) {
    await announceApprovedSubmission(submission);
  }

  revalidatePath("/admin/submissions");
  revalidatePath("/wiki");
  revalidatePath("/media");
  revalidatePath("/people");
}
