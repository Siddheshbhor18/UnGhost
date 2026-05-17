"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[unGhost] Critical layout error:", error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          fontFamily:
            "Inter, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
          background:
            "radial-gradient(circle at top, #E6F4FE 0%, #F8F9FB 60%, #ffffff 100%)",
          color: "#0A0A0A",
          padding: "2rem",
        }}
      >
        <div
          style={{
            maxWidth: 480,
            textAlign: "center",
            background: "rgba(255,255,255,0.72)",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(255,255,255,0.6)",
            boxShadow: "0 24px 64px rgba(0,0,0,0.12)",
            borderRadius: 24,
            padding: "2.5rem 2rem",
          }}
        >
          <div
            style={{
              fontSize: 48,
              marginBottom: 12,
            }}
          >
            👻
          </div>
          <p
            style={{
              fontSize: 11,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              fontWeight: 700,
              color: "#EF4444",
              margin: 0,
            }}
          >
            Critical failure
          </p>
          <h1
            style={{
              fontSize: 28,
              fontWeight: 800,
              margin: "12px 0 8px",
            }}
          >
            unGhost itself got ghosted.
          </h1>
          <p
            style={{ fontSize: 14, color: "#5A5A5A", lineHeight: 1.6 }}
          >
            Something broke at the root level. The team is logged in and on
            it. Try refreshing.
          </p>
          {error.digest && (
            <p
              style={{
                fontSize: 10,
                fontFamily: "monospace",
                color: "#9A9A9A",
                marginTop: 16,
              }}
            >
              Trace · {error.digest}
            </p>
          )}
          <button
            onClick={() => reset()}
            style={{
              marginTop: 24,
              padding: "10px 20px",
              borderRadius: 12,
              border: "none",
              background:
                "linear-gradient(135deg, #0191FC 0%, #3454DA 100%)",
              color: "white",
              fontWeight: 700,
              fontSize: 14,
              cursor: "pointer",
              boxShadow: "0 4px 16px rgba(1, 145, 252, 0.3)",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
