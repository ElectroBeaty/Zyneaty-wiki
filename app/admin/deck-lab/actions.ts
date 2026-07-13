"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { analyzeDeckList as analyzeDeckListInternal } from "@/lib/deck-lab";
import {
  deleteDeckLabDeck,
  listDeckLabDecks,
  saveDeckLabDeck,
} from "@/lib/deck-lab";
import { isAdminDiscordId } from "@/lib/admin";

async function requireDeckLabAdmin() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  if (!userId || !isAdminDiscordId(userId)) {
    redirect("/denied");
  }

  return userId;
}

export async function getDeckLabDecks() {
  const ownerDiscordId = await requireDeckLabAdmin();

  return listDeckLabDecks(ownerDiscordId);
}

export async function analyzeDeckList(rawList: string, format: string) {
  await requireDeckLabAdmin();

  return analyzeDeckListInternal(rawList, format);
}

export async function saveDeck(input: {
  id?: string;
  name: string;
  format: string;
  rawList: string;
  notes?: string;
}) {
  const ownerDiscordId = await requireDeckLabAdmin();
  const name = input.name.trim();
  const rawList = input.rawList.trim();

  if (!name) {
    throw new Error("Bitte gib dem Deck einen Namen.");
  }

  if (!rawList) {
    throw new Error("Bitte fuege eine Deckliste ein.");
  }

  const analysis = await analyzeDeckListInternal(rawList, input.format);
  const deck = await saveDeckLabDeck({
    id: input.id,
    ownerDiscordId,
    name,
    format: input.format,
    rawList,
    notes: input.notes,
    analysis,
  });

  revalidatePath("/admin/deck-lab");

  return deck;
}

export async function deleteDeck(id: string) {
  const ownerDiscordId = await requireDeckLabAdmin();

  await deleteDeckLabDeck(id, ownerDiscordId);
  revalidatePath("/admin/deck-lab");
}
