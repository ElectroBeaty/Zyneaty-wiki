"use server";

import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { supabase } from "@/lib/supabase";

export async function updateWikiEntry(id: string, formData: FormData) {
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.id !== process.env.ADMIN_DISCORD_ID) {
    redirect("/denied");
  }

  const { error } = await supabase
    .from("submissions")
    .update({
      title: String(formData.get("title")),
      category: String(formData.get("category")),
      people: String(formData.get("people") ?? ""),
      story: String(formData.get("story")),
      why_funny: String(formData.get("whyFunny")),
      usage: String(formData.get("usage") ?? ""),
    })
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  redirect("/wiki");
}