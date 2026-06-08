import NextAuth from "next-auth";
import DiscordProvider from "next-auth/providers/discord";

async function isInDiscordServer(accessToken: string) {
  const guildId = process.env.DISCORD_GUILD_ID;

  const res = await fetch("https://discord.com/api/users/@me/guilds", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) return false;

  const guilds = await res.json();

  return guilds.some((guild: { id: string }) => guild.id === guildId);
}

export const authOptions = {
  providers: [
    DiscordProvider({
      clientId: process.env.AUTH_DISCORD_ID!,
      clientSecret: process.env.AUTH_DISCORD_SECRET!,
      authorization: {
        params: {
          scope: "identify guilds",
        },
      },
    }),
  ],
  callbacks: {
    async signIn({ account }: any) {
      if (!account?.access_token) return false;

      const isMember = await isInDiscordServer(account.access_token);

      if (!isMember) {
        return "/denied";
      }

      return true;
    },

    async jwt({ token, profile }: any) {
      if (profile?.id) {
        token.discordId = profile.id;
      }

      return token;
    },

    async session({ session, token }: any) {
      session.user.id = token.discordId;
      return session;
    },
  },
};

export const { handlers, signIn, signOut, auth } = NextAuth(authOptions);