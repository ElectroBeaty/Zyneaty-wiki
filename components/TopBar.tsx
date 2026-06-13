import Image from "next/image";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { isAdminDiscordId } from "@/lib/admin";

export default async function TopBar() {
  const session = await getServerSession(authOptions);

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-black/60 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-4 text-white">
        <Link href="/" className="flex items-center gap-3 text-xl font-black">
          <Image
            src="/logo.png"
            alt="Zyneaty Logo"
            width={44}
            height={44}
            className="rounded-full"
          />
          <span>Zyneaty Wiki</span>
        </Link>

        <nav className="flex flex-wrap items-center gap-5 text-sm font-semibold">
          {session?.user ? (
            <>
              <Link href="/wiki" className="text-zinc-300 hover:text-white">
                Wiki
              </Link>

              <Link href="/media" className="text-zinc-300 hover:text-white">
                Medien
              </Link>

              <Link href="/people" className="text-zinc-300 hover:text-white">
                Personen
              </Link>

              <Link href="/submit" className="text-zinc-300 hover:text-white">
                Einreichen
              </Link>

              {isAdminDiscordId(session.user.id) && (
                <Link
                  href="/admin/submissions"
                  className="text-zinc-300 hover:text-white"
                >
                  Admin
                </Link>
              )}

              <div className="hidden items-center gap-2 text-zinc-400 md:flex">
                {session.user.image && (
                  <img
                    src={session.user.image}
                    alt=""
                    className="h-7 w-7 rounded-full border border-white/10"
                  />
                )}

                <span>Eingeloggt als {session.user.name}</span>
              </div>

              <Link
                href="/logout"
                className="rounded-full border border-white/20 px-5 py-2 text-white transition hover:border-white hover:bg-white/10"
              >
                Abmelden
              </Link>
            </>
          ) : (
            <Link
              href="/api/auth/signin/discord"
              className="rounded-full bg-white px-5 py-2 font-semibold text-black transition hover:scale-105 hover:bg-zinc-200"
            >
              Login
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
