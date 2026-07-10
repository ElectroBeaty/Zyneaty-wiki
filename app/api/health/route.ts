import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

type HealthCheck = {
  ok: boolean;
  message: string;
};

function checkEnv(name: string): HealthCheck {
  const value = process.env[name];

  return {
    ok: Boolean(value),
    message: value ? "set" : "missing",
  };
}

export async function GET() {
  const env = {
    NEXT_PUBLIC_SUPABASE_URL: checkEnv("NEXT_PUBLIC_SUPABASE_URL"),
    SUPABASE_SERVICE_ROLE_KEY: checkEnv("SUPABASE_SERVICE_ROLE_KEY"),
    AUTH_DISCORD_ID: checkEnv("AUTH_DISCORD_ID"),
    AUTH_DISCORD_SECRET: checkEnv("AUTH_DISCORD_SECRET"),
    DISCORD_GUILD_ID: checkEnv("DISCORD_GUILD_ID"),
    AUTH_SECRET: checkEnv("AUTH_SECRET"),
  };

  const missingEnv = Object.entries(env)
    .filter(([, check]) => !check.ok)
    .map(([name]) => name);

  if (missingEnv.length > 0) {
    return NextResponse.json(
      {
        ok: false,
        service: "zyneaty-wiki",
        message: "Required environment variables are missing.",
        env,
        supabase: {
          ok: false,
          message: "skipped",
        },
      },
      { status: 503 }
    );
  }

  try {
    const { error } = await getSupabaseAdmin()
      .from("submissions")
      .select("id", { count: "exact", head: true });

    if (error) {
      return NextResponse.json(
        {
          ok: false,
          service: "zyneaty-wiki",
          message: "Supabase is reachable, but the submissions table check failed.",
          env,
          supabase: {
            ok: false,
            message: error.message,
          },
        },
        { status: 503 }
      );
    }

    return NextResponse.json({
      ok: true,
      service: "zyneaty-wiki",
      message: "Wiki backend is healthy.",
      env,
      supabase: {
        ok: true,
        message: "submissions table reachable",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        service: "zyneaty-wiki",
        message: "Health check failed before Supabase could be queried.",
        env,
        supabase: {
          ok: false,
          message: error instanceof Error ? error.message : "unknown error",
        },
      },
      { status: 503 }
    );
  }
}
