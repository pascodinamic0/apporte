"use client";
import { useRouter } from "next/navigation";
import { useRef } from "react";
import { useLive } from "@/src/lib/client/live";
import { LiveBadge } from "./LiveBadge";

/** Re-render a server page when a realtime event arrives (fallback: polling). */
export function LiveRefresh({ topics, pollMs = 12_000, fastPollMs = 4_000, badge = true }: { topics: string[]; pollMs?: number; fastPollMs?: number; badge?: boolean }) {
  const router = useRouter();
  const t = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { connected } = useLive(
    topics,
    () => {
      if (t.current) clearTimeout(t.current);
      t.current = setTimeout(() => router.refresh(), 250);
    },
    { pollMs, fastPollMs },
  );
  return badge ? <LiveBadge connected={connected} /> : null;
}
