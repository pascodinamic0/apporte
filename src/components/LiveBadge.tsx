"use client";
export function LiveBadge({ connected, className = "" }: { connected: boolean; className?: string }) {
  return (
    <span
      data-testid="live-badge"
      data-connected={connected ? "1" : "0"}
      title={connected ? "Mises à jour en temps réel" : "Actualisation automatique"}
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium ${
        connected ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-800"
      } ${className}`}
    >
      <span className="relative flex h-2 w-2">
        {connected && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />}
        <span className={`relative inline-flex h-2 w-2 rounded-full ${connected ? "bg-emerald-500" : "bg-amber-500"}`} />
      </span>
      {connected ? "En direct" : "Auto"}
    </span>
  );
}
