import { OFFER_LEASE_MS } from "./geo";

/** A rider counts as watching the dashboard if they polled within this window. */
export const RIDER_PRESENCE_MS = 10_000;

const g = globalThis as typeof globalThis & { __apporteRiderSeen?: Map<string, number> };

function seenMap() {
  return (g.__apporteRiderSeen ??= new Map<string, number>());
}

export function markRiderPresent(riderId: string, now = Date.now()) {
  seenMap().set(riderId, now);
}

export function riderIsPresent(riderId: string, now = Date.now()) {
  return (seenMap().get(riderId) ?? 0) + RIDER_PRESENCE_MS > now;
}

export type DispatchQueue = {
  riderIds: string[];
  currentIndex: number;
  expireAt?: number;
};

export type DispatchStep = {
  riderIds: string[];
  currentIndex: number;
  expireAt?: number;
  changed: boolean;
  closed: boolean;
  offer: boolean;
};

function nextOnlineForward(riderIds: string[], start: number, online: Set<string>): number | null {
  for (let i = start; i < riderIds.length; i++) {
    if (online.has(riderIds[i])) return i;
  }
  return null;
}

/** First rider at or after `start` who is online and has the dashboard open. */
function nextWatching(
  riderIds: string[],
  start: number,
  online: Set<string>,
  present: (id: string) => boolean,
): number | null {
  for (let i = start; i < riderIds.length; i++) {
    const id = riderIds[i];
    if (online.has(id) && present(id)) return i;
  }
  return null;
}

/**
 * Decide who should see this course on the current poll.
 * Online riders who are not watching the app do not hold the offer:
 * the rider with the dashboard open receives it on this request.
 */
export function stepDispatchQueue(
  queue: DispatchQueue,
  riderId: string,
  opts: {
    now: number;
    online: Set<string>;
    declined: boolean;
    present: (id: string) => boolean;
    leaseMs?: number;
  },
): DispatchStep {
  const leaseMs = opts.leaseMs ?? OFFER_LEASE_MS;
  const { now, online, declined, present } = opts;
  const riderIds = queue.riderIds;
  let currentIndex = Math.max(0, queue.currentIndex);
  let expireAt = queue.expireAt;
  let changed = false;

  if (!riderIds.length || currentIndex >= riderIds.length) {
    return { riderIds, currentIndex, expireAt, changed: false, closed: true, offer: false };
  }

  if (!online.has(riderIds[currentIndex])) {
    const moved = nextOnlineForward(riderIds, currentIndex + 1, online);
    if (moved == null) {
      return { riderIds, currentIndex: riderIds.length, expireAt, changed: true, closed: true, offer: false };
    }
    currentIndex = moved;
    expireAt = now + leaseMs;
    changed = true;
  }

  const holder = riderIds[currentIndex];
  const expired = !expireAt || expireAt <= now;

  if (holder === riderId && !declined) {
    const renew = expired || expireAt! - now < 20_000;
    return {
      riderIds,
      currentIndex,
      expireAt: renew ? now + leaseMs : expireAt,
      changed: changed || renew,
      closed: false,
      offer: true,
    };
  }

  const reserved = holder !== riderId && present(holder) && !expired;
  if (reserved) {
    return { riderIds, currentIndex, expireAt, changed, closed: false, offer: false };
  }

  const start = holder === riderId || present(holder) ? currentIndex + 1 : currentIndex;
  const moved = nextWatching(riderIds, start, online, present);
  if (moved == null) {
    return { riderIds, currentIndex, expireAt, changed, closed: false, offer: false };
  }

  return {
    riderIds,
    currentIndex: moved,
    expireAt: now + leaseMs,
    changed: true,
    closed: false,
    offer: riderIds[moved] === riderId,
  };
}
