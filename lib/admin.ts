export function isAdminDiscordId(discordId: string | null | undefined) {
  const adminDiscordId = process.env.ADMIN_DISCORD_ID;

  return Boolean(adminDiscordId && discordId && discordId === adminDiscordId);
}
