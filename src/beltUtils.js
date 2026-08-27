export const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

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
