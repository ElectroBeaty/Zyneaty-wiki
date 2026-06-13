import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { isAdminDiscordId } from "@/lib/admin";

export async function middleware(request: NextRequest) {
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET,
  });

  if (!token) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  const discordId =
    typeof token.discordId === "string" ? token.discordId : undefined;

  if (
    request.nextUrl.pathname.startsWith("/admin") &&
    !isAdminDiscordId(discordId)
  ) {
    return NextResponse.redirect(new URL("/denied", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/wiki/:path*",
    "/submit/:path*",
    "/admin/:path*",
    "/people/:path*",
    "/media/:path*",
  ],
};
