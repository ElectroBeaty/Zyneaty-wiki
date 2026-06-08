"use client";

import { signOut } from "next-auth/react";
import { useEffect } from "react";

export default function LogoutPage() {
  useEffect(() => {
    signOut({
      callbackUrl: "/",
    });
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center bg-black text-white">
      <p className="text-zinc-400">Du wirst abgemeldet...</p>
    </main>
  );
}