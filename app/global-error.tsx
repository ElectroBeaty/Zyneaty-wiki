"use client";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="de">
      <body>
        <main style={{
          alignItems: "center",
          background: "linear-gradient(135deg, #050505, #18181b, #050505)",
          color: "white",
          display: "flex",
          fontFamily: "system-ui, sans-serif",
          justifyContent: "center",
          minHeight: "100vh",
          padding: "24px",
        }}>
          <section style={{
            background: "rgba(255, 255, 255, 0.04)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            borderRadius: "32px",
            maxWidth: "560px",
            padding: "32px",
          }}>
            <p style={{
              color: "#71717a",
              fontSize: "14px",
              letterSpacing: "0.3em",
              textTransform: "uppercase",
            }}>
              Zyneaty Wiki
            </p>

            <h1 style={{ fontSize: "36px", lineHeight: 1.1 }}>
              Etwas ist schiefgelaufen.
            </h1>

            <p style={{ color: "#d4d4d8", lineHeight: 1.7 }}>
              Die Website konnte gerade nicht starten. Bitte versuche es gleich
              nochmal.
            </p>

            <button
              type="button"
              onClick={reset}
              style={{
                background: "white",
                border: 0,
                borderRadius: "999px",
                color: "black",
                cursor: "pointer",
                fontWeight: 700,
                marginTop: "24px",
                padding: "12px 20px",
              }}
            >
              Nochmal versuchen
            </button>
          </section>
        </main>
      </body>
    </html>
  );
}
