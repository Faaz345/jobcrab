"use client";

import { AlertTriangle } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", background: "#0a0a0a", color: "#fafafa" }}>
        <div style={{ display: "flex", minHeight: "100vh", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, textAlign: "center", padding: 24 }}>
          <AlertTriangle style={{ width: 40, height: 40, color: "#f87171" }} />
          <h2 style={{ fontSize: 18, fontWeight: 600 }}>Application error</h2>
          <p style={{ fontSize: 14, color: "#a1a1aa", maxWidth: 420 }}>
            {error.message || "A critical error occurred."}
          </p>
          <button
            onClick={reset}
            style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #3f3f46", background: "transparent", color: "#fafafa", cursor: "pointer" }}
          >
            Reload
          </button>
        </div>
      </body>
    </html>
  );
}
