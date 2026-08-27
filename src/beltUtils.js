export const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** How many of the oldest weeks are treated as "on their way out" of the window. */
export const EXPIRING_WEEKS = 4;

/** A fresh week with every day unattended. */
export function emptyDays() {
  return Object.fromEntries(DAYS.map((d) => [d, false]));
}

/**
 * Computes the BELT average: sum of the best 8 day-counts out of a 12-week window, divided by 8.
 * Returns null if fewer than 8 weeks are provided.
 *
 * @param {Array<{ days: Record<string, boolean> }>} weeks
 * @returns {number | null}
 */
export function computeBELT(weeks) {
  const counts = weeks.map((w) => Object.values(w.days).filter(Boolean).length);
  const sorted = [...counts].sort((a, b) => b - a);
  const best8 = sorted.slice(0, 8);
  if (best8.length < 8) return null;
  return best8.reduce((a, b) => a + b, 0) / 8;
}

/**
 * Measures what the oldest weeks are actually worth by comparing the BELT now
 * against the BELT once they have aged out and nothing new has been logged.
 *
 * This asks the question directly rather than guessing from day counts. A week
 * only shows up as a loss if removing it genuinely moves the average, so weeks
 * that tie with their replacement — or that were never in the best 8 — cost
 * nothing and stay silent. Because it compares the whole window at once, it
 * also catches the case where no single week matters on its own but several
 * leaving together do.
 *
 * `perWeek` breaks the total down over the oldest weeks, in the order they
 * actually leave. Each entry is what the BELT loses at the moment that week
 * ages out, given the ones before it are already gone. Attributing the cost
 * to a step of the real timeline keeps the parts honest: they telescope to
 * exactly `drop`, so a week reads as free only when the loss genuinely lands
 * on a later departure rather than vanishing.
 *
 * Measuring each week in isolation instead would break that. Against nine
 * weeks at three days, removing any single one is absorbed by a backfill and
 * scores zero, yet the four together cost 1.125 — the total would have no
 * parts to account for it.
 *
 * Returns null when the window is too short to have a BELT at either end.
 *
 * @param {Array<{ days: Record<string, boolean> }>} weeks - oldest first
 * @returns {{ current: number, after: number, drop: number, perWeek: number[] } | null}
 */
export function computeExpiringDrop(weeks) {
  const current = computeBELT(weeks);
  // The surviving weeks alone: any new weeks arriving to replace the expired
  // ones start empty, and empty weeks can never displace a survivor from the
  // best 8, so leaving them out gives the same average.
  const after = computeBELT(weeks.slice(EXPIRING_WEEKS));
  if (current === null || after === null) return null;

  // Every intermediate window sits between the full one and the survivors, so
  // each is long enough to have a BELT once the two ends above are non-null.
  const perWeek = Array.from({ length: EXPIRING_WEEKS }, (_, i) =>
    computeBELT(weeks.slice(i)) - computeBELT(weeks.slice(i + 1))
  );

  return { current, after, drop: current - after, perWeek };
}

/**
 * Returns the minimum number of days needed in the current (last) week to achieve BELT >= 3.0.
 * Returns "7+" if even a full week of 7 days cannot reach the threshold.
 *
 * @param {Array<{ days: Record<string, boolean> }>} weeks - full 12-week window, last entry = current week
 * @returns {number | "7+"}
 */
export function computeMinDaysNeeded(weeks) {
  for (let target = 0; target <= 7; target++) {
    const testWeeks = weeks.map((w, i) => {
      if (i === weeks.length - 1) {
        const fakeDays = {};
        DAYS.forEach((d, di) => (fakeDays[d] = di < target));
        return { ...w, days: fakeDays };
      }
      return w;
    });
    const b = computeBELT(testWeeks);
    if (b !== null && b >= 3) return target;
  }
  return "7+";
}
