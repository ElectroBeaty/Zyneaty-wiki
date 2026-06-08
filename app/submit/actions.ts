"use server";

import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { supabase } from "@/lib/supabase";

function normalizePeople(value: string) {
  return value
    .split(/[,\s]+/)
    .map((person) => person.trim())
    .filter(Boolean)
    .join(", ");
}

export async function createSubmission(formData: FormData) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    throw new Error("Nicht eingeloggt");
  }

  const title = String(formData.get("title")).trim();

  const { data: existing } = await supabase
    .from("submissions")
    .select("id")
    .ilike("title", title)
    .limit(1);

  if (existing && existing.length > 0) {
    redirect("/submit?error=duplicate");
  }

  const { error } = await supabase.from("submissions").insert({
    title,
    category: String(formData.get("category")),
    people: normalizePeople(String(formData.get("people") ?? "")),
    story: String(formData.get("story")),
    why_funny: String(formData.get("whyFunny")),
    usage: String(formData.get("usage") ?? ""),
    author_name: session.user.name ?? "Unknown",
    approved: false,
  });

  if (error) {
    throw new Error(error.message);
  }

  redirect("/submit?success=1");
}