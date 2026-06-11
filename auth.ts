import NextAuth, { type DefaultSession, type NextAuthOptions } from "next-auth";
import DiscordProvider from "next-auth/providers/discord";

declare module "next-auth" {
  interface Session {
    user: {
      id?: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    discordId?: string;
  }
}

async function isInDiscordServer(accessToken: string) {
  const guildId = process.env.DISCORD_GUILD_ID;

  const res = await fetch("https://discord.com/api/users/@me/guilds", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) return false;

  const guilds = (await res.json()) as Array<{ id: string }>;

  return guilds.some((guild) => guild.id === guildId);
}

export const authOptions: NextAuthOptions = {
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
    async signIn({ account }) {
      if (!account?.access_token) return false;

      const isMember = await isInDiscordServer(account.access_token);

      if (!isMember) {
        return "/denied";
      }

      return true;
    },

    async jwt({ token, profile }) {
      const profileId =
        profile && "id" in profile && typeof profile.id === "string"
          ? profile.id
          : undefined;

      if (profileId) {
        token.discordId = profileId;
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.discordId;
      }

      return session;
    },
  },
};

export const { handlers, signIn, signOut, auth } = NextAuth(authOptions);
