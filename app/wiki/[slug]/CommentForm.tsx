"use client";

import { FormEvent, useState, useTransition } from "react";
import {
  submitComment,
  type CommentFormState,
} from "./actions";

const initialState: CommentFormState = {
  status: "idle",
  message: "",
};

export default function CommentForm({
  submissionId,
  slug,
}: {
  submissionId: string;
  slug: string;
}) {
  const [body, setBody] = useState("");
  const [state, setState] = useState(initialState);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const result = await submitComment(submissionId, slug, formData);
      setState(result);

      if (result.status === "success") {
        setBody("");
      }
    });
  }

  const remaining = 500 - body.length;

  return (
    <form onSubmit={handleSubmit} className="mt-4">
      {state.message && (
        <div
          className={`mb-4 rounded-2xl border p-4 text-sm font-semibold ${
            state.status === "success"
              ? "border-green-500/20 bg-green-500/10 text-green-300"
              : "border-red-500/20 bg-red-500/10 text-red-300"
          }`}
        >
          {state.message}
        </div>
      )}

      <textarea
        name="body"
        required
        maxLength={500}
        value={body}
        onChange={(event) => setBody(event.target.value)}
        placeholder="Kontext, Erinnerung oder kurzer Kommentar..."
        className="min-h-28 w-full rounded-2xl border border-white/10 bg-white/5 p-4 text-white outline-none transition placeholder:text-zinc-500 focus:border-white/30"
      />

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <span className="text-sm text-zinc-500">
          {remaining} Zeichen übrig
        </span>

        <button
          type="submit"
          disabled={isPending || body.trim().length === 0}
          className="rounded-full bg-white px-5 py-2 font-semibold text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? "Speichert..." : "Kommentieren"}
        </button>
      </div>
    </form>
  );
}
