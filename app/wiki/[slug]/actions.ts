"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { supabase } from "@/lib/supabase";

export async function deleteWikiEntry(id: string) {
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.id !== process.env.ADMIN_DISCORD_ID) {
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
  redirect("/wiki");
}