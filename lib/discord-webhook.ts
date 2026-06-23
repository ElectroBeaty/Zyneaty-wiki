import { createSlug, createSummary } from "@/lib/wiki";

type ApprovedSubmission = {
  title: string;
  category: string;
  people?: string | null;
  quote_speaker?: string | null;
  story: string;
  media_url?: string | null;
};

export async function announceApprovedSubmission(entry: ApprovedSubmission) {
  const webhookUrl = process.env.DISCORD_WIKI_WEBHOOK_URL;

  if (!webhookUrl) return;

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  const entryUrl = siteUrl ? `${siteUrl}/wiki/${createSlug(entry.title)}` : null;

  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        content: entryUrl
          ? `Neuer Wiki-Eintrag freigegeben: ${entry.title}\n${entryUrl}`
          : `Neuer Wiki-Eintrag freigegeben: ${entry.title}`,
        embeds: [
          {
            title: entry.title,
            description: createSummary(entry.story, 180),
            url: entryUrl ?? undefined,
            color: 0xffffff,
            fields: [
              {
                name: "Typ",
                value: entry.category,
                inline: true,
              },
              ...(entry.quote_speaker
                ? [
                    {
                      name: "Gesagt von",
                      value: entry.quote_speaker,
                      inline: true,
                    },
                  ]
                : []),
              ...(entry.people
                ? [
                    {
                      name: "Beteiligte",
                      value: entry.people,
                      inline: false,
                    },
                  ]
                : []),
            ],
            image: entry.media_url ? { url: entry.media_url } : undefined,
          },
        ],
      }),
    });
  } catch {
    // Discord announcements should never block moderation.
  }
}
