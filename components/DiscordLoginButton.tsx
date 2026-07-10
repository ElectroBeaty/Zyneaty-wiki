"use client";

import { useState, type ReactNode } from "react";
import { signIn } from "next-auth/react";

type DiscordLoginButtonProps = {
  children: ReactNode;
  className: string;
  loadingLabel?: string;
};

export default function DiscordLoginButton({
  children,
  className,
  loadingLabel = "Weiter zu Discord...",
}: DiscordLoginButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  async function handleClick() {
    setIsLoading(true);

    try {
      await signIn("discord", {
        callbackUrl: "/wiki",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isLoading}
      aria-busy={isLoading}
      className={`${className} disabled:cursor-wait disabled:opacity-70`}
    >
      {isLoading ? loadingLabel : children}
    </button>
  );
}
