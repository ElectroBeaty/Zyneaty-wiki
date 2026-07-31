export type AnnouncementChannel = {
  id: string;
  name: string;
  type: number;
  position: number;
  parentId?: string | null;
  parentName?: string | null;
};

type DiscordGuildChannel = {
  id: string;
  name: string;
  type: number;
  position?: number;
  parent_id?: string | null;
};

type AnnouncementChannelsResult = {
  channels: AnnouncementChannel[];
  defaultChannelId: string;
  error?: string;
};

const sendableChannelTypes = new Set([0, 5]);

export async function getAnnouncementChannels(): Promise<AnnouncementChannelsResult> {
  const token = process.env.DISCORD_BOT_TOKEN;
  const guildId = process.env.DISCORD_GUILD_ID;
  const defaultChannelId = process.env.DISCORD_ANNOUNCEMENT_CHANNEL_ID ?? "";

  if (!token || !guildId) {
    return {
      channels: [],
      defaultChannelId,
      error: "DISCORD_BOT_TOKEN oder DISCORD_GUILD_ID fehlt. Channel-ID kann trotzdem manuell gesetzt werden.",
    };
  }

  const response = await fetch(`https://discord.com/api/v10/guilds/${guildId}/channels`, {
    headers: {
      Authorization: `Bot ${token}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    return {
      channels: [],
      defaultChannelId,
      error: `Discord Channels konnten nicht geladen werden (${response.status}). Channel-ID kann trotzdem manuell gesetzt werden.`,
    };
  }

  const discordChannels = (await response.json()) as DiscordGuildChannel[];
  const categories = new Map(
    discordChannels.filter((channel) => channel.type === 4).map((channel) => [channel.id, channel.name]),
  );

  const channels = discordChannels
    .filter((channel) => sendableChannelTypes.has(channel.type))
    .map((channel) => ({
      id: channel.id,
      name: channel.name,
      type: channel.type,
      position: channel.position ?? 0,
      parentId: channel.parent_id,
      parentName: channel.parent_id ? categories.get(channel.parent_id) : undefined,
    }))
    .sort((left, right) => {
      const leftGroup = left.parentName ?? "";
      const rightGroup = right.parentName ?? "";
      if (leftGroup !== rightGroup) {
        return leftGroup.localeCompare(rightGroup);
      }

      return left.position - right.position || left.name.localeCompare(right.name);
    });

  return { channels, defaultChannelId };
}
