export function getDiscordBotToken() {
  const token = process.env.DISCORD_BOT_TOKEN?.trim();

  if (!token) {
    return null;
  }

  return token.replace(/^Bot\s+/i, "").trim();
}

export function getDiscordMessageError(status: number) {
  if (status === 401) {
    return "Discord API Fehler (401): Der Bot-Token ist ungueltig. In Vercel bei DISCORD_BOT_TOKEN nur den reinen Token eintragen, ohne 'Bot ' davor.";
  }

  if (status === 403) {
    return "Discord API Fehler (403): Der Bot hat in diesem Channel keine Rechte. Pruefe Send Messages, Embed Links, Add Reactions und Mention Everyone.";
  }

  if (status === 404) {
    return "Discord API Fehler (404): Channel nicht gefunden. Pruefe die Channel-ID und ob der Bot auf diesem Server ist.";
  }

  return `Discord API Fehler (${status}). Pruefe Bot-Rechte, Channel-ID und Token.`;
}

export function getDiscordChannelLoadError(status: number) {
  if (status === 401) {
    return "Discord Channels konnten nicht geladen werden: DISCORD_BOT_TOKEN ist ungueltig oder enthaelt 'Bot ' doppelt.";
  }

  if (status === 403) {
    return "Discord Channels konnten nicht geladen werden: Der Bot darf Server-Channels nicht lesen.";
  }

  if (status === 404) {
    return "Discord Channels konnten nicht geladen werden: DISCORD_GUILD_ID passt nicht zu diesem Server.";
  }

  return `Discord Channels konnten nicht geladen werden (${status}). Channel-ID kann trotzdem manuell gesetzt werden.`;
}