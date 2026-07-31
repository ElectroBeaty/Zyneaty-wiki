"use server";

import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { isAdminDiscordId } from "@/lib/admin";

export type AnnouncementInput = {
  channelId: string;
  title: string;
  description: string;
  link?: string;
  imageUrl?: string;
  color?: string;
  pingEveryone?: boolean;
  reactions?: string;
};

export type AnnouncementResult =
  | {
      ok: true;
      messageUrl?: string;
      reactionsAdded: number;
      reactionsFailed: number;
    }
  | {
      ok: false;
      error: string;
    };

type DiscordMessage = {
  id: string;
  channel_id: string;
  guild_id?: string;
};

async function requireAnnouncementAdmin() {
  const session = await getServerSession(authOptions);

  if (!isAdminDiscordId(session?.user?.id)) {
    redirect("/denied");
  }
}

function clean(value: unknown) {
  return String(value ?? "").trim();
}

function isHttpUrl(value: string) {
  if (!value) {
    return true;
  }

  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function parseColor(value: string) {
  const normalized = value.trim().replace(/^#/, "");
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) {
    return 0x2f3136;
  }

  return Number.parseInt(normalized, 16);
}

function normalizeReaction(reaction: string) {
  const customEmoji = reaction.match(/^<a?:([A-Za-z0-9_]+):(\d+)>$/);
  if (customEmoji) {
    return `${customEmoji[1]}:${customEmoji[2]}`;
  }

  return reaction;
}

function parseReactions(value: string) {
  const unique = new Set<string>();

  for (const rawReaction of value.split(/[\s,]+/)) {
    const reaction = normalizeReaction(rawReaction.trim());
    if (reaction) {
      unique.add(reaction);
    }
  }

  return Array.from(unique).slice(0, 10);
}

async function addReactions(token: string, channelId: string, messageId: string, reactions: string[]) {
  let reactionsAdded = 0;
  let reactionsFailed = 0;

  for (const reaction of reactions) {
    const response = await fetch(
      `https://discord.com/api/v10/channels/${channelId}/messages/${messageId}/reactions/${encodeURIComponent(reaction)}/@me`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bot ${token}`,
        },
      },
    );

    if (response.ok) {
      reactionsAdded += 1;
    } else {
      reactionsFailed += 1;
    }
  }

  return { reactionsAdded, reactionsFailed };
}

export async function sendAnnouncement(input: AnnouncementInput): Promise<AnnouncementResult> {
  await requireAnnouncementAdmin();

  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) {
    return { ok: false, error: "DISCORD_BOT_TOKEN fehlt in den Server-Umgebungsvariablen." };
  }

  const channelId = clean(input.channelId);
  const title = clean(input.title);
  const description = clean(input.description);
  const link = clean(input.link);
  const imageUrl = clean(input.imageUrl);
  const reactions = parseReactions(clean(input.reactions));

  if (!/^\d{16,25}$/.test(channelId)) {
    return { ok: false, error: "Bitte eine gueltige Discord Channel-ID eintragen." };
  }

  if (!title || !description) {
    return { ok: false, error: "Titel und Text duerfen nicht leer sein." };
  }

  if (title.length > 256) {
    return { ok: false, error: "Der Titel ist zu lang. Discord erlaubt maximal 256 Zeichen." };
  }

  if (description.length > 4000) {
    return { ok: false, error: "Der Text ist zu lang. Bitte unter 4000 Zeichen bleiben." };
  }

  if (!isHttpUrl(link) || !isHttpUrl(imageUrl)) {
    return { ok: false, error: "Links muessen mit http:// oder https:// beginnen." };
  }

  const response = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bot ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      content: input.pingEveryone ? "@everyone" : undefined,
      allowed_mentions: {
        parse: input.pingEveryone ? ["everyone"] : [],
      },
      embeds: [
        {
          title,
          description,
          color: parseColor(clean(input.color)),
          url: link || undefined,
          image: imageUrl ? { url: imageUrl } : undefined,
        },
      ],
    }),
  });

  if (!response.ok) {
    return { ok: false, error: `Discord API Fehler (${response.status}). Pruefe Bot-Rechte, Channel-ID und Token.` };
  }

  const message = (await response.json()) as DiscordMessage;
  const reactionResult = await addReactions(token, channelId, message.id, reactions);
  const messageUrl = message.guild_id
    ? `https://discord.com/channels/${message.guild_id}/${message.channel_id}/${message.id}`
    : undefined;

  return {
    ok: true,
    messageUrl,
    reactionsAdded: reactionResult.reactionsAdded,
    reactionsFailed: reactionResult.reactionsFailed,
  };
}
