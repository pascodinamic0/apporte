"use client";

export default function GlobalError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <html lang="fr">
      <body style={{ fontFamily: "system-ui, sans-serif", margin: 0, minHeight: "100dvh", display: "grid", placeItems: "center", background: "#fff", color: "#111827" }}>
        <div style={{ maxWidth: 420, padding: 24, textAlign: "center" }}>
          <title>Erreur · Apporte</title>
          <div style={{ color: "#047857", fontWeight: 700, letterSpacing: 2, fontSize: 13 }}>APPORTE</div>
          <h1 style={{ fontSize: 24, margin: "8px 0" }}>L’application a rencontré un problème</h1>
          <p style={{ color: "#4b5563", fontSize: 14 }}>Réessaie dans un instant. Si le problème continue, écris-nous à pascal@digni-digital-llc.com.</p>
          {error.digest && <p style={{ color: "#9ca3af", fontSize: 12 }}>Référence : {error.digest}</p>}
          <button onClick={() => retry()} style={{ marginTop: 16, background: "#047857", color: "#fff", border: 0, borderRadius: 12, padding: "12px 20px", fontSize: 15, fontWeight: 600 }}>
            Réessayer
          </button>
        </div>
      </body>
    </html>
  );
}
