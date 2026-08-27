// One-time migration from Monday-keyed weeks to Sunday-keyed weeks.
//
// Nothing here talks to Firestore: it maps plain objects to plain objects so
// the transform can be tested exhaustively before it is pointed at real data.

import { DAYS, emptyDays } from "./beltUtils";
import { getWeekStart, weekId } from "./weeks";

/** Day order under the old Monday-start scheme, i.e. offsets from the Monday. */
export const OLD_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/**
 * Parses a "YYYY-MM-DD" week id as a LOCAL date.
 *
 * new Date("2026-07-06") would read it as UTC midnight, which is the previous
 * evening anywhere behind Greenwich and would shift every date by a day.
 */
export function parseWeekId(id) {
  const [y, m, d] = id.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/**
 * Rewrites Monday-keyed week records as Sunday-keyed ones.
 *
 * Rather than shifting keys by a fixed offset, every attended day is resolved
 * to its absolute calendar date and then re-filed under whichever Sunday week
 * now contains it. That keeps the two halves of the shift straight: Mon-Sat
 * move to the week starting the day before, while each Sunday moves forward to
 * open the following week. Because dates map one-to-one, no day can be dropped
 * or duplicated.
 *
 * Only attended days are carried over; an unset day is already the default.
 *
 * @param {Record<string, Record<string, boolean>>} oldWeeks - by Monday id
 * @returns {Record<string, Record<string, boolean>>} by Sunday id
 */
export function remapWeeks(oldWeeks) {
  const out = {};
  for (const [oldId, days] of Object.entries(oldWeeks)) {
    const monday = parseWeekId(oldId);
    for (const [dayName, attended] of Object.entries(days || {})) {
      if (!attended) continue;
      const offset = OLD_DAYS.indexOf(dayName);
      if (offset === -1) continue; // unrecognised key, leave it behind
      const date = new Date(monday);
      date.setDate(monday.getDate() + offset);
      const newId = weekId(getWeekStart(date));
      if (!out[newId]) out[newId] = emptyDays();
      out[newId][DAYS[date.getDay()]] = true;
    }
  }
  return out;
}

/** Total attended days across a set of week records. */
export function countAttended(weeks) {
  return Object.values(weeks).reduce(
    (sum, days) => sum + Object.values(days || {}).filter(Boolean).length,
    0
  );
}

/**
 * Describes what a migration would do, without performing it.
 *
 * `balanced` is the safety check worth reading first: the day totals before
 * and after must match exactly, since the transform only ever re-files days.
 */
export function planMigration(oldWeeks) {
  const migrated = remapWeeks(oldWeeks);
  const before = countAttended(oldWeeks);
  const after = countAttended(migrated);
  return {
    migrated,
    before,
    after,
    balanced: before === after,
    sourceWeeks: Object.keys(oldWeeks).length,
    targetWeeks: Object.keys(migrated).length,
    rows: Object.entries(migrated)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([id, days]) => ({
        id,
        days: DAYS.filter((d) => days[d]),
      })),
  };
}
