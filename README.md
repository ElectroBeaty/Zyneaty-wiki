This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Zyneaty Wiki Setup

Production site:

```text
https://zyneaty-wiki.vercel.app
```

The canonical Vercel project is `zyneaty-wiki`. Do not use old preview or
duplicate project URLs for Discord announcements or OAuth setup.

Use `.env.example` as the checklist for Vercel Environment Variables. Keep
the real values only in Vercel or in a local `.env.local` file, never in git.

After changing Vercel or Supabase settings, check the production health route:

```text
https://zyneaty-wiki.vercel.app/api/health
```

It should return `"ok": true`. If it returns `"missing"` for an environment
variable or a Supabase table error, the app itself is reachable but the backend
setup still needs attention.

The social wiki features use two additional Supabase tables:

```sql
supabase/migrations/202606130001_wiki_social.sql
supabase/migrations/202606170001_enable_rls.sql
supabase/migrations/202606230001_add_quote_speaker.sql
supabase/migrations/202606230002_add_quote_text.sql
supabase/migrations/202606230003_wiki_runtime_setup.sql
supabase/migrations/202606230004_fire_reaction.sql
```

Run `202606230003_wiki_runtime_setup.sql` in Supabase SQL Editor if comments, reactions, quote speakers, or separated quote editing are missing in production.
Run `202606230004_fire_reaction.sql` afterwards if the old multi-reaction setup was already applied.

Important environment variables:

```bash
AUTH_DISCORD_ID=
AUTH_DISCORD_SECRET=
DISCORD_GUILD_ID=
ADMIN_DISCORD_ID=
AUTH_SECRET=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
DISCORD_BOT_TOKEN=
DISCORD_ANNOUNCEMENT_CHANNEL_ID=
DISCORD_WIKI_WEBHOOK_URL=
NEXT_PUBLIC_SITE_URL=https://zyneaty-wiki.vercel.app
```

`SUPABASE_SERVICE_ROLE_KEY` is recommended for server-side comment, reaction, and admin writes while keeping public RLS read policies tight.
`DISCORD_WIKI_WEBHOOK_URL` posts a Discord message when an admin approves a new wiki entry.
`NEXT_PUBLIC_SITE_URL` is used to include the public entry link in that Discord message.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!


### Admin Discord Embed Sender

The admin-only `/admin/announcements` page sends Discord embeds through `DISCORD_BOT_TOKEN`. When `DISCORD_GUILD_ID` is set, the page can load text channels into a dropdown; `DISCORD_ANNOUNCEMENT_CHANNEL_ID` only pre-fills a default channel and can stay empty.
## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.


