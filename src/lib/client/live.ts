"use client";
import { useEffect, useRef, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";

export type LiveEvent = { type: string; orderId?: string; status?: string; at?: number; topic?: string };

const PREFIX = "apporte:";
let clientPromise: Promise<SupabaseClient | null> | null = null;

function getClient(): Promise<SupabaseClient | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon || typeof window === "undefined") return Promise.resolve(null);
  if (!clientPromise) {
    clientPromise = import("@supabase/supabase-js")
      .then(({ createClient }) =>
        createClient(url, anon, {
          auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
          realtime: { params: { eventsPerSecond: 5 } },
        }),
      )
      .catch(() => null);
  }
  return clientPromise;
}

type Listener = { onEvent: (e: LiveEvent) => void; onStatus: (ok: boolean) => void };
type TopicEntry = { listeners: Set<Listener>; ok: boolean; channel?: { unsubscribe: () => unknown }; closing?: ReturnType<typeof setTimeout> };
const topicsHub = new Map<string, TopicEntry>();

/** One shared channel per topic, reference-counted across components. */
function joinTopic(topic: string, l: Listener): () => void {
  let entry = topicsHub.get(topic);
  if (entry?.closing) {
    clearTimeout(entry.closing);
    entry.closing = undefined;
  }
  if (!entry) {
    const created: TopicEntry = { listeners: new Set(), ok: false };
    entry = created;
    topicsHub.set(topic, created);
    getClient().then((c) => {
      if (!c || topicsHub.get(topic) !== created) return;
      const ch = c.channel(PREFIX + topic, { config: { broadcast: { self: false } } });
      ch.on("broadcast", { event: "*" }, (msg: { event: string; payload?: LiveEvent }) => {
        const e = { ...(msg.payload || {}), type: msg.payload?.type || msg.event, topic };
        created.listeners.forEach((x) => x.onEvent(e));
      });
      ch.subscribe((status: string) => {
        created.ok = status === "SUBSCRIBED";
        created.listeners.forEach((x) => x.onStatus(created.ok));
      });
      created.channel = { unsubscribe: () => c.removeChannel(ch) };
    });
  }
  entry.listeners.add(l);
  l.onStatus(entry.ok);
  const e = entry;
  return () => {
    e.listeners.delete(l);
    if (e.listeners.size === 0) {
      // Small grace period so page transitions don't churn the socket
      e.closing = setTimeout(() => {
        if (e.listeners.size === 0) {
          try {
            e.channel?.unsubscribe();
          } catch {}
          topicsHub.delete(topic);
        }
      }, 3_000);
    }
  };
}

/**
 * Subscribe to realtime topics (Supabase Broadcast) and call `onEvent` on each
 * event. Also calls `onEvent({type:"poll"})` on a timer as a fallback: slowly
 * when realtime is connected, quickly when it is not. Paused while the tab is
 * hidden; resyncs as soon as it becomes visible again.
 */
export function useLive(
  topics: string[],
  onEvent: (e: LiveEvent) => void,
  opts: { pollMs?: number; fastPollMs?: number; enabled?: boolean } = {},
): { connected: boolean } {
  const { pollMs = 20_000, fastPollMs = 6_000, enabled = true } = opts;
  const [connected, setConnected] = useState(false);
  const cb = useRef(onEvent);
  cb.current = onEvent;
  const key = topics.filter(Boolean).sort().join("|");

  useEffect(() => {
    if (!enabled || !key) return;
    const list = key.split("|");
    const ok = new Map<string, boolean>();
    const leaves = list.map((t) =>
      joinTopic(t, {
        onEvent: (e) => cb.current(e),
        onStatus: (s) => {
          ok.set(t, s);
          setConnected(list.every((x) => ok.get(x)));
        },
      }),
    );
    return () => {
      leaves.forEach((leave) => leave());
      setConnected(false);
    };
  }, [key, enabled]);

  // Fallback polling
  useEffect(() => {
    if (!enabled) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const tick = () => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") {
        timer = setTimeout(tick, 2_000);
        return;
      }
      cb.current({ type: "poll" });
      timer = setTimeout(tick, connected ? pollMs : fastPollMs);
    };
    timer = setTimeout(tick, connected ? pollMs : fastPollMs);
    const onVisible = () => {
      if (document.visibilityState === "visible") cb.current({ type: "resync" });
    };
    const onOnline = () => cb.current({ type: "resync" });
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", onOnline);
    return () => {
      if (timer) clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", onOnline);
    };
  }, [connected, pollMs, fastPollMs, enabled]);

  return { connected };
}
