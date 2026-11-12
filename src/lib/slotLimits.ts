// Shared by the website and the app, so it must not import React or Node modules.
//
// The same rules as POST /api/events/[slug]/participants, worked out before saving so a person
// is not offered a slot the server would refuse.

interface Holder {
  id: string;
  availability?: string[];
  availableDates?: string[];
}

const slotsOf = (p: Holder | undefined): string[] => p?.availability || p?.availableDates || [];

/**
 * How many other people hold each slot. My own saved answer is left out, matching the server:
 * a slot I already hold is never "full" for me, so I can still edit my answer.
 */
export function slotsTakenByOthers(
  participants: readonly Holder[],
  myId: string | null | undefined,
  maxPerSlot: number | null | undefined
): Map<string, number> {
  const taken = new Map<string, number>();
  if (!maxPerSlot) return taken;
  for (const p of participants) {
    if (myId && p.id === myId) continue;
    for (const s of slotsOf(p)) taken.set(s, (taken.get(s) ?? 0) + 1);
  }
  return taken;
}

/** The slots I cannot take: at the limit without counting me, and not already in my saved answer. */
export function fullSlotsFor(
  participants: readonly Holder[],
  myId: string | null | undefined,
  maxPerSlot: number | null | undefined
): Set<string> {
  const full = new Set<string>();
  if (!maxPerSlot) return full;
  const held = new Set(slotsOf(myId ? participants.find(p => p.id === myId) : undefined));
  for (const [slot, count] of slotsTakenByOthers(participants, myId, maxPerSlot)) {
    if (count >= maxPerSlot && !held.has(slot)) full.add(slot);
  }
  return full;
}

/**
 * What a change to the selection may become. Slots already chosen stay, new ones are dropped if
 * they are full, and only as many are added as the per-person limit leaves room for.
 * Returns `prev` itself when nothing changes, so React can skip the update.
 */
export function withinLimits(
  prev: string[],
  wanted: readonly string[],
  fullSlots: ReadonlySet<string>,
  maxPicks: number | null | undefined
): string[] {
  const had = new Set(prev);
  const kept = wanted.filter(s => had.has(s));
  let added = wanted.filter(s => !had.has(s) && !fullSlots.has(s));
  if (maxPicks) added = added.slice(0, Math.max(0, maxPicks - kept.length));
  return added.length === 0 && kept.length === prev.length ? prev : [...kept, ...added];
}
