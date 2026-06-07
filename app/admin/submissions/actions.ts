"use server";

import fs from "fs/promises";
import path from "path";
import { revalidatePath } from "next/cache";

type Submission = {
  id: string;
  approved: boolean;
};

async function readSubmissions() {
  const filePath = path.join(process.cwd(), "data", "submissions.json");

  const raw = await fs.readFile(filePath, "utf-8");
  return {
    filePath,
    submissions: JSON.parse(raw),
  };
}

export async function deleteSubmission(id: string) {
  const { filePath, submissions } = await readSubmissions();

  const filtered = submissions.filter(
    (submission: Submission) => submission.id !== id
  );

  await fs.writeFile(filePath, JSON.stringify(filtered, null, 2));

  revalidatePath("/admin/submissions");
}

export async function approveSubmission(id: string) {
  const { filePath, submissions } = await readSubmissions();

  const updated = submissions.map((submission: Submission) =>
    submission.id === id
      ? {
          ...submission,
          approved: true,
        }
      : submission
  );

  await fs.writeFile(filePath, JSON.stringify(updated, null, 2));

  revalidatePath("/admin/submissions");
}