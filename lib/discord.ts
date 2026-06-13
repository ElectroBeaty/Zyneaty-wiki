export type DiscordUser = {
  id: string;
  username: string;
  global_name?: string | null;
  avatar?: string | null;
};

export function getDefaultDiscordAvatar(discordId: string) {
  const index = BigInt(discordId) >> BigInt(22);
  return `https://cdn.discordapp.com/embed/avatars/${Number(index % BigInt(6))}.png`;
}

export async function getDiscordAvatar(discordId: string | null) {
  if (!discordId) return null;

  const token = process.env.DISCORD_BOT_TOKEN;

  if (!token) return null;

  const res = await fetch(`https://discord.com/api/v10/users/${discordId}`, {
    headers: {
      Authorization: `Bot ${token}`,
    },
    next: {
      revalidate: 60 * 60,
    },
  });

  if (!res.ok) return null;

  const user = (await res.json()) as DiscordUser;

  if (!user.avatar) {
    return getDefaultDiscordAvatar(discordId);
  }

  const extension = user.avatar.startsWith("a_") ? "gif" : "png";

  return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.${extension}?size=128`;
}
