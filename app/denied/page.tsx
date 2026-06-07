import Link from "next/link";

export default function DeniedPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950 px-6 text-white">
      <div className="max-w-xl rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-center">
        <div className="text-6xl">☯</div>

        <h1 className="mt-6 text-4xl font-black">
          Zugriff verweigert
        </h1>

        <p className="mt-4 text-zinc-300">
          Du musst Mitglied des Discord-Servers sein, um das Zyneaty Wiki zu lesen.
        </p>

        <Link
          href="/"
          className="mt-8 inline-block rounded-full bg-white px-6 py-3 font-semibold text-black"
        >
          Zurück zur Startseite
        </Link>
      </div>
    </main>
  );
}