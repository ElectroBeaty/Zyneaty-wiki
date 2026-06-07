"use server";

import fs from "fs/promises";
import path from "path";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";

export async function createSubmission(formData: FormData) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    throw new Error("Nicht eingeloggt");
  }

  const filePath = path.join(process.cwd(), "data", "submissions.json");

  const raw = await fs.readFile(filePath, "utf-8");
  const submissions = JSON.parse(raw);

  submissions.push({
    id: crypto.randomUUID(),
    title: String(formData.get("title")),
    category: String(formData.get("category")),
    people: String(formData.get("people")),
    story: String(formData.get("story")),
    whyFunny: String(formData.get("whyFunny")),
    usage: String(formData.get("usage")),
    authorName: session.user.name ?? "Unknown",
    createdAt: new Date().toISOString(),
    approved: false,
  });

  await fs.writeFile(filePath, JSON.stringify(submissions, null, 2));

  redirect("/submit?success=1");
}