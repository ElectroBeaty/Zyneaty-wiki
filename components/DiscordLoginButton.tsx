"use client";

import { useState, type ReactNode } from "react";

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
      const csrfResponse = await fetch("/api/auth/csrf");

      if (!csrfResponse.ok) {
        throw new Error("CSRF token request failed.");
      }

      const { csrfToken } = (await csrfResponse.json()) as {
        csrfToken?: string;
      };

      if (!csrfToken) {
        throw new Error("CSRF token missing.");
      }

      const signInResponse = await fetch("/api/auth/signin/discord", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          csrfToken,
          callbackUrl: `${window.location.origin}/wiki`,
          json: "true",
        }),
      });

      if (!signInResponse.ok) {
        throw new Error("Discord sign-in request failed.");
      }

      const { url } = (await signInResponse.json()) as { url?: string };

      if (!url) {
        throw new Error("Discord sign-in URL missing.");
      }

      window.location.assign(url);
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
