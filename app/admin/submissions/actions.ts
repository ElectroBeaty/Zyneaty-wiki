"use server";

import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";

export async function deleteSubmission(id: string) {
  const { error } = await supabase.from("submissions").delete().eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin/submissions");
}

export async function approveSubmission(id: string) {
  const { error } = await supabase
    .from("submissions")
    .update({ approved: true })
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin/submissions");
  revalidatePath("/wiki");
}